import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

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

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100) // Max 100 per page
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || 'all'
    const frequency = searchParams.get('frequency') || 'all'
    const privacy = searchParams.get('privacy') || 'all'
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const offset = (page - 1) * limit

    // Build the base query
    let query = supabase
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

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    if (role !== 'all') {
      query = query.eq('group_members.role', role)
    }

    if (frequency !== 'all') {
      query = query.eq('contribution_frequency', frequency)
    }

    if (privacy !== 'all') {
      const isPrivate = privacy === 'private'
      query = query.eq('is_private', isPrivate)
    }

    // Apply sorting
    const ascending = sortOrder === 'asc'
    switch (sortBy) {
      case 'name':
        query = query.order('name', { ascending })
        break
      case 'member_count':
        // Note: This would require a more complex query with member counts
        query = query.order('created_at', { ascending: false })
        break
      case 'contribution_amount':
        query = query.order('contribution_amount', { ascending })
        break
      case 'created_at':
      default:
        query = query.order('created_at', { ascending })
        break
    }

    // Get total count for pagination
    const { count: totalCount, error: countError } = await supabase
      .from('groups')
      .select('*', { count: 'exact', head: true })
      .eq('group_members.user_id', user.id)
      .eq('group_members.is_active', true)

    if (countError) {
      console.error('Error getting count:', countError)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: groups, error } = await query

    if (error) {
      console.error('Error fetching paginated groups:', error)
      return NextResponse.json({ error: 'Failed to fetch groups', details: error.message }, { status: 500 })
    }

    // Format the response
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
      groups: formattedGroups,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit)
      }
    })

  } catch (error: any) {
    console.error('Error in paginated groups API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
