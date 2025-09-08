import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { 
  Group, 
  GroupFormData, 
  GroupFilters, 
  GroupsResponse,
  GroupFormErrors 
} from '../types/groups'

export function useGroups() {
  const router = useRouter()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState<any>(null)
  
  // Filter and search state
  const [filters, setFilters] = useState<GroupFilters>({
    search: '',
    role: 'all',
    frequency: 'all',
    privacy: 'all',
    sortBy: 'created_at',
    sortOrder: 'desc'
  })

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

  // Fetch groups from API
  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/groups', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      const data: GroupsResponse = await response.json()

      if (data.success) {
        setGroups(data.groups)
      } else {
        setError(data.groups ? 'Failed to fetch groups' : 'No groups found')
      }
    } catch (err: any) {
      console.error('Error fetching groups:', err)
      setError('Failed to fetch groups')
    } finally {
      setLoading(false)
    }
  }, [router])

  // Create new group
  const createGroup = useCallback(async (formData: GroupFormData) => {
    try {
      setSaving(true)
      setError('')

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Please log in to create a group')
        return { success: false, error: 'Not authenticated' }
      }

      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (data.success) {
        // Refresh groups list
        await fetchGroups()
        return { success: true, group: data.group }
      } else {
        setError(data.error || 'Failed to create group')
        return { success: false, error: data.error }
      }
    } catch (err: any) {
      console.error('Error creating group:', err)
      const errorMsg = 'Failed to create group'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setSaving(false)
    }
  }, [fetchGroups])

  // Update group
  const updateGroup = useCallback(async (groupId: string, formData: Partial<GroupFormData>) => {
    try {
      setSaving(true)
      setError('')

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Please log in to update a group')
        return { success: false, error: 'Not authenticated' }
      }

      const response = await fetch(`/api/groups/${groupId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (data.success) {
        // Update local state
        setGroups(prev => prev.map(g => g.id === groupId ? { ...g, ...data.group } : g))
        return { success: true, group: data.group }
      } else {
        setError(data.error || 'Failed to update group')
        return { success: false, error: data.error }
      }
    } catch (err: any) {
      console.error('Error updating group:', err)
      const errorMsg = 'Failed to update group'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setSaving(false)
    }
  }, [])

  // Delete group
  const deleteGroup = useCallback(async (groupId: string) => {
    try {
      setSaving(true)
      setError('')

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Please log in to delete a group')
        return { success: false, error: 'Not authenticated' }
      }

      const response = await fetch(`/api/groups/${groupId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (data.success) {
        // Remove from local state
        setGroups(prev => prev.filter(g => g.id !== groupId))
        return { success: true }
      } else {
        setError(data.error || 'Failed to delete group')
        return { success: false, error: data.error }
      }
    } catch (err: any) {
      console.error('Error deleting group:', err)
      const errorMsg = 'Failed to delete group'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setSaving(false)
    }
  }, [])

  // Filtered and sorted groups
  const filteredGroups = useMemo(() => {
    let filtered = groups.filter(group => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        const matchesSearch = 
          group.name.toLowerCase().includes(searchLower) ||
          group.description?.toLowerCase().includes(searchLower)
        if (!matchesSearch) return false
      }

      // Role filter
      if (filters.role !== 'all' && group.userRole !== filters.role) {
        return false
      }

      // Frequency filter
      if (filters.frequency !== 'all' && group.contribution_frequency !== filters.frequency) {
        return false
      }

      // Privacy filter
      if (filters.privacy !== 'all') {
        const isPrivate = filters.privacy === 'private'
        if (group.is_private !== isPrivate) return false
      }

      return true
    })

    // Sort groups
    filtered.sort((a, b) => {
      let aValue: any, bValue: any

      switch (filters.sortBy) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'created_at':
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
          break
        case 'member_count':
          aValue = a.member_count || 0
          bValue = b.member_count || 0
          break
        case 'contribution_amount':
          aValue = a.contribution_amount
          bValue = b.contribution_amount
          break
        default:
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
      }

      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return filtered
  }, [groups, filters])

  // Form validation
  const validateGroupForm = useCallback((formData: GroupFormData): GroupFormErrors => {
    const errors: GroupFormErrors = {}

    if (!formData.name.trim()) {
      errors.name = 'Group name is required'
    } else if (formData.name.length < 3) {
      errors.name = 'Group name must be at least 3 characters'
    }

    if (!formData.contribution_amount || formData.contribution_amount <= 0) {
      errors.contribution_amount = 'Contribution amount must be greater than 0'
    }

    if (!formData.contribution_frequency) {
      errors.contribution_frequency = 'Contribution frequency is required'
    }

    if (formData.interest_rate < 0 || formData.interest_rate > 100) {
      errors.interest_rate = 'Interest rate must be between 0 and 100'
    }

    if (!formData.max_members || formData.max_members < 2) {
      errors.max_members = 'Maximum members must be at least 2'
    }

    return errors
  }, [])

  // Refresh data
  const refreshData = useCallback(() => {
    fetchGroups()
  }, [fetchGroups])

  // Initialize
  useEffect(() => {
    checkAuth().then(isAuthenticated => {
      if (isAuthenticated) {
        fetchGroups()
      }
    })
  }, [checkAuth, fetchGroups])

  return {
    // State
    groups: filteredGroups,
    loading,
    saving,
    error,
    user,
    filters,
    
    // Actions
    setFilters,
    createGroup,
    updateGroup,
    deleteGroup,
    refreshData,
    validateGroupForm,
    
    // Computed
    totalGroups: groups.length,
    filteredCount: filteredGroups.length
  }
}
