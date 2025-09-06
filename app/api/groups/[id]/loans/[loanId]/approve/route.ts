import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../../../lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; loanId: string }> }
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
    const loanId = (await params).loanId
    const body = await request.json()
    const { action, disbursement_date } = body // action: 'approve' or 'reject'

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

    // Get the loan details
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('*')
      .eq('id', loanId)
      .eq('group_id', groupId)
      .single()

    if (loanError || !loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
    }

    if (loan.status !== 'pending') {
      return NextResponse.json({ error: 'Loan is not in pending status' }, { status: 400 })
    }

    // Update loan status
    const updateData: any = {
      status: action === 'approve' ? 'approved' : 'rejected',
      approved_by: user.id,
      approved_at: new Date().toISOString()
    }

    if (action === 'approve' && disbursement_date) {
      updateData.disbursement_date = disbursement_date
    }

    const { data: updatedLoan, error: updateError } = await supabase
      .from('loans')
      .update(updateData)
      .eq('id', loanId)
      .select(`
        id,
        amount,
        interest_rate,
        total_amount,
        purpose,
        status,
        approved_by,
        approved_at,
        disbursement_date,
        due_date,
        repayment_schedule,
        created_at,
        updated_at
      `)
      .single()

    if (updateError) {
      console.error('Error updating loan:', updateError)
      return NextResponse.json({ error: 'Failed to update loan status' }, { status: 500 })
    }

    // If approved, create payment schedule (this will be handled by the trigger)
    // The trigger will automatically create loan payments when status changes to 'approved'

    return NextResponse.json({ 
      success: true, 
      loan: updatedLoan,
      message: action === 'approve' ? 'Loan approved successfully' : 'Loan rejected'
    })

  } catch (error: any) {
    console.error('Error in loan approval API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
