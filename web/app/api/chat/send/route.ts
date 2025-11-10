import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth/server'
import { sendChatMessage, createRequestLogger, logError } from '@relevel-me/shared'

export async function POST(request: NextRequest) {
  const logger = createRequestLogger()
  let user: any = null

  try {
    // Authenticate user
    const supabase = createServerClient()
    const { data: { user: authenticatedUser }, error: authError } = await supabase.auth.getUser()
    user = authenticatedUser

    if (authError || !user) {
      logger.warn({ error: authError?.message }, 'Unauthorized chat attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.info({ userId: user.id }, 'Processing chat message')

    // Parse request body
    const body = await request.json()
    const { message, conversationId, includeMemoryContext = true } = body

    // Validate input
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    // Process chat message through LLM
    const result = await sendChatMessage({
      supabase, // Pass authenticated client to respect RLS
      userId: user.id,
      conversationId,
      userMessage: message,
      includeMemoryContext,
    })

    if (!result.success) {
      logger.error({ error: result.error }, 'Chat service error')
      return NextResponse.json(
        { error: result.error || 'Failed to process chat message' },
        { status: 500 }
      )
    }

    logger.info(
      {
        userId: user.id,
        conversationId: result.conversationId,
        responseLength: result.assistantMessage?.length,
      },
      'Chat message processed successfully'
    )

    return NextResponse.json({
      success: true,
      conversationId: result.conversationId,
      message: result.assistantMessage,
    })

  } catch (error: any) {
    logError(logger, 'Chat API error', error, { userId: user?.id })
    return NextResponse.json(
      { error: error.message || 'Failed to send chat message' },
      { status: 500 }
    )
  }
}
