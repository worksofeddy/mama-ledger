import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export async function GET(
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
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    // Check if user is a member of this group
    const { data: membership, error: membershipError } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Access denied - Not a group member' }, { status: 403 })
    }

    // Build query
    let query = supabase
      .from('contributions')
      .select(`
        id,
        amount,
        contribution_type,
        merry_go_round_amount,
        investment_amount,
        penalty_amount,
        penalty_reason,
        contribution_date,
        due_date,
        payment_status,
        created_at,
        users (
          id,
          email,
          user_profiles (
            first_name,
            last_name
          )
        )
      `)
      .eq('group_id', groupId)
      .order('contribution_date', { ascending: false })

    // If user is not admin, only show their own contributions
    if (membership.role !== 'admin' && membership.role !== 'treasurer') {
      query = query.eq('user_id', user.id)
    } else if (userId) {
      // Admin/treasurer can filter by specific user
      query = query.eq('user_id', userId)
    }

    const { data: contributions, error } = await query

    if (error) {
      console.error('Error fetching contributions:', error)
      return NextResponse.json({ error: 'Failed to fetch contributions' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      contributions: contributions || []
    })

  } catch (error: any) {
    console.error('Error in contributions API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
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

    const { id: groupId } = await params
    const body = await request.json()
    const { 
      amount, 
      contribution_type, 
      merry_go_round_amount = 0, 
      investment_amount = 0, 
      penalty_amount = 0, 
      penalty_reason,
      contribution_date,
      due_date 
    } = body

    // Check if user is a member of this group
    const { data: membership, error: membershipError } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Access denied - Not a group member' }, { status: 403 })
    }

    // Validate required fields
    if (!amount || !contribution_type) {
      return NextResponse.json({ 
        error: 'Missing required fields: amount, contribution_type' 
      }, { status: 400 })
    }

    // For merry-go-round contributions, check if user can contribute
    if (contribution_type === 'merry_go_round') {
      const { data: canContribute, error: checkError } = await supabase
        .rpc('can_contribute_merry_go_round', {
          p_group_id: groupId,
          p_user_id: user.id
        })

      if (checkError) {
        console.error('Error checking merry-go-round eligibility:', checkError)
      } else if (!canContribute) {
        return NextResponse.json({ 
          error: 'You have already won in the current merry-go-round' 
        }, { status: 400 })
      }
    }

    // Create contribution
    const { data: contribution, error: contribError } = await supabase
      .from('contributions')
      .insert({
        group_id: groupId,
        user_id: user.id,
        amount: parseFloat(amount),
        contribution_type,
        merry_go_round_amount: parseFloat(merry_go_round_amount),
        investment_amount: parseFloat(investment_amount),
        penalty_amount: parseFloat(penalty_amount),
        penalty_reason,
        contribution_date: contribution_date || new Date().toISOString().split('T')[0],
        due_date: due_date || new Date().toISOString().split('T')[0],
        payment_status: 'paid' // Assuming immediate payment for now
      })
      .select(`
        id,
        amount,
        contribution_type,
        merry_go_round_amount,
        investment_amount,
        penalty_amount,
        penalty_reason,
        contribution_date,
        due_date,
        payment_status,
        created_at
      `)
      .single()

    if (contribError) {
      console.error('Error creating contribution:', contribError)
      return NextResponse.json({ error: 'Failed to create contribution' }, { status: 500 })
    }

    // If this is a merry-go-round contribution, update the merry-go-round total
    if (contribution_type === 'merry_go_round' && merry_go_round_amount > 0) {
      // Get current merry-go-round or create new one
      const { data: currentRound, error: roundError } = await supabase
        .from('merry_go_rounds')
        .select('id, total_amount')
        .eq('group_id', groupId)
        .eq('status', 'active')
        .single()

      if (roundError && roundError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching current merry-go-round:', roundError)
      } else if (currentRound) {
        // Update existing round
        await supabase
          .from('merry_go_rounds')
          .update({ 
            total_amount: currentRound.total_amount + parseFloat(merry_go_round_amount)
          })
          .eq('id', currentRound.id)
      } else {
        // Create new round
        await supabase
          .from('merry_go_rounds')
          .insert({
            group_id: groupId,
            round_number: 1, // This should be calculated based on previous rounds
            total_amount: parseFloat(merry_go_round_amount),
            status: 'active'
          })
      }
    }

    return NextResponse.json({ 
      success: true, 
      contribution
    })

  } catch (error: any) {
    console.error('Error in create contribution API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
