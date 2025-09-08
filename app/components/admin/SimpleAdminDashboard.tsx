'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '../../lib/utils'
import { supabase } from '../../lib/supabase'
import {
  DollarSign,
  Users,
  TrendingUp,
  Activity,
  UsersIcon,
  RefreshCw,
  AlertCircle,
  Calendar
} from 'lucide-react'

interface User {
  id: string
  email: string
  role: string
  created_at: string
  last_sign_in_at?: string
  email_confirmed_at?: string
  first_name?: string
  last_name?: string
  phone?: string
  bio?: string
  last_login?: string
  updated_at?: string
}

interface Group {
  id: string
  name: string
  admin_id: string
  contribution_amount: number
  created_at: string
  member_count: number
}

interface Transaction {
  id: string
  amount: number
  type: string
  description: string
  category: string
  user_id: string
  created_at: string
}

interface AdminData {
  systemStats: {
    totalUsers: number
    totalGroups: number
    totalTransactions: number
    totalRevenue: number
    userGrowth: number
    groupGrowth: number
    transactionGrowth: number
    revenueGrowth: number
  }
  users: User[]
  groups: Group[]
  recentTransactions: Transaction[]
}

type TimePeriod = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'

export default function SimpleAdminDashboard() {
  const [data, setData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'groups' | 'transactions'>('overview')
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  // Get date range based on time period selection
  const getDateRange = (period: TimePeriod) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    switch (period) {
      case 'today':
        return {
          startDate: today.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        }
      case 'week':
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - 7)
        return {
          startDate: weekStart.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        }
      case 'month':
        const monthStart = new Date(today)
        monthStart.setDate(today.getDate() - 30)
        return {
          startDate: monthStart.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        }
      case 'quarter':
        const quarterStart = new Date(today)
        quarterStart.setDate(today.getDate() - 90)
        return {
          startDate: quarterStart.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        }
      case 'year':
        const yearStart = new Date(today)
        yearStart.setDate(today.getDate() - 365)
        return {
          startDate: yearStart.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        }
      case 'custom':
        return {
          startDate: customStartDate || today.toISOString().split('T')[0],
          endDate: customEndDate || today.toISOString().split('T')[0]
        }
      default:
        return {
          startDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        }
    }
  }

  const fetchAdminData = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Please log in to access the admin dashboard')
        return
      }

      // Get date range for filtering
      const { startDate, endDate } = getDateRange(timePeriod)
      
      // Fetch transactions directly from Supabase (same as bookkeeping)
      let transactionsQuery = supabase
        .from('transactions')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59.999Z')
        .order('created_at', { ascending: false })

      // Fetch users directly from Supabase
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('updated_at', { ascending: false })

      if (usersError) {
        console.error('Users query error:', JSON.stringify(usersError, null, 2))
        throw usersError
      }

      // Fetch groups directly from Supabase
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false })

      if (groupsError) {
        console.error('Groups query error:', JSON.stringify(groupsError, null, 2))
        throw groupsError
      }

      const { data: transactionsData, error: transactionsError } = await transactionsQuery

      if (transactionsError) {
        console.error('Transactions query error:', JSON.stringify(transactionsError, null, 2))
        throw transactionsError
      }

      // Calculate statistics
      const totalTransactions = transactionsData?.length || 0
      const totalRevenue = transactionsData?.reduce((sum, t) => t.type === 'income' ? sum + t.amount : sum, 0) || 0
      const totalUsers = usersData?.length || 0
      const totalGroups = groupsData?.length || 0

      const adminData: AdminData = {
        systemStats: {
          totalUsers,
          totalGroups,
          totalTransactions,
          totalRevenue,
          userGrowth: 0, // Could be calculated with historical data
          groupGrowth: 0,
          transactionGrowth: 0,
          revenueGrowth: 0
        },
        users: usersData || [],
        groups: groupsData || [],
        recentTransactions: transactionsData || []
      }

      setData(adminData)
    } catch (err: any) {
      console.error('Error fetching admin data:', JSON.stringify(err, null, 2))
      console.error('Error details:', err)
      setError(`Failed to load admin dashboard: ${err.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdminData()
  }, [])

  // Refresh data when time period changes
  useEffect(() => {
    if (timePeriod !== 'custom') {
      fetchAdminData()
    }
  }, [timePeriod])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 text-lg font-semibold">{error}</p>
          <button
            onClick={fetchAdminData}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600 text-lg">No data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">
            Monitor system performance and user activity
            {timePeriod !== 'custom' && (
              <span className="ml-2 text-sm bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
                {timePeriod === 'today' ? 'Today' :
                 timePeriod === 'week' ? 'Last 7 days' :
                 timePeriod === 'month' ? 'Last 30 days' :
                 timePeriod === 'quarter' ? 'Last 90 days' :
                 timePeriod === 'year' ? 'Last year' : timePeriod}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Time Period Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <select
              value={timePeriod}
              onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="today">Today</option>
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
              <option value="quarter">Last 90 days</option>
              <option value="year">Last year</option>
              <option value="custom">Custom range</option>
            </select>
          </div>
          <button
            onClick={fetchAdminData}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Custom Date Range Inputs */}
      {timePeriod === 'custom' && (
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <label className="text-sm font-medium">From:</label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">To:</label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <button
            onClick={fetchAdminData}
            className="px-3 py-1 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 transition-colors"
          >
            Apply Filter
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
        {[
          { id: 'overview', label: 'Overview', icon: Activity },
          { id: 'users', label: 'Users', icon: Users },
          { id: 'groups', label: 'Groups', icon: UsersIcon },
          { id: 'transactions', label: 'Transactions', icon: DollarSign }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === id
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Total Users",
                value: data.systemStats.totalUsers.toLocaleString(),
                icon: Users,
                color: "text-blue-600"
              },
              {
                title: "Total Groups",
                value: data.systemStats.totalGroups.toLocaleString(),
                icon: UsersIcon,
                color: "text-green-600"
              },
              {
                title: "Total Revenue",
                value: formatCurrency(data.systemStats.totalRevenue),
                icon: DollarSign,
                color: "text-yellow-600"
              },
              {
                title: "Transactions",
                value: data.systemStats.totalTransactions.toLocaleString(),
                icon: Activity,
                color: "text-purple-600"
              }
            ].map((metric) => (
              <div key={metric.title} className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg bg-gray-50 ${metric.color}`}>
                    <metric.icon className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                {data.users.length} users total
              </div>
              <div className="text-sm text-gray-600">
                {data.users.filter(u => u.role === 'admin').length} admins
              </div>
            </div>
          </div>
          
          {/* User Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{data.users.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-indigo-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Admins</p>
                  <p className="text-2xl font-bold text-gray-900">{data.users.filter(u => u.role === 'admin').length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Regular Users</p>
                  <p className="text-2xl font-bold text-gray-900">{data.users.filter(u => u.role !== 'admin').length}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6">
              <div className="space-y-4">
                {data.users.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No users found for the selected time period</p>
                  </div>
                ) : (
                  data.users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          user.role === 'admin' ? 'bg-indigo-100' : 'bg-gray-100'
                        }`}>
                          <span className={`font-semibold ${
                            user.role === 'admin' ? 'text-indigo-600' : 'text-gray-600'
                          }`}>
                            {(user.first_name?.[0] || user.last_name?.[0] || 'U').toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {user.first_name && user.last_name 
                              ? `${user.first_name} ${user.last_name}` 
                              : user.first_name || user.last_name || 'Unknown User'
                            }
                          </h3>
                          <p className="text-sm text-gray-600">ID: {user.id.slice(0, 8)}...</p>
                          <p className="text-xs text-gray-500">
                            Role: {user.role || 'user'} | Updated: {user.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          user.role === 'admin' 
                            ? 'bg-indigo-100 text-indigo-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role}
                        </span>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">
                            {user.last_login ? 
                              `Last login: ${new Date(user.last_login).toLocaleDateString()}` :
                              'No login recorded'
                            }
                          </p>
                          <p className="text-xs text-gray-500">
                            Phone: {user.phone || 'Not provided'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Groups Tab */}
      {activeTab === 'groups' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Group Management</h2>
            <div className="text-sm text-gray-600">
              {data.groups.length} groups total
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6">
              <div className="space-y-4">
                {data.groups.map((group) => (
                  <div key={group.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <span className="text-green-600 font-semibold">
                          {group.name[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{group.name}</h3>
                        <p className="text-sm text-gray-600">Admin ID: {group.admin_id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(group.contribution_amount)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {new Date(group.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Recent Transactions</h2>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                {data.recentTransactions.length} recent transactions
              </div>
              <div className="text-sm text-gray-600">
                Total: {formatCurrency(data.systemStats.totalRevenue)}
              </div>
            </div>
          </div>
          
          {/* Transaction Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.systemStats.totalRevenue)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <Activity className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                  <p className="text-2xl font-bold text-gray-900">{data.systemStats.totalTransactions}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Avg Transaction</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {data.systemStats.totalTransactions > 0 
                      ? formatCurrency(data.systemStats.totalRevenue / data.systemStats.totalTransactions)
                      : formatCurrency(0)
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6">
              <div className="space-y-3">
                {data.recentTransactions.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No transactions found for the selected time period</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Try adding some transactions in the bookkeeping section
                    </p>
                  </div>
                ) : (
                  data.recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          transaction.type === 'income' 
                            ? 'bg-green-100' 
                            : 'bg-red-100'
                        }`}>
                          {transaction.type === 'income' ? (
                            <TrendingUp className="w-5 h-5 text-green-600" />
                          ) : (
                            <TrendingUp className="w-5 h-5 text-red-600 rotate-180" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{transaction.description || transaction.category}</p>
                          <p className="text-sm text-gray-600 capitalize">{transaction.category}</p>
                          <p className="text-xs text-gray-500">User: {transaction.user_id.slice(0, 8)}...</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold text-lg ${
                          transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {transaction.type}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
