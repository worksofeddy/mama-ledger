'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  BarChart3, 
  Calendar,
  Target,
  AlertTriangle,
  CheckCircle,
  Info,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react'
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart as RechartsPieChart, 
  Pie,
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts'

interface AnalyticsData {
  period: {
    start: string
    end: string
    days: number
  }
  summary: {
    totalIncome: number
    totalExpenses: number
    netIncome: number
    savingsRate: number
    transactionCount: number
  }
  categoryBreakdown: Array<{
    category: string
    type: string
    amount: number
    count: number
  }>
  monthlyTrends: Array<{
    month: string
    income: number
    expenses: number
    net: number
  }>
  spendingPatterns: Array<{
    day: string
    amount: number
    count: number
    average: number
  }>
  topCategories: Array<{
    category: string
    amount: number
    count: number
  }>
  cashFlow: Array<{
    date: string
    amount: number
    type: string
    balance: number
  }>
  insights: Array<{
    type: 'positive' | 'warning' | 'info'
    title: string
    message: string
    icon: string
  }>
}

interface PredictionsData {
  nextMonthIncome: number
  nextMonthExpenses: number
  nextMonthNet: number
  trendAnalysis: string
  categoryForecasts: Array<{
    category: string
    predictedAmount: number
    trend: string
    confidence: string
  }>
  recommendations: Array<{
    type: string
    title: string
    message: string
    priority: string
  }>
  confidence: string
}

