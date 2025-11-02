import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth/server'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']

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
        { error: 'Invalid file type. Allowed types: PNG, JPEG, JPG, WebP' },
        { status: 400 }
      )
    }

    // Delete existing background images for this user
    const { data: existingFiles } = await supabase.storage
      .from('backgrounds')
      .list(user.id)

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map(f => `${user.id}/${f.name}`)
      await supabase.storage
        .from('backgrounds')
        .remove(filesToDelete)
    }

    // Upload new file to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/background-${Date.now()}.${fileExt}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('backgrounds')
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
      .from('backgrounds')
      .getPublicUrl(fileName)

    // Update user record with new background URL
    const { error: updateError } = await supabase
      .from('users')
      .update({ background_image_url: publicUrl })
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
    console.error('Background upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    )
  }
}
