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

interface PaginationState {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface GroupsPaginatedState {
  groups: Group[]
  pagination: PaginationState
  loading: boolean
  saving: boolean
  error: string
  user: any
  filters: GroupFilters
}

export function useGroupsPaginated(initialLimit: number = 20) {
  const router = useRouter()
  const [state, setState] = useState<GroupsPaginatedState>({
    groups: [],
    pagination: {
      page: 1,
      limit: initialLimit,
      total: 0,
      totalPages: 0
    },
    loading: true,
    saving: false,
    error: '',
    user: null,
    filters: {
      search: '',
      role: 'all',
      frequency: 'all',
      privacy: 'all',
      sortBy: 'created_at',
      sortOrder: 'desc'
    }
  })

  // Debounced search to prevent excessive API calls
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)

  // Check authentication
  const checkAuth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return false
    }
    setState(prev => ({ ...prev, user: session.user }))
    return true
  }, [router])

  // Fetch groups with pagination
  const fetchGroups = useCallback(async (page: number = 1, filters: GroupFilters = state.filters) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: '' }))
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: state.pagination.limit.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.role !== 'all' && { role: filters.role }),
        ...(filters.frequency !== 'all' && { frequency: filters.frequency }),
        ...(filters.privacy !== 'all' && { privacy: filters.privacy }),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      })

      const response = await fetch(`/api/groups/paginated?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      const data: GroupsResponse = await response.json()

      if (data.success) {
        setState(prev => ({
          ...prev,
          groups: data.groups || [],
          pagination: {
            page: data.page || page,
            limit: data.limit || state.pagination.limit,
            total: data.total || 0,
            totalPages: Math.ceil((data.total || 0) / (data.limit || state.pagination.limit))
          },
          loading: false
        }))
      } else {
        setState(prev => ({
          ...prev,
          error: data.groups ? 'Failed to fetch groups' : 'No groups found',
          loading: false
        }))
      }
    } catch (err: any) {
      console.error('Error fetching groups:', err)
      setState(prev => ({
        ...prev,
        error: 'Failed to fetch groups',
        loading: false
      }))
    }
  }, [router, state.pagination.limit, state.filters])

  // Debounced search
  const debouncedSearch = useCallback((searchTerm: string) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    const timeout = setTimeout(() => {
      const newFilters = { ...state.filters, search: searchTerm }
      setState(prev => ({ ...prev, filters: newFilters }))
      fetchGroups(1, newFilters)
    }, 300)

    setSearchTimeout(timeout)
  }, [searchTimeout, state.filters, fetchGroups])

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<GroupFilters>) => {
    const updatedFilters = { ...state.filters, ...newFilters }
    setState(prev => ({ ...prev, filters: updatedFilters }))
    fetchGroups(1, updatedFilters)
  }, [state.filters, fetchGroups])

  // Pagination controls
  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= state.pagination.totalPages) {
      fetchGroups(page, state.filters)
    }
  }, [state.pagination.totalPages, state.filters, fetchGroups])

  const nextPage = useCallback(() => {
    if (state.pagination.page < state.pagination.totalPages) {
      goToPage(state.pagination.page + 1)
    }
  }, [state.pagination.page, state.pagination.totalPages, goToPage])

  const prevPage = useCallback(() => {
    if (state.pagination.page > 1) {
      goToPage(state.pagination.page - 1)
    }
  }, [state.pagination.page, goToPage])

  // Create new group
  const createGroup = useCallback(async (formData: GroupFormData) => {
    try {
      setState(prev => ({ ...prev, saving: true, error: '' }))

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setState(prev => ({ ...prev, error: 'Please log in to create a group', saving: false }))
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
        // Refresh current page
        await fetchGroups(state.pagination.page, state.filters)
        return { success: true, group: data.group }
      } else {
        setState(prev => ({ ...prev, error: data.error || 'Failed to create group', saving: false }))
        return { success: false, error: data.error }
      }
    } catch (err: any) {
      console.error('Error creating group:', err)
      const errorMsg = 'Failed to create group'
      setState(prev => ({ ...prev, error: errorMsg, saving: false }))
      return { success: false, error: errorMsg }
    }
  }, [fetchGroups, state.pagination.page, state.filters])

  // Update group
  const updateGroup = useCallback(async (groupId: string, formData: Partial<GroupFormData>) => {
    try {
      setState(prev => ({ ...prev, saving: true, error: '' }))

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setState(prev => ({ ...prev, error: 'Please log in to update a group', saving: false }))
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
        setState(prev => ({
          ...prev,
          groups: prev.groups.map(g => g.id === groupId ? { ...g, ...data.group } : g),
          saving: false
        }))
        return { success: true, group: data.group }
      } else {
        setState(prev => ({ ...prev, error: data.error || 'Failed to update group', saving: false }))
        return { success: false, error: data.error }
      }
    } catch (err: any) {
      console.error('Error updating group:', err)
      const errorMsg = 'Failed to update group'
      setState(prev => ({ ...prev, error: errorMsg, saving: false }))
      return { success: false, error: errorMsg }
    }
  }, [])

  // Delete group
  const deleteGroup = useCallback(async (groupId: string) => {
    try {
      setState(prev => ({ ...prev, saving: true, error: '' }))

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setState(prev => ({ ...prev, error: 'Please log in to delete a group', saving: false }))
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
        setState(prev => ({
          ...prev,
          groups: prev.groups.filter(g => g.id !== groupId),
          pagination: {
            ...prev.pagination,
            total: prev.pagination.total - 1,
            totalPages: Math.ceil((prev.pagination.total - 1) / prev.pagination.limit)
          },
          saving: false
        }))
        return { success: true }
      } else {
        setState(prev => ({ ...prev, error: data.error || 'Failed to delete group', saving: false }))
        return { success: false, error: data.error }
      }
    } catch (err: any) {
      console.error('Error deleting group:', err)
      const errorMsg = 'Failed to delete group'
      setState(prev => ({ ...prev, error: errorMsg, saving: false }))
      return { success: false, error: errorMsg }
    }
  }, [])

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
    fetchGroups(state.pagination.page, state.filters)
  }, [fetchGroups, state.pagination.page, state.filters])

  // Initialize
  useEffect(() => {
    checkAuth().then(isAuthenticated => {
      if (isAuthenticated) {
        fetchGroups()
      }
    })
  }, [checkAuth, fetchGroups])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout)
      }
    }
  }, [searchTimeout])

  return {
    // State
    groups: state.groups,
    pagination: state.pagination,
    loading: state.loading,
    saving: state.saving,
    error: state.error,
    user: state.user,
    filters: state.filters,
    
    // Actions
    updateFilters,
    debouncedSearch,
    goToPage,
    nextPage,
    prevPage,
    createGroup,
    updateGroup,
    deleteGroup,
    refreshData,
    validateGroupForm,
    
    // Computed
    hasNextPage: state.pagination.page < state.pagination.totalPages,
    hasPrevPage: state.pagination.page > 1,
    showingFrom: (state.pagination.page - 1) * state.pagination.limit + 1,
    showingTo: Math.min(state.pagination.page * state.pagination.limit, state.pagination.total)
  }
}
