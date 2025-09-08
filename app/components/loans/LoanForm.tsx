'use client'

import { useState, useEffect } from 'react'
import { X, User, Building, DollarSign, Calendar, FileText, Clock } from 'lucide-react'
import { LoanFormData, Group, GroupMember, GroupRole } from '../../types/loans'

interface LoanFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (formData: LoanFormData) => Promise<boolean>
  groups: Group[]
  groupMembers: GroupMember[]
  userRoles: { [groupId: string]: string }
  onGroupChange: (groupId: string) => void
  loading?: boolean
}

export default function LoanForm({
  isOpen,
  onClose,
  onSubmit,
  groups,
  groupMembers,
  userRoles,
  onGroupChange,
  loading = false
}: LoanFormProps) {
  const [formData, setFormData] = useState<LoanFormData>({
    selectedGroup: '',
    amount: '',
    purpose: '',
    dueDate: '',
    repaymentSchedule: 'monthly',
    selectedBorrower: '',
    autoApprove: false
  })

  const [errors, setErrors] = useState<Partial<LoanFormData>>({})

  // Set default due date to 30 days from now
  useEffect(() => {
    if (isOpen && !formData.dueDate) {
      const defaultDate = new Date()
      defaultDate.setMonth(defaultDate.getMonth() + 1)
      setFormData(prev => ({
        ...prev,
        dueDate: defaultDate.toISOString().split('T')[0]
      }))
    }
  }, [isOpen, formData.dueDate])

  const handleInputChange = (field: keyof LoanFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleGroupChange = (groupId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedGroup: groupId,
      selectedBorrower: '',
      autoApprove: false
    }))
    onGroupChange(groupId)
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<LoanFormData> = {}

    if (!formData.selectedGroup) newErrors.selectedGroup = 'Please select a group'
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount'
    }
    if (!formData.purpose.trim()) newErrors.purpose = 'Please enter a purpose'
    if (!formData.dueDate) newErrors.dueDate = 'Please select a due date'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    const success = await onSubmit(formData)
    if (success) {
      // Reset form
      setFormData({
        selectedGroup: '',
        amount: '',
        purpose: '',
        dueDate: '',
        repaymentSchedule: 'monthly',
        selectedBorrower: '',
        autoApprove: false
      })
      setErrors({})
      onClose()
    }
  }

  const selectedGroup = groups.find(g => g.id === formData.selectedGroup)
  const userRole = userRoles[formData.selectedGroup] as GroupRole
  const isAdminOrTreasurer = userRole === 'admin' || userRole === 'treasurer'

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            {isAdminOrTreasurer ? 'Create Loan' : 'Request Loan'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Group Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Building className="w-4 h-4 inline mr-1" />
              Group *
            </label>
            <select
              value={formData.selectedGroup}
              onChange={(e) => handleGroupChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                errors.selectedGroup ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select a group</option>
              {groups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.name} ({userRoles[group.id]})
                </option>
              ))}
            </select>
            {errors.selectedGroup && (
              <p className="mt-1 text-sm text-red-600">{errors.selectedGroup}</p>
            )}
          </div>

          {/* Borrower Selection (Admin/Treasurer only) */}
          {isAdminOrTreasurer && formData.selectedGroup && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Borrower
              </label>
              <select
                value={formData.selectedBorrower}
                onChange={(e) => handleInputChange('selectedBorrower', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select a borrower (leave empty for self)</option>
                {groupMembers.map(member => (
                  <option key={member.user_id} value={member.user_id}>
                    Member {member.user_id.slice(0, 8)} ({member.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="w-4 h-4 inline mr-1" />
              Amount (KSh) *
            </label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              placeholder="Enter loan amount"
              min="1"
              step="0.01"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                errors.amount ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.amount && (
              <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
            )}
          </div>

          {/* Purpose */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Purpose *
            </label>
            <textarea
              value={formData.purpose}
              onChange={(e) => handleInputChange('purpose', e.target.value)}
              placeholder="Describe the purpose of this loan"
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                errors.purpose ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.purpose && (
              <p className="mt-1 text-sm text-red-600">{errors.purpose}</p>
            )}
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Due Date *
            </label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => handleInputChange('dueDate', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                errors.dueDate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.dueDate && (
              <p className="mt-1 text-sm text-red-600">{errors.dueDate}</p>
            )}
          </div>

          {/* Repayment Schedule */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              Repayment Schedule
            </label>
            <select
              value={formData.repaymentSchedule}
              onChange={(e) => handleInputChange('repaymentSchedule', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annually">Annually</option>
            </select>
          </div>

          {/* Auto-approve (Admin/Treasurer only) */}
          {isAdminOrTreasurer && formData.selectedBorrower && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoApprove"
                checked={formData.autoApprove}
                onChange={(e) => handleInputChange('autoApprove', e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="autoApprove" className="ml-2 block text-sm text-gray-900">
                Auto-approve this loan
              </label>
            </div>
          )}

          {/* Group Interest Rate Info */}
          {selectedGroup && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Group Information</h4>
              <p className="text-sm text-blue-700">
                Interest Rate: {selectedGroup.interest_rate}% | 
                Contribution: KSh {selectedGroup.contribution_amount.toLocaleString()}
              </p>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : (isAdminOrTreasurer ? 'Create Loan' : 'Request Loan')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
