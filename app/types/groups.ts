// Centralized types for groups module
export interface Group {
  id: string
  name: string
  description: string
  contribution_amount: number
  contribution_frequency: 'weekly' | 'monthly'
  interest_rate: number
  max_members: number
  is_private: boolean
  created_at: string
  updated_at?: string
  userRole?: string
  member_count?: number
  total_contributions?: number
  active_loans?: number
  financial_summary?: GroupFinancialSummary
}

export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  role: GroupRole
  is_active: boolean
  joined_at: string
  users?: {
    email: string
    user_profiles?: {
      first_name: string
      last_name: string
      phone?: string
    }
  }
  contribution_summary?: MemberContributionSummary
}

export interface GroupRole {
  type: 'admin' | 'treasurer' | 'member'
  permissions: string[]
}

export interface GroupFormData {
  name: string
  description: string
  contribution_amount: number
  contribution_frequency: 'weekly' | 'monthly'
  interest_rate: number
  max_members: number
  is_private: boolean
}

export interface GroupFilters {
  search: string
  role: 'all' | 'admin' | 'treasurer' | 'member'
  frequency: 'all' | 'weekly' | 'monthly'
  privacy: 'all' | 'private' | 'public'
  sortBy: 'name' | 'created_at' | 'member_count' | 'contribution_amount'
  sortOrder: 'asc' | 'desc'
}

export interface GroupFinancialSummary {
  total_contributions: number
  total_merry_go_round: number
  total_investments: number
  total_penalties: number
  active_loans: number
  total_loan_payments: number
  pending_contributions: number
  overdue_contributions: number
}

export interface MemberContributionSummary {
  total_contributed: number
  pending_contributions: number
  overdue_contributions: number
  last_contribution_date?: string
  next_contribution_due?: string
}

export interface GroupContribution {
  id: string
  group_id: string
  user_id: string
  amount: number
  contribution_date: string
  payment_method?: string
  notes?: string
  created_at: string
  member?: GroupMember
}

export interface GroupLoan {
  id: string
  group_id: string
  borrower_id: string
  amount: number
  purpose: string
  interest_rate: number
  term_months: number
  status: 'pending' | 'approved' | 'active' | 'completed' | 'defaulted'
  approved_by?: string
  approved_at?: string
  disbursed_at?: string
  due_date?: string
  created_at: string
  borrower?: GroupMember
  payments?: LoanPayment[]
}

export interface LoanPayment {
  id: string
  loan_id: string
  amount: number
  payment_date: string
  payment_method?: string
  notes?: string
  created_at: string
}

export interface MerryGoRound {
  id: string
  group_id: string
  round_number: number
  amount_per_member: number
  start_date: string
  end_date?: string
  status: 'active' | 'completed' | 'cancelled'
  winner_id?: string
  winner_selected_at?: string
  created_at: string
  participants?: MerryGoRoundParticipant[]
}

export interface MerryGoRoundParticipant {
  id: string
  merry_go_round_id: string
  user_id: string
  contribution_amount: number
  contribution_date?: string
  is_winner: boolean
  member?: GroupMember
}

// API Response types
export interface GroupsResponse {
  success: boolean
  groups: Group[]
  total?: number
  page?: number
  limit?: number
}

export interface GroupResponse {
  success: boolean
  group: Group
  members?: GroupMember[]
  financial_summary?: GroupFinancialSummary
}

export interface GroupMembersResponse {
  success: boolean
  members: GroupMember[]
  total?: number
}

export interface GroupContributionsResponse {
  success: boolean
  contributions: GroupContribution[]
  total?: number
  summary?: {
    total_amount: number
    pending_amount: number
    overdue_amount: number
  }
}

export interface GroupLoansResponse {
  success: boolean
  loans: GroupLoan[]
  total?: number
  summary?: {
    total_amount: number
    active_amount: number
    pending_amount: number
  }
}

// Form validation types
export interface GroupFormErrors {
  name?: string
  description?: string
  contribution_amount?: string
  contribution_frequency?: string
  interest_rate?: string
  max_members?: string
}

export interface MemberFormData {
  email: string
  role: 'admin' | 'treasurer' | 'member'
  message?: string
}

export interface ContributionFormData {
  amount: number
  contribution_date: string
  payment_method?: string
  notes?: string
}

export interface LoanFormData {
  borrower_id: string
  amount: number
  purpose: string
  term_months: number
  interest_rate?: number
}

// Statistics and analytics types
export interface GroupStatistics {
  total_groups: number
  active_groups: number
  total_members: number
  total_contributions: number
  total_loans: number
  average_group_size: number
  contribution_compliance_rate: number
}

export interface GroupAnalytics {
  contribution_trends: {
    period: string
    amount: number
    count: number
  }[]
  member_growth: {
    period: string
    new_members: number
    total_members: number
  }[]
  loan_performance: {
    period: string
    loans_approved: number
    loans_completed: number
    default_rate: number
  }[]
}
