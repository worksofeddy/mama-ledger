'use client'

import { useState, useMemo } from 'react'
import { 
  Search, 
  Filter, 
  Eye, 
  Clock, 
  CheckCircle, 
  XCircle,
  DollarSign,
  Calendar,
  Building,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react'
import { Loan, LoanFilters, LoanStatus } from '../../types/loans'
import { formatCurrency } from '../../lib/utils'

interface PaginationState {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface LoanListPaginatedProps {
  loans: Loan[]
  loading: boolean
  pagination: PaginationState
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
  filters: LoanFilters
  onFiltersChange: (filters: LoanFilters) => void
  searchTerm: string
  onSearchChange: (term: string) => void
  onViewLoan: (loan: Loan) => void
  onDeleteLoan: (loanId: string) => void
  onApproveLoan: (loanId: string) => void
  onEditLoan: (loan: Loan) => void
  userRoles: { [groupId: string]: string }
  currentUserId: string
}

export default function LoanListPaginated({
  loans,
  loading,
  pagination,
  onPageChange,
  onLimitChange,
  filters,
  onFiltersChange,
  searchTerm,
  onSearchChange,
  onViewLoan,
  onDeleteLoan,
  onApproveLoan,
  onEditLoan,
  userRoles,
  currentUserId
}: LoanListPaginatedProps) {
  const [showFilters, setShowFilters] = useState(false)

  const getStatusIcon = (status: LoanStatus) => {
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

  const getStatusColor = (status: LoanStatus) => {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // Pagination helpers
  const startItem = (pagination.page - 1) * pagination.limit + 1
  const endItem = Math.min(pagination.page * pagination.limit, pagination.total)
  
  const getPageNumbers = () => {
    const pages = []
    const { page, totalPages } = pagination
    
    // Always show first page
    if (page > 3) {
      pages.push(1)
      if (page > 4) pages.push('...')
    }
    
    // Show pages around current page
    const start = Math.max(1, page - 2)
    const end = Math.min(totalPages, page + 2)
    
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    
    // Always show last page
    if (page < totalPages - 2) {
      if (page < totalPages - 3) pages.push('...')
      pages.push(totalPages)
    }
    
    return pages
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Loan Requests</h3>
            <p className="text-sm text-gray-500">
              Showing {startItem}-{endItem} of {pagination.total.toLocaleString()} loans
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search loans..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm w-64"
              />
            </div>
            
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="w-4 h-4 mr-1" />
              Filter
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Status:</label>
              <select
                value={filters.status}
                onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="defaulted">Defaulted</option>
              </select>
              
              <label className="text-sm font-medium text-gray-700">Per page:</label>
              <select
                value={pagination.limit}
                onChange={(e) => onLimitChange(Number(e.target.value))}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Loan List */}
      <div className="overflow-x-auto">
        {loans.length === 0 ? (
          <div className="p-6 text-center">
            <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No loans found</h3>
            <p className="text-gray-500">
              {filters.status !== 'all' || searchTerm 
                ? 'No loans match your current filters.' 
                : 'You haven\'t requested any loans yet.'}
            </p>
          </div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Loan Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Borrower
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Group
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
                {loans.map((loan) => {
                  const daysUntilDue = getDaysUntilDue(loan.due_date)
                  const isOverdue = daysUntilDue < 0 && loan.status === 'active'
                  
                  return (
                    <tr key={loan.id} className="hover:bg-gray-50">
                      {/* Loan Details */}
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(loan.amount)}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {loan.purpose}
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatDate(loan.created_at)}
                        </div>
                      </td>

                      {/* Borrower */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {loan.borrower?.user_profiles?.first_name ? (
                            `${loan.borrower.user_profiles.first_name} ${loan.borrower.user_profiles.last_name}`
                          ) : (
                            'Loading...'
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {loan.borrower?.user_profiles?.first_name && loan.borrower?.user_profiles?.last_name 
                            ? `${loan.borrower.user_profiles.first_name} ${loan.borrower.user_profiles.last_name}`
                            : loan.borrower_id}
                        </div>
                      </td>

                      {/* Group */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Building className="w-4 h-4 mr-1 text-gray-400" />
                          {loan.groups?.name || 'Unknown Group'}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(loan.amount)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Total: {formatCurrency(loan.total_amount)}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(loan.status)}
                          <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(loan.status)}`}>
                            {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                          </span>
                        </div>
                      </td>

                      {/* Due Date */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                          {formatDate(loan.due_date)}
                        </div>
                        {isOverdue && (
                          <div className="text-xs text-red-600 font-medium">
                            Overdue by {Math.abs(daysUntilDue)} days
                          </div>
                        )}
                        {!isOverdue && daysUntilDue <= 7 && loan.status === 'active' && (
                          <div className="text-xs text-yellow-600 font-medium">
                            Due in {daysUntilDue} days
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => onViewLoan(loan)}
                            className="text-indigo-600 hover:text-indigo-900 flex items-center"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </button>
                          
                          {/* Show edit/delete/approve buttons based on user role and loan status */}
                          {(() => {
                            const userRole = userRoles[loan.group_id]
                            const isAdminOrTreasurer = userRole === 'admin' || userRole === 'treasurer'
                            const isLoanOwner = loan.borrower_id === currentUserId
                            
                            return (
                              <>
                                {/* Edit button - only for pending loans */}
                                {loan.status === 'pending' && (isAdminOrTreasurer || isLoanOwner) && (
                                  <button
                                    onClick={() => onEditLoan(loan)}
                                    className="text-blue-600 hover:text-blue-900 flex items-center"
                                  >
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Edit
                                  </button>
                                )}
                                
                                {/* Approve button - only for admins/treasurers on pending loans */}
                                {loan.status === 'pending' && isAdminOrTreasurer && (
                                  <button
                                    onClick={() => onApproveLoan(loan.id)}
                                    className="text-green-600 hover:text-green-900 flex items-center"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Approve
                                  </button>
                                )}
                                
                                {/* Delete button - only for pending loans */}
                                {loan.status === 'pending' && (isAdminOrTreasurer || isLoanOwner) && (
                                  <button
                                    onClick={() => onDeleteLoan(loan.id)}
                                    className="text-red-600 hover:text-red-900 flex items-center"
                                  >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    Delete
                                  </button>
                                )}
                              </>
                            )
                          })()}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => onPageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => onPageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{startItem}</span> to{' '}
                      <span className="font-medium">{endItem}</span> of{' '}
                      <span className="font-medium">{pagination.total.toLocaleString()}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      {/* First page */}
                      <button
                        onClick={() => onPageChange(1)}
                        disabled={pagination.page === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronsLeft className="h-5 w-5" />
                      </button>
                      
                      {/* Previous page */}
                      <button
                        onClick={() => onPageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>

                      {/* Page numbers */}
                      {getPageNumbers().map((page, index) => (
                        <button
                          key={index}
                          onClick={() => typeof page === 'number' ? onPageChange(page) : undefined}
                          disabled={typeof page !== 'number'}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === pagination.page
                              ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          } ${typeof page !== 'number' ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                          {page}
                        </button>
                      ))}

                      {/* Next page */}
                      <button
                        onClick={() => onPageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
                        className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                      
                      {/* Last page */}
                      <button
                        onClick={() => onPageChange(pagination.totalPages)}
                        disabled={pagination.page === pagination.totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronsRight className="h-5 w-5" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
