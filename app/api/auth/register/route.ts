import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, fullName } = body

    // Validate input
    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Email, password, and full name are required' },
        { status: 400 }
      )
    }

    // Create user account with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    if (data.user) {
      // Create user profile in our users table
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email!,
          full_name: fullName,
        })

      if (profileError) {
        // If profile creation fails, we should clean up the auth user
        // For now, just return an error
        return NextResponse.json(
          { error: 'Failed to create user profile' },
          { status: 500 }
        )
      }

      // Fetch the created profile
      const { data: userProfile, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (fetchError) {
        return NextResponse.json(
          { error: 'Failed to fetch user profile' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        user: userProfile,
        message: 'User registered successfully'
      }, { status: 201 })
    }

    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
