import { useState, useEffect } from 'react'
import { X, Save, AlertCircle } from 'lucide-react'
import { GroupFormData, GroupFormErrors } from '../../types/groups'

interface GroupFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (formData: GroupFormData) => Promise<{ success: boolean; error?: string }>
  initialData?: Partial<GroupFormData>
  loading?: boolean
  title?: string
}

export default function GroupForm({ 
  isOpen, 
  onClose, 
  onSubmit, 
  initialData, 
  loading = false,
  title = "Create New Group"
}: GroupFormProps) {
  const [formData, setFormData] = useState<GroupFormData>({
    name: '',
    description: '',
    contribution_amount: 0,
    contribution_frequency: 'weekly',
    interest_rate: 0,
    max_members: 20,
    is_private: true,
    ...initialData
  })

  const [errors, setErrors] = useState<GroupFormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when modal opens/closes or initialData changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        description: '',
        contribution_amount: 0,
        contribution_frequency: 'weekly',
        interest_rate: 0,
        max_members: 20,
        is_private: true,
        ...initialData
      })
      setErrors({})
    }
  }, [isOpen, initialData])

  const validateForm = (): boolean => {
    const newErrors: GroupFormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Group name is required'
    } else if (formData.name.length < 3) {
      newErrors.name = 'Group name must be at least 3 characters'
    }

    if (!formData.contribution_amount || formData.contribution_amount <= 0) {
      newErrors.contribution_amount = 'Contribution amount must be greater than 0'
    }

    if (!formData.contribution_frequency) {
      newErrors.contribution_frequency = 'Contribution frequency is required'
    }

    if (formData.interest_rate < 0 || formData.interest_rate > 100) {
      newErrors.interest_rate = 'Interest rate must be between 0 and 100'
    }

    if (!formData.max_members || formData.max_members < 2) {
      newErrors.max_members = 'Maximum members must be at least 2'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      const result = await onSubmit(formData)
      if (result.success) {
        onClose()
      }
    } catch (error) {
      console.error('Error submitting form:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof GroupFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field as keyof GroupFormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter group name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Describe your group's purpose and goals"
                  rows={3}
                />
              </div>
            </div>

            {/* Financial Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Financial Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contribution Amount *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-500">$</span>
                    <input
                      type="number"
                      value={formData.contribution_amount}
                      onChange={(e) => handleInputChange('contribution_amount', parseFloat(e.target.value) || 0)}
                      className={`w-full pl-8 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                        errors.contribution_amount ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="1000"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  {errors.contribution_amount && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.contribution_amount}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frequency *
                  </label>
                  <select
                    value={formData.contribution_frequency}
                    onChange={(e) => handleInputChange('contribution_frequency', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      errors.contribution_frequency ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  {errors.contribution_frequency && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.contribution_frequency}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Interest Rate (%)
                  </label>
                  <input
                    type="number"
                    value={formData.interest_rate}
                    onChange={(e) => handleInputChange('interest_rate', parseFloat(e.target.value) || 0)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      errors.interest_rate ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="5.0"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                  {errors.interest_rate && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.interest_rate}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Members *
                  </label>
                  <input
                    type="number"
                    value={formData.max_members}
                    onChange={(e) => handleInputChange('max_members', parseInt(e.target.value) || 0)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      errors.max_members ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="20"
                    min="2"
                    max="100"
                  />
                  {errors.max_members && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.max_members}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Privacy Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Privacy Settings</h3>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_private"
                  checked={formData.is_private}
                  onChange={(e) => handleInputChange('is_private', e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="is_private" className="ml-3 block text-sm text-gray-700">
                  Private group (invite only)
                </label>
              </div>
              <p className="text-sm text-gray-500">
                Private groups require invitations to join. Public groups can be discovered and joined by anyone.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
              >
                {isSubmitting || loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {initialData ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {initialData ? 'Update Group' : 'Create Group'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
