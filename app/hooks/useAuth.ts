import { useState, useEffect } from 'react'
import { User } from '../types'
import { supabase } from '../lib/supabase'

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  })

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        // Fetch user profile from our users table
        const { data: userProfile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (userProfile) {
          setAuthState({
            user: userProfile,
            isLoading: false,
            isAuthenticated: true,
          })
        }
      } else {
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        })
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          // Fetch user profile
          const { data: userProfile } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (userProfile) {
            setAuthState({
              user: userProfile,
              isLoading: false,
              isAuthenticated: true,
            })
          }
        } else if (event === 'SIGNED_OUT') {
          setAuthState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
          })
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true }))
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        // Fetch user profile
        const { data: userProfile } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single()

        if (userProfile) {
          setAuthState({
            user: userProfile,
            isLoading: false,
            isAuthenticated: true,
          })
        }
      }
      
      return { success: true }
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, isLoading: false }))
      return { success: false, error: error.message || 'Login failed' }
    }
  }

  const register = async (email: string, password: string, fullName: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true }))
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      })

      if (error) throw error

      if (data.user) {
        // Create user profile in our users table
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email!,
            full_name: fullName,
          })

        if (profileError) throw profileError

        // Fetch the created profile
        const { data: userProfile } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single()

        if (userProfile) {
          setAuthState({
            user: userProfile,
            isLoading: false,
            isAuthenticated: true,
          })
        }
      }
      
      return { success: true }
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, isLoading: false }))
      return { success: false, error: error.message || 'Registration failed' }
    }
  }

  const logout = async () => {
    try {
      await supabase.auth.signOut()
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      })
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return {
    ...authState,
    login,
    register,
    logout,
  }
}
