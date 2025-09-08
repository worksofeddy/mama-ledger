import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Loan, Group, GroupMember, LoanFormData, LoanFilters } from '../types/loans'

interface UseLoansReturn {
  // Data
  loans: Loan[]
  groups: Group[]
  groupMembers: GroupMember[]
  userRoles: { [groupId: string]: string }
  
  // State
  loading: boolean
  saving: boolean
  error: string
  
  // Actions
  fetchLoans: () => Promise<void>
  fetchGroups: () => Promise<void>
  fetchGroupMembers: (groupId: string) => Promise<void>
  createLoan: (formData: LoanFormData) => Promise<boolean>
  deleteLoan: (loanId: string) => Promise<boolean>
  approveLoan: (loanId: string) => Promise<boolean>
  editLoan: (loanId: string, updates: Partial<LoanFormData>) => Promise<boolean>
  refreshData: () => Promise<void>
  
  // Filters
  filters: LoanFilters
  setFilters: (filters: LoanFilters) => void
  filteredLoans: Loan[]
}

export function useLoans(userId: string | null): UseLoansReturn {
  const [loans, setLoans] = useState<Loan[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([])
  const [userRoles, setUserRoles] = useState<{ [groupId: string]: string }>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState<LoanFilters>({
    status: 'all',
    searchTerm: ''
  })

  const fetchLoans = useCallback(async () => {
    if (!userId) {
      console.log('No userId available for fetchLoans')
      return
    }

    console.log('Fetching loans for userId:', userId)
    try {
      setLoading(true)
      
      // Get user's groups first
      const { data: userGroups, error: groupsError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId)
        .eq('is_active', true)

      if (groupsError) {
        console.error('Error fetching user groups:', groupsError)
        console.error('Groups error details:', JSON.stringify(groupsError, null, 2))
        throw groupsError
      }

      const groupIds = userGroups?.map(g => g.group_id) || []

      if (groupIds.length === 0) {
        setLoans([])
        return
      }

      // Fetch loans for user's groups
      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .in('group_id', groupIds)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Loans table error:', error)
        console.error('Loans error details:', JSON.stringify(error, null, 2))
        throw error
      }

      setLoans(data || [])
    } catch (err) {
      console.error('Error fetching loans:', err)
      console.error('Error details:', JSON.stringify(err, null, 2))
      setError('Failed to fetch loans')
    } finally {
      setLoading(false)
    }
  }, [userId])

  const fetchGroups = useCallback(async () => {
    if (!userId) {
      console.log('No userId available for fetchGroups')
      return
    }

    console.log('Fetching groups for userId:', userId)
    try {
      // First, try a simple query to get user's group memberships
      const { data, error } = await supabase
        .from('group_members')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)

      if (error) {
        console.error('Group members error:', error)
        console.error('Group members error details:', JSON.stringify(error, null, 2))
        throw error
      }

      // For now, just set basic data - we'll enhance this later
      const roles: { [groupId: string]: string } = {}
      data?.forEach(item => {
        roles[item.group_id] = item.role
      })
      
      setUserRoles(roles)
      
      // Get group details separately
      if (data && data.length > 0) {
        const groupIds = data.map(item => item.group_id)
        const { data: groupsData, error: groupsError } = await supabase
          .from('groups')
          .select('*')
          .in('id', groupIds)

        if (groupsError) {
          console.error('Groups error:', groupsError)
        } else {
          setGroups(groupsData || [])
        }
      }
    } catch (err) {
      console.error('Error fetching groups:', err)
      console.error('Groups fetch error details:', JSON.stringify(err, null, 2))
    }
  }, [userId])

  const fetchGroupMembers = useCallback(async (groupId: string) => {
    try {
      // First, get basic group members data
      const { data, error } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .eq('is_active', true)

      if (error) {
        console.error('Group members error:', error)
        throw error
      }

      // For now, just set the basic data - we'll enhance this later
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
      console.log('Creating loan with data:', formData)
      
      // Get group interest rate first
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('interest_rate')
        .eq('id', formData.selectedGroup)
        .single()

      if (groupError) {
        console.error('Error fetching group:', groupError)
        throw new Error('Failed to fetch group details')
      }

      const interestRate = group.interest_rate || 0
      const loanAmount = parseFloat(formData.amount)
      const totalAmount = loanAmount + (loanAmount * interestRate / 100)

      // Determine borrower ID
      const userRole = userRoles[formData.selectedGroup]
      const isAdminOrTreasurer = userRole === 'admin' || userRole === 'treasurer'
      
      let borrowerId = userId // Default to current user
      if (isAdminOrTreasurer && formData.selectedBorrower) {
        borrowerId = formData.selectedBorrower
      }

      // Create loan directly with Supabase
      const { data: loan, error: loanError } = await supabase
        .from('loans')
        .insert({
          group_id: formData.selectedGroup,
          borrower_id: borrowerId,
          amount: loanAmount,
          interest_rate: interestRate,
          total_amount: totalAmount,
          purpose: formData.purpose,
          due_date: formData.dueDate,
          repayment_schedule: formData.repaymentSchedule,
          status: 'pending'
        })
        .select()
        .single()

      if (loanError) {
        console.error('Error creating loan:', loanError)
        throw new Error(`Failed to create loan: ${loanError.message}`)
      }

      console.log('Loan created successfully:', loan)

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

  const deleteLoan = useCallback(async (loanId: string): Promise<boolean> => {
    if (!userId) return false

    setSaving(true)
    setError('')

    try {
      console.log('Deleting loan:', loanId)
      
      const { error } = await supabase
        .from('loans')
        .delete()
        .eq('id', loanId)

      if (error) {
        console.error('Error deleting loan:', error)
        throw new Error(`Failed to delete loan: ${error.message}`)
      }

      console.log('Loan deleted successfully')
      
      // Refresh loans list
      await fetchLoans()
      return true
    } catch (err: any) {
      console.error('Error deleting loan:', err)
      setError(err.message || 'Failed to delete loan')
      return false
    } finally {
      setSaving(false)
    }
  }, [userId, fetchLoans])

  const approveLoan = useCallback(async (loanId: string): Promise<boolean> => {
    if (!userId) return false

    setSaving(true)
    setError('')

    try {
      console.log('Approving loan:', loanId)
      
      const { error } = await supabase
        .from('loans')
        .update({
          status: 'approved',
          approved_by: userId,
          approved_at: new Date().toISOString()
        })
        .eq('id', loanId)

      if (error) {
        console.error('Error approving loan:', error)
        throw new Error(`Failed to approve loan: ${error.message}`)
      }

      console.log('Loan approved successfully')
      
      // Refresh loans list
      await fetchLoans()
      return true
    } catch (err: any) {
      console.error('Error approving loan:', err)
      setError(err.message || 'Failed to approve loan')
      return false
    } finally {
      setSaving(false)
    }
  }, [userId, fetchLoans])

  const editLoan = useCallback(async (loanId: string, updates: Partial<LoanFormData>): Promise<boolean> => {
    if (!userId) return false

    setSaving(true)
    setError('')

    try {
      console.log('Editing loan:', loanId, updates)
      
      // Prepare update data
      const updateData: any = {}
      
      if (updates.amount) {
        updateData.amount = parseFloat(updates.amount)
      }
      if (updates.purpose) {
        updateData.purpose = updates.purpose
      }
      if (updates.dueDate) {
        updateData.due_date = updates.dueDate
      }
      if (updates.repaymentSchedule) {
        updateData.repayment_schedule = updates.repaymentSchedule
      }

      // If amount changed, recalculate total amount
      if (updates.amount) {
        const { data: loan, error: loanError } = await supabase
          .from('loans')
          .select('interest_rate')
          .eq('id', loanId)
          .single()

        if (loanError) {
          throw new Error('Failed to fetch loan details for recalculation')
        }

        const interestRate = loan.interest_rate || 0
        const loanAmount = parseFloat(updates.amount)
        updateData.total_amount = loanAmount + (loanAmount * interestRate / 100)
      }

      const { error } = await supabase
        .from('loans')
        .update(updateData)
        .eq('id', loanId)

      if (error) {
        console.error('Error editing loan:', error)
        throw new Error(`Failed to edit loan: ${error.message}`)
      }

      console.log('Loan edited successfully')
      
      // Refresh loans list
      await fetchLoans()
      return true
    } catch (err: any) {
      console.error('Error editing loan:', err)
      setError(err.message || 'Failed to edit loan')
      return false
    } finally {
      setSaving(false)
    }
  }, [userId, fetchLoans])

  const refreshData = useCallback(async () => {
    await Promise.all([fetchLoans(), fetchGroups()])
  }, [fetchLoans, fetchGroups])

  // Filter loans based on current filters
  const filteredLoans = loans.filter(loan => {
    const matchesStatus = filters.status === 'all' || loan.status === filters.status
    const matchesSearch = filters.searchTerm === '' || 
      loan.purpose.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      loan.groups?.name.toLowerCase().includes(filters.searchTerm.toLowerCase())
    
    return matchesStatus && matchesSearch
  })

  // Initial data fetch
  useEffect(() => {
    if (userId) {
      refreshData()
    }
  }, [userId, refreshData])

  return {
    // Data
    loans,
    groups,
    groupMembers,
    userRoles,
    
    // State
    loading,
    saving,
    error,
    
    // Actions
    fetchLoans,
    fetchGroups,
    fetchGroupMembers,
    createLoan,
    deleteLoan,
    approveLoan,
    editLoan,
    refreshData,
    
    // Filters
    filters,
    setFilters,
    filteredLoans
  }
}
