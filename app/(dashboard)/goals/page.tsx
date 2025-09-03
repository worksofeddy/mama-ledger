'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Target, TrendingUp, DollarSign, Calendar, Plus, Edit3, Trash2, Trophy, Clock, CheckCircle } from 'lucide-react'

interface FinancialGoal {
  id: string
  title: string
  description: string
  target_amount: number
  current_amount: number
  goal_type: 'saving' | 'earning' | 'debt_payoff'
  deadline: string
  is_completed: boolean
  created_at: string
  updated_at: string
}

export default function GoalsPage() {
  const [user, setUser] = useState<any>(null)
  const [goals, setGoals] = useState<FinancialGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null)
  
  // Form states
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [goalType, setGoalType] = useState<'saving' | 'earning' | 'debt_payoff'>('saving')
  const [deadline, setDeadline] = useState('')
  const [currentAmount, setCurrentAmount] = useState('')

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user?.id) {
      fetchGoals()
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

  const fetchGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setGoals(data || [])
    } catch (err) {
      console.error('Error fetching goals:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !targetAmount) return

    try {
      const { error } = await supabase
        .from('financial_goals')
        .insert({
          user_id: user.id,
          title,
          description,
          target_amount: parseFloat(targetAmount),
          current_amount: parseFloat(currentAmount) || 0,
          goal_type: goalType,
          deadline: deadline || null
        })

      if (error) throw error

      // Reset form and refresh
      resetForm()
      setShowAddForm(false)
      fetchGoals()

    } catch (err) {
      console.error('Error adding goal:', err)
    }
  }

  const handleUpdateGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingGoal || !title || !targetAmount) return

    try {
      const { error } = await supabase
        .from('financial_goals')
        .update({
          title,
          description,
          target_amount: parseFloat(targetAmount),
          current_amount: parseFloat(currentAmount),
          goal_type: goalType,
          deadline: deadline || null
        })
        .eq('id', editingGoal.id)

      if (error) throw error

      // Reset form and refresh
      setEditingGoal(null)
      resetForm()
      fetchGoals()

    } catch (err) {
      console.error('Error updating goal:', err)
    }
  }

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return

    try {
      const { error } = await supabase
        .from('financial_goals')
        .delete()
        .eq('id', goalId)

      if (error) throw error
      fetchGoals()

    } catch (err) {
      console.error('Error deleting goal:', err)
    }
  }

  const handleUpdateProgress = async (goalId: string, newAmount: number) => {
    try {
      const { error } = await supabase
        .from('financial_goals')
        .update({ current_amount: newAmount })
        .eq('id', goalId)

      if (error) throw error
      fetchGoals()

    } catch (err) {
      console.error('Error updating progress:', err)
    }
  }

  const startEditing = (goal: FinancialGoal) => {
    setEditingGoal(goal)
    setTitle(goal.title)
    setDescription(goal.description)
    setTargetAmount(goal.target_amount.toString())
    setCurrentAmount(goal.current_amount.toString())
    setGoalType(goal.goal_type)
    setDeadline(goal.deadline || '')
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setTargetAmount('')
    setCurrentAmount('')
    setGoalType('saving')
    setDeadline('')
  }

  const cancelEditing = () => {
    setEditingGoal(null)
    resetForm()
  }

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100)
  }

  const getProgressColor = (current: number, target: number) => {
    const percentage = (current / target) * 100
    if (percentage >= 100) return 'bg-green-500'
    if (percentage >= 75) return 'bg-blue-500'
    if (percentage >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getGoalStatus = (goal: FinancialGoal) => {
    if (goal.is_completed || goal.current_amount >= goal.target_amount) {
      return { text: 'Completed!', color: 'text-green-600', icon: CheckCircle }
    }
    
    if (goal.deadline) {
      const daysLeft = Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      if (daysLeft < 0) return { text: 'Overdue', color: 'text-red-600', icon: Clock }
      if (daysLeft <= 7) return { text: `${daysLeft} days left`, color: 'text-orange-600', icon: Clock }
    }
    
    return { text: 'In Progress', color: 'text-blue-600', icon: TrendingUp }
  }

  const getGoalTypeIcon = (type: string) => {
    switch (type) {
      case 'saving': return '💰'
      case 'earning': return '📈'
      case 'debt_payoff': return '💳'
      default: return '🎯'
    }
  }

  const getGoalTypeColor = (type: string) => {
    switch (type) {
      case 'saving': return 'bg-green-100 text-green-800'
      case 'earning': return 'bg-blue-100 text-blue-800'
      case 'debt_payoff': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your financial goals...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Financial Goals</h1>
          <p className="text-gray-600">Set targets and track your progress towards financial success</p>
        </div>

        {/* Add Goal Button */}
        <div className="mb-8">
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
          >
            <Plus className="w-5 h-5 inline mr-2" />
            Add New Goal
          </button>
        </div>

        {/* Add/Edit Goal Form */}
        {(showAddForm || editingGoal) && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingGoal ? 'Edit Goal' : 'Create New Goal'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {editingGoal ? 'Update your goal details' : 'Set a new financial target to work towards'}
              </p>
            </div>
            
            <div className="p-6">
              <form onSubmit={editingGoal ? handleUpdateGoal : handleAddGoal} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Goal Title */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Goal Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Save for new equipment"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe your goal in detail..."
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  {/* Goal Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Goal Type</label>
                    <select
                      value={goalType}
                      onChange={(e) => setGoalType(e.target.value as 'saving' | 'earning' | 'debt_payoff')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="saving">💰 Saving Goal</option>
                      <option value="earning">📈 Earning Goal</option>
                      <option value="debt_payoff">💳 Debt Payoff</option>
                    </select>
                  </div>

                  {/* Target Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Target Amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-gray-500">$</span>
                      <input
                        type="number"
                        value={targetAmount}
                        onChange={(e) => setTargetAmount(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Current Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Current Amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-gray-500">$</span>
                      <input
                        type="number"
                        value={currentAmount}
                        onChange={(e) => setCurrentAmount(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Deadline */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Deadline (Optional)</label>
                    <input
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={editingGoal ? cancelEditing : () => setShowAddForm(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    {editingGoal ? 'Update Goal' : 'Create Goal'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Goals List */}
        {goals.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No goals set yet</h3>
            <p className="text-gray-600 mb-6">Create your first financial goal to start building wealth and achieving your dreams</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-5 h-5 inline mr-2" />
              Set Your First Goal
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {goals.map((goal) => {
              const progressPercentage = getProgressPercentage(goal.current_amount, goal.target_amount)
              const progressColor = getProgressColor(goal.current_amount, goal.target_amount)
              const status = getGoalStatus(goal)
              const StatusIcon = status.icon

              return (
                <div key={goal.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  {/* Goal Header */}
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">{getGoalTypeIcon(goal.goal_type)}</span>
                        <div>
                          <h3 className="font-semibold text-gray-900">{goal.title}</h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getGoalTypeColor(goal.goal_type)}`}>
                            {goal.goal_type.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => startEditing(goal)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteGoal(goal.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {goal.description && (
                      <p className="text-sm text-gray-600">{goal.description}</p>
                    )}
                  </div>

                  {/* Goal Progress */}
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-600">Progress</span>
                      <span className={`text-sm font-medium ${status.color}`}>
                        {status.text}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                      <div
                        className={`h-3 rounded-full transition-all duration-300 ${progressColor}`}
                        style={{ width: `${progressPercentage}%` }}
                      ></div>
                    </div>

                    {/* Amount Details */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500">Target</p>
                        <p className="text-lg font-bold text-gray-900">
                          ${goal.target_amount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Current</p>
                        <p className="text-lg font-bold text-blue-600">
                          ${goal.current_amount.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Remaining Amount */}
                    <div className="text-center p-3 bg-gray-50 rounded-lg mb-4">
                      <p className="text-xs text-gray-500 mb-1">Remaining</p>
                      <p className={`text-xl font-bold ${
                        goal.target_amount - goal.current_amount <= 0 ? 'text-green-600' : 'text-gray-900'
                      }`}>
                        ${Math.max(0, goal.target_amount - goal.current_amount).toLocaleString()}
                      </p>
                    </div>

                    {/* Quick Update Progress */}
                    {!goal.is_completed && goal.current_amount < goal.target_amount && (
                      <div className="border-t pt-4">
                        <label className="block text-xs text-gray-500 mb-2">Quick Update Progress</label>
                        <div className="flex space-x-2">
                          <input
                            type="number"
                            placeholder="Add amount"
                            step="0.01"
                            min="0"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                const input = e.target as HTMLInputElement
                                const newAmount = goal.current_amount + parseFloat(input.value || '0')
                                handleUpdateProgress(goal.id, newAmount)
                                input.value = ''
                              }
                            }}
                          />
                          <button
                            onClick={(e) => {
                              const input = e.currentTarget.previousElementSibling as HTMLInputElement
                              const newAmount = goal.current_amount + parseFloat(input.value || '0')
                              handleUpdateProgress(goal.id, newAmount)
                              input.value = ''
                            }}
                            className="px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Deadline */}
                    {goal.deadline && (
                      <div className="mt-4 flex items-center text-sm text-gray-500">
                        <Calendar className="w-4 h-4 mr-2" />
                        Due: {new Date(goal.deadline).toLocaleDateString()}
                      </div>
                    )}

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

        {/* Goal Tips */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">🎯 Goal Setting Tips</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <p className="font-medium mb-2">🎯 Be Specific</p>
              <p>Set clear, measurable goals with specific amounts and deadlines.</p>
            </div>
            <div>
              <p className="font-medium mb-2">📅 Set Deadlines</p>
              <p>Give yourself realistic timeframes to stay motivated and focused.</p>
            </div>
            <div>
              <p className="font-medium mb-2">💰 Start Small</p>
              <p>Begin with achievable goals and gradually increase the challenge.</p>
            </div>
            <div>
              <p className="font-medium mb-2">📊 Track Progress</p>
              <p>Regularly update your progress to see how close you are to your target.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
