'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Mail, Lock, Phone } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'

export default function LoginPage() {
  const [showPin, setShowPin] = useState(false)
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email')
  
  // State for email login
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  
  // State for phone login
  const [phone, setPhone] = useState<string | undefined>('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!email || !pin) {
      setError('Please enter your email and PIN.')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: pin,
      })

      if (error) {
        setError('Invalid email or PIN. Please try again.')
      } else {
        // Success! User is now logged in
        router.push('/dashboard')
      }
    } catch (err) {
      setError('An error occurred during login.')
      console.error('Login error:', err)
    }
    
    setLoading(false)
  }

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    if (!phone || phone.length < 10) {
      setError('Please enter a valid phone number.')
      setLoading(false)
      return
    }
    const { error } = await supabase.auth.signInWithOtp({ phone: phone })

    if (error) {
      setError('Could not send login code. Please check the number.')
      console.error('Phone login error:', error)
    } else {
      setOtpSent(true)
    }
    setLoading(false)
  }

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    if (!phone) {
      setError('Phone number is missing.')
      setLoading(false)
      return
    }
    const { error } = await supabase.auth.verifyOtp({ phone: phone, token: otp, type: 'sms' })

    if (error) {
      setError('Invalid code. Please try again.')
      console.error('OTP verification error:', error)
    } else {
      router.push('/dashboard')
    }
    setLoading(false)
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome Back!
          </h1>
          <p className="text-gray-600 mt-2">
            Log in to see your business records.
          </p>
        </div>

        <div className="space-y-4">
          {loginMethod === 'email' && (
            <form className="space-y-6" onSubmit={handleEmailLogin}>
              <div>
                <label className="text-lg font-semibold text-gray-700 flex items-center mb-2">
                  <Mail className="w-5 h-5 mr-2 text-gray-400" /> Your Email
                </label>
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-lg px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-lg font-semibold text-gray-700 flex items-center mb-2">
                  <Lock className="w-5 h-5 mr-2 text-gray-400" /> Your Secret PIN
                </label>
                <div className="relative">
                    <input 
                      type={showPin ? 'text' : 'password'} 
                      placeholder="Enter your PIN (6+ characters)" 
                      required 
                      maxLength={20}
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      className="w-full text-lg px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPin(!showPin)} 
                      className="absolute inset-y-0 right-0 px-4 flex items-center text-gray-500"
                    >
                      {showPin ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
              </div>
              {error && <p className="text-red-500 text-center font-semibold">{error}</p>}
              <div>
                <button 
                  type="submit" 
                  className="w-full mt-4 p-4 bg-indigo-600 text-white text-xl font-bold rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
                  disabled={loading}
                >
                  {loading ? 'Logging In...' : 'Log In'}
                </button>
              </div>
            </form>
          )}

          {loginMethod === 'phone' && !otpSent && (
            <form className="space-y-6" onSubmit={handlePhoneLogin}>
              <div>
                <label className="text-lg font-semibold text-gray-700 flex items-center mb-2">
                  <Phone className="w-5 h-5 mr-2 text-gray-400" /> Your Phone Number
                </label>
                <PhoneInput
                  international
                  defaultCountry="KE"
                  placeholder="Enter phone number"
                  value={phone}
                  onChange={setPhone}
                  className="w-full text-lg px-4 py-3 border-2 border-gray-200 rounded-lg focus-within:ring-indigo-500 focus-within:border-indigo-500"
                />
                <p className="text-sm text-gray-500 mt-2">We will send you a login code.</p>
              </div>
              {error && <p className="text-red-500 text-center font-semibold">{error}</p>}
              <div>
                <button type="submit" className="w-full mt-4 p-4 bg-indigo-600 text-white text-xl font-bold rounded-lg hover:bg-indigo-700 disabled:bg-gray-400" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Code'}
                </button>
              </div>
            </form>
          )}
          
          {loginMethod === 'phone' && otpSent && (
            <form className="space-y-6" onSubmit={handleOtpVerify}>
              <div>
                <label className="text-lg font-semibold text-gray-700 flex items-center mb-2">
                  Enter Code
                </label>
                <input type="number" placeholder="Enter code from SMS" required value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full text-lg px-4 py-3 border-2 border-gray-200 rounded-lg"/>
                <p className="text-sm text-gray-500 mt-2">We sent a code to {phone}.</p>
              </div>
              {error && <p className="text-red-500 text-center font-semibold">{error}</p>}
              <div>
                <button type="submit" className="w-full mt-4 p-4 bg-indigo-600 text-white text-xl font-bold rounded-lg hover:bg-indigo-700 disabled:bg-gray-400" disabled={loading}>
                  {loading ? 'Logging In...' : 'Log In'}
                </button>
              </div>
            </form>
          )}
        </div>
        
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">or</span>
          </div>
        </div>

        <div className="text-center">
          {loginMethod === 'email' ? (
            <button onClick={() => setLoginMethod('phone')} className="font-semibold text-indigo-600 hover:underline">
              Log in with Phone Number instead
            </button>
          ) : (
            <button onClick={() => setLoginMethod('email')} className="font-semibold text-indigo-600 hover:underline">
              Log in with Email instead
            </button>
          )}
        </div>

        <p className="text-center text-gray-600 mt-8">
          Don't have an account?{' '}
          <Link href="/register" className="font-bold text-indigo-600 hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  )
}