export default function AnalyticsPage() {
  const [user, setUser] = useState<any>(null)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [predictionsData, setPredictionsData] = useState<PredictionsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('30')
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'predictions'>('overview')
  const [error, setError] = useState('')
  const [analyticsScope, setAnalyticsScope] = useState<'personal' | 'group' | 'member'>('personal')
  const [selectedGroup, setSelectedGroup] = useState<any>(null)
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const [groups, setGroups] = useState<any[]>([])
  const [groupMembers, setGroupMembers] = useState<any[]>([])
  const [userRole, setUserRole] = useState<string>('user')
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user?.id) {
      fetchGroups()
      fetchAnalytics()
    }
  }, [user, selectedPeriod, analyticsScope, selectedGroup, selectedMember])

  useEffect(() => {
    if (selectedGroup && analyticsScope === 'member') {
      fetchGroupMembers()
    }
  }, [selectedGroup, analyticsScope])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
    } else {
      setUser(session.user)
      
      // Check if user is admin by looking at user_profiles role
      try {
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        if (error) {
          console.error('Error fetching user profile:', error)
          setUserRole('user')
          setIsAdmin(false)
        } else {
          const userRole = profile?.role || 'user'
          setUserRole(userRole)
          setIsAdmin(userRole === 'admin' || userRole === 'super_admin' || userRole === 'moderator')
        }
      } catch (err) {
        console.error('Error checking user role:', err)
        setUserRole('user')
        setIsAdmin(false)
      }
    }
  }

  const fetchGroups = async () => {
    try {
      let groupsQuery

      if (isAdmin) {
        // Admins can see all groups
        groupsQuery = supabase
          .from('groups')
          .select('*')
          .order('created_at', { ascending: false })
      } else {
        // Regular users can only see groups they're a member of
        groupsQuery = supabase
          .from('groups')
          .select(`
            *,
            group_members!inner(
              user_id,
              role
            )
          `)
          .eq('group_members.user_id', user.id)
      }

      const { data: groupsData, error } = await groupsQuery

      if (error) throw error
      setGroups(groupsData || [])
    } catch (err) {
      console.error('Error fetching groups:', err)
    }
  }

  const fetchGroupMembers = async () => {
    try {
      if (!selectedGroup) return

      // Check if user is a member of this group (unless they're an admin)
      if (!isAdmin) {
        const { data: userMembership, error: membershipError } = await supabase
          .from('group_members')
          .select('user_id')
          .eq('group_id', selectedGroup.id)
          .eq('user_id', user.id)
          .single()

        if (membershipError || !userMembership) {
          console.error('User is not a member of this group')
          setGroupMembers([])
          return
        }
      }

      const { data: membersData, error } = await supabase
        .from('group_members')
        .select(`
          *,
          user_profiles!inner(
            id,
            email,
            role
          )
        `)
        .eq('group_id', selectedGroup.id)

      if (error) throw error
      setGroupMembers(membersData || [])
    } catch (err) {
      console.error('Error fetching group members:', err)
    }
  }

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError('')

      const { data: { session } } = await supabase.auth.getSession()
      if (!session || !user?.id) return

      // Calculate date range
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - parseInt(selectedPeriod))

      // Determine which user IDs to fetch transactions for
      let userIds: string[] = []
      
      if (analyticsScope === 'personal') {
        userIds = [user.id]
      } else if (analyticsScope === 'group' && selectedGroup) {
        // For group analytics, only allow if user is a member (or admin)
        if (isAdmin || groupMembers.some(member => member.user_id === user.id)) {
          const memberIds = groupMembers.map(member => member.user_id)
          userIds = memberIds
        } else {
          throw new Error('You can only view analytics for groups you are a member of')
        }
      } else if (analyticsScope === 'member' && selectedMember) {
        // For member analytics, only allow if user is in the same group (or admin)
        if (isAdmin || groupMembers.some(member => member.user_id === user.id)) {
          userIds = [selectedMember.user_id]
        } else {
          throw new Error('You can only view analytics for members in your groups')
        }
      } else {
        userIds = [user.id] // fallback to personal
      }

      // Fetch transactions for the selected scope
      let transactionsQuery = supabase
        .from('transactions')
        .select('*')
        .in('user_id', userIds)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false })

      const { data: transactions, error: transactionsError } = await transactionsQuery

      if (transactionsError) throw transactionsError

      // Calculate analytics data
      const totalIncome = transactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) || 0
      const totalExpenses = transactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) || 0
      const netIncome = totalIncome - totalExpenses
      const savingsRate = totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0

      // Category breakdown
      const categoryBreakdown = transactions?.reduce((acc, transaction) => {
        const key = `${transaction.category}_${transaction.type}`
        if (!acc[key]) {
          acc[key] = { category: transaction.category, type: transaction.type, amount: 0, count: 0 }
        }
        acc[key].amount += transaction.amount
        acc[key].count += 1
        return acc
      }, {} as Record<string, any>) || {}

      // Monthly trends (last 6 months)
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      
      const { data: monthlyTransactions } = await supabase
        .from('transactions')
        .select('type, amount, created_at')
        .in('user_id', userIds)
        .gte('created_at', sixMonthsAgo.toISOString())
        .order('created_at', { ascending: true })

      const monthlyData = monthlyTransactions?.reduce((acc, transaction) => {
        const month = new Date(transaction.created_at).toISOString().substring(0, 7)
        if (!acc[month]) {
          acc[month] = { income: 0, expenses: 0 }
        }
        if (transaction.type === 'income') {
          acc[month].income += transaction.amount
        } else {
          acc[month].expenses += transaction.amount
        }
        return acc
      }, {} as Record<string, any>) || {}

      // Spending patterns by day of week
      const dayOfWeekSpending = transactions?.filter(t => t.type === 'expense').reduce((acc, transaction) => {
        const day = new Date(transaction.created_at).getDay()
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        const dayName = dayNames[day]
        if (!acc[dayName]) {
          acc[dayName] = { amount: 0, count: 0 }
        }
        acc[dayName].amount += transaction.amount
        acc[dayName].count += 1
        return acc
      }, {} as Record<string, any>) || {}

      // Top categories
      const topCategoriesData = transactions?.filter(t => t.type === 'expense').reduce((acc, transaction) => {
        if (!acc[transaction.category]) {
          acc[transaction.category] = { amount: 0, count: 0 }
        }
        acc[transaction.category].amount += transaction.amount
        acc[transaction.category].count += 1
        return acc
      }, {} as Record<string, any>) || {}

      // Cash flow analysis
      let runningBalance = 0
      const cashFlowData = transactions?.map(transaction => {
        if (transaction.type === 'income') {
          runningBalance += transaction.amount
        } else {
          runningBalance -= transaction.amount
        }
        return {
          date: transaction.created_at.split('T')[0],
          amount: transaction.amount,
          type: transaction.type,
          balance: runningBalance
        }
      }) || []

      // Generate insights
      const insights = generateInsights({
        totalIncome,
        totalExpenses,
        netIncome,
        savingsRate,
        categoryBreakdown,
        monthlyData,
        dayOfWeekSpending,
        topCategoriesData,
        cashFlowData
      })

      const analyticsData: AnalyticsData = {
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          days: parseInt(selectedPeriod)
        },
        summary: {
          totalIncome,
          totalExpenses,
          netIncome,
          savingsRate: Math.round(savingsRate * 100) / 100,
          transactionCount: transactions?.length || 0
        },
        categoryBreakdown: Object.values(categoryBreakdown),
        monthlyTrends: Object.entries(monthlyData).map(([month, data]) => ({
          month,
          ...data as any,
          net: (data as any).income - (data as any).expenses
        })),
        spendingPatterns: Object.entries(dayOfWeekSpending).map(([day, data]) => ({
          day,
          ...data as any,
          average: (data as any).count > 0 ? (data as any).amount / (data as any).count : 0
        })),
        topCategories: Object.entries(topCategoriesData)
          .map(([category, data]) => ({ category, ...data as any }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 10),
        cashFlow: cashFlowData,
        insights
      }

      setAnalyticsData(analyticsData)

      // Generate simple predictions (basic forecasting)
      const predictionsData: PredictionsData = {
        nextMonthIncome: totalIncome * 1.05, // 5% growth assumption
        nextMonthExpenses: totalExpenses * 1.02, // 2% growth assumption
        nextMonthNet: (totalIncome * 1.05) - (totalExpenses * 1.02),
        trendAnalysis: netIncome > 0 ? 'Positive cash flow trend' : 'Negative cash flow trend',
        categoryForecasts: Object.entries(topCategoriesData).slice(0, 5).map(([category, data]) => ({
          category,
          predictedAmount: (data as any).amount * 1.02,
          trend: 'Stable',
          confidence: 'Medium'
        })),
        recommendations: generateRecommendations(analyticsData),
        confidence: 'Medium'
      }

      setPredictionsData(predictionsData)

    } catch (err) {
      console.error('Error fetching analytics:', err)
      setError('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  // Helper function to generate insights
  const generateInsights = (data: any): Array<{
    type: 'positive' | 'warning' | 'info'
    title: string
    message: string
    icon: string
  }> => {
    const insights: Array<{
      type: 'positive' | 'warning' | 'info'
      title: string
      message: string
      icon: string
    }> = []

    // Savings rate insight
    if (data.savingsRate > 20) {
      insights.push({
        type: 'positive',
        title: 'Excellent Savings Rate',
        message: `You're saving ${data.savingsRate.toFixed(1)}% of your income. Great job!`,
        icon: 'trending-up'
      })
    } else if (data.savingsRate < 0) {
      insights.push({
        type: 'warning',
        title: 'Spending More Than Income',
        message: `You're spending ${Math.abs(data.savingsRate).toFixed(1)}% more than you earn. Consider reducing expenses.`,
        icon: 'alert-triangle'
      })
    }

    // Top spending category insight
    const topCategory = Object.entries(data.topCategoriesData).sort(([,a], [,b]) => (b as any).amount - (a as any).amount)[0]
    if (topCategory && data.totalExpenses > 0) {
      insights.push({
        type: 'info',
        title: 'Top Spending Category',
        message: `${topCategory[0]} accounts for ${(((topCategory[1] as any).amount / data.totalExpenses) * 100).toFixed(1)}% of your expenses.`,
        icon: 'pie-chart'
      })
    }

    // Spending pattern insight
    const highestSpendingDay = Object.entries(data.dayOfWeekSpending)
      .sort(([,a], [,b]) => (b as any).amount - (a as any).amount)[0]
    
    if (highestSpendingDay) {
      insights.push({
        type: 'info',
        title: 'Spending Pattern',
        message: `You spend most on ${highestSpendingDay[0]}s (Ksh ${(highestSpendingDay[1] as any).amount.toLocaleString()}).`,
        icon: 'calendar'
      })
    }

    return insights
  }

  // Helper function to generate recommendations
  const generateRecommendations = (analyticsData: AnalyticsData): Array<{
    type: string
    title: string
    message: string
    priority: string
  }> => {
    const recommendations: Array<{
      type: string
      title: string
      message: string
      priority: string
    }> = []

    if (analyticsData.summary.savingsRate < 10) {
      recommendations.push({
        type: 'savings',
        title: 'Increase Savings Rate',
        message: 'Consider setting aside 20% of your income for savings.',
        priority: 'High'
      })
    }

    if (analyticsData.summary.netIncome < 0) {
      recommendations.push({
        type: 'budget',
        title: 'Review Your Budget',
        message: 'You are spending more than you earn. Review and reduce expenses.',
        priority: 'High'
      })
    }

    if (analyticsData.topCategories.length > 0) {
      const topCategory = analyticsData.topCategories[0]
      if (topCategory.amount > analyticsData.summary.totalExpenses * 0.3) {
        recommendations.push({
          type: 'category',
          title: `Reduce ${topCategory.category} Spending`,
          message: `This category represents ${((topCategory.amount / analyticsData.summary.totalExpenses) * 100).toFixed(1)}% of your expenses.`,
          priority: 'Medium'
        })
      }
    }

    return recommendations
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'positive':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />
      default:
        return <Info className="w-5 h-5 text-gray-500" />
    }
  }

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'positive':
        return 'bg-green-50 border-green-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      case 'info':
        return 'bg-blue-50 border-blue-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C']

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Analytics</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Advanced Analytics</h1>
              <p className="mt-2 text-gray-600">
                Deep insights into your financial patterns
                {isAdmin && <span className="ml-2 text-sm bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">Admin</span>}
              </p>
            </div>
            <div className="flex gap-3">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
              </select>
              <button
                onClick={fetchAnalytics}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Analytics Scope Selector */}
        <div className="mb-6 bg-white rounded-lg shadow-sm p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">View Analytics For:</span>
              <select
                value={analyticsScope}
                onChange={(e) => {
                  setAnalyticsScope(e.target.value as 'personal' | 'group' | 'member')
                  setSelectedGroup(null)
                  setSelectedMember(null)
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="personal">Personal</option>
                {groups.length > 0 && (
                  <>
                    <option value="group">My Groups</option>
                    <option value="member">Group Members</option>
                  </>
                )}
              </select>
            </div>

            {analyticsScope === 'group' && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Select Group:</span>
                <select
                  value={selectedGroup?.id || ''}
                  onChange={(e) => {
                    const group = groups.find(g => g.id === e.target.value)
                    setSelectedGroup(group || null)
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Choose a group...</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name} {!isAdmin && '(My Group)'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {analyticsScope === 'member' && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Select Group:</span>
                  <select
                    value={selectedGroup?.id || ''}
                    onChange={(e) => {
                      const group = groups.find(g => g.id === e.target.value)
                      setSelectedGroup(group || null)
                      setSelectedMember(null)
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Choose a group...</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name} {!isAdmin && '(My Group)'}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedGroup && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Select Member:</span>
                    <select
                      value={selectedMember?.user_id || ''}
                      onChange={(e) => {
                        const member = groupMembers.find(m => m.user_id === e.target.value)
                        setSelectedMember(member || null)
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">Choose a member...</option>
                      {groupMembers.map((member) => (
                        <option key={member.user_id} value={member.user_id}>
                          {member.user_profiles?.email || `User ${member.user_id.slice(0, 8)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            {(analyticsScope === 'group' || analyticsScope === 'member') && (
              <div className="text-sm text-gray-600">
                {analyticsScope === 'group' && selectedGroup && (
                  <span>
                    Showing analytics for all members of <strong>{selectedGroup.name}</strong>
                    {!isAdmin && ' (your group)'}
                  </span>
                )}
                {analyticsScope === 'member' && selectedMember && (
                  <span>
                    Showing analytics for <strong>{selectedMember.user_profiles?.email || `User ${selectedMember.user_id.slice(0, 8)}`}</strong>
                    {!isAdmin && ' (fellow group member)'}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'trends', label: 'Trends', icon: TrendingUp },
                { id: 'predictions', label: 'Predictions', icon: Target }
              ].map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && analyticsData && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DollarSign className="w-8 h-8 text-green-500" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Income</p>
                    <p className="text-2xl font-bold text-gray-900">
                      KES {analyticsData.summary.totalIncome.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <TrendingDown className="w-8 h-8 text-red-500" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Expenses</p>
                    <p className="text-2xl font-bold text-gray-900">
                      KES {analyticsData.summary.totalExpenses.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <TrendingUp className="w-8 h-8 text-blue-500" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Net Income</p>
                    <p className={`text-2xl font-bold ${analyticsData.summary.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      KES {analyticsData.summary.netIncome.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <PieChart className="w-8 h-8 text-purple-500" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Savings Rate</p>
                    <p className={`text-2xl font-bold ${analyticsData.summary.savingsRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {analyticsData.summary.savingsRate.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Breakdown */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Categories</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={analyticsData.categoryBreakdown.filter(c => c.type === 'expense')}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="amount"
                    >
                      {analyticsData.categoryBreakdown.filter(c => c.type === 'expense').map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`KES ${value.toLocaleString()}`, 'Amount']} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>

              {/* Spending Patterns */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending by Day of Week</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.spendingPatterns}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`KES ${value.toLocaleString()}`, 'Amount']} />
                    <Bar dataKey="amount" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Insights */}
            {analyticsData.insights.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Insights</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analyticsData.insights.map((insight, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${getInsightColor(insight.type)}`}
                    >
                      <div className="flex items-start gap-3">
                        {getInsightIcon(insight.type)}
                        <div>
                          <h4 className="font-medium text-gray-900">{insight.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{insight.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Trends Tab */}
        {activeTab === 'trends' && analyticsData && (
          <div className="space-y-6">
            {/* Monthly Trends */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Income vs Expenses</h3>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={analyticsData.monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`KES ${value.toLocaleString()}`, 'Amount']} />
                  <Legend />
                  <Area type="monotone" dataKey="income" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="expenses" stackId="2" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Cash Flow */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cash Flow Trend</h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={analyticsData.cashFlow}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`KES ${value.toLocaleString()}`, 'Balance']} />
                  <Line type="monotone" dataKey="balance" stroke="#3B82F6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Predictions Tab */}
        {activeTab === 'predictions' && predictionsData && (
          <div className="space-y-6">
            {/* Next Month Predictions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DollarSign className="w-8 h-8 text-green-500" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Predicted Income</p>
                    <p className="text-2xl font-bold text-gray-900">
                      KES {predictionsData.nextMonthIncome.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <TrendingDown className="w-8 h-8 text-red-500" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Predicted Expenses</p>
                    <p className="text-2xl font-bold text-gray-900">
                      KES {predictionsData.nextMonthExpenses.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <TrendingUp className="w-8 h-8 text-blue-500" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Predicted Net</p>
                    <p className={`text-2xl font-bold ${predictionsData.nextMonthNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      KES {predictionsData.nextMonthNet.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Category Forecasts */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Spending Forecasts</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Predicted Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trend
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Confidence
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {predictionsData.categoryForecasts.map((forecast, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {forecast.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          KES {forecast.predictedAmount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            forecast.trend === 'increasing' 
                              ? 'bg-red-100 text-red-800'
                              : forecast.trend === 'decreasing'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {forecast.trend}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            forecast.confidence === 'high'
                              ? 'bg-green-100 text-green-800'
                              : forecast.confidence === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {forecast.confidence}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Recommendations</h3>
              <div className="space-y-4">
                {predictionsData.recommendations.map((recommendation, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      recommendation.priority === 'high'
                        ? 'bg-red-50 border-red-200'
                        : recommendation.priority === 'medium'
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {recommendation.type === 'warning' ? (
                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                      ) : recommendation.type === 'positive' ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <Info className="w-5 h-5 text-blue-500" />
                      )}
                      <div>
                        <h4 className="font-medium text-gray-900">{recommendation.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{recommendation.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
