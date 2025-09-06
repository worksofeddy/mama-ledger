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
  income: number
  expense: number
  profit: number
  periodData: Array<{ name: string; profit: number }>
  recentTransactions: Array<Transaction>
}

type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'annually';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    income: 0,
    expense: 0,
    profit: 0,
    periodData: [],
    recentTransactions: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState<any>(null)
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('monthly');
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData()
    }
  }, [user, timePeriod])

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
      
      const now = new Date();
      let startDate: Date;
      let endDate: Date = now;

      switch (timePeriod) {
        case 'daily':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'weekly':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - now.getDay());
          break;
        case 'monthly':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'annually':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
      }

      // Fetch transactions for the selected period
      const { data: periodTransactions, error: periodError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (periodError) throw periodError;

      // Calculate summary for the period
      const income = periodTransactions?.filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0) || 0;
      const expense = periodTransactions?.filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0) || 0;
      const profit = income - expense;

      // Process data for the chart
      const periodData = [];
      if (timePeriod === 'daily') {
        // For daily, we can show hourly breakdown if needed, for now just one bar
        periodData.push({ name: 'Today', profit });
      } else if (timePeriod === 'weekly') {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        for (let i = 0; i < 7; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
            
            const dayTransactions = periodTransactions?.filter(t => {
                const tDate = new Date(t.created_at);
                return tDate >= dayStart && tDate <= dayEnd;
            }) || [];

            const dayIncome = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
            const dayExpense = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
            periodData.push({ name: days[date.getDay()], profit: dayIncome - dayExpense });
        }
      } else if (timePeriod === 'monthly') {
          const weeksInMonth = Math.ceil((now.getDate() + new Date(now.getFullYear(), now.getMonth(), 1).getDay()) / 7);
          for (let i = 1; i <= weeksInMonth; i++) {
              const weekStart = new Date(now.getFullYear(), now.getMonth(), (i-1)*7 + 1);
              const weekEnd = new Date(now.getFullYear(), now.getMonth(), i*7, 23, 59, 59);

              const weekTransactions = periodTransactions?.filter(t => {
                  const tDate = new Date(t.created_at);
                  return tDate >= weekStart && tDate <= weekEnd;
              }) || [];
              const weekIncome = weekTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
              const weekExpense = weekTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
              periodData.push({ name: `Week ${i}`, profit: weekIncome - weekExpense });
          }
      } else if (timePeriod === 'annually') {
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          for (let i = 0; i < 12; i++) {
              const monthStart = new Date(now.getFullYear(), i, 1);
              const monthEnd = new Date(now.getFullYear(), i + 1, 0, 23, 59, 59);

              const monthTransactions = periodTransactions?.filter(t => {
                  const tDate = new Date(t.created_at);
                  return tDate >= monthStart && tDate <= monthEnd;
              }) || [];
              const monthIncome = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
              const monthExpense = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
              periodData.push({ name: months[i], profit: monthIncome - monthExpense });
          }
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
        income,
        expense,
        profit,
        periodData,
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
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center space-x-2">
          <select
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
            className="bg-white border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="annually">Annually</option>
          </select>
          <button 
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
          >
            Refresh
          </button>
        </div>
      </div>
      <p className="text-gray-600 mb-8">
        Summary for this {timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-green-100 p-4 rounded-xl text-center">
          <p className="text-lg font-bold text-green-800">Money In</p>
          <p className="text-4xl font-extrabold text-green-600">
            {formatCurrency(data.income)}
          </p>
        </div>
        <div className="bg-red-100 p-4 rounded-xl text-center">
          <p className="text-lg font-bold text-red-800">Money Out</p>
          <p className="text-4xl font-extrabold text-red-600">
            {formatCurrency(data.expense)}
          </p>
        </div>
      </div>

      <div className="bg-indigo-100 p-4 rounded-xl text-center mb-8">
        <p className="text-lg font-bold text-indigo-800">Total Profit</p>
        <p className={`text-5xl font-extrabold ${data.profit >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
          {formatCurrency(data.profit)}
        </p>
      </div>

      {/* Profit Chart */}
      <div className="bg-white p-4 rounded-xl shadow-md mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Profit Over Time</h2>
        <div style={{ width: '100%', height: 200 }}>
          <ResponsiveContainer>
            <BarChart data={data.periodData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{ 
                  borderRadius: '0.75rem', 
                  borderColor: '#e5e7eb',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' 
                }}
                formatter={(value: number) => [formatCurrency(value), 'Profit']}
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
                {formatCurrency(transaction.amount)}
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
