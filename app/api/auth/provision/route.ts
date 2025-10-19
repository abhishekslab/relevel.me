import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth/server'

/**
 * Provisions a new user record in the public.users table
 * Called after successful authentication to ensure user record exists
 */
export async function POST() {
  try {
    const supabase = createServerClient()

    // Get current user - use getUser() for security (validates with auth server)
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check if user record already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (existingUser) {
      return NextResponse.json({
        success: true,
        message: 'User already exists',
        userId: existingUser.id,
      })
    }

    // Create new user record
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        auth_user_id: user.id,
        email: user.email,
      })
      .select('id')
      .single()

    if (createError) {
      console.error('Error creating user record:', createError)
      return NextResponse.json(
        { error: 'Failed to create user record' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'User provisioned successfully',
      userId: newUser.id,
    })
  } catch (error) {
    console.error('User provisioning error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
