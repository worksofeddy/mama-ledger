'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  Clock, 
  CheckCircle, 
  XCircle,
  DollarSign,
  Calendar,
  User,
  Building
} from 'lucide-react'
import LoanDetailModal from '../../components/loans/LoanDetailModal'

interface Loan {
  id: string
  group_id: string
  borrower_id: string
  amount: number
  interest_rate: number
  total_amount: number
  purpose: string
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'completed' | 'defaulted'
  approved_by?: string
  approved_at?: string
  disbursement_date?: string
  due_date: string
  repayment_schedule: string
  created_at: string
  updated_at: string
  // Joined data
  group?: {
    name: string
    description: string
    interest_rate: number
  }
  borrower?: {
    email: string
    user_profiles?: {
      first_name: string
      last_name: string
    }
  }
  approver?: {
    email: string
    user_profiles?: {
      first_name: string
      last_name: string
    }
  }
}

interface Group {
  id: string
  name: string
  description: string
  contribution_amount: number
  interest_rate: number
  max_members: number
  is_private: boolean
  created_at: string
}

interface GroupMember {
  user_id: string
  role: string
  joined_at: string
  is_active: boolean
  users: {
    email: string
    user_profiles?: {
      first_name: string
      last_name: string
    }
  }
}

export default function LoansPage() {
  const [user, setUser] = useState<any>(null)
  const [loans, setLoans] = useState<Loan[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([])
  const [userRoles, setUserRoles] = useState<{[groupId: string]: string}>({})
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null)
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Form states
  const [selectedGroup, setSelectedGroup] = useState('')
  const [amount, setAmount] = useState('')
  const [purpose, setPurpose] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [repaymentSchedule, setRepaymentSchedule] = useState('monthly')
  const [selectedBorrower, setSelectedBorrower] = useState('')
  const [autoApprove, setAutoApprove] = useState(false)
  
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user?.id) {
      fetchLoans()
      fetchGroups()
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

  const fetchLoans = async () => {
    try {
      setLoading(true)
      
      // Get user's groups first
      const { data: userGroups, error: groupsError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (groupsError) throw groupsError

      const groupIds = userGroups?.map(g => g.group_id) || []

      if (groupIds.length === 0) {
        setLoans([])
        return
      }

      // Fetch loans for user's groups
      const { data, error } = await supabase
        .from('loans')
        .select(`
          *,
          group:groups(name),
          borrower:borrower_id(email, user_profiles(first_name, last_name)),
          approver:approved_by(email, user_profiles(first_name, last_name))
        `)
        .in('group_id', groupIds)
        .order('created_at', { ascending: false })

      if (error) throw error
      setLoans(data || [])
    } catch (err) {
      console.error('Error fetching loans:', err)
      setError('Failed to fetch loans')
    } finally {
      setLoading(false)
    }
  }

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          group_id,
          role,
          groups(*)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (error) throw error
      
      const userGroups = data?.map(item => item.groups).filter(Boolean) as unknown as Group[] || []
      const roles: {[groupId: string]: string} = {}
      
      data?.forEach(item => {
        roles[item.group_id] = item.role
      })
      
      setGroups(userGroups)
      setUserRoles(roles)
    } catch (err) {
      console.error('Error fetching groups:', err)
    }
  }

  const fetchGroupMembers = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          user_id,
          role,
          joined_at,
          is_active,
          users (
            email,
            user_profiles (
              first_name,
              last_name
            )
          )
        `)
        .eq('group_id', groupId)
        .eq('is_active', true)

      if (error) throw error
      setGroupMembers((data as unknown as GroupMember[]) || [])
    } catch (err) {
      console.error('Error fetching group members:', err)
    }
  }

  const handleAddLoan = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    if (!selectedGroup || !amount || !dueDate) {
      setError('Please fill in all required fields')
      setSaving(false)
      return
    }

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        setSaving(false)
        return
      }

      // Prepare loan data
      const loanData: any = {
        group_id: selectedGroup,
        amount: parseFloat(amount),
        purpose,
        due_date: dueDate,
        repayment_schedule: repaymentSchedule
      }

      // Determine borrower and auto-approve settings
      const userRole = userRoles[selectedGroup]
      const isAdminOrTreasurer = userRole === 'admin' || userRole === 'treasurer'
      
      if (isAdminOrTreasurer && selectedBorrower) {
        // Admin/treasurer creating loan for another member
        loanData.borrower_id = selectedBorrower
        loanData.auto_approve = autoApprove
      } else {
        // Regular user requesting loan for themselves
        loanData.borrower_id = user.id
      }

      // Make API call to create loan
      const response = await fetch(`/api/groups/${selectedGroup}/loans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(loanData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create loan')
      }

      // Refresh loans list
      await fetchLoans()
      
      // Reset form
      setSelectedGroup('')
      setAmount('')
      setPurpose('')
      setDueDate('')
      setRepaymentSchedule('monthly')
      setSelectedBorrower('')
      setAutoApprove(false)
      setGroupMembers([])
      setShowAddForm(false)
    } catch (err: any) {
      console.error('Error creating loan:', err)
      setError(err.message || 'Failed to create loan request')
    } finally {
      setSaving(false)
    }
  }

  const handleViewLoan = (loan: Loan) => {
    setSelectedLoan(loan)
    setShowDetailModal(true)
  }

  const handleCloseDetailModal = () => {
    setShowDetailModal(false)
    setSelectedLoan(null)
  }

  const handleLoanUpdate = () => {
    fetchLoans()
  }

  const handleGroupChange = (groupId: string) => {
    setSelectedGroup(groupId)
    setSelectedBorrower('')
    setAutoApprove(false)
    
    // Fetch group members if user is admin/treasurer
    const userRole = userRoles[groupId]
    if (userRole === 'admin' || userRole === 'treasurer') {
      fetchGroupMembers(groupId)
    } else {
      setGroupMembers([])
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'active':
        return <DollarSign className="w-4 h-4 text-blue-500" />
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'defaulted':
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'active':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'defaulted':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredLoans = loans.filter(loan => {
    const matchesStatus = filterStatus === 'all' || loan.status === filterStatus
    const matchesSearch = searchTerm === '' || 
      loan.purpose?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.group?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.borrower?.user_profiles?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.borrower?.user_profiles?.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesStatus && matchesSearch
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading loans...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Loan Management</h1>
              <p className="mt-2 text-gray-600">Manage group loans and applications</p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {Object.values(userRoles).some(role => role === 'admin' || role === 'treasurer') 
                ? 'Create Loan' 
                : 'Request Loan'
              }
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search loans..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="defaulted">Defaulted</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Loans List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {filteredLoans.length === 0 ? (
            <div className="text-center py-12">
              <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No loans found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || filterStatus !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Start by requesting a loan from one of your groups.'
                }
              </p>
              {!searchTerm && filterStatus === 'all' && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Request Your First Loan
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Loan Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Group
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Borrower
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLoans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {loan.purpose || 'No purpose specified'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {loan.repayment_schedule} payments
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {loan.group?.name || 'Unknown Group'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {loan.borrower?.user_profiles?.first_name} {loan.borrower?.user_profiles?.last_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {loan.borrower?.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          KES {loan.amount.toLocaleString()}
                        </div>
                        {loan.interest_rate > 0 && (
                          <div className="text-sm text-gray-500">
                            +{loan.interest_rate}% interest
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(loan.status)}`}>
                          {getStatusIcon(loan.status)}
                          {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(loan.due_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewLoan(loan)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="View loan details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add Loan Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {Object.values(userRoles).some(role => role === 'admin' || role === 'treasurer') 
                  ? 'Create New Loan' 
                  : 'Request New Loan'
                }
              </h2>
              
              <form onSubmit={handleAddLoan} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Group *
                  </label>
                  <select
                    value={selectedGroup}
                    onChange={(e) => handleGroupChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a group</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name} ({userRoles[group.id]})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Borrower selection for admin/treasurer */}
                {selectedGroup && userRoles[selectedGroup] && (userRoles[selectedGroup] === 'admin' || userRoles[selectedGroup] === 'treasurer') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Borrower
                    </label>
                    <select
                      value={selectedBorrower}
                      onChange={(e) => setSelectedBorrower(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">Select borrower (leave empty for self)</option>
                      {groupMembers.map((member) => (
                        <option key={member.user_id} value={member.user_id}>
                          {member.users.user_profiles?.first_name} {member.users.user_profiles?.last_name} ({member.users.email})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loan Amount (KES) *
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter loan amount"
                    required
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Purpose
                  </label>
                  <input
                    type="text"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="What is this loan for?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Repayment Schedule
                  </label>
                  <select
                    value={repaymentSchedule}
                    onChange={(e) => setRepaymentSchedule(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="lump_sum">Lump Sum</option>
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>

                {/* Auto-approve checkbox for admin/treasurer */}
                {selectedGroup && userRoles[selectedGroup] && (userRoles[selectedGroup] === 'admin' || userRoles[selectedGroup] === 'treasurer') && selectedBorrower && (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="autoApprove"
                      checked={autoApprove}
                      onChange={(e) => setAutoApprove(e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="autoApprove" className="ml-2 block text-sm text-gray-700">
                      Auto-approve this loan
                    </label>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {saving 
                      ? (Object.values(userRoles).some(role => role === 'admin' || role === 'treasurer') ? 'Creating...' : 'Requesting...')
                      : (Object.values(userRoles).some(role => role === 'admin' || role === 'treasurer') ? 'Create Loan' : 'Request Loan')
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Loan Detail Modal */}
        {selectedLoan && (
          <LoanDetailModal
            loan={selectedLoan}
            isOpen={showDetailModal}
            onClose={handleCloseDetailModal}
            onUpdate={handleLoanUpdate}
            currentUserId={user?.id}
          />
        )}
      </div>
    </div>
  )
}
