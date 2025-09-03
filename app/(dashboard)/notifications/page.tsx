'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Bell, AlertTriangle, CheckCircle, Info, TrendingUp, DollarSign, Target, X, Check } from 'lucide-react'

interface Notification {
  id: string
  title: string
  message: string
  type: 'budget_alert' | 'goal_reminder' | 'transaction_reminder' | 'system'
  is_read: boolean
  created_at: string
}

export default function NotificationsPage() {
  const [user, setUser] = useState<any>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'budget_alert' | 'goal_reminder'>('all')

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user?.id) {
      fetchNotifications()
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

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setNotifications(data || [])
    } catch (err) {
      console.error('Error fetching notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      if (error) throw error
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      )
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
  }

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (error) throw error
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      )
    } catch (err) {
      console.error('Error marking all notifications as read:', err)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (error) throw error
      
      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
    } catch (err) {
      console.error('Error deleting notification:', err)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'budget_alert':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />
      case 'goal_reminder':
        return <Target className="w-5 h-5 text-blue-500" />
      case 'transaction_reminder':
        return <DollarSign className="w-5 h-5 text-green-500" />
      case 'system':
        return <Info className="w-5 h-5 text-gray-500" />
      default:
        return <Bell className="w-5 h-5 text-indigo-500" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'budget_alert':
        return 'border-l-orange-500 bg-orange-50'
      case 'goal_reminder':
        return 'border-l-blue-500 bg-blue-50'
      case 'transaction_reminder':
        return 'border-l-green-500 bg-green-50'
      case 'system':
        return 'border-l-gray-500 bg-gray-50'
      default:
        return 'border-l-indigo-500 bg-indigo-50'
    }
  }

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case 'budget_alert':
        return 'Budget Alert'
      case 'goal_reminder':
        return 'Goal Reminder'
      case 'transaction_reminder':
        return 'Transaction Reminder'
      case 'system':
        return 'System'
      default:
        return 'Notification'
    }
  }

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true
    if (filter === 'unread') return !notification.is_read
    return notification.type === filter
  })

  const unreadCount = notifications.filter(n => !n.is_read).length

  if (loading) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your notifications...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
              <p className="text-gray-600">Stay updated with your financial progress and important alerts</p>
            </div>
            <div className="flex items-center space-x-4">
              {unreadCount > 0 && (
                <span className="bg-red-100 text-red-800 text-sm font-medium px-3 py-1 rounded-full">
                  {unreadCount} unread
                </span>
              )}
              <button
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-100 rounded-lg hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Mark all as read
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="p-4">
            <div className="flex space-x-2">
              {(['all', 'unread', 'budget_alert', 'goal_reminder'] as const).map((filterType) => (
                <button
                  key={filterType}
                  onClick={() => setFilter(filterType)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === filterType
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filterType === 'all' && 'All'}
                  {filterType === 'unread' && `Unread (${unreadCount})`}
                  {filterType === 'budget_alert' && 'Budget Alerts'}
                  {filterType === 'goal_reminder' && 'Goal Reminders'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
            <p className="text-gray-600">
              {notifications.length === 0 
                ? "You're all caught up! Notifications will appear here for budget alerts, goal reminders, and other important updates."
                : "No notifications match your current filter. Try selecting a different filter option."
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 ${getNotificationColor(notification.type)} ${
                  !notification.is_read ? 'ring-2 ring-indigo-100' : ''
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className={`text-lg font-semibold ${
                            notification.is_read ? 'text-gray-700' : 'text-gray-900'
                          }`}>
                            {notification.title}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            notification.type === 'budget_alert' ? 'bg-orange-100 text-orange-800' :
                            notification.type === 'goal_reminder' ? 'bg-blue-100 text-blue-800' :
                            notification.type === 'transaction_reminder' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {getNotificationTypeLabel(notification.type)}
                          </span>
                        </div>
                        
                        <p className={`text-sm ${
                          notification.is_read ? 'text-gray-500' : 'text-gray-700'
                        }`}>
                          {notification.message}
                        </p>
                        
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {!notification.is_read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete notification"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Notification Settings Info */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">🔔 Smart Notifications</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <p className="font-medium mb-2">💰 Budget Alerts</p>
              <p>Get notified when you reach your spending limits to avoid overspending.</p>
            </div>
            <div>
              <p className="font-medium mb-2">🎯 Goal Reminders</p>
              <p>Stay motivated with reminders about your financial goals and deadlines.</p>
            </div>
            <div>
              <p className="font-medium mb-2">📊 Transaction Insights</p>
              <p>Receive updates about your spending patterns and financial trends.</p>
            </div>
            <div>
              <p className="font-medium mb-2">⚙️ System Updates</p>
              <p>Important information about new features and app improvements.</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        {notifications.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-100 rounded-lg hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Mark all as read
              </button>
              <button
                onClick={() => setFilter('unread')}
                disabled={unreadCount === 0}
                className="px-4 py-2 text-sm font-medium text-orange-600 bg-orange-100 rounded-lg hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                View unread only
              </button>
              <button
                onClick={() => setFilter('budget_alert')}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
              >
                Budget alerts
              </button>
              <button
                onClick={() => setFilter('goal_reminder')}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
              >
                Goal reminders
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
