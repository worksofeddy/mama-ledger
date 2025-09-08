import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { 
  Group, 
  GroupMember, 
  GroupFinancialSummary,
  GroupResponse 
} from '../types/groups'

export function useGroupDetails(groupId: string) {
  const router = useRouter()
  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [financialSummary, setFinancialSummary] = useState<GroupFinancialSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState<any>(null)

  // Check authentication
  const checkAuth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return false
    }
    setUser(session.user)
    return true
  }, [router])

  // Fetch group details
  const fetchGroupDetails = useCallback(async () => {
    if (!groupId) return

    try {
      setLoading(true)
      setError('')
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const response = await fetch(`/api/groups/${groupId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      const data: GroupResponse = await response.json()

      if (data.success) {
        setGroup(data.group)
        if (data.members) {
          setMembers(data.members)
        }
        if (data.financial_summary) {
          setFinancialSummary(data.financial_summary)
        }
      } else {
        setError(data.group ? 'Failed to fetch group details' : 'Group not found')
      }
    } catch (err: any) {
      console.error('Error fetching group details:', err)
      setError('Failed to fetch group details')
    } finally {
      setLoading(false)
    }
  }, [groupId, router])

  // Fetch group members
  const fetchGroupMembers = useCallback(async () => {
    if (!groupId) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/groups/${groupId}/members`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (data.success) {
        setMembers(data.members)
      }
    } catch (err: any) {
      console.error('Error fetching group members:', err)
    }
  }, [groupId])

  // Add member to group
  const addMember = useCallback(async (email: string, role: 'admin' | 'treasurer' | 'member' = 'member') => {
    if (!groupId) return { success: false, error: 'No group ID' }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        return { success: false, error: 'Not authenticated' }
      }

      const response = await fetch(`/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, role })
      })

      const data = await response.json()

      if (data.success) {
        await fetchGroupMembers()
        return { success: true, member: data.member }
      } else {
        return { success: false, error: data.error }
      }
    } catch (err: any) {
      console.error('Error adding member:', err)
      return { success: false, error: 'Failed to add member' }
    }
  }, [groupId, fetchGroupMembers])

  // Remove member from group
  const removeMember = useCallback(async (memberId: string) => {
    if (!groupId) return { success: false, error: 'No group ID' }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        return { success: false, error: 'Not authenticated' }
      }

      const response = await fetch(`/api/groups/${groupId}/members`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ member_id: memberId })
      })

      const data = await response.json()

      if (data.success) {
        await fetchGroupMembers()
        return { success: true }
      } else {
        return { success: false, error: data.error }
      }
    } catch (err: any) {
      console.error('Error removing member:', err)
      return { success: false, error: 'Failed to remove member' }
    }
  }, [groupId, fetchGroupMembers])

  // Update member role
  const updateMemberRole = useCallback(async (memberId: string, role: 'admin' | 'treasurer' | 'member') => {
    if (!groupId) return { success: false, error: 'No group ID' }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        return { success: false, error: 'Not authenticated' }
      }

      const response = await fetch(`/api/groups/${groupId}/members`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ member_id: memberId, role })
      })

      const data = await response.json()

      if (data.success) {
        await fetchGroupMembers()
        return { success: true, member: data.member }
      } else {
        return { success: false, error: data.error }
      }
    } catch (err: any) {
      console.error('Error updating member role:', err)
      return { success: false, error: 'Failed to update member role' }
    }
  }, [groupId, fetchGroupMembers])

  // Check if user has permission
  const hasPermission = useCallback((permission: string) => {
    if (!group || !user) return false
    
    const userRole = group.userRole
    if (!userRole) return false

    // Admin has all permissions
    if (userRole === 'admin') return true

    // Treasurer permissions
    if (userRole === 'treasurer') {
      return ['view_finances', 'manage_contributions', 'manage_loans'].includes(permission)
    }

    // Member permissions
    if (userRole === 'member') {
      return ['view_group', 'make_contributions', 'request_loans'].includes(permission)
    }

    return false
  }, [group, user])

  // Refresh all data
  const refreshData = useCallback(() => {
    fetchGroupDetails()
  }, [fetchGroupDetails])

  // Initialize
  useEffect(() => {
    checkAuth().then(isAuthenticated => {
      if (isAuthenticated) {
        fetchGroupDetails()
      }
    })
  }, [checkAuth, fetchGroupDetails])

  return {
    // State
    group,
    members,
    financialSummary,
    loading,
    error,
    user,
    
    // Actions
    fetchGroupDetails,
    fetchGroupMembers,
    addMember,
    removeMember,
    updateMemberRole,
    refreshData,
    hasPermission,
    
    // Computed
    memberCount: members.length,
    isAdmin: group?.userRole === 'admin',
    isTreasurer: group?.userRole === 'treasurer',
    isMember: group?.userRole === 'member'
  }
}
