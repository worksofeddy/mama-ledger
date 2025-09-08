'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { 
  X, 
  Clock, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  Calendar, 
  User, 
  Building,
  CreditCard,
  TrendingUp,
  AlertCircle,
  Plus
} from 'lucide-react'
import LoanPaymentModal from './LoanPaymentModal'

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

interface LoanPayment {
  id: string
  loan_id: string
  amount: number
  due_date: string
  paid_date?: string
  payment_status: 'pending' | 'paid' | 'late' | 'defaulted'
  penalty_amount: number
  created_at: string
}

interface LoanDetailModalProps {
  loan: Loan
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
  currentUserId: string
}

export default function LoanDetailModal({ 
  loan, 
  isOpen, 
  onClose, 
  onUpdate, 
  currentUserId 
}: LoanDetailModalProps) {
  const [payments, setPayments] = useState<LoanPayment[]>([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<LoanPayment | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  useEffect(() => {
    if (isOpen && loan.id) {
      fetchPayments()
    }
  }, [isOpen, loan.id])

  const fetchPayments = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('loan_payments')
        .select('*')
        .eq('loan_id', loan.id)
        .order('due_date', { ascending: true })

      if (error) throw error
      setPayments(data || [])
    } catch (err) {
      console.error('Error fetching payments:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    try {
      setActionLoading(true)
      const { error } = await supabase
        .from('loans')
        .update({
          status: 'approved',
          approved_by: currentUserId,
          approved_at: new Date().toISOString(),
          disbursement_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', loan.id)

      if (error) throw error

      // Create payment schedule
      await createPaymentSchedule()
      
      onUpdate()
      onClose()
    } catch (err) {
      console.error('Error approving loan:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    try {
      setActionLoading(true)
      const { error } = await supabase
        .from('loans')
        .update({
          status: 'rejected',
          approved_by: currentUserId,
          approved_at: new Date().toISOString()
        })
        .eq('id', loan.id)

      if (error) throw error

      onUpdate()
      onClose()
    } catch (err) {
      console.error('Error rejecting loan:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const createPaymentSchedule = async () => {
    try {
      const { error } = await supabase.rpc('create_loan_payment_schedule', {
        p_loan_id: loan.id,
        p_total_amount: loan.total_amount,
        p_due_date: loan.due_date,
        p_schedule: loan.repayment_schedule
      })

      if (error) throw error
    } catch (err) {
      console.error('Error creating payment schedule:', err)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'active':
        return <DollarSign className="w-5 h-5 text-blue-500" />
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'defaulted':
        return <XCircle className="w-5 h-5 text-red-600" />
      default:
        return <Clock className="w-5 h-5 text-gray-500" />
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

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'late':
        return 'bg-orange-100 text-orange-800'
      case 'defaulted':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const canApprove = loan.status === 'pending' && currentUserId !== loan.borrower_id
  const canReject = loan.status === 'pending' && currentUserId !== loan.borrower_id
  const canRecordPayment = loan.status === 'active' && currentUserId !== loan.borrower_id

  const handleRecordPayment = (payment: LoanPayment) => {
    setSelectedPayment(payment)
    setShowPaymentModal(true)
  }

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false)
    setSelectedPayment(null)
  }

  const handlePaymentUpdate = () => {
    fetchPayments()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Loan Details</h2>
            <p className="text-gray-600">Loan ID: {loan.id.slice(0, 8)}...</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Loan Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Loan Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Principal Amount</p>
                      <p className="font-semibold text-gray-900">KES {loan.amount.toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Interest Rate</p>
                      <p className="font-semibold text-gray-900">{loan.interest_rate}%</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Total Amount</p>
                      <p className="font-semibold text-gray-900">KES {loan.total_amount.toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Due Date</p>
                      <p className="font-semibold text-gray-900">
                        {new Date(loan.due_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Status & Details</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(loan.status)}`}>
                      {getStatusIcon(loan.status)}
                      {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Building className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Group</p>
                      <p className="font-semibold text-gray-900">{loan.group?.name || 'Unknown'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Borrower</p>
                      <p className="font-semibold text-gray-900">
                        {loan.borrower?.user_profiles?.first_name && loan.borrower?.user_profiles?.last_name 
                          ? `${loan.borrower.user_profiles.first_name} ${loan.borrower.user_profiles.last_name}`
                          : loan.borrower_id}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Repayment Schedule</p>
                      <p className="font-semibold text-gray-900 capitalize">
                        {loan.repayment_schedule.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Purpose */}
          {loan.purpose && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Purpose</h3>
              <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{loan.purpose}</p>
            </div>
          )}

          {/* Payment Schedule */}
          {payments.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Payment Schedule</h3>
                {canRecordPayment && (
                  <button
                    onClick={() => {
                      const pendingPayment = payments.find(p => p.payment_status === 'pending')
                      if (pendingPayment) {
                        handleRecordPayment(pendingPayment)
                      }
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-lg text-sm flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Record Payment
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Due Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Paid Date
                      </th>
                      {canRecordPayment && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(payment.due_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          KES {payment.amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusColor(payment.payment_status)}`}>
                            {payment.payment_status.charAt(0).toUpperCase() + payment.payment_status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payment.paid_date ? new Date(payment.paid_date).toLocaleDateString() : '-'}
                        </td>
                        {canRecordPayment && (
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                            {payment.payment_status === 'pending' && (
                              <button
                                onClick={() => handleRecordPayment(payment)}
                                className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1"
                              >
                                <CreditCard className="w-4 h-4" />
                                Record
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Approval Actions */}
          {(canApprove || canReject) && (
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              {canApprove && (
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  {actionLoading ? 'Approving...' : 'Approve Loan'}
                </button>
              )}
              {canReject && (
                <button
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  {actionLoading ? 'Rejecting...' : 'Reject Loan'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Payment Modal */}
        {selectedPayment && (
          <LoanPaymentModal
            payment={selectedPayment}
            isOpen={showPaymentModal}
            onClose={handleClosePaymentModal}
            onUpdate={handlePaymentUpdate}
          />
        )}
      </div>
    </div>
  )
}
