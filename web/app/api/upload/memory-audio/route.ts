import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth/server'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB (audio files can be larger)
const ALLOWED_TYPES = [
  'audio/webm',
  'audio/mp3',
  'audio/mpeg',
  'audio/mp4',
  'audio/m4a',
  'audio/wav',
  'audio/wave',
  'audio/ogg',
  'audio/x-m4a'
]

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed types: WebM, MP3, MP4, WAV, OGG (got ${file.type})` },
        { status: 400 }
      )
    }

    // Upload new file to Supabase Storage (audio bucket)
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/memory-${Date.now()}.${fileExt}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new Error(uploadError.message)
    }

    // Generate signed URL to return to client (valid for 1 year)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('audio')
      .createSignedUrl(fileName, 31536000)

    if (signedUrlError || !signedUrlData) {
      console.error('Signed URL error:', signedUrlError)
      throw new Error('Failed to create signed URL')
    }

    return NextResponse.json({
      success: true,
      url: signedUrlData.signedUrl,
      path: fileName,
      fileName: file.name,
      fileSize: file.size,
      duration: null // Will be filled in by transcription service
    })

  } catch (error: any) {
    console.error('Memory audio upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    )
  }
}
