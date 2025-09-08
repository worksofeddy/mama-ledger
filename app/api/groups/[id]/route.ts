import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params;
    if (!groupId) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 });
      }
      console.error('Error fetching group details:', error);
      return NextResponse.json({ error: 'Failed to fetch group details', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, group: data });
  } catch (error) {
    console.error('Error in GET /api/groups/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handler for CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function PUT(
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

    const { id: groupId } = await params
    const body = await request.json()

    // Check if user is admin of this group
    const { data: membership, error: membershipError } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (membershipError) {
      console.error('Error checking membership:', membershipError)
      console.error('User ID:', user.id)
      console.error('Group ID:', groupId)
      return NextResponse.json({ 
        error: 'Failed to verify group membership', 
        details: membershipError.message 
      }, { status: 500 })
    }

    if (!membership || membership.role !== 'admin') {
      console.error('Access denied - User is not admin')
      console.error('Membership data:', membership)
      return NextResponse.json({ error: 'Access denied - Admin role required' }, { status: 403 })
    }

    // First, check if the group exists and user has access
    const { data: existingGroup, error: checkError } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single()

    if (checkError) {
      console.error('Error checking group existence:', checkError)
      console.error('Group ID:', groupId)
      return NextResponse.json({ 
        error: 'Group not found or access denied', 
        details: checkError.message 
      }, { status: 404 })
    }

    console.log('Group found for update:', existingGroup.name, 'Admin:', existingGroup.admin_id, 'User:', user.id)

    // Update group
    const { data: groups, error: groupError } = await supabase
      .from('groups')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', groupId)
      .select()

    if (groupError) {
      console.error('Error updating group:', groupError)
      console.error('Update data:', body)
      console.error('Group ID:', groupId)
      return NextResponse.json({ 
        error: 'Failed to update group', 
        details: groupError.message,
        code: groupError.code 
      }, { status: 500 })
    }

    if (!groups || groups.length === 0) {
      console.error('No group found to update after update query')
      console.error('Group ID:', groupId)
      console.error('Update result:', groups)
      return NextResponse.json({ 
        error: 'Group not found after update' 
      }, { status: 404 })
    }

    const group = groups[0]

    return NextResponse.json({ 
      success: true, 
      group: {
        ...group,
        userRole: 'admin'
      }
    })

  } catch (error: any) {
    console.error('Error in update group API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
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

    const { id: groupId } = await params

    // Check if user is admin of this group
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

    // Check if group has active loans or contributions
    const { data: activeLoans, error: loansError } = await supabase
      .from('loans')
      .select('id')
      .eq('group_id', groupId)
      .in('status', ['pending', 'approved', 'active'])
      .limit(1)

    if (loansError) {
      console.error('Error checking active loans:', loansError)
      return NextResponse.json({ error: 'Failed to check group status' }, { status: 500 })
    }

    if (activeLoans && activeLoans.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete group with active loans. Please resolve all loans first.' 
      }, { status: 400 })
    }

    const { data: contributions, error: contributionsError } = await supabase
      .from('contributions')
      .select('id')
      .eq('group_id', groupId)
      .limit(1)

    if (contributionsError) {
      console.error('Error checking contributions:', contributionsError)
      return NextResponse.json({ error: 'Failed to check group status' }, { status: 500 })
    }

    if (contributions && contributions.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete group with existing contributions. Please contact support.' 
      }, { status: 400 })
    }

    // Delete group (this will cascade delete group_members due to foreign key constraints)
    const { error: deleteError } = await supabase
      .from('groups')
      .delete()
      .eq('id', groupId)

    if (deleteError) {
      console.error('Error deleting group:', deleteError)
      return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Group deleted successfully' 
    })

  } catch (error: any) {
    console.error('Error in delete group API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
