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
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

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
      .from('loans')
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
        updated_at,
        borrower:users!loans_borrower_id_fkey (
          id,
          email,
          user_profiles (
            first_name,
            last_name
          )
        ),
        approver:users!loans_approved_by_fkey (
          id,
          email,
          user_profiles (
            first_name,
            last_name
          )
        )
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status)
    }

    // If user is not admin/treasurer, only show their own loans
    if (membership.role !== 'admin' && membership.role !== 'treasurer') {
      query = query.eq('borrower_id', user.id)
    }

    const { data: loans, error } = await query

    if (error) {
      console.error('Error fetching loans:', error)
      return NextResponse.json({ error: 'Failed to fetch loans' }, { status: 500 })
    }

    // Get payment information for each loan
    const loansWithPayments = await Promise.all(
      loans.map(async (loan) => {
        const { data: payments, error: paymentsError } = await supabase
          .from('loan_payments')
          .select('id, amount, due_date, paid_date, payment_status, penalty_amount')
          .eq('loan_id', loan.id)
          .order('due_date', { ascending: true })

        if (paymentsError) {
          console.error('Error fetching loan payments:', paymentsError)
        }

        const totalPaid = payments?.reduce((sum, payment) => 
          payment.payment_status === 'paid' ? sum + parseFloat(payment.amount.toString()) : sum, 0) || 0

        const pendingPayments = payments?.filter(payment => 
          payment.payment_status === 'pending').length || 0

        const overduePayments = payments?.filter(payment => 
          payment.payment_status === 'pending' && 
          new Date(payment.due_date) < new Date()).length || 0

        return {
          ...loan,
          paymentSummary: {
            totalPaid,
            pendingPayments,
            overduePayments,
            payments: payments || []
          }
        }
      })
    )

    return NextResponse.json({ 
      success: true, 
      loans: loansWithPayments
    })

  } catch (error: any) {
    console.error('Error in loans API:', error)
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
    const { 
      amount, 
      purpose, 
      due_date, 
      repayment_schedule = 'monthly',
      borrower_id, // New field for admin/treasurer to specify borrower
      auto_approve = false // New field for admin/treasurer to auto-approve
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
    if (!amount || !due_date) {
      return NextResponse.json({ 
        error: 'Missing required fields: amount, due_date' 
      }, { status: 400 })
    }

    // Determine borrower ID
    let finalBorrowerId = user.id // Default to current user (self-request)
    let isAdminCreating = false

    // If borrower_id is provided, check if user has permission to create loans for others
    if (borrower_id && borrower_id !== user.id) {
      if (membership.role !== 'admin' && membership.role !== 'treasurer') {
        return NextResponse.json({ 
          error: 'Access denied - Only admins and treasurers can create loans for other members' 
        }, { status: 403 })
      }

      // Verify the borrower is a member of the group
      const { data: borrowerMembership, error: borrowerError } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId)
        .eq('user_id', borrower_id)
        .eq('is_active', true)
        .single()

      if (borrowerError || !borrowerMembership) {
        return NextResponse.json({ 
          error: 'Invalid borrower - User is not a member of this group' 
        }, { status: 400 })
      }

      finalBorrowerId = borrower_id
      isAdminCreating = true
    }

    // Get group interest rate
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('interest_rate')
      .eq('id', groupId)
      .single()

    if (groupError) {
      console.error('Error fetching group:', groupError)
      return NextResponse.json({ error: 'Failed to fetch group details' }, { status: 500 })
    }

    const interestRate = group.interest_rate || 0
    const loanAmount = parseFloat(amount)
    const totalAmount = loanAmount + (loanAmount * interestRate / 100)

    // Determine initial status
    let initialStatus = 'pending'
    let approvedBy = null
    let approvedAt = null

    // If admin/treasurer is creating and auto_approve is true, approve immediately
    if (isAdminCreating && auto_approve) {
      initialStatus = 'approved'
      approvedBy = user.id
      approvedAt = new Date().toISOString()
    }

    // Create loan
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .insert({
        group_id: groupId,
        borrower_id: finalBorrowerId,
        amount: loanAmount,
        interest_rate: interestRate,
        total_amount: totalAmount,
        purpose,
        due_date,
        repayment_schedule,
        status: initialStatus,
        approved_by: approvedBy,
        approved_at: approvedAt
      })
      .select(`
        id,
        amount,
        interest_rate,
        total_amount,
        purpose,
        status,
        due_date,
        repayment_schedule,
        approved_by,
        approved_at,
        created_at
      `)
      .single()

    if (loanError) {
      console.error('Error creating loan:', loanError)
      return NextResponse.json({ error: 'Failed to create loan request' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      loan,
      message: isAdminCreating 
        ? (auto_approve ? 'Loan created and approved successfully' : 'Loan created successfully')
        : 'Loan request submitted successfully'
    })

  } catch (error: any) {
    console.error('Error in create loan API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
