import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth/server'
import {
  createRequestLogger,
  logApiRequest,
  logApiResponse,
  logDatabaseError,
  logSuccess,
  logError,
} from '@relevel-me/shared'
import { captureException } from '@sentry/nextjs'

export async function POST(req: NextRequest) {
  // Create request logger for correlation
  const logger = createRequestLogger()
  const startTime = Date.now()

  logger.info('Call initiation request received')

  try {
    const supabase = createServerClient()

    // Get authenticated user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      logger.warn({ error: authError?.message }, 'Authentication failed')
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    logger.info({ userId: authUser.id }, 'User authenticated successfully')

    // Get user record from public.users table
    logger.debug({ userId: authUser.id }, 'Fetching user profile')
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (userError || !user) {
      logDatabaseError(logger, 'SELECT', 'users', userError, { userId: authUser.id })
      return NextResponse.json(
        { error: 'User profile not found. Please complete your profile first.' },
        { status: 404 }
      )
    }

    logger.info({ userId: user.id, hasPhone: !!user.phone }, 'User profile fetched')

    // Validate phone number exists
    if (!user.phone) {
      logger.warn({ userId: user.id }, 'Phone number not set for user')
      return NextResponse.json(
        { error: 'Phone number not set. Please add your phone number in profile settings.' },
        { status: 400 }
      )
    }

    // Create call record in database
    logger.info({ userId: user.id, phone: `***${user.phone.slice(-4)}` }, 'Creating call record')
    const { data: call, error: dbError } = await supabase
      .from('calls')
      .insert({
        user_id: user.id,
        to_number: user.phone,
        agent_id: process.env.CALLKARO_AGENT_ID || 'artha-daily-journal-v1',
        scheduled_at: new Date().toISOString(),
        status: 'queued'
      })
      .select()
      .single()

    if (dbError) {
      logDatabaseError(logger, 'INSERT', 'calls', dbError, { userId: user.id })
      captureException(dbError, { tags: { operation: 'create_call', userId: user.id } })
      return NextResponse.json(
        { error: 'Failed to create call record', details: dbError },
        { status: 500 }
      )
    }

    logger.info({ userId: user.id, callId: call.id }, 'Call record created')

    // Initiate call via CallKaro API
    const callkaroPayload = {
      to_number: user.phone,
      agent_id: process.env.CALLKARO_AGENT_ID,
      metadata: {
        call_id: call.id,
        user_id: user.id,
        name: user.name
      }
    }

    logApiRequest(logger, 'POST', '/call/outbound', {
      callId: call.id,
      userId: user.id,
      phone: `***${user.phone.slice(-4)}`,
      agentId: process.env.CALLKARO_AGENT_ID
    })

    const apiStartTime = Date.now()
    const callkaroResponse = await fetch(
      `${process.env.CALLKARO_BASE_URL}/call/outbound`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': process.env.CALLKARO_API_KEY!
        },
        body: JSON.stringify(callkaroPayload)
      }
    )

    const apiDuration = Date.now() - apiStartTime
    logApiResponse(logger, 'POST', '/call/outbound', callkaroResponse.status, apiDuration, {
      callId: call.id
    })

    if (!callkaroResponse.ok) {
      const errorText = await callkaroResponse.text()
      logError(logger, 'CallKaro API call failed', new Error(errorText), {
        callId: call.id,
        userId: user.id,
        status: callkaroResponse.status
      })
      captureException(new Error(`CallKaro API error: ${errorText}`), {
        tags: { operation: 'initiate_call', callId: call.id }
      })

      // Update call status to failed
      await supabase
        .from('calls')
        .update({ status: 'failed', vendor_payload: { error: errorText } })
        .eq('id', call.id)

      return NextResponse.json(
        { error: 'Failed to initiate call', details: errorText },
        { status: callkaroResponse.status }
      )
    }

    const callkaroData = await callkaroResponse.json()

    // Update call record with vendor ID
    logger.info({ callId: call.id, vendorCallId: callkaroData.call_id }, 'Updating call with vendor ID')
    const { error: updateError } = await supabase
      .from('calls')
      .update({
        vendor_call_id: callkaroData.call_id,
        vendor_payload: callkaroData,
        status: 'ringing'
      })
      .eq('id', call.id)

    if (updateError) {
      logDatabaseError(logger, 'UPDATE', 'calls', updateError, {
        callId: call.id,
        vendorCallId: callkaroData.call_id
      })
      captureException(updateError, {
        tags: { operation: 'update_call_status', callId: call.id }
      })
    }

    const totalDuration = Date.now() - startTime
    logSuccess(logger, 'Call initiated successfully', {
      callId: call.id,
      vendorCallId: callkaroData.call_id,
      userId: user.id,
      duration: totalDuration
    })

    return NextResponse.json({
      success: true,
      call_id: call.id,
      vendor_call_id: callkaroData.call_id,
      status: callkaroData.status,
      message: callkaroData.message || `Call initiated to ${user.name || user.phone}`
    })

  } catch (error) {
    logError(logger, 'Unexpected error in call initiation', error as Error, {
      duration: Date.now() - startTime
    })
    captureException(error, { tags: { operation: 'call_initiation' } })
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
