'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts'

interface AppUser {
  id: string
  email: string | undefined
  full_name: string
  role: string
  provider: string
  created_at: string
}

interface UserAnalytics {
  userId: string
  userName: string
  totalIncome: number
  totalExpenses: number
  netProfit: number
  transactionCount: number
  lastActive: string
  categories: { name: string; count: number; amount: number }[]
}

interface SystemAnalytics {
  userGrowth: Array<{ date: string; users: number }>
  categoryPerformance: Array<{ name: string; count: number; amount: number }>
  financialTrends: Array<{ date: string; income: number; expenses: number; profit: number }>
}

export default function AdminPage() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTransactions: 0,
    totalIncome: 0,
    totalExpenses: 0
  })
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null)
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics | null>(null)
  const [systemAnalytics, setSystemAnalytics] = useState<SystemAnalytics | null>(null)
  const [view, setView] = useState<'overview' | 'user-detail'>('overview')

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      
      // First, check if the current user is an admin
      const { data: adminProfile, error: adminError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user?.id)
        .single()

      if (adminError || adminProfile?.role !== 'admin') {
        setError('Access denied. You must be an admin to view this page.')
        setLoading(false)
        return
      }

      // If they are an admin, fetch all data
      const [usersResult, statsResult] = await Promise.all([
        supabase.from('users').select('*').order('created_at', { ascending: false }),
        supabase.from('transactions').select('*')
      ])

      if (usersResult.error) {
        setError('Failed to fetch users.')
        console.error('Error fetching users:', usersResult.error)
      } else {
        setUsers(usersResult.data as AppUser[])
      }

      if (statsResult.error) {
        console.error('Error fetching stats:', statsResult.error)
      } else {
        const transactions = statsResult.data || []
        const totalIncome = transactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0)
        const totalExpenses = transactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0)

        setStats({
          totalUsers: usersResult.data?.length || 0,
          totalTransactions: transactions.length,
          totalIncome,
          totalExpenses
        })

        // Generate system analytics
        generateSystemAnalytics(transactions, usersResult.data || [])
      }
      
      setLoading(false)
    }

    fetchData()
  }, [])

  const generateSystemAnalytics = (transactions: any[], users: AppUser[]) => {
    // User growth over time
    const userGrowth = users.reduce((acc: any[], user) => {
      const date = new Date(user.created_at).toISOString().split('T')[0]
      const existing = acc.find(item => item.date === date)
      if (existing) {
        existing.users += 1
      } else {
        acc.push({ date, users: 1 })
      }
      return acc
    }, []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Category performance
    const categoryPerformance = transactions.reduce((acc: any[], transaction) => {
      const existing = acc.find(item => item.name === transaction.category)
      if (existing) {
        existing.count += 1
        existing.amount += transaction.amount
      } else {
        acc.push({ 
          name: transaction.category, 
          count: 1, 
          amount: transaction.amount,
          type: transaction.type 
        })
      }
      return acc
    }, []).sort((a, b) => b.amount - a.amount).slice(0, 10)

    // Financial trends (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const recentTransactions = transactions.filter(t => 
      new Date(t.created_at) >= thirtyDaysAgo
    )

    const financialTrends = recentTransactions.reduce((acc: any[], transaction) => {
      const date = new Date(transaction.created_at).toISOString().split('T')[0]
      const existing = acc.find(item => item.date === date)
      if (existing) {
        if (transaction.type === 'income') {
          existing.income += transaction.amount
        } else {
          existing.expenses += transaction.amount
        }
        existing.profit = existing.income - existing.expenses
      } else {
        acc.push({ 
          date, 
          income: transaction.type === 'income' ? transaction.amount : 0,
          expenses: transaction.type === 'expense' ? transaction.amount : 0,
          profit: transaction.type === 'income' ? transaction.amount : -transaction.amount
        })
      }
      return acc
    }, []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    setSystemAnalytics({
      userGrowth,
      categoryPerformance,
      financialTrends
    })
  }

  const fetchUserAnalytics = async (user: AppUser) => {
    setSelectedUser(user)
    setView('user-detail')
    
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!error && transactions) {
      const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0)
      const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0)

      const categories = transactions.reduce((acc: any[], transaction) => {
        const existing = acc.find(item => item.name === transaction.category)
        if (existing) {
          existing.count += 1
          existing.amount += transaction.amount
        } else {
          acc.push({ 
            name: transaction.category, 
            count: 1, 
            amount: transaction.amount 
          })
        }
        return acc
      }, []).sort((a, b) => b.amount - a.amount)

      setUserAnalytics({
        userId: user.id,
        userName: user.full_name || user.email || 'Unknown User',
        totalIncome,
        totalExpenses,
        netProfit: totalIncome - totalExpenses,
        transactionCount: transactions.length,
        lastActive: transactions[0]?.created_at || 'Never',
        categories
      })
    }
  }

  if (loading) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4 text-lg">{error}</div>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  if (view === 'user-detail' && selectedUser && userAnalytics) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <button 
              onClick={() => setView('overview')} 
              className="text-indigo-600 font-bold flex items-center"
            >
              &larr; Back to Admin Dashboard
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              {userAnalytics.userName}'s Financial Dashboard
            </h1>
            <div className="text-sm text-gray-500">
              User since {new Date(selectedUser.created_at).toLocaleDateString()}
            </div>
          </div>

          {/* User Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Income</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${userAnalytics.totalIncome.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-600">
                    ${userAnalytics.totalExpenses.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Net Profit</p>
                  <p className={`text-2xl font-bold ${userAnalytics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${userAnalytics.netProfit.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Transactions</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {userAnalytics.transactionCount}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Category Breakdown</h2>
              <p className="text-sm text-gray-600 mt-1">How this user spends and earns money</p>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Income Categories */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 text-green-600">Income Sources</h3>
                  <div className="space-y-3">
                    {userAnalytics.categories
                      .filter(cat => cat.amount > 0)
                      .slice(0, 5)
                      .map((category, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <span className="font-medium text-green-800">{category.name}</span>
                          <span className="text-green-600 font-bold">
                            ${category.amount.toLocaleString()}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Expense Categories */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 text-red-600">Expense Categories</h3>
                  <div className="space-y-3">
                    {userAnalytics.categories
                      .filter(cat => cat.amount < 0)
                      .slice(0, 5)
                      .map((category, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                          <span className="font-medium text-red-800">{category.name}</span>
                          <span className="text-red-600 font-bold">
                            ${Math.abs(category.amount).toLocaleString()}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
              <p className="text-sm text-gray-600 mt-1">Last transaction: {new Date(userAnalytics.lastActive).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Monitor system activity and user financial data</p>
        </div>

        {/* System Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalTransactions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Income</p>
                <p className="text-2xl font-bold text-green-600">
                  ${stats.totalIncome.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600">
                  ${stats.totalExpenses.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Charts */}
        {systemAnalytics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* User Growth Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">User Growth</h2>
              <div style={{ height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={systemAnalytics.userGrowth}>
                    <XAxis dataKey="date" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip />
                    <Line type="monotone" dataKey="users" stroke="#4f46e5" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Financial Trends Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Financial Trends (Last 30 Days)</h2>
              <div style={{ height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={systemAnalytics.financialTrends}>
                    <XAxis dataKey="date" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip />
                    <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Top Categories */}
        {systemAnalytics && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Top Categories by Volume</h2>
              <p className="text-sm text-gray-600 mt-1">Most popular spending and earning categories</p>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Top Income Categories */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 text-green-600">Top Income Categories</h3>
                  <div className="space-y-3">
                    {systemAnalytics.categoryPerformance
                      .filter(cat => cat.amount > 0)
                      .slice(0, 5)
                      .map((category, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <span className="font-medium text-green-800">{category.name}</span>
                          <div className="text-right">
                            <div className="text-green-600 font-bold">${category.amount.toLocaleString()}</div>
                            <div className="text-xs text-green-500">{category.count} transactions</div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Top Expense Categories */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 text-red-600">Top Expense Categories</h3>
                  <div className="space-y-3">
                    {systemAnalytics.categoryPerformance
                      .filter(cat => cat.amount < 0)
                      .slice(0, 5)
                      .map((category, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                          <span className="font-medium text-red-800">{category.name}</span>
                          <div className="text-right">
                            <div className="text-red-600 font-bold">${Math.abs(category.amount).toLocaleString()}</div>
                            <div className="text-xs text-red-500">{category.count} transactions</div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Management */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
            <p className="text-sm text-gray-600 mt-1">Click on any user to view their detailed financial dashboard</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined On</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-indigo-600">
                            {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{user.full_name || 'Unnamed User'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email || 'No email'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                      {user.provider || 'email'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => fetchUserAnalytics(user)}
                        className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
                      >
                        View Dashboard
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
