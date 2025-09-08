import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 })
    }

    // This is the CORRECTED query.
    // It uses a standard .select() which WILL RESPECT the RLS policies.
    // The previous .rpc() call was bypassing them entirely.
    const { data: groups, error } = await supabase
      .from('groups')
      .select(`
        id,
        name,
        description,
        contribution_amount,
        contribution_frequency,
        interest_rate,
        max_members,
        is_private,
        created_at,
        group_members!inner(
          role,
          is_active
        )
      `)
      .eq('group_members.user_id', user.id)
      .eq('group_members.is_active', true)

    if (error) {
      console.error('Error fetching groups with RLS:', error)
      return NextResponse.json({ error: 'Failed to fetch groups', details: error.message }, { status: 500 })
    }

    // We need to reshape the data slightly to match what the frontend expects.
    const formattedGroups = groups?.map(g => ({
      id: g.id,
      name: g.name,
      description: g.description,
      contribution_amount: g.contribution_amount,
      contribution_frequency: g.contribution_frequency,
      interest_rate: g.interest_rate,
      max_members: g.max_members,
      is_private: g.is_private,
      created_at: g.created_at,
      userRole: g.group_members[0]?.role || 'member'
    })) || []

    return NextResponse.json({ 
      success: true, 
      groups: formattedGroups
    })

  } catch (error: any) {
    console.error('Error in groups API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 })
    }

    const { name, description, contribution_amount, contribution_frequency, interest_rate, max_members, is_private } = await request.json()

    if (!name || !contribution_amount || !contribution_frequency) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create group directly
    console.log('Creating group with data:', {
      name,
      description,
      admin_id: user.id,
      contribution_amount,
      contribution_frequency,
      interest_rate,
      max_members,
      is_private
    })

    const { data: newGroup, error: groupError } = await supabase
      .from('groups')
      .insert({
        name,
        description,
        admin_id: user.id,
        contribution_amount: parseFloat(contribution_amount),
        contribution_frequency,
        interest_rate: parseFloat(interest_rate) || 0,
        max_members: parseInt(max_members) || 20,
        is_private: Boolean(is_private)
      })
      .select()
      .single()

    if (groupError) {
      console.error('Error creating group:', groupError)
      return NextResponse.json({ 
        error: 'Failed to create group', 
        details: groupError.message,
        code: groupError.code,
        hint: groupError.hint
      }, { status: 500 })
    }

    console.log('Group created successfully:', newGroup)

    // Add the creator as an admin member
    console.log('Adding admin member:', {
      group_id: newGroup.id,
      user_id: user.id,
      role: 'admin',
      is_active: true
    })

    const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: newGroup.id,
        user_id: user.id,
        role: 'admin',
        is_active: true
      })

    if (memberError) {
      console.error('Error adding admin member:', memberError)
      // Try to clean up the group if member creation fails
      await supabase.from('groups').delete().eq('id', newGroup.id)
      return NextResponse.json({ 
        error: 'Failed to add admin member', 
        details: memberError.message,
        code: memberError.code,
        hint: memberError.hint
      }, { status: 500 })
    }

    console.log('Admin member added successfully')

    return NextResponse.json({ success: true, group: { id: newGroup.id } })

  } catch (error: any) {
    console.error('Error in POST /api/groups:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Handler for CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}