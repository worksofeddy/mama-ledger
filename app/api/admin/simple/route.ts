import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create admin client with service role key for accessing auth.users
const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Use regular client for token validation
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 })
    }

    // Create admin client for accessing auth.users
    const adminSupabase = createAdminClient()

    // Get date range from query params
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    // Build date filters
    const dateFilter = (query: any) => {
      if (startDate && endDate) {
        return query.gte('created_at', startDate).lte('created_at', endDate + 'T23:59:59.999Z')
      }
      return query
    }

    // Get basic system stats using simple queries with date filtering
    const [groupsResult, transactionsResult] = await Promise.all([
      dateFilter(supabase.from('groups').select('id, name, admin_id, contribution_amount, created_at')).limit(100),
      dateFilter(supabase.from('transactions').select('id, amount, type, description, category, user_id, created_at')).limit(100)
    ])

    // Get users from auth.users table (this is where Supabase stores authenticated users)
    const { data: authUsers, error: authUsersError } = await adminSupabase.auth.admin.listUsers()
    
    if (authUsersError) {
      console.error('Error fetching auth users:', authUsersError)
    }

    // Calculate basic stats
    const totalUsers = authUsers?.users?.length || 0
    const totalGroups = groupsResult.data?.length || 0
    const totalTransactions = transactionsResult.data?.length || 0
    
    // Calculate total revenue (sum of income transactions)
    const totalRevenue = transactionsResult.data
      ?.filter((t: any) => t.type === 'income')
      ?.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0

    // Get recent transactions
    const recentTransactions = transactionsResult.data
      ?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      ?.slice(0, 10) || []

    // Try to get user roles from user_profiles table
    const { data: userProfiles } = await supabase
      .from('user_profiles')
      .select('id, role')
      .limit(100)

    // Get users from auth.users and match with user_profiles for roles
    const users = authUsers?.users?.map((authUser: any) => {
      const userProfile = userProfiles?.find((profile: any) => profile.id === authUser.id)
      return {
        id: authUser.id,
        email: authUser.email || 'No email',
        role: userProfile?.role || 'user', // Use role from user_profiles or default to 'user'
        created_at: authUser.created_at,
        last_sign_in_at: authUser.last_sign_in_at,
        email_confirmed_at: authUser.email_confirmed_at
      }
    }) || []

    // Get groups with member counts
    const groups = groupsResult.data?.map((group: any) => ({
      id: group.id,
      name: group.name,
      admin_id: group.admin_id,
      contribution_amount: group.contribution_amount,
      created_at: group.created_at,
      member_count: 1 // We'll improve this later
    })) || []

    return NextResponse.json({
      success: true,
      systemStats: {
        totalUsers,
        totalGroups,
        totalTransactions,
        totalRevenue,
        userGrowth: 0, // We'll calculate this later
        groupGrowth: 0,
        transactionGrowth: 0,
        revenueGrowth: 0
      },
      users,
      groups,
      recentTransactions,
      categoryData: [], // We'll add this later
      userStatsDaily: [], // We'll add this later
      groupStatsDaily: [] // We'll add this later
    })

  } catch (error: any) {
    console.error('Error in admin simple API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
