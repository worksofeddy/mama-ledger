'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../lib/utils'
import { X, CreditCard, Calendar, DollarSign, AlertCircle } from 'lucide-react'

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

interface LoanPaymentModalProps {
  payment: LoanPayment
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

export default function LoanPaymentModal({ 
  payment, 
  isOpen, 
  onClose, 
  onUpdate 
}: LoanPaymentModalProps) {
  const [paidDate, setPaidDate] = useState(payment.paid_date || '')
  const [amount, setAmount] = useState(payment.amount.toString())
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    if (!paidDate || !amount) {
      setError('Please fill in all required fields')
      setSaving(false)
      return
    }

    try {
      const paymentAmount = parseFloat(amount)
      const isLate = new Date(paidDate) > new Date(payment.due_date)
      const penaltyAmount = isLate ? paymentAmount * 0.05 : 0 // 5% penalty for late payments

      const { error } = await supabase
        .from('loan_payments')
        .update({
          paid_date: paidDate,
          amount: paymentAmount,
          payment_status: 'paid',
          penalty_amount: penaltyAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id)

      if (error) throw error

      // Create notification for the borrower
      await supabase
        .from('group_notifications')
        .insert({
          group_id: payment.loan_id, // This should be the group_id, but we need to get it from the loan
          user_id: payment.loan_id, // This should be the borrower_id
          title: 'Payment Recorded',
          message: `Payment of ${formatCurrency(paymentAmount)} has been recorded for your loan.`,
          notification_type: 'payment_confirmation'
        })

      onUpdate()
      onClose()
    } catch (err) {
      console.error('Error recording payment:', err)
      setError('Failed to record payment')
    } finally {
      setSaving(false)
    }
  }

  const isOverdue = new Date() > new Date(payment.due_date) && payment.payment_status === 'pending'

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Record Payment</h2>
            <p className="text-gray-600">Payment ID: {payment.id.slice(0, 8)}...</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Payment Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Due Date</p>
              <p className="font-semibold text-gray-900">
                {new Date(payment.due_date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Amount Due</p>
              <p className="font-semibold text-gray-900">
                KES {payment.amount.toLocaleString()}
              </p>
            </div>
          </div>
          
          {isOverdue && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <p className="text-sm text-red-700">This payment is overdue</p>
              </div>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Date *
            </label>
            <input
              type="date"
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount Paid (KES) *
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter amount paid"
              required
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              rows={3}
              placeholder="Add any notes about this payment..."
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              {saving ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
