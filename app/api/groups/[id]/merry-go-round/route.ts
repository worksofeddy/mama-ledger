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

    const groupId = (await params).id

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

    // Get current merry-go-round
    const { data: currentRound, error: roundError } = await supabase
      .from('merry_go_rounds')
      .select(`
        id,
        round_number,
        total_amount,
        winner_id,
        winner_selection_method,
        winner_request_reason,
        selection_date,
        status,
        created_at,
        completed_at,
        winner:users!merry_go_rounds_winner_id_fkey (
          id,
          email,
          user_profiles (
            first_name,
            last_name
          )
        )
      `)
      .eq('group_id', groupId)
      .eq('status', 'active')
      .single()

    if (roundError && roundError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching current merry-go-round:', roundError)
      return NextResponse.json({ error: 'Failed to fetch merry-go-round' }, { status: 500 })
    }

    // Get all completed rounds
    const { data: completedRounds, error: completedError } = await supabase
      .from('merry_go_rounds')
      .select(`
        id,
        round_number,
        total_amount,
        winner_id,
        winner_selection_method,
        winner_request_reason,
        selection_date,
        status,
        created_at,
        completed_at,
        winner:users!merry_go_rounds_winner_id_fkey (
          id,
          email,
          user_profiles (
            first_name,
            last_name
          )
        )
      `)
      .eq('group_id', groupId)
      .eq('status', 'completed')
      .order('round_number', { ascending: false })

    if (completedError) {
      console.error('Error fetching completed rounds:', completedError)
    }

    // Get eligible members (those who haven't won in current round)
    const { data: eligibleMembers, error: membersError } = await supabase
      .from('group_members')
      .select(`
        id,
        user_id,
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
      .eq('is_active', true)

    if (membersError) {
      console.error('Error fetching eligible members:', membersError)
    }

    // Filter out members who have already won in current round
    const eligibleMembersList = eligibleMembers?.filter(member => {
      if (!currentRound) return true
      return member.user_id !== currentRound.winner_id
    }) || []

    // Check if current user can contribute to merry-go-round
    const { data: canContribute, error: checkError } = await supabase
      .rpc('can_contribute_merry_go_round', {
        p_group_id: groupId,
        p_user_id: user.id
      })

    if (checkError) {
      console.error('Error checking merry-go-round eligibility:', checkError)
    }

    return NextResponse.json({ 
      success: true, 
      currentRound: currentRound || null,
      completedRounds: completedRounds || [],
      eligibleMembers: eligibleMembersList,
      canContribute: canContribute || false
    })

  } catch (error: any) {
    console.error('Error in merry-go-round API:', error)
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

    const groupId = (await params).id
    const body = await request.json()
    const { action, winner_id, selection_method = 'raffle', request_reason } = body

    // Check if user is admin or treasurer of this group
    const { data: membership, error: membershipError } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (membershipError || !membership || 
        (membership.role !== 'admin' && membership.role !== 'treasurer')) {
      return NextResponse.json({ error: 'Access denied - Admin or Treasurer role required' }, { status: 403 })
    }

    if (action === 'select_winner') {
      // Get current active round
      const { data: currentRound, error: roundError } = await supabase
        .from('merry_go_rounds')
        .select('*')
        .eq('group_id', groupId)
        .eq('status', 'active')
        .single()

      if (roundError || !currentRound) {
        return NextResponse.json({ error: 'No active merry-go-round found' }, { status: 404 })
      }

      // Validate winner is a group member
      const { data: winnerMembership, error: winnerError } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', winner_id)
        .eq('is_active', true)
        .single()

      if (winnerError || !winnerMembership) {
        return NextResponse.json({ error: 'Winner is not a valid group member' }, { status: 400 })
      }

      // Update merry-go-round with winner
      const { data: updatedRound, error: updateError } = await supabase
        .from('merry_go_rounds')
        .update({
          winner_id: winner_id,
          winner_selection_method: selection_method,
          winner_request_reason: request_reason,
          selection_date: new Date().toISOString().split('T')[0],
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', currentRound.id)
        .select(`
          id,
          round_number,
          total_amount,
          winner_id,
          winner_selection_method,
          winner_request_reason,
          selection_date,
          status,
          completed_at,
          winner:users!merry_go_rounds_winner_id_fkey (
            id,
            email,
            user_profiles (
              first_name,
              last_name
            )
          )
        `)
        .single()

      if (updateError) {
        console.error('Error updating merry-go-round:', updateError)
        return NextResponse.json({ error: 'Failed to select winner' }, { status: 500 })
      }

      // Create income transaction for the winner
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: winner_id,
          amount: currentRound.total_amount,
          type: 'income',
          category: 'Merry Go Round',
          description: `Merry Go Round Win - Round ${currentRound.round_number}`,
          date: new Date().toISOString().split('T')[0]
        })

      if (transactionError) {
        console.error('Error creating income transaction:', transactionError)
        // Don't fail the request, just log the error
      }

      return NextResponse.json({ 
        success: true, 
        round: updatedRound,
        message: 'Winner selected successfully'
      })

    } else if (action === 'start_new_round') {
      // Get the next round number
      const { data: lastRound, error: lastRoundError } = await supabase
        .from('merry_go_rounds')
        .select('round_number')
        .eq('group_id', groupId)
        .order('round_number', { ascending: false })
        .limit(1)
        .single()

      const nextRoundNumber = lastRound ? lastRound.round_number + 1 : 1

      // Create new merry-go-round
      const { data: newRound, error: newRoundError } = await supabase
        .from('merry_go_rounds')
        .insert({
          group_id: groupId,
          round_number: nextRoundNumber,
          total_amount: 0,
          status: 'active'
        })
        .select(`
          id,
          round_number,
          total_amount,
          status,
          created_at
        `)
        .single()

      if (newRoundError) {
        console.error('Error creating new merry-go-round:', newRoundError)
        return NextResponse.json({ error: 'Failed to start new round' }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        round: newRound,
        message: 'New merry-go-round started successfully'
      })

    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error: any) {
    console.error('Error in merry-go-round action API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
