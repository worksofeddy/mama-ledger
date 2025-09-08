import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { 
  GroupMember, 
  GroupMembersResponse,
  MemberFormData,
  GroupRole
} from '../types/groups'

export function useGroupMembers(groupId: string) {
  const [members, setMembers] = useState<GroupMember[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  
  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'treasurer' | 'member'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  // Fetch group members
  const fetchMembers = useCallback(async () => {
    if (!groupId) return

    try {
      setLoading(true)
      setError('')
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return
      }

      const response = await fetch(`/api/groups/${groupId}/members`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      const data: GroupMembersResponse = await response.json()

      if (data.success) {
        setMembers(data.members)
      } else {
        setError(data.members ? 'Failed to fetch members' : 'No members found')
      }
    } catch (err: any) {
      console.error('Error fetching group members:', err)
      setError('Failed to fetch group members')
    } finally {
      setLoading(false)
    }
  }, [groupId])

  // Add member to group
  const addMember = useCallback(async (formData: MemberFormData) => {
    if (!groupId) return { success: false, error: 'No group ID' }

    try {
      setSaving(true)
      setError('')

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return { success: false, error: 'Not authenticated' }
      }

      const response = await fetch(`/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (data.success) {
        // Add to local state
        setMembers(prev => [...prev, data.member])
        return { success: true, member: data.member }
      } else {
        setError(data.error || 'Failed to add member')
        return { success: false, error: data.error }
      }
    } catch (err: any) {
      console.error('Error adding member:', err)
      const errorMsg = 'Failed to add member'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setSaving(false)
    }
  }, [groupId])

  // Remove member from group
  const removeMember = useCallback(async (memberId: string) => {
    if (!groupId) return { success: false, error: 'No group ID' }

    try {
      setSaving(true)
      setError('')

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
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
        // Remove from local state
        setMembers(prev => prev.filter(m => m.id !== memberId))
        return { success: true }
      } else {
        setError(data.error || 'Failed to remove member')
        return { success: false, error: data.error }
      }
    } catch (err: any) {
      console.error('Error removing member:', err)
      const errorMsg = 'Failed to remove member'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setSaving(false)
    }
  }, [groupId])

  // Update member role
  const updateMemberRole = useCallback(async (memberId: string, role: 'admin' | 'treasurer' | 'member') => {
    if (!groupId) return { success: false, error: 'No group ID' }

    try {
      setSaving(true)
      setError('')

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
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
        // Update local state
        setMembers(prev => prev.map(m => 
          m.id === memberId ? { ...m, role: role as unknown as GroupRole } : m
        ))
        return { success: true, member: data.member }
      } else {
        setError(data.error || 'Failed to update member role')
        return { success: false, error: data.error }
      }
    } catch (err: any) {
      console.error('Error updating member role:', err)
      const errorMsg = 'Failed to update member role'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setSaving(false)
    }
  }, [groupId])

  // Toggle member active status
  const toggleMemberStatus = useCallback(async (memberId: string) => {
    if (!groupId) return { success: false, error: 'No group ID' }

    try {
      setSaving(true)
      setError('')

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return { success: false, error: 'Not authenticated' }
      }

      const member = members.find(m => m.id === memberId)
      if (!member) {
        return { success: false, error: 'Member not found' }
      }

      const response = await fetch(`/api/groups/${groupId}/members`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          member_id: memberId, 
          is_active: !member.is_active 
        })
      })

      const data = await response.json()

      if (data.success) {
        // Update local state
        setMembers(prev => prev.map(m => 
          m.id === memberId ? { ...m, is_active: !m.is_active } : m
        ))
        return { success: true, member: data.member }
      } else {
        setError(data.error || 'Failed to update member status')
        return { success: false, error: data.error }
      }
    } catch (err: any) {
      console.error('Error updating member status:', err)
      const errorMsg = 'Failed to update member status'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setSaving(false)
    }
  }, [groupId, members])

  // Filtered members
  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const matchesSearch = 
          member.users?.email.toLowerCase().includes(searchLower) ||
          member.users?.user_profiles?.first_name?.toLowerCase().includes(searchLower) ||
          member.users?.user_profiles?.last_name?.toLowerCase().includes(searchLower)
        if (!matchesSearch) return false
      }

      // Role filter
      if (roleFilter !== 'all' && member.role !== (roleFilter as unknown as GroupRole)) {
        return false
      }

      // Status filter
      if (statusFilter !== 'all') {
        const isActive = statusFilter === 'active'
        if (member.is_active !== isActive) return false
      }

      return true
    })
  }, [members, searchTerm, roleFilter, statusFilter])

  // Member statistics
  const memberStats = useMemo(() => {
    const total = members.length
    const active = members.filter(m => m.is_active).length
    const inactive = total - active
    const admins = members.filter(m => m.role === ('admin' as unknown as GroupRole)).length
    const treasurers = members.filter(m => m.role === ('treasurer' as unknown as GroupRole)).length
    const regularMembers = members.filter(m => m.role === ('member' as unknown as GroupRole)).length

    return {
      total,
      active,
      inactive,
      admins,
      treasurers,
      regularMembers
    }
  }, [members])

  // Refresh data
  const refreshData = useCallback(() => {
    fetchMembers()
  }, [fetchMembers])

  // Initialize
  useEffect(() => {
    if (groupId) {
      fetchMembers()
    }
  }, [groupId, fetchMembers])

  return {
    // State
    members: filteredMembers,
    loading,
    saving,
    error,
    searchTerm,
    roleFilter,
    statusFilter,
    
    // Actions
    setSearchTerm,
    setRoleFilter,
    setStatusFilter,
    addMember,
    removeMember,
    updateMemberRole,
    toggleMemberStatus,
    refreshData,
    
    // Computed
    memberStats,
    totalMembers: members.length,
    filteredCount: filteredMembers.length
  }
}
