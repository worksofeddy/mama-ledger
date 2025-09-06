import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const groupId = (await params).id;
    if (!groupId) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }

    // You might want to add pagination here in a real-world scenario
    const { data: members, error } = await supabase
      .from('group_members')
      .select(`
        user_id,
        role,
        joined_at,
        is_active,
        users (
          email,
          user_profiles (
            first_name,
            last_name
          )
        )
      `)
      .eq('group_id', groupId);

    if (error) {
      console.error('Error fetching group members:', error);
      return NextResponse.json({ error: 'Failed to fetch group members', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, members });
  } catch (error) {
    console.error('Error in GET /api/groups/[id]/members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handler for CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const groupId = (await params).id
    const body = await request.json()
    const { user_id, role = 'member' } = body

    // Check if current user is admin of this group
    const { data: membership, error: membershipError } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (membershipError || !membership || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied - Admin role required' }, { status: 403 })
    }

    // Check if group has space for new member
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('max_members')
      .eq('id', groupId)
      .single()

    if (groupError) {
      console.error('Error fetching group:', groupError)
      return NextResponse.json({ error: 'Failed to fetch group' }, { status: 500 })
    }

    const { data: currentMembers, error: membersError } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('is_active', true)

    if (membersError) {
      console.error('Error fetching current members:', membersError)
      return NextResponse.json({ error: 'Failed to fetch current members' }, { status: 500 })
    }

    if (currentMembers && currentMembers.length >= group.max_members) {
      return NextResponse.json({ error: 'Group is full' }, { status: 400 })
    }

    // Check if user is already a member
    const { data: existingMember, error: existingError } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', user_id)
      .single()

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a member of this group' }, { status: 400 })
    }

    // Add new member
    const { data: newMember, error: addError } = await supabase
      .from('group_members')
      .insert({
        group_id: groupId,
        user_id: user_id,
        role: role
      })
      .select(`
        id,
        role,
        joined_at,
        users (
          id,
          email,
          user_profiles (
            first_name,
            last_name,
            phone
          )
        )
      `)
      .single()

    if (addError) {
      console.error('Error adding group member:', addError)
      return NextResponse.json({ error: 'Failed to add group member' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      member: newMember
    })

  } catch (error: any) {
    console.error('Error in add group member API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
