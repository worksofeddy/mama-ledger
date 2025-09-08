'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { User } from '@supabase/supabase-js'

interface ValidationErrors {
  firstName?: string
  lastName?: string
  phoneNumber?: string
  termsAccepted?: string
  privacyAccepted?: string
}

export default function SecureSettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [bio, setBio] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})

  // Validation functions
  const validateFirstName = (name: string): string | undefined => {
    if (!name.trim()) return 'First name is required'
    if (name.trim().length < 2) return 'First name must be at least 2 characters'
    if (!/^[a-zA-Z\s]+$/.test(name.trim())) return 'First name can only contain letters and spaces'
    return undefined
  }

  const validateLastName = (name: string): string | undefined => {
    if (!name.trim()) return 'Last name is required'
    if (name.trim().length < 2) return 'Last name must be at least 2 characters'
    if (!/^[a-zA-Z\s]+$/.test(name.trim())) return 'Last name can only contain letters and spaces'
    return undefined
  }

  const validatePhoneNumber = (phone: string): string | undefined => {
    if (!phone.trim()) return 'Phone number is required for security'
    // Kenyan phone number validation
    const kenyanPhoneRegex = /^(\+254|0)[17]\d{8}$/
    if (!kenyanPhoneRegex.test(phone.replace(/\s/g, ''))) {
      return 'Please enter a valid Kenyan phone number (e.g., +254712345678 or 0712345678)'
    }
    return undefined
  }

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {}
    
    const firstNameError = validateFirstName(firstName)
    if (firstNameError) errors.firstName = firstNameError
    
    const lastNameError = validateLastName(lastName)
    if (lastNameError) errors.lastName = lastNameError
    
    const phoneError = validatePhoneNumber(phoneNumber)
    if (phoneError) errors.phoneNumber = phoneError
    
    if (!termsAccepted) {
      errors.termsAccepted = 'You must accept the Terms and Conditions'
    }
    
    if (!privacyAccepted) {
      errors.privacyAccepted = 'You must accept the Privacy Policy'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setUser(session.user)
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('first_name, last_name, bio, phone, terms_accepted, privacy_accepted')
          .eq('id', session.user.id)
          .single()

        if (error) {
          console.error('Error fetching profile:', error)
        } else if (profile) {
          setFirstName(profile.first_name || '')
          setLastName(profile.last_name || '')
          setBio(profile.bio || '')
          setPhoneNumber(profile.phone || '')
          setTermsAccepted(profile.terms_accepted || false)
          setPrivacyAccepted(profile.privacy_accepted || false)
        }
      }
      setLoading(false)
    }
    fetchProfile()
  }, [])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    // Validate form before submission
    if (!validateForm()) {
      setMessage('Please fix the validation errors below')
      setMessageType('error')
      return
    }

    setSaving(true)
    setMessage('')
    
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          bio: bio.trim(),
          phone: phoneNumber.trim(),
          terms_accepted: termsAccepted,
          privacy_accepted: privacyAccepted,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) {
        setMessage('Error updating profile. Please try again.')
        setMessageType('error')
        console.error('Profile update error:', error)
      } else {
        setMessage('Profile updated successfully! Your account is now secure.')
        setMessageType('success')
        setValidationErrors({})
      }
    } catch (err) {
      setMessage('An unexpected error occurred. Please try again.')
      setMessageType('error')
      console.error('Unexpected error:', err)
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Secure Profile Settings</h1>
          <p className="text-gray-600">Complete your profile to ensure account security and compliance</p>
        </div>

        <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
            <h2 className="text-xl font-semibold text-red-800">🔒 Required Security Information</h2>
            <p className="text-sm text-red-600 mt-1">All fields below are mandatory for financial security and compliance</p>
          </div>

          <div className="p-6">
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              {/* Profile Picture Section */}
              <div className="flex items-center space-x-6">
                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-indigo-600">
                    {firstName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{`${firstName} ${lastName}` || 'Your Name'}</h3>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                </div>
              </div>

              {/* Message Display */}
              {message && (
                <div className={`p-4 rounded-lg ${
                  messageType === 'success' 
                    ? 'bg-green-50 border border-green-200 text-green-800' 
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}>
                  {message}
                </div>
              )}

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg shadow-sm text-gray-600 cursor-not-allowed"
                />
                <p className="mt-2 text-xs text-gray-500">Email address cannot be changed for security reasons.</p>
              </div>
              
              {/* First Name Field - REQUIRED */}
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value)
                    if (validationErrors.firstName) {
                      setValidationErrors(prev => ({ ...prev, firstName: undefined }))
                    }
                  }}
                  placeholder="Enter your first name"
                  className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                    validationErrors.firstName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  required
                />
                {validationErrors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.firstName}</p>
                )}
              </div>

              {/* Last Name Field - REQUIRED */}
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value)
                    if (validationErrors.lastName) {
                      setValidationErrors(prev => ({ ...prev, lastName: undefined }))
                    }
                  }}
                  placeholder="Enter your last name"
                  className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                    validationErrors.lastName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  required
                />
                {validationErrors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.lastName}</p>
                )}
              </div>

              {/* Phone Number Field - REQUIRED */}
              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  id="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value)
                    if (validationErrors.phoneNumber) {
                      setValidationErrors(prev => ({ ...prev, phoneNumber: undefined }))
                    }
                  }}
                  placeholder="+254712345678 or 0712345678"
                  className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                    validationErrors.phoneNumber ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  required
                />
                {validationErrors.phoneNumber && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.phoneNumber}</p>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  <strong>Required for:</strong> Two-factor authentication, account recovery, and fraud prevention
                </p>
              </div>
              
              {/* Bio Field - OPTIONAL */}
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                  Bio
                </label>
                <textarea
                  id="bio"
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us a bit about yourself or your business..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
                />
                <p className="mt-2 text-xs text-gray-500">Optional: A short description about you or your business</p>
              </div>

              {/* Terms and Conditions - REQUIRED */}
              <div className="border-t pt-6">
                <div className="flex items-start space-x-3">
                  <input
                    id="termsAccepted"
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => {
                      setTermsAccepted(e.target.checked)
                      if (validationErrors.termsAccepted) {
                        setValidationErrors(prev => ({ ...prev, termsAccepted: undefined }))
                      }
                    }}
                    className={`mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded ${
                      validationErrors.termsAccepted ? 'border-red-300' : ''
                    }`}
                    required
                  />
                  <div className="flex-1">
                    <label htmlFor="termsAccepted" className="text-sm font-medium text-gray-700">
                      I accept the <a href="/terms" className="text-indigo-600 hover:text-indigo-500 underline">Terms and Conditions</a> <span className="text-red-500">*</span>
                    </label>
                    {validationErrors.termsAccepted && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.termsAccepted}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Privacy Policy - REQUIRED */}
              <div>
                <div className="flex items-start space-x-3">
                  <input
                    id="privacyAccepted"
                    type="checkbox"
                    checked={privacyAccepted}
                    onChange={(e) => {
                      setPrivacyAccepted(e.target.checked)
                      if (validationErrors.privacyAccepted) {
                        setValidationErrors(prev => ({ ...prev, privacyAccepted: undefined }))
                      }
                    }}
                    className={`mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded ${
                      validationErrors.privacyAccepted ? 'border-red-300' : ''
                    }`}
                    required
                  />
                  <div className="flex-1">
                    <label htmlFor="privacyAccepted" className="text-sm font-medium text-gray-700">
                      I accept the <a href="/privacy" className="text-indigo-600 hover:text-indigo-500 underline">Privacy Policy</a> and consent to data processing <span className="text-red-500">*</span>
                    </label>
                    {validationErrors.privacyAccepted && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.privacyAccepted}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Saving...
                    </div>
                  ) : (
                    'Save Secure Profile'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">🔒 Security Notice</h3>
          <p className="text-sm text-blue-800">
            All information provided is encrypted and stored securely. Your phone number is required for:
          </p>
          <ul className="mt-2 text-sm text-blue-800 list-disc list-inside space-y-1">
            <li>Two-factor authentication (2FA)</li>
            <li>Account recovery in case of lost access</li>
            <li>Fraud prevention and security alerts</li>
            <li>Compliance with financial regulations</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
