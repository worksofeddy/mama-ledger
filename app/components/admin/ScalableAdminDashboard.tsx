'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { formatCurrency } from '../../lib/utils'
import { MetricCard } from './MetricCard'
import { TimePeriodSelector, TimePeriod } from './TimePeriodSelector'
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
  Cell,
  CartesianGrid
} from 'recharts'
import {
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  Activity,
  UsersIcon,
  Plus,
  Calendar,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react'

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  role: string
  created_at: string
  last_sign_in: string
}

interface Group {
  id: string
  name: string
  description: string
  admin_id: string
  contribution_amount: number
  contribution_frequency: string
  interest_rate: number
  max_members: number
  is_private: boolean
  created_at: string
  member_count: number
  admin_name: string
  admin_email: string
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
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
  userPagination: PaginationInfo
  groupPagination: PaginationInfo
  recentTransactions: any[]
  categoryData: any[]
  userStatsDaily: any[]
  groupStatsDaily: any[]
}

export default function ScalableAdminDashboard() {
  const [data, setData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'groups' | 'transactions'>('overview')
  const [dateRange, setDateRange] = useState<TimePeriod>('month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  // Get date range based on selection
  const getDateRange = useCallback((period: TimePeriod) => {
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
  }, [customStartDate, customEndDate])

  // Fetch system statistics
  const fetchSystemStats = useCallback(async () => {
    try {
      const { startDate, endDate } = getDateRange(dateRange)
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate
      })
      
      const response = await fetch(`/api/admin/stats?${params}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('Please log in to access the admin dashboard')
          return
        }
        if (response.status === 403) {
          setError('You need admin privileges to access this dashboard')
          return
        }
        throw new Error(`Failed to fetch system stats: ${response.status}`)
      }
      
      const statsData = await response.json()
      
      setData(prev => ({
        systemStats: statsData.systemStats || {
          totalUsers: 0,
          totalGroups: 0,
          totalTransactions: 0,
          totalRevenue: 0,
          userGrowth: 0,
          groupGrowth: 0,
          transactionGrowth: 0,
          revenueGrowth: 0
        },
        users: prev?.users || [],
        groups: prev?.groups || [],
        userPagination: prev?.userPagination || { page: 1, limit: 10, total: 0, totalPages: 0 },
        groupPagination: prev?.groupPagination || { page: 1, limit: 10, total: 0, totalPages: 0 },
        recentTransactions: statsData.recentTransactions || [],
        categoryData: statsData.categoryData || [],
        userStatsDaily: statsData.userStatsDaily || [],
        groupStatsDaily: statsData.groupStatsDaily || []
      }))
    } catch (err) {
      console.error('Error fetching system stats:', err)
      setError('Failed to load system statistics')
    }
  }, [dateRange, getDateRange])

  // Fetch users
  const fetchUsers = useCallback(async (page = 1, limit = 10) => {
    try {
      const response = await fetch(`/api/admin/users?page=${page}&limit=${limit}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('Please log in to access the admin dashboard')
          return
        }
        if (response.status === 403) {
          setError('You need admin privileges to access this dashboard')
          return
        }
        throw new Error(`Failed to fetch users: ${response.status}`)
      }
      
      const usersData = await response.json()
      
      setData(prev => ({
        systemStats: prev?.systemStats || {
          totalUsers: 0,
          totalGroups: 0,
          totalTransactions: 0,
          totalRevenue: 0,
          userGrowth: 0,
          groupGrowth: 0,
          transactionGrowth: 0,
          revenueGrowth: 0
        },
        users: usersData.users || [],
        groups: prev?.groups || [],
        userPagination: usersData.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 },
        groupPagination: prev?.groupPagination || { page: 1, limit: 10, total: 0, totalPages: 0 },
        recentTransactions: prev?.recentTransactions || [],
        categoryData: prev?.categoryData || [],
        userStatsDaily: prev?.userStatsDaily || [],
        groupStatsDaily: prev?.groupStatsDaily || []
      }))
    } catch (err) {
      console.error('Error fetching users:', err)
      setError('Failed to load users')
    }
  }, [])

  // Fetch groups
  const fetchGroups = useCallback(async (page = 1, limit = 10) => {
    try {
      const response = await fetch(`/api/admin/groups?page=${page}&limit=${limit}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('Please log in to access the admin dashboard')
          return
        }
        if (response.status === 403) {
          setError('You need admin privileges to access this dashboard')
          return
        }
        throw new Error(`Failed to fetch groups: ${response.status}`)
      }
      
      const groupsData = await response.json()
      
      setData(prev => ({
        systemStats: prev?.systemStats || {
          totalUsers: 0,
          totalGroups: 0,
          totalTransactions: 0,
          totalRevenue: 0,
          userGrowth: 0,
          groupGrowth: 0,
          transactionGrowth: 0,
          revenueGrowth: 0
        },
        users: prev?.users || [],
        groups: groupsData.groups || [],
        userPagination: prev?.userPagination || { page: 1, limit: 10, total: 0, totalPages: 0 },
        groupPagination: groupsData.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 },
        recentTransactions: prev?.recentTransactions || [],
        categoryData: prev?.categoryData || [],
        userStatsDaily: prev?.userStatsDaily || [],
        groupStatsDaily: prev?.groupStatsDaily || []
      }))
    } catch (err) {
      console.error('Error fetching groups:', err)
      setError('Failed to load groups')
    }
  }, [])

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        await Promise.all([
          fetchSystemStats(),
          fetchUsers(),
          fetchGroups()
        ])
      } catch (err) {
        console.error('Error loading data:', err)
        setError('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [fetchSystemStats, fetchUsers, fetchGroups])

  // Refresh data when date range changes
  useEffect(() => {
    if (dateRange !== 'custom') {
      fetchSystemStats()
    }
  }, [dateRange, fetchSystemStats])

  // Chart data processing
  const chartData = useMemo(() => {
    if (!data?.userStatsDaily || !data?.groupStatsDaily) return []
    
    return data.userStatsDaily.map((userStat, index) => ({
      date: new Date(userStat.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      users: userStat.new_users || 0,
      groups: data.groupStatsDaily[index]?.new_groups || 0,
      transactions: userStat.new_transactions || 0
    }))
  }, [data?.userStatsDaily, data?.groupStatsDaily])

  const pieData = useMemo(() => {
    if (!data?.categoryData) return []
    
    return data.categoryData.map((item, index) => ({
      name: item.category,
      value: item.amount,
      color: index === 0 ? 'hsl(var(--success))' : 
             index === 1 ? 'hsl(var(--destructive))' : 
             index === 2 ? 'hsl(var(--primary))' : 
             index === 3 ? 'hsl(var(--warning))' : 'hsl(var(--muted))'
    }))
  }, [data?.categoryData])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground animate-pulse">
          Loading admin dashboard...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-destructive">
          {error}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">
          No data available
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-scale-in">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor system performance, users, and financial metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TimePeriodSelector 
            selected={dateRange}
            onSelect={setDateRange}
          />
          <button 
            onClick={() => fetchSystemStats()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-200 hover:scale-105 hover:shadow-lg animate-pulse-glow"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Custom Date Range Inputs */}
      {dateRange === 'custom' && (
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <label className="text-sm font-medium">From:</label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-3 py-1 border border-border rounded-md text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">To:</label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-3 py-1 border border-border rounded-md text-sm"
            />
          </div>
          <button
            onClick={() => fetchSystemStats()}
            className="px-3 py-1 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition-colors"
          >
            Apply Filter
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-muted/50 rounded-lg p-1 animate-fade-in">
        {[
          { id: 'overview', label: 'Overview', icon: Activity },
          { id: 'users', label: 'Users', icon: Users },
          { id: 'groups', label: 'Groups', icon: UsersIcon },
          { id: 'transactions', label: 'Transactions', icon: DollarSign }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              activeTab === id
                ? 'bg-primary text-primary-foreground shadow-soft'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {[
              {
                title: "Total Users",
                value: data.systemStats.totalUsers.toLocaleString(),
                change: `+${data.systemStats.userGrowth}%`,
                trend: "up" as const,
                icon: Users,
              },
              {
                title: "Total Groups", 
                value: data.systemStats.totalGroups.toLocaleString(),
                change: `+${data.systemStats.groupGrowth}%`,
                trend: "up" as const,
                icon: UsersIcon,
              },
              {
                title: "Total Revenue",
                value: formatCurrency(data.systemStats.totalRevenue),
                change: `+${data.systemStats.revenueGrowth}%`,
                trend: "up" as const,
                icon: DollarSign,
              },
              {
                title: "Transactions",
                value: data.systemStats.totalTransactions.toLocaleString(),
                change: `+${data.systemStats.transactionGrowth}%`,
                trend: "up" as const,
                icon: Activity,
              },
              {
                title: "Daily Average",
                value: formatCurrency(data.systemStats.totalRevenue / 30),
                change: "+12.5%",
                trend: "up" as const,
                icon: TrendingUp,
              },
              {
                title: "Growth Rate",
                value: `${data.systemStats.userGrowth}%`,
                change: "This month",
                trend: "up" as const,
                icon: TrendingUp,
              },
            ].map((metric, index) => (
              <div 
                key={metric.title}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <MetricCard {...metric} />
              </div>
            ))}
          </div>

          {/* Charts Section */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* User Growth Chart */}
            <div className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <div className="bg-card border border-border rounded-lg p-6 shadow-elegant hover:shadow-lg transition-all duration-300 group">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">User Growth Trends</h3>
                  <p className="text-sm text-muted-foreground">Daily new users and groups ({dateRange} view)</p>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)"
                      }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="users" 
                      stroke="hsl(var(--success))" 
                      strokeWidth={2}
                      name="New Users"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="groups" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      name="New Groups"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Financial Overview */}
            <div className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <div className="bg-card border border-border rounded-lg p-6 shadow-elegant hover:shadow-lg transition-all duration-300 group">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">Financial Overview</h3>
                  <p className="text-sm text-muted-foreground">Transaction volume trends ({dateRange})</p>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.slice(-6)}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)"
                      }} 
                    />
                    <Bar 
                      dataKey="transactions" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                      name="Transactions"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Category Distribution */}
          <div className="animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <div className="bg-card border border-border rounded-lg p-6 shadow-elegant hover:shadow-lg transition-all duration-300 group">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">Category Distribution</h3>
                <p className="text-sm text-muted-foreground">Breakdown of transaction categories</p>
              </div>
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(1)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), ""]}
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)"
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">User Management</h2>
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-200 hover:scale-105">
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </button>
          </div>
          
          <div className="bg-card border border-border rounded-lg shadow-elegant">
            <div className="p-6">
              <div className="grid gap-4">
                {data.users.map((user, index) => (
                  <div 
                    key={user.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors animate-fade-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                        <span className="text-primary-foreground font-semibold">
                          {user.first_name?.[0] || user.email[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {user.first_name} {user.last_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin' 
                          ? 'bg-primary/10 text-primary' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {user.role}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Groups Tab */}
      {activeTab === 'groups' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">Group Management</h2>
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-200 hover:scale-105">
              <Plus className="w-4 h-4 mr-2" />
              Create Group
            </button>
          </div>
          
          <div className="bg-card border border-border rounded-lg shadow-elegant">
            <div className="p-6">
              <div className="grid gap-4">
                {data.groups.map((group, index) => (
                  <div 
                    key={group.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors animate-fade-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                        <span className="text-primary-foreground font-semibold">
                          {group.name[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{group.name}</h3>
                        <p className="text-sm text-muted-foreground">{group.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">
                          {group.member_count} members
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(group.contribution_amount)}/{group.contribution_frequency}
                        </p>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(group.created_at).toLocaleDateString()}
                      </span>
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
            <h2 className="text-2xl font-bold text-foreground">Transaction Management</h2>
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </button>
              <button className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
            </div>
          </div>
          
          {/* Transaction Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="bg-card border border-border rounded-lg p-6 shadow-elegant hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Income</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(data.systemStats.totalRevenue)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-card border border-border rounded-lg p-6 shadow-elegant hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Expenses</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(data.systemStats.totalRevenue * 0.3)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-card border border-border rounded-lg p-6 shadow-elegant hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Net Profit</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(data.systemStats.totalRevenue * 0.7)}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Recent Transactions */}
          <div className="bg-card border border-border rounded-lg shadow-elegant">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Recent Transactions</h3>
              <div className="space-y-3">
                {data.recentTransactions.slice(0, 10).map((transaction, index) => (
                  <div 
                    key={transaction.id || index}
                    className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors animate-fade-in"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        transaction.type === 'income' 
                          ? 'bg-success/10' 
                          : 'bg-destructive/10'
                      }`}>
                        {transaction.type === 'income' ? (
                          <TrendingUp className="w-4 h-4 text-success" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-destructive" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">{transaction.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        transaction.type === 'income' ? 'text-success' : 'text-destructive'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(transaction.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}