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
      group_id: g.id,
      group_name: g.name,
      description: g.description,
      contribution_amount: g.contribution_amount,
      contribution_frequency: g.contribution_frequency,
      interest_rate: g.interest_rate,
      max_members: g.max_members,
      is_private: g.is_private,
      created_at: g.created_at,
      role: g.group_members[0]?.role || 'member'
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

    const { data: new_group_id, error } = await supabase
      .rpc('create_new_group', {
        p_name: name,
        p_description: description,
        p_contribution_amount: contribution_amount,
        p_contribution_frequency: contribution_frequency,
        p_interest_rate: interest_rate,
        p_max_members: max_members,
        p_is_private: is_private,
        p_admin_id: user.id
      })

    if (error) {
      console.error('Error creating group via RPC:', error)
      return NextResponse.json({ error: 'Failed to create group', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, group: { id: new_group_id } })

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