import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth/server'
import { getEmbeddingProvider } from '@relevel-me/shared'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { kind, textContent, fileUrl, transcript, tags = [] } = body

    // Validate input
    if (!kind || !['text', 'image', 'audio'].includes(kind)) {
      return NextResponse.json(
        { error: 'Invalid kind. Must be: text, image, or audio' },
        { status: 400 }
      )
    }

    if (kind === 'text' && !textContent) {
      return NextResponse.json({ error: 'Text content is required for text messages' }, { status: 400 })
    }

    if (kind === 'image' && !fileUrl) {
      return NextResponse.json({ error: 'File URL is required for image messages' }, { status: 400 })
    }

    if (kind === 'audio' && (!fileUrl || !transcript)) {
      return NextResponse.json(
        { error: 'File URL and transcript are required for audio messages' },
        { status: 400 }
      )
    }

    // Create message record
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        user_id: user.id,
        kind,
        text_content: textContent || null,
        file_url: fileUrl || null,
        transcript: transcript || null,
        tags: tags,
        meta: {
          user_id: user.id,
          created_via: 'floating-input-bar',
        },
      })
      .select()
      .single()

    if (messageError) {
      console.error('Message creation error:', messageError)
      throw new Error(messageError.message)
    }

    // Get embedding provider
    const embeddingProvider = await getEmbeddingProvider()

    // Generate embeddings based on content type
    const embeddings: Array<{
      message_id: string
      modality: string
      model: string
      dims: number
      embedding: number[]
      meta: any
    }> = []

    // For text messages: embed the text directly
    if (kind === 'text' && textContent) {
      const result = await embeddingProvider.embed({
        text: textContent,
        metadata: { user_id: user.id, message_id: message.id },
      })

      embeddings.push({
        message_id: message.id,
        modality: 'text',
        model: result.model,
        dims: result.dims,
        embedding: result.embedding,
        meta: { user_id: user.id },
      })
    }

    // For image messages: embed any OCR text (TODO: add OCR support)
    // For now, we'll just log a warning
    if (kind === 'image') {
      console.warn('[Memory Create] Image embedding not yet implemented. Consider adding OCR.')
      // TODO: Add OCR extraction and embedding
      // const ocrText = await extractTextFromImage(fileUrl)
      // if (ocrText) {
      //   const result = await embeddingProvider.embed({ text: ocrText })
      //   embeddings.push({ ... })
      // }
    }

    // For audio messages: embed the transcript
    if (kind === 'audio' && transcript) {
      const result = await embeddingProvider.embed({
        text: transcript,
        metadata: { user_id: user.id, message_id: message.id, hint: 'transcript' },
      })

      embeddings.push({
        message_id: message.id,
        modality: 'text',
        model: result.model,
        dims: result.dims,
        embedding: result.embedding,
        meta: { user_id: user.id, hint: 'transcript' },
      })
    }

    // Store embeddings in database
    if (embeddings.length > 0) {
      const { error: embeddingsError } = await supabase
        .from('message_embeddings')
        .insert(embeddings)

      if (embeddingsError) {
        console.error('Embeddings storage error:', embeddingsError)
        // Don't fail the request if embeddings fail - we still have the message
        console.warn('[Memory Create] Message created but embeddings failed to store')
      }
    }

    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        kind: message.kind,
        textContent: message.text_content,
        fileUrl: message.file_url,
        transcript: message.transcript,
        tags: message.tags,
        createdAt: message.created_at,
      },
      embeddingsCount: embeddings.length,
    })

  } catch (error: any) {
    console.error('Memory creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create memory' },
      { status: 500 }
    )
  }
}
