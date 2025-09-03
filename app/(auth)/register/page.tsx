'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, User, Mail, Lock, Phone } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'

export default function RegisterPage() {
  const [showPin, setShowPin] = useState(false)
  const [signupMethod, setSignupMethod] = useState<'email' | 'phone'>('email')
  
  // State for email signup
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [pin, setPin] = useState('')
  
  // State for phone signup
  const [phone, setPhone] = useState<string | undefined>('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!email || !fullName || !pin) {
      setError('Please fill in all fields.')
      setLoading(false)
      return
    }

    if (pin.length < 6) {
      setError('PIN must be at least 6 characters.')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: pin,
        options: {
          data: {
            full_name: fullName,
          }
        }
      })

      if (error) {
        setError(error.message)
        console.error('Signup error:', error)
      } else {
        console.log('Signup successful:', data)
        
        // Check if we need email confirmation
        if (data.user && !data.session) {
          setError('Please check your email for a confirmation link before logging in.')
        } else if (data.session) {
          // Success! User is now signed up and logged in
          console.log('User automatically logged in, redirecting to dashboard')
          router.push('/dashboard')
        } else {
          // Fallback - try to sign in immediately
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: email,
            password: pin,
          })
          
          if (signInError) {
            setError('Account created! Please log in with your email and PIN.')
            console.error('Auto-login failed:', signInError)
          } else {
            console.log('Auto-login successful, redirecting to dashboard')
            router.push('/dashboard')
          }
        }
      }
    } catch (err) {
      setError('An error occurred during signup.')
      console.error('Signup error:', err)
    }
    
    setLoading(false)
  }

  const handlePhoneSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!phone || phone.length < 10) {
      setError('Please enter a valid phone number.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithOtp({
      phone: phone,
    })

    if (error) {
      setError('Could not send verification code. Please check the number and try again.')
      console.error('Phone sign-in error:', error)
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
            Join Mama Ledger
          </h1>
          <p className="text-gray-600 mt-2">
            Start with your email. It's free!
          </p>
        </div>

        <div className="space-y-4">
          {signupMethod === 'email' && (
            <form className="space-y-6" onSubmit={handleEmailSignup}>
              <div>
                <label className="text-lg font-semibold text-gray-700 flex items-center mb-2">
                  <User className="w-5 h-5 mr-2 text-gray-400" /> Your Name
                </label>
                <input 
                  type="text" 
                  placeholder="Enter your name" 
                  required 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full text-lg px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
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
                  <Lock className="w-5 h-5 mr-2 text-gray-400" /> Create a Secret PIN
                </label>
                <div className="relative">
                  <input 
                    type={showPin ? 'text' : 'password'} 
                    placeholder="Enter a 6+ character PIN" 
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
                  {loading ? 'Creating Account...' : 'Create My Account'}
                </button>
              </div>
            </form>
          )}

          {signupMethod === 'phone' && !otpSent && (
            <form className="space-y-6" onSubmit={handlePhoneSignup}>
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
                <p className="text-sm text-gray-500 mt-2">Select your country and enter your number.</p>
              </div>
              {error && <p className="text-red-500 text-center font-semibold">{error}</p>}
              <div>
                <button 
                  type="submit" 
                  className="w-full mt-4 p-4 bg-indigo-600 text-white text-xl font-bold rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Send Code'}
                </button>
              </div>
            </form>
          )}

          {signupMethod === 'phone' && otpSent && (
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
                  {loading ? 'Verifying...' : 'Create My Account'}
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
          {signupMethod === 'email' ? (
            <button onClick={() => setSignupMethod('phone')} className="font-semibold text-indigo-600 hover:underline">
              Sign up with Phone Number instead
            </button>
          ) : (
            <button onClick={() => setSignupMethod('phone')} className="font-semibold text-indigo-600 hover:underline">
              Sign up with Email instead
            </button>
          )}
        </div>

        <p className="text-center text-gray-600 mt-8">
          Already have an account?{' '}
          <Link href="/login" className="font-bold text-indigo-600 hover:underline">
            Log In
          </Link>
        </p>
      </div>
    </div>
  )
}
