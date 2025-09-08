import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Loan, GroupMember, LoanFormData } from '../types/loans'

interface UseLoansSimpleReturn {
  loans: Loan[]
  groups: any[]
  groupMembers: GroupMember[]
  userRoles: { [groupId: string]: string }
  loading: boolean
  error: string
  refreshData: () => Promise<void>
}

export function useLoansSimple(userId: string | undefined): UseLoansSimpleReturn {
  const [loans, setLoans] = useState<Loan[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([])
  const [userRoles, setUserRoles] = useState<{ [groupId: string]: string }>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const refreshData = useCallback(async () => {
    if (!userId) {
      console.log('No userId provided to useLoansSimple')
      return
    }

    console.log('🔄 Starting simple data refresh for user:', userId)
    setLoading(true)
    setError('')

    try {
      // Step 1: Test basic authentication
      console.log('Step 1: Testing authentication...')
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      if (authError || !session) {
        throw new Error('Authentication failed')
      }
      console.log('✅ Authentication successful')

      // Step 2: Test user profile
      console.log('Step 2: Testing user profile...')
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileError) {
        console.log('⚠️ User profile error (might be expected):', profileError.message)
      } else {
        console.log('✅ User profile found:', profile)
      }

      // Step 3: Test group memberships
      console.log('Step 3: Testing group memberships...')
      const { data: memberships, error: membershipsError } = await supabase
        .from('group_members')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)

      if (membershipsError) {
        console.error('❌ Group memberships error:', membershipsError)
        throw membershipsError
      }

      console.log('✅ Group memberships:', memberships?.length || 0, 'groups')
      setUserRoles(memberships?.reduce((acc, m) => ({ ...acc, [m.group_id]: m.role }), {}) || {})

      // Step 4: Test groups
      console.log('Step 4: Testing groups...')
      if (memberships && memberships.length > 0) {
        const groupIds = memberships.map(m => m.group_id)
        const { data: groupsData, error: groupsError } = await supabase
          .from('groups')
          .select('*')
          .in('id', groupIds)

        if (groupsError) {
          console.error('❌ Groups error:', groupsError)
          throw groupsError
        }

        console.log('✅ Groups found:', groupsData?.length || 0)
        setGroups(groupsData || [])
      } else {
        console.log('⚠️ No group memberships found')
        setGroups([])
      }

      // Step 5: Test loans
      console.log('Step 5: Testing loans...')
      if (memberships && memberships.length > 0) {
        const groupIds = memberships.map(m => m.group_id)
        const { data: loansData, error: loansError } = await supabase
          .from('loans')
          .select('*')
          .in('group_id', groupIds)
          .order('created_at', { ascending: false })

        if (loansError) {
          console.error('❌ Loans error:', loansError)
          throw loansError
        }

        console.log('✅ Loans found:', loansData?.length || 0)
        setLoans(loansData || [])
      } else {
        console.log('⚠️ No loans to fetch (no group memberships)')
        setLoans([])
      }

      console.log('🎉 Simple data refresh completed successfully')

    } catch (err: any) {
      console.error('❌ Error in simple data refresh:', err)
      setError(err.message || 'Failed to refresh data')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (userId) {
      refreshData()
    }
  }, [userId, refreshData])

  return {
    loans,
    groups,
    groupMembers,
    userRoles,
    loading,
    error,
    refreshData
  }
}
