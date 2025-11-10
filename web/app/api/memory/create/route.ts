import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth/server'
import { getEmbeddingProvider, createRequestLogger, logError } from '@relevel-me/shared'

export async function POST(request: NextRequest) {
  const logger = createRequestLogger()
  let userId: string | undefined

  try {
    // Authenticate user
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    userId = user?.id

    if (authError || !user) {
      logger.warn({ error: authError?.message }, 'Unauthorized memory creation attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.info({ userId: user.id }, 'Creating memory')

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

    // Get embedding provider with error handling
    let embeddingProvider
    try {
      embeddingProvider = await getEmbeddingProvider()
      logger.info({ provider: embeddingProvider.name }, 'Embedding provider initialized')
    } catch (embeddingError) {
      // ONNX Runtime or model loading error - continue without embeddings
      logError(logger, 'Failed to initialize embedding provider', embeddingError as Error, {
        userId: user.id,
        messageId: message.id
      })
      logger.warn('Continuing without embeddings - memory will be stored but not searchable')

      // Return success but without embeddings
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
        embeddingsCount: 0,
        warning: 'Embeddings disabled - memory stored without vector search capability'
      })
    }

    // Database vector dimension (must match message_embeddings.embedding column)
    // NOTE: If changing this, update the database migration and HNSW index
    const DB_VECTOR_DIMS = 1536

    // Helper function to pad or truncate vectors to match database dimension
    // WARNING: Padding with zeros can degrade search quality. Consider using a
    // provider with matching dimensions (OpenAI: 1536, Local: 384, HuggingFace: varies)
    const normalizeVector = (vector: number[], targetDims: number): number[] => {
      if (vector.length === targetDims) return vector

      if (vector.length > targetDims) {
        console.warn(
          `[Memory Create] Truncating ${vector.length}D vector to ${targetDims}D. ` +
          `Consider adjusting DB_VECTOR_DIMS or using a different embedding model.`
        )
        return vector.slice(0, targetDims)
      }

      // Pad with zeros if smaller
      const paddingSize = targetDims - vector.length
      console.warn(
        `[Memory Create] Padding ${vector.length}D vector to ${targetDims}D with ${paddingSize} zeros. ` +
        `This may reduce search quality. Consider using EMBEDDING_PROVIDER=openai for 1536D vectors.`
      )
      return [...vector, ...new Array(paddingSize).fill(0)]
    }

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
        embedding: normalizeVector(result.embedding, DB_VECTOR_DIMS),
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
        embedding: normalizeVector(result.embedding, DB_VECTOR_DIMS),
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
    logError(logger, 'Memory creation error', error, { userId })
    return NextResponse.json(
      { error: error.message || 'Failed to create memory' },
      { status: 500 }
    )
  }
}
