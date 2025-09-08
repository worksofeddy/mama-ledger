import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { Loan, Group, GroupMember, LoanFormData, LoanFilters } from '../types/loans'

interface PaginationState {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface UseLoansPaginatedReturn {
  // Data
  loans: Loan[]
  groups: Group[]
  groupMembers: GroupMember[]
  userRoles: { [groupId: string]: string }
  
  // Pagination
  pagination: PaginationState
  setPage: (page: number) => void
  setLimit: (limit: number) => void
  
  // State
  loading: boolean
  saving: boolean
  error: string
  
  // Actions
  fetchLoans: (page?: number, limit?: number) => Promise<void>
  fetchGroups: () => Promise<void>
  fetchGroupMembers: (groupId: string) => Promise<void>
  createLoan: (formData: LoanFormData) => Promise<boolean>
  refreshData: () => Promise<void>
  
  // Filters
  filters: LoanFilters
  setFilters: (filters: LoanFilters) => void
  
  // Search
  searchTerm: string
  setSearchTerm: (term: string) => void
  debouncedSearchTerm: string
}

export function useLoansPaginated(userId: string | null): UseLoansPaginatedReturn {
  const [loans, setLoans] = useState<Loan[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([])
  const [userRoles, setUserRoles] = useState<{ [groupId: string]: string }>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 20, // Start with 20 items per page
    total: 0,
    totalPages: 0
  })
  
  const [filters, setFilters] = useState<LoanFilters>({
    status: 'all',
    searchTerm: ''
  })

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Reset to page 1 when filters change
  useEffect(() => {
    if (pagination.page !== 1) {
      setPagination(prev => ({ ...prev, page: 1 }))
    }
  }, [filters.status, debouncedSearchTerm])

  const fetchLoans = useCallback(async (page = pagination.page, limit = pagination.limit) => {
    if (!userId) return

    try {
      setLoading(true)
      
      // Get user's groups first
      const { data: userGroups, error: groupsError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId)
        .eq('is_active', true)

      if (groupsError) throw groupsError

      const groupIds = userGroups?.map(g => g.group_id) || []

      if (groupIds.length === 0) {
        setLoans([])
        setPagination(prev => ({ ...prev, total: 0, totalPages: 0 }))
        return
      }

      // Build query with server-side filtering and pagination
      let query = supabase
        .from('loans')
        .select(`
          *,
          groups ( name )
        `, { count: 'exact' })
        .in('group_id', groupIds)
        .order('created_at', { ascending: false })

      // Apply status filter
      if (filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }

      // Apply search filter
      if (debouncedSearchTerm) {
        query = query.or(`purpose.ilike.%${debouncedSearchTerm}%,groups.name.ilike.%${debouncedSearchTerm}%`)
      }

      // Apply pagination
      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) throw error
      
      setLoans(data || [])
      setPagination(prev => ({
        ...prev,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        page,
        limit
      }))
    } catch (err) {
      console.error('Error fetching loans:', err)
      setError('Failed to fetch loans')
    } finally {
      setLoading(false)
    }
  }, [userId, filters.status, debouncedSearchTerm, pagination.page, pagination.limit])

  const fetchGroups = useCallback(async () => {
    if (!userId) return

    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          group_id,
          role,
          groups(*)
        `)
        .eq('user_id', userId)
        .eq('is_active', true)

      if (error) throw error
      
      const userGroups = data?.map(item => item.groups).filter(Boolean) as unknown as Group[] || []
      const roles: { [groupId: string]: string } = {}
      
      data?.forEach(item => {
        roles[item.group_id] = item.role
      })
      
      setGroups(userGroups)
      setUserRoles(roles)
    } catch (err) {
      console.error('Error fetching groups:', err)
    }
  }, [userId])

  const fetchGroupMembers = useCallback(async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          user_id,
          role,
          joined_at,
          is_active,
          users (
            email,
            user_profiles (
              first_name,
              last_name
            )
          )
        `)
        .eq('group_id', groupId)
        .eq('is_active', true)

      if (error) throw error
      setGroupMembers((data as unknown as GroupMember[]) || [])
    } catch (err) {
      console.error('Error fetching group members:', err)
    }
  }, [])

  const createLoan = useCallback(async (formData: LoanFormData): Promise<boolean> => {
    if (!userId) return false

    setSaving(true)
    setError('')

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return false
      }

      // Prepare loan data
      const loanData: any = {
        group_id: formData.selectedGroup,
        amount: parseFloat(formData.amount),
        purpose: formData.purpose,
        due_date: formData.dueDate,
        repayment_schedule: formData.repaymentSchedule
      }

      // Determine borrower and auto-approve settings
      const userRole = userRoles[formData.selectedGroup]
      const isAdminOrTreasurer = userRole === 'admin' || userRole === 'treasurer'
      
      if (isAdminOrTreasurer && formData.selectedBorrower) {
        loanData.borrower_id = formData.selectedBorrower
        loanData.auto_approve = formData.autoApprove
      } else {
        loanData.borrower_id = userId
      }

      // Make API call to create loan
      const response = await fetch(`/api/groups/${formData.selectedGroup}/loans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(loanData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create loan')
      }

      // Refresh loans list
      await fetchLoans()
      return true
    } catch (err: any) {
      console.error('Error creating loan:', err)
      setError(err.message || 'Failed to create loan request')
      return false
    } finally {
      setSaving(false)
    }
  }, [userId, userRoles, fetchLoans])

  const refreshData = useCallback(async () => {
    await Promise.all([fetchLoans(), fetchGroups()])
  }, [fetchLoans, fetchGroups])

  const setPage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }, [])

  const setLimit = useCallback((limit: number) => {
    setPagination(prev => ({ ...prev, limit, page: 1 }))
  }, [])

  // Fetch data when dependencies change
  useEffect(() => {
    if (userId) {
      fetchLoans()
    }
  }, [userId, fetchLoans])

  useEffect(() => {
    if (userId) {
      fetchGroups()
    }
  }, [userId, fetchGroups])

  return {
    // Data
    loans,
    groups,
    groupMembers,
    userRoles,
    
    // Pagination
    pagination,
    setPage,
    setLimit,
    
    // State
    loading,
    saving,
    error,
    
    // Actions
    fetchLoans,
    fetchGroups,
    fetchGroupMembers,
    createLoan,
    refreshData,
    
    // Filters
    filters,
    setFilters,
    
    // Search
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm
  }
}
