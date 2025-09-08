'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { Plus, AlertCircle, RefreshCw } from 'lucide-react'
import { Loan, LoanFormData } from '../../types/loans'
import { useLoans } from '../../hooks/useLoans'
import LoanForm from '../../components/loans/LoanForm'
import LoanList from '../../components/loans/LoanList'
import LoanDetailModal from '../../components/loans/LoanDetailModal'

export default function LoansPage() {
  const [user, setUser] = useState<any>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const router = useRouter()

  // Use the custom hook for loan management
  const {
    loans,
    groups,
    groupMembers,
    userRoles,
    loading,
    saving,
    error,
    createLoan,
    deleteLoan,
    approveLoan,
    editLoan,
    fetchGroupMembers,
    refreshData,
    filters,
    setFilters,
    filteredLoans
  } = useLoans(user?.id)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
    } else {
      setUser(session.user)
    }
  }

  const handleCreateLoan = async (formData: LoanFormData): Promise<boolean> => {
    return await createLoan(formData)
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
    refreshData()
  }

  const handleGroupChange = (groupId: string) => {
    fetchGroupMembers(groupId)
  }

  const handleDeleteLoan = async (loanId: string) => {
    if (confirm('Are you sure you want to delete this loan? This action cannot be undone.')) {
      const success = await deleteLoan(loanId)
      if (success) {
        // Loan deleted successfully, data will be refreshed automatically
      }
    }
  }

  const handleApproveLoan = async (loanId: string) => {
    if (confirm('Are you sure you want to approve this loan?')) {
      const success = await approveLoan(loanId)
      if (success) {
        // Loan approved successfully, data will be refreshed automatically
      }
    }
  }

  const handleEditLoan = (loan: Loan) => {
    // For now, we'll just show an alert. In a real app, you'd open an edit modal
    alert(`Edit loan functionality for loan: ${loan.id}\nThis would open an edit form with pre-filled data.`)
  }

  const handleRefresh = () => {
    refreshData()
  }

  const handleCloseForm = () => {
    setShowAddForm(false)
  }

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Loans</h1>
          <p className="text-gray-600 mt-1">
            Manage your loan requests and track repayments
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Request Loan
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
            <div className="text-sm text-red-700">
              <strong>Error:</strong> {error}
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">T</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Loans</p>
              <p className="text-2xl font-semibold text-gray-900">{loans.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <span className="text-yellow-600 font-semibold text-sm">P</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-2xl font-semibold text-gray-900">
                {loans.filter(loan => loan.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 font-semibold text-sm">A</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active</p>
              <p className="text-2xl font-semibold text-gray-900">
                {loans.filter(loan => loan.status === 'active').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 font-semibold text-sm">C</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-2xl font-semibold text-gray-900">
                {loans.filter(loan => loan.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Loan List */}
      <LoanList
        loans={filteredLoans}
        loading={loading}
        filters={filters}
        onFiltersChange={setFilters}
        onViewLoan={handleViewLoan}
        onDeleteLoan={handleDeleteLoan}
        onApproveLoan={handleApproveLoan}
        onEditLoan={handleEditLoan}
        userRoles={userRoles}
        currentUserId={user?.id || ''}
      />
      

      {/* Loan Form Modal */}
      <LoanForm
        isOpen={showAddForm}
        onClose={handleCloseForm}
        onSubmit={handleCreateLoan}
        groups={groups}
        groupMembers={groupMembers}
        userRoles={userRoles}
        onGroupChange={handleGroupChange}
        loading={saving}
      />

      {/* Loan Detail Modal */}
      {selectedLoan && (
        <LoanDetailModal
          loan={selectedLoan}
          isOpen={showDetailModal}
          onClose={handleCloseDetailModal}
          onUpdate={handleLoanUpdate}
          currentUserId={user?.id || ''}
        />
      )}
    </div>
  )
}