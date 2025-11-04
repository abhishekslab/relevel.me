import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth/server'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_TYPES = ['model/gltf-binary', 'application/octet-stream']

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

    // Validate file extension
    if (!file.name.toLowerCase().endsWith('.glb')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only .glb files are allowed' },
        { status: 400 }
      )
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
        { error: 'Invalid file type. Expected GLB binary format' },
        { status: 400 }
      )
    }

    // Delete existing model files for this user
    const { data: existingFiles } = await supabase.storage
      .from('models')
      .list(user.id)

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map(f => `${user.id}/${f.name}`)
      await supabase.storage
        .from('models')
        .remove(filesToDelete)
    }

    // Upload new file to Supabase Storage
    const fileName = `${user.id}/model-${Date.now()}.glb`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('models')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new Error(uploadError.message)
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('models')
      .getPublicUrl(fileName)

    // Update user record with new model URL
    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id)

    if (updateError) {
      console.error('Database update error:', updateError)
      throw new Error(updateError.message)
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: fileName
    })

  } catch (error: any) {
    console.error('Model upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    )
  }
}
