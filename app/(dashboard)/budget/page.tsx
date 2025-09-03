'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Target, AlertTriangle, TrendingUp, DollarSign, Plus, Edit3, Trash2, X } from 'lucide-react'

interface Budget {
  id: string
  category: string
  amount: number
  spent: number
  period: 'monthly' | 'weekly' | 'yearly'
  alert_threshold: number
  created_at: string
}

interface Category {
  id: string
  name: string
  type: 'income' | 'expense'
  icon: string
}

export default function BudgetPage() {
  const [user, setUser] = useState<any>(null)
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  
  // Form states
  const [selectedCategory, setSelectedCategory] = useState('')
  const [budgetAmount, setBudgetAmount] = useState('')
  const [budgetPeriod, setBudgetPeriod] = useState<'monthly' | 'weekly' | 'yearly'>('monthly')
  const [alertThreshold, setAlertThreshold] = useState('80')

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user?.id) {
      fetchBudgets()
      fetchCategories()
    }
  }, [user])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      window.location.href = '/login'
    } else {
      setUser(session.user)
    }
  }

  const fetchBudgets = async () => {
    try {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Calculate spent amounts for each budget
      const budgetsWithSpent = await Promise.all(
        (data || []).map(async (budget) => {
          const { data: transactions } = await supabase
            .from('transactions')
            .select('amount')
            .eq('user_id', user.id)
            .eq('category', budget.category)
            .eq('type', 'expense')

          const spent = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0
          return { ...budget, spent }
        })
      )

      setBudgets(budgetsWithSpent)
    } catch (err) {
      console.error('Error fetching budgets:', err)
      setError('Failed to load budgets. Please try again.')
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (err) {
      console.error('Error fetching categories:', err)
      setError('Failed to load categories. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCategory || !budgetAmount) return

    try {
      setActionLoading(true)
      setError('')
      const { error } = await supabase
        .from('budgets')
        .insert({
          user_id: user.id,
          category: selectedCategory,
          amount: parseFloat(budgetAmount),
          period: budgetPeriod,
          alert_threshold: parseInt(alertThreshold)
        })

      if (error) throw error

      // Reset form and refresh
      setSelectedCategory('')
      setBudgetAmount('')
      setBudgetPeriod('monthly')
      setAlertThreshold('80')
      setShowAddForm(false)
      fetchBudgets()

    } catch (err) {
      console.error('Error adding budget:', err)
      setError('Failed to add budget. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdateBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingBudget || !budgetAmount) return

    try {
      const { error } = await supabase
        .from('budgets')
        .update({
          amount: parseFloat(budgetAmount),
          period: budgetPeriod,
          alert_threshold: parseInt(alertThreshold)
        })
        .eq('id', editingBudget.id)

      if (error) throw error

      // Reset form and refresh
      setEditingBudget(null)
      setBudgetAmount('')
      setBudgetPeriod('monthly')
      setAlertThreshold('80')
      fetchBudgets()

    } catch (err) {
      console.error('Error updating budget:', err)
    }
  }

  const handleDeleteBudget = async (budgetId: string) => {
    if (!confirm('Are you sure you want to delete this budget?')) return

    try {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', budgetId)

      if (error) throw error
      fetchBudgets()

    } catch (err) {
      console.error('Error deleting budget:', err)
    }
  }

  const startEditing = (budget: Budget) => {
    setEditingBudget(budget)
    setSelectedCategory(budget.category)
    setBudgetAmount(budget.amount.toString())
    setBudgetPeriod(budget.period)
    setAlertThreshold(budget.alert_threshold.toString())
  }

  const cancelEditing = () => {
    setEditingBudget(null)
    setSelectedCategory('')
    setBudgetAmount('')
    setBudgetPeriod('monthly')
    setAlertThreshold('80')
  }

  const getProgressPercentage = (spent: number, amount: number) => {
    return Math.min((spent / amount) * 100, 100)
  }

  const getProgressColor = (spent: number, amount: number, threshold: number) => {
    const percentage = (spent / amount) * 100
    if (percentage >= 100) return 'bg-red-500'
    if (percentage >= threshold) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getBudgetStatus = (spent: number, amount: number, threshold: number) => {
    const percentage = (spent / amount) * 100
    if (percentage >= 100) return { text: 'Over Budget', color: 'text-red-600', icon: AlertTriangle }
    if (percentage >= threshold) return { text: 'Warning', color: 'text-yellow-600', icon: AlertTriangle }
    return { text: 'On Track', color: 'text-green-600', icon: TrendingUp }
  }

  if (loading) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your budgets...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Budget Planning</h1>
          <p className="text-gray-600">Set spending limits and track your financial goals</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setError('')}
                  className="text-red-400 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Budget Button */}
        <div className="mb-8">
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
          >
            <Plus className="w-5 h-5 inline mr-2" />
            Add New Budget
          </button>
        </div>

        {/* Add/Edit Budget Form */}
        {(showAddForm || editingBudget) && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingBudget ? 'Edit Budget' : 'Create New Budget'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {editingBudget ? 'Update your budget settings' : 'Set spending limits for different categories'}
              </p>
            </div>
            
            <div className="p-6">
              <form onSubmit={editingBudget ? handleUpdateBudget : handleAddBudget} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Category Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                      disabled={!!editingBudget}
                    >
                      <option value="">Select a category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.name}>
                          {category.icon} {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Budget Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Budget Amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-gray-500">$</span>
                      <input
                        type="number"
                        value={budgetAmount}
                        onChange={(e) => setBudgetAmount(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Budget Period */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Budget Period</label>
                    <select
                      value={budgetPeriod}
                      onChange={(e) => setBudgetPeriod(e.target.value as 'monthly' | 'weekly' | 'yearly')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>

                  {/* Alert Threshold */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Alert Threshold (%)</label>
                    <input
                      type="number"
                      value={alertThreshold}
                      onChange={(e) => setAlertThreshold(e.target.value)}
                      placeholder="80"
                      min="1"
                      max="100"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Get notified when you reach this percentage of your budget</p>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={editingBudget ? cancelEditing : () => setShowAddForm(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto mr-2"></div>
                        {editingBudget ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      editingBudget ? 'Update Budget' : 'Create Budget'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Budgets List */}
        {budgets.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No budgets set yet</h3>
            <p className="text-gray-600 mb-6">Create your first budget to start tracking your spending goals</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-5 h-5 inline mr-2" />
              Create Your First Budget
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {budgets.map((budget) => {
              const progressPercentage = getProgressPercentage(budget.spent, budget.amount)
              const progressColor = getProgressColor(budget.spent, budget.amount, budget.alert_threshold)
              const status = getBudgetStatus(budget.spent, budget.amount, budget.alert_threshold)
              const StatusIcon = status.icon

              return (
                <div key={budget.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  {/* Budget Header */}
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">
                          {categories.find(c => c.name === budget.category)?.icon || '💰'}
                        </span>
                        <div>
                          <h3 className="font-semibold text-gray-900">{budget.category}</h3>
                          <p className="text-sm text-gray-500 capitalize">{budget.period} budget</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => startEditing(budget)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBudget(budget.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Budget Progress */}
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-600">Progress</span>
                      <span className={`text-sm font-medium ${status.color}`}>
                        {status.text}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-300 ${progressColor}`}
                        style={{ width: `${progressPercentage}%` }}
                      ></div>
                    </div>

                    {/* Amount Details */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500">Budget</p>
                        <p className="text-lg font-bold text-gray-900">
                          ${budget.amount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Spent</p>
                        <p className={`text-lg font-bold ${
                          budget.spent > budget.amount ? 'text-red-600' : 'text-gray-900'
                        }`}>
                          ${budget.spent.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Remaining Amount */}
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Remaining</p>
                      <p className={`text-xl font-bold ${
                        budget.amount - budget.spent < 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        ${(budget.amount - budget.spent).toLocaleString()}
                      </p>
                    </div>

                    {/* Status Icon */}
                    <div className="flex justify-center mt-3">
                      <StatusIcon className={`w-5 h-5 ${status.color}`} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Budget Tips */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">💡 Budgeting Tips</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <p className="font-medium mb-2">🎯 Start Small</p>
              <p>Begin with 2-3 essential categories and gradually add more as you get comfortable.</p>
            </div>
            <div>
              <p className="font-medium mb-2">📱 Check Regularly</p>
              <p>Review your budget progress daily to stay on track and avoid overspending.</p>
            </div>
            <div>
              <p className="font-medium mb-2">💰 Be Realistic</p>
              <p>Set budgets based on your actual income and essential expenses, not wishful thinking.</p>
            </div>
            <div>
              <p className="font-medium mb-2">🔄 Adjust as Needed</p>
              <p>Don't be afraid to modify your budgets based on changing circumstances and needs.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
