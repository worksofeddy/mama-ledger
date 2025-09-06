'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../lib/utils'

interface Transaction {
  id: string
  amount: number
  type: 'income' | 'expense'
  category: string
  created_at: string
}

interface DashboardData {
  todayIncome: number
  todayExpense: number
  todayProfit: number
  weeklyData: Array<{ day: string; profit: number }>
  recentTransactions: Array<Transaction>
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    todayIncome: 0,
    todayExpense: 0,
    todayProfit: 0,
    weeklyData: [],
    recentTransactions: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData()
    }
  }, [user])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
    } else {
      setUser(session.user)
    }
  }

  const fetchDashboardData = async () => {
    try {
      if (!user?.id) return
      
      setLoading(true)
      
      // Get today's date range
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
      
      // Get this week's date range
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - today.getDay())
      const endOfWeek = new Date(today)
      endOfWeek.setDate(today.getDate() + (6 - today.getDay()))

      // Fetch today's transactions for current user
      const { data: todayTransactions, error: todayError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: false })

      if (todayError) throw todayError

      // Fetch this week's transactions for current user
      const { data: weekTransactions, error: weekError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startOfWeek.toISOString())
        .lte('created_at', endOfWeek.toISOString())
        .order('created_at', { ascending: true })

      if (weekError) throw weekError

      // Calculate today's summary
      const todayIncome = todayTransactions?.filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0) || 0
      const todayExpense = todayTransactions?.filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0) || 0
      const todayProfit = todayIncome - todayExpense

      // Calculate weekly data
      const weeklyData = []
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek)
        date.setDate(startOfWeek.getDate() + i)
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
        const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59)
        
        const dayTransactions = weekTransactions?.filter(t => {
          const tDate = new Date(t.created_at)
          return tDate >= dayStart && tDate <= dayEnd
        }) || []

        const dayIncome = dayTransactions.filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0)
        const dayExpense = dayTransactions.filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0)
        const dayProfit = dayIncome - dayExpense

        weeklyData.push({
          day: days[date.getDay()],
          profit: dayProfit
        })
      }

      // Fetch recent transactions (last 10) for current user
      const { data: recentTransactions, error: recentError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (recentError) throw recentError

      setData({
        todayIncome,
        todayExpense,
        todayProfit,
        weeklyData,
        recentTransactions: recentTransactions || []
      })

    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      console.error('Error details:', JSON.stringify(err, null, 2))
      setError(`Failed to load dashboard data: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Today's Summary</h1>
        <button 
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
        >
          Refresh
        </button>
      </div>
      <p className="text-gray-600 text-center mb-8">{new Date().toDateString()}</p>

      {/* Today's Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-green-100 p-4 rounded-xl text-center">
          <p className="text-lg font-bold text-green-800">Money In</p>
          <p className="text-4xl font-extrabold text-green-600">
            {formatCurrency(data.todayIncome)}
          </p>
        </div>
        <div className="bg-red-100 p-4 rounded-xl text-center">
          <p className="text-lg font-bold text-red-800">Money Out</p>
          <p className="text-4xl font-extrabold text-red-600">
            {formatCurrency(data.todayExpense)}
          </p>
        </div>
      </div>

      <div className="bg-indigo-100 p-4 rounded-xl text-center mb-8">
        <p className="text-lg font-bold text-indigo-800">Today's Profit</p>
        <p className={`text-5xl font-extrabold ${data.todayProfit >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
          {formatCurrency(data.todayProfit)}
        </p>
      </div>

      {/* Weekly Profit Chart */}
      <div className="bg-white p-4 rounded-xl shadow-md mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">This Week's Profit</h2>
        <div style={{ width: '100%', height: 200 }}>
          <ResponsiveContainer>
            <BarChart data={data.weeklyData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <XAxis dataKey="day" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{ 
                  borderRadius: '0.75rem', 
                  borderColor: '#e5e7eb',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' 
                }}
                formatter={(value: number) => [value.toLocaleString('en-US', { style: 'currency', currency: 'USD' }), 'Profit']}
              />
              <Bar 
                dataKey="profit" 
                radius={[4, 4, 0, 0]}
                fill="#4f46e5"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white p-4 rounded-xl shadow-md mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Transactions</h2>
        <div className="space-y-3">
          {data.recentTransactions?.slice(0, 5).map((transaction: Transaction) => (
            <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${transaction.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <div>
                  <p className="font-medium text-gray-800">{transaction.category}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(transaction.created_at).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
              <span className={`font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                {transaction.type === 'income' ? '+' : '-'}
                {transaction.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
              </span>
            </div>
          ))}
          {(!data.recentTransactions || data.recentTransactions.length === 0) && (
            <p className="text-gray-500 text-center py-4">No transactions yet. Start by adding your first entry!</p>
          )}
        </div>
      </div>

      {/* Navigation Link to Bookkeeping */}
      <div className="text-center mt-8">
        <Link href="/bookkeeping" className="text-indigo-600 font-bold text-lg">
          Go to My Ledger &rarr;
        </Link>
      </div>
    </div>
  )
}
