'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { TrendingUp, TrendingDown, Calendar, Search, Filter, Plus, ArrowLeft, Clock, DollarSign, Target, BarChart3 } from 'lucide-react'

interface Category {
  id: string
  name: string
  type: 'income' | 'expense'
  icon: string
}

interface Transaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  category: string
  description: string
  date: string
  created_at: string
}

// Enhanced category icons and colors
const categoryIcons: { [key: string]: string } = {
  'Sales': '💰',
  'Gifts': '🎁',
  'Stock': '📦',
  'Transport': '🚚',
  'Rent': '🏠',
  'Utilities': '💡',
  'Food': '🍔',
  'Other': '🤷‍♀️'
}

const categoryColors: { [key: string]: string } = {
  'Sales': 'bg-green-100 text-green-800 border-green-200',
  'Gifts': 'bg-blue-100 text-blue-800 border-blue-200',
  'Stock': 'bg-purple-100 text-purple-800 border-purple-200',
  'Transport': 'bg-orange-100 text-orange-800 border-orange-200',
  'Rent': 'bg-red-100 text-red-800 border-red-200',
  'Utilities': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Food': 'bg-pink-100 text-pink-800 border-pink-200',
  'Other': 'bg-gray-100 text-gray-800 border-gray-200'
}

// Quick entry component
function QuickEntry({ onAdd }: { onAdd: (type: 'income' | 'expense', amount: number, category: string) => void }) {
  const [amount, setAmount] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [entryType, setEntryType] = useState<'income' | 'expense'>('expense')

  const handleQuickAdd = () => {
    if (amount && selectedCategory) {
      onAdd(entryType, parseFloat(amount), selectedCategory)
      setAmount('')
      setSelectedCategory('')
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Entry</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Amount Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
          <div className="relative">
            <span className="absolute left-3 top-3 text-gray-500">$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Entry Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setEntryType('income')}
              className={`p-3 rounded-lg font-medium transition-colors ${
                entryType === 'income' 
                  ? 'bg-green-100 text-green-800 border-2 border-green-300' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <TrendingUp className="w-4 h-4 inline mr-2" />
              Income
            </button>
            <button
              onClick={() => setEntryType('expense')}
              className={`p-3 rounded-lg font-medium transition-colors ${
                entryType === 'expense' 
                  ? 'bg-red-100 text-red-800 border-2 border-red-300' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <TrendingDown className="w-4 h-4 inline mr-2" />
              Expense
            </button>
          </div>
        </div>

        {/* Category Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Select category</option>
            {entryType === 'income' ? (
              <>
                <option value="Sales">💰 Sales</option>
                <option value="Gifts">🎁 Gifts</option>
              </>
            ) : (
              <>
                <option value="Stock">📦 Stock</option>
                <option value="Transport">🚚 Transport</option>
                <option value="Rent">🏠 Rent</option>
                <option value="Utilities">💡 Utilities</option>
                <option value="Food">🍔 Food</option>
                <option value="Other">🤷‍♀️ Other</option>
              </>
            )}
          </select>
        </div>
      </div>

      <button
        onClick={handleQuickAdd}
        disabled={!amount || !selectedCategory}
        className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-colors ${
          entryType === 'income' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
        } disabled:bg-gray-300 disabled:cursor-not-allowed`}
      >
        Add {entryType === 'income' ? 'Income' : 'Expense'}
      </button>
    </div>
  )
}

// Enhanced transaction card with edit/delete
function TransactionCard({ 
  transaction, 
  onEdit, 
  onDelete 
}: { 
  transaction: Transaction
  onEdit: (transaction: Transaction) => void
  onDelete: (transactionId: string) => void
}) {
  const isIncome = transaction.type === 'income'
  const formattedDate = new Date(transaction.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  
  return (
    <div className={`bg-white rounded-xl shadow-sm border-l-4 ${
      isIncome ? 'border-l-green-500' : 'border-l-red-500'
    } p-4 hover:shadow-md transition-shadow group`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            isIncome ? 'bg-green-100' : 'bg-red-100'
          }`}>
            <span className="text-2xl">{categoryIcons[transaction.category] || '💰'}</span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-gray-900 text-lg">{transaction.category}</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                categoryColors[transaction.category] || 'bg-gray-100 text-gray-800'
              }`}>
                {transaction.type}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>{formattedDate}</span>
            </div>
            {transaction.description && transaction.description !== transaction.category && (
              <p className="text-sm text-gray-600 mt-1">{transaction.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <p className={`text-2xl font-bold ${
              isIncome ? 'text-green-600' : 'text-red-600'
            }`}>
              {isIncome ? '+' : '-'}${transaction.amount.toLocaleString()}
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(transaction)}
              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Edit transaction"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(transaction.id)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete transaction"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Summary cards component
function SummaryCards({ transactions }: { transactions: Transaction[] }) {
  const today = new Date().toISOString().split('T')[0]
  const todayTransactions = transactions.filter(t => 
    t.created_at.startsWith(today)
  )
  
  const todayIncome = todayTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)
  
  const todayExpenses = todayTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)
  
  const todayProfit = todayIncome - todayExpenses

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-100 text-sm font-medium">Today's Income</p>
            <p className="text-3xl font-bold">${todayIncome.toLocaleString()}</p>
          </div>
          <TrendingUp className="w-8 h-8 text-green-200" />
        </div>
      </div>
      
      <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-red-100 text-sm font-medium">Today's Expenses</p>
            <p className="text-3xl font-bold">${todayExpenses.toLocaleString()}</p>
          </div>
          <TrendingDown className="w-8 h-8 text-red-200" />
        </div>
      </div>
      
      <div className={`rounded-xl p-6 text-white ${
        todayProfit >= 0 
          ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
          : 'bg-gradient-to-br from-orange-500 to-orange-600'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm font-medium">Today's Profit</p>
            <p className="text-3xl font-bold">${todayProfit.toLocaleString()}</p>
          </div>
          <Target className="w-8 h-8 text-blue-200" />
        </div>
      </div>
    </div>
  )
}

export default function BookkeepingPage() {
  const [view, setView] = useState<'overview' | 'add' | 'history'>('overview')
  const [entryType, setEntryType] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [description, setDescription] = useState('')
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState<any>(null)
  
  // History view states
  const [historyFilter, setHistoryFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'category'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  const router = useRouter()

  // Edit and delete handlers
  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setEntryType(transaction.type)
    setAmount(transaction.amount.toString())
    setSelectedCategory(categories.find(c => c.name === transaction.category) || null)
    setDescription(transaction.description || '')
    setView('add')
  }

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId)

      if (error) throw error

      // Remove from local state
      setTransactions(prev => prev.filter(t => t.id !== transactionId))
      
    } catch (err) {
      console.error('Error deleting transaction:', err)
      setError('Failed to delete transaction')
    }
  }

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user?.id) {
      fetchCategories()
      fetchTransactions()
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

  const fetchCategories = async () => {
    try {
      if (!user?.id) return
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (err) {
      console.error('Error fetching categories:', err)
      setError('Failed to load categories')
    }
  }

  const fetchTransactions = async () => {
    try {
      if (!user?.id) return
      
      setLoading(true)
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setTransactions(data || [])
    } catch (err) {
      console.error('Error fetching transactions:', err)
      setError('Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }

  const handleAddEntry = async (type: 'income' | 'expense', amount: number, category: string) => {
    try {
      setSaving(true)
      setError('')

      const { data, error } = await supabase
        .from('transactions')
        .insert({
          user_id: user?.id,
          type,
          amount,
          category,
          description: category,
          date: new Date().toISOString().split('T')[0]
        })
        .select()

      if (error) throw error

      if (data && data[0]) {
        setTransactions([data[0], ...transactions])
      }
      
      // Refresh data
      fetchTransactions()
      
    } catch (err: any) {
      console.error('Error saving transaction:', err)
      setError(`Failed to save transaction: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDetailedAdd = async () => {
    if (!amount || !selectedCategory) return
    
    try {
      setSaving(true)
      setError('')

      if (editingTransaction) {
        // Update existing transaction
        const { data, error } = await supabase
          .from('transactions')
          .update({
            type: entryType,
            amount: parseFloat(amount),
            category: selectedCategory.name,
            description: description || selectedCategory.name,
            date: new Date().toISOString().split('T')[0]
          })
          .eq('id', editingTransaction.id)
          .select()

        if (error) throw error

        if (data && data[0]) {
          setTransactions(prev => 
            prev.map(t => t.id === editingTransaction.id ? data[0] : t)
          )
        }
      } else {
        // Insert new transaction
        const { data, error } = await supabase
          .from('transactions')
          .insert({
            user_id: user?.id,
            type: entryType,
            amount: parseFloat(amount),
            category: selectedCategory.name,
            description: description || selectedCategory.name,
            date: new Date().toISOString().split('T')[0]
          })
          .select()

        if (error) throw error

        if (data && data[0]) {
          setTransactions([data[0], ...transactions])
        }
      }

      // Reset form
      setAmount('')
      setSelectedCategory(null)
      setDescription('')
      setEditingTransaction(null)
      setView('overview')
      
      // Refresh data
      fetchTransactions()
      
    } catch (err: any) {
      console.error('Error saving transaction:', err)
      setError(`Failed to save transaction: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user?.id || !amount || !selectedCategory) return
    
    try {
      setSaving(true)
      setError('')
      
      if (editingTransaction) {
        // Update existing transaction
        const { error } = await supabase
          .from('transactions')
          .update({
            type: entryType,
            amount: parseFloat(amount),
            category: selectedCategory.name,
            description,
            date: new Date().toISOString()
          })
          .eq('id', editingTransaction.id)

        if (error) throw error
        
        // Reset editing state
        setEditingTransaction(null)
      } else {
        // Insert new transaction
        const { error } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            type: entryType,
            amount: parseFloat(amount),
            category: selectedCategory.name,
            description,
            date: new Date().toISOString()
          })

        if (error) throw error
      }

      // Reset form and refresh
      setAmount('')
      setSelectedCategory(null)
      setDescription('')
      setView('overview')
      fetchTransactions()
      
    } catch (err: any) {
      console.error('Error saving transaction:', err)
      setError(`Failed to save transaction: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (view === 'add') {
    return (
      <div className="fixed inset-0 bg-gray-50 z-50 p-4 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={() => setView('overview')} 
              className="flex items-center text-indigo-600 font-semibold hover:text-indigo-700"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Overview
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              {editingTransaction ? 'Edit' : 'Add'} {entryType === 'income' ? 'Income' : 'Expense'}
            </h1>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-600 font-medium">{error}</p>
            </div>
          )}
          
          {/* Entry Type Toggle */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Entry Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setEntryType('income')}
                className={`p-4 rounded-lg font-medium transition-all ${
                  entryType === 'income' 
                    ? 'bg-green-100 text-green-800 border-2 border-green-300 shadow-sm' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <TrendingUp className="w-6 h-6 mx-auto mb-2" />
                Income
              </button>
              <button
                onClick={() => setEntryType('expense')}
                className={`p-4 rounded-lg font-medium transition-all ${
                  entryType === 'expense' 
                    ? 'bg-red-100 text-red-800 border-2 border-red-300 shadow-sm' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <TrendingDown className="w-6 h-6 mx-auto mb-2" />
                Expense
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-4 text-gray-500 text-xl">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full pl-12 pr-4 py-4 text-2xl font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Category Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Category</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {categories
                .filter(c => c.type === entryType)
                .map(category => (
                <button 
                  key={category.id}
                  onClick={() => setSelectedCategory(category)}
                  className={`p-4 rounded-lg text-center border-2 transition-all ${
                    selectedCategory?.id === category.id 
                      ? 'border-indigo-500 bg-indigo-50 shadow-sm' 
                      : 'border-transparent bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="text-3xl mb-2">{category.icon || '💰'}</div>
                  <p className="font-medium text-sm">{category.name}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Description Input */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Description (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Save Button */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
            <button 
              onClick={handleDetailedAdd}
              disabled={!amount || !selectedCategory || saving}
              className={`w-full py-4 rounded-xl text-white text-lg font-bold transition-colors ${
                entryType === 'income' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-red-600 hover:bg-red-700'
              } disabled:bg-gray-300 disabled:cursor-not-allowed`}
            >
              {saving ? 'Saving...' : editingTransaction ? 'Update Transaction' : `Save ${entryType === 'income' ? 'Income' : 'Expense'}`}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Transaction History View
  if (view === 'history') {
    const filteredTransactions = transactions
      .filter(t => historyFilter === 'all' || t.type === historyFilter)
      .filter(t => 
        searchTerm === '' || 
        t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        if (sortBy === 'date') {
          return sortOrder === 'asc' 
            ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        } else if (sortBy === 'amount') {
          return sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount
        } else {
          return sortOrder === 'asc' 
            ? a.category.localeCompare(b.category)
            : b.category.localeCompare(a.category)
        }
      })

    return (
      <div className="p-4 bg-gray-50 min-h-screen">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <button 
              onClick={() => setView('overview')} 
              className="flex items-center text-indigo-600 font-semibold hover:text-indigo-700"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Overview
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Transaction History</h1>
            <button 
              onClick={() => setView('add')}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Entry
            </button>
          </div>

          {/* Filters and Search */}
          <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={historyFilter}
                  onChange={(e) => setHistoryFilter(e.target.value as 'all' | 'income' | 'expense')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Transactions</option>
                  <option value="income">Income Only</option>
                  <option value="expense">Expenses Only</option>
                </select>
              </div>

              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search categories..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'amount' | 'category')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="date">Date</option>
                  <option value="amount">Amount</option>
                  <option value="category">Category</option>
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>
            </div>
          </div>

          {/* Transactions List */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {filteredTransactions.length} Transaction{filteredTransactions.length !== 1 ? 's' : ''}
              </h2>
            </div>
            
            <div className="divide-y divide-gray-200">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((transaction) => (
                  <TransactionCard 
                    key={transaction.id} 
                    transaction={transaction}
                    onEdit={handleEditTransaction}
                    onDelete={handleDeleteTransaction}
                  />
                ))
              ) : (
                <div className="p-8 text-center">
                  <div className="text-gray-400 text-6xl mb-4">📊</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
                  <p className="text-gray-500">
                    {searchTerm || historyFilter !== 'all' 
                      ? 'Try adjusting your filters or search terms'
                      : 'Start by adding your first transaction!'
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your ledger...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Daily Money</h1>
            <p className="text-gray-600 mt-1">Track your daily income and expenses</p>
          </div>
          <button 
            onClick={fetchTransactions}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm flex items-center"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        )}
        
        {/* Summary Cards */}
        <SummaryCards transactions={transactions} />
        
        {/* Quick Entry */}
        <QuickEntry onAdd={handleAddEntry} />
        
        {/* Recent Transactions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-32">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Recent Transactions</h2>
            <button 
              onClick={() => setView('history')}
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              View All
            </button>
          </div>
          
          <div className="space-y-4">
            {transactions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📝</div>
                <p className="text-gray-500 text-lg mb-2">No transactions yet</p>
                <p className="text-gray-400">Add your first income or expense to get started!</p>
              </div>
            ) : (
              transactions.slice(0, 10).map((transaction) => (
                <TransactionCard 
                  key={transaction.id} 
                  transaction={transaction}
                  onEdit={handleEditTransaction}
                  onDelete={handleDeleteTransaction}
                />
              ))
            )}
          </div>
        </div>
        
        {/* Fixed Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-sm border-t">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-3 gap-4">
              <button 
                onClick={() => { setEntryType('income'); setView('add'); }}
                className="flex items-center justify-center p-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl text-lg font-bold shadow-lg hover:shadow-xl transition-all"
              >
                <TrendingUp className="w-6 h-6 mr-2" />
                Money In
              </button>
              <button 
                onClick={() => { setEntryType('expense'); setView('add'); }}
                className="flex items-center justify-center p-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl text-lg font-bold shadow-lg hover:shadow-xl transition-all"
              >
                <TrendingDown className="w-6 h-6 mr-2" />
                Money Out
              </button>
              <button 
                onClick={() => setView('history')}
                className="flex items-center justify-center p-4 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl text-lg font-bold shadow-lg hover:shadow-xl transition-all"
              >
                <BarChart3 className="w-6 h-6 mr-2" />
                History
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
