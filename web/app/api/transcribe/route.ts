import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth/server'
import OpenAI from 'openai'

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
    const { audioPath } = body

    if (!audioPath) {
      return NextResponse.json({ error: 'Audio path is required' }, { status: 400 })
    }

    // Verify that the audio file belongs to the authenticated user
    if (!audioPath.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: 'Unauthorized access to audio file' }, { status: 403 })
    }

    // Download audio file from Supabase Storage
    const { data: audioData, error: downloadError } = await supabase.storage
      .from('audio')
      .download(audioPath)

    if (downloadError || !audioData) {
      console.error('Download error:', downloadError)
      return NextResponse.json({ error: 'Failed to download audio file' }, { status: 500 })
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Cannot transcribe audio.' },
        { status: 500 }
      )
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    // Convert blob to File object for OpenAI API
    const audioFile = new File([audioData], audioPath.split('/').pop() || 'audio.webm', {
      type: 'audio/webm',
    })

    // Transcribe using Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en', // Can be made configurable
      response_format: 'verbose_json', // Get additional metadata
    })

    return NextResponse.json({
      success: true,
      transcript: transcription.text,
      language: transcription.language,
      duration: transcription.duration,
      segments: transcription.segments || [],
    })

  } catch (error: any) {
    console.error('Transcription error:', error)
    return NextResponse.json(
      { error: error.message || 'Transcription failed' },
      { status: 500 }
    )
  }
}
