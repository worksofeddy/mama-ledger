'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../lib/utils'
import { Download, FileText, TrendingUp, Calendar, DollarSign, BarChart3 } from 'lucide-react'

interface ReportData {
  totalIncome: number
  totalExpenses: number
  netProfit: number
  transactionCount: number
  topCategories: Array<{ name: string; amount: number; count: number; type: string }>
  monthlyData: Array<{ month: string; income: number; expenses: number; profit: number }>,
  recentTransactions: Array<{ date: string; category: string; amount: number; type: string }>
}

export default function ReportsPage() {
  const [user, setUser] = useState<any>(null)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user?.id) {
      fetchReportData()
    }
  }, [user, dateRange])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      window.location.href = '/login'
    } else {
      setUser(session.user)
    }
  }

  const fetchReportData = async () => {
    try {
      setLoading(true)
      
      // Calculate date range
      const endDate = new Date()
      const startDate = new Date()
      
      switch (dateRange) {
        case 'week':
          startDate.setDate(endDate.getDate() - 7)
          break
        case 'month':
          startDate.setMonth(endDate.getMonth() - 1)
          break
        case 'quarter':
          startDate.setMonth(endDate.getMonth() - 3)
          break
        case 'year':
          startDate.setFullYear(endDate.getFullYear() - 1)
          break
      }

      // Fetch transactions for the date range
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false })

      if (error) throw error

      // Process data for reports
      const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0)
      
      const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0)

      // Top categories
      const categoryMap = new Map()
      transactions.forEach(transaction => {
        const key = `${transaction.category}-${transaction.type}`
        if (categoryMap.has(key)) {
          categoryMap.get(key).amount += transaction.amount
          categoryMap.get(key).count += 1
        } else {
          categoryMap.set(key, {
            name: transaction.category,
            amount: transaction.amount,
            count: 1,
            type: transaction.type
          })
        }
      })

      const topCategories = Array.from(categoryMap.values())
        .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
        .slice(0, 10)

      // Monthly data
      const monthlyMap = new Map()
      transactions.forEach(transaction => {
        const month = new Date(transaction.created_at).toISOString().slice(0, 7)
        if (!monthlyMap.has(month)) {
          monthlyMap.set(month, { month, income: 0, expenses: 0, profit: 0 })
        }
        const monthData = monthlyMap.get(month)
        if (transaction.type === 'income') {
          monthData.income += transaction.amount
        } else {
          monthData.expenses += transaction.amount
        }
        monthData.profit = monthData.income - monthData.expenses
      })

      const monthlyData = Array.from(monthlyMap.values())
        .sort((a, b) => a.month.localeCompare(b.month))

      // Recent transactions
      const recentTransactions = transactions.slice(0, 20).map(t => ({
        date: new Date(t.created_at).toLocaleDateString(),
        category: t.category,
        amount: t.amount,
        type: t.type
      }))

      setReportData({
        totalIncome,
        totalExpenses,
        netProfit: totalIncome - totalExpenses,
        transactionCount: transactions.length,
        topCategories,
        monthlyData,
        recentTransactions
      })

    } catch (err) {
      console.error('Error fetching report data:', err)
    } finally {
      setLoading(false)
    }
  }

  const generatePDFReport = async () => {
    setGenerating(true)
    try {
      // Simulate PDF generation
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Create a simple text report
      const reportText = `
Mama Ledger Financial Report
Generated: ${new Date().toLocaleDateString()}
Period: ${dateRange}

Summary:
- Total Income: ${formatCurrency(reportData?.totalIncome || 0)}
- Total Expenses: ${formatCurrency(reportData?.totalExpenses || 0)}
- Net Profit: ${formatCurrency(reportData?.netProfit || 0)}
- Transactions: ${reportData?.transactionCount}

Top Categories:
${reportData?.topCategories.map(cat => 
  `- ${cat.name}: ${formatCurrency(cat.amount)} (${cat.count} transactions)`
).join('\n')}
      `.trim()

      // Create and download file
      const blob = new Blob([reportText], { type: 'text/plain' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mama-ledger-report-${dateRange}-${new Date().toISOString().split('T')[0]}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

    } catch (err) {
      console.error('Error generating report:', err)
    } finally {
      setGenerating(false)
    }
  }

  const exportToCSV = () => {
    if (!reportData) return

    const csvContent = [
      ['Date', 'Category', 'Type', 'Amount'],
      ...reportData.recentTransactions.map(t => [
        t.date,
        t.category,
        t.type,
        t.amount
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mama-ledger-transactions-${dateRange}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your financial reports...</p>
        </div>
      </div>
    )
  }

  if (!reportData) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No data available for reports.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Financial Reports</h1>
          <p className="text-gray-600">Generate and export your financial data for banks, family, or personal records</p>
        </div>

        {/* Date Range Selector */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Select Report Period</h2>
              <p className="text-sm text-gray-600">Choose the time range for your financial report</p>
            </div>
            <div className="flex space-x-2">
              {(['week', 'month', 'quarter', 'year'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    dateRange === range
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Income</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(reportData.totalIncome)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(reportData.totalExpenses)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Net Profit</p>
                <p className={`text-2xl font-bold ${reportData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(reportData.netProfit)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Transactions</p>
                <p className="text-2xl font-bold text-blue-600">
                  {reportData.transactionCount}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Export Options */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Export Your Data</h2>
            <p className="text-sm text-gray-600 mt-1">Download your financial data in various formats</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* PDF Report */}
              <div className="p-6 border border-gray-200 rounded-lg">
                <div className="flex items-center mb-4">
                  <FileText className="w-8 h-8 text-red-500 mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Detailed Report</h3>
                    <p className="text-sm text-gray-600">Comprehensive financial summary with charts</p>
                  </div>
                </div>
                <button
                  onClick={generatePDFReport}
                  disabled={generating}
                  className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {generating ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Generating...
                    </div>
                  ) : (
                    <>
                      <Download className="w-4 h-4 inline mr-2" />
                      Generate PDF Report
                    </>
                  )}
                </button>
              </div>

              {/* CSV Export */}
              <div className="p-6 border border-gray-200 rounded-lg">
                <div className="flex items-center mb-4">
                  <BarChart3 className="w-8 h-8 text-green-500 mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Transaction Data</h3>
                    <p className="text-sm text-gray-600">Raw transaction data for Excel or accounting software</p>
                  </div>
                </div>
                <button
                  onClick={exportToCSV}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                >
                  <Download className="w-4 h-4 inline mr-2" />
                  Export to CSV
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Top Categories */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Top Categories</h2>
            <p className="text-sm text-gray-600 mt-1">Your most active income and expense categories</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Income Categories */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 text-green-600">Income Sources</h3>
                <div className="space-y-3">
                  {reportData.topCategories
                    .filter(cat => cat.type === 'income')
                    .slice(0, 5)
                    .map((category, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <span className="font-medium text-green-800">{category.name}</span>
                        <div className="text-right">
                          <div className="text-green-600 font-bold">{formatCurrency(category.amount)}</div>
                          <div className="text-xs text-green-500">{category.count} transactions</div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Expense Categories */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 text-red-600">Expense Categories</h3>
                <div className="space-y-3">
                  {reportData.topCategories
                    .filter(cat => cat.type === 'expense')
                    .slice(0, 5)
                    .map((category, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <span className="font-medium text-red-800">{category.name}</span>
                        <div className="text-right">
                          <div className="text-red-600 font-bold">{formatCurrency(category.amount)}</div>
                          <div className="text-xs text-red-500">{category.count} transactions</div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Recent Transactions</h2>
            <p className="text-sm text-gray-600 mt-1">Latest financial activity for this period</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.recentTransactions.map((transaction, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transaction.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transaction.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        transaction.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.type}
                      </span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                      transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
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
