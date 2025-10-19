import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient()

    // Get user ID from request body (or use hardcoded test user)
    const body = await req.json().catch(() => ({}))
    const userId = body.userId

    // If no userId provided, get the first test user
    let user
    if (userId) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      user = data
    } else {
      // Get first user as fallback
      const { data } = await supabase
        .from('users')
        .select('*')
        .limit(1)
        .single()
      user = data
    }

    if (!user) {
      return NextResponse.json(
        { error: 'No user found. Please add a user to the database first.' },
        { status: 404 }
      )
    }

    // Create call record in database
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
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to create call record', details: dbError },
        { status: 500 }
      )
    }

    // Initiate call via CallKaro API
    const callkaroResponse = await fetch(
      `${process.env.CALLKARO_BASE_URL}/call/outbound`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': process.env.CALLKARO_API_KEY!
        },
        body: JSON.stringify({
          to_number: user.phone,
          agent_id: process.env.CALLKARO_AGENT_ID,
          metadata: {
            call_id: call.id,
            user_id: user.id,
            name: user.name
          }
        })
      }
    )

    if (!callkaroResponse.ok) {
      const errorText = await callkaroResponse.text()
      console.error('CallKaro API error:', errorText)

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
    const { error: updateError } = await supabase
      .from('calls')
      .update({
        vendor_call_id: callkaroData.call_id,
        vendor_payload: callkaroData,
        status: 'ringing'
      })
      .eq('id', call.id)

    if (updateError) {
      console.error('Failed to update call record:', updateError)
    }

    return NextResponse.json({
      success: true,
      call_id: call.id,
      vendor_call_id: callkaroData.call_id,
      status: callkaroData.status,
      message: callkaroData.message || `Call initiated to ${user.name || user.phone}`
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
