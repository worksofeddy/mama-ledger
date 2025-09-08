export interface Loan {
  id: string
  group_id: string
  borrower_id: string
  amount: number
  interest_rate: number
  total_amount: number
  purpose: string
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'completed' | 'defaulted'
  approved_by?: string
  approved_at?: string
  disbursement_date?: string
  due_date: string
  repayment_schedule: string
  created_at: string
  updated_at: string
  // Joined data
  groups?: {
    name: string
  }
  borrower?: {
    email: string
    user_profiles?: {
      first_name: string
      last_name: string
    }
  }
  approver?: {
    email: string
    user_profiles?: {
      first_name: string
      last_name: string
    }
  }
}

export interface Group {
  id: string
  name: string
  description: string
  contribution_amount: number
  interest_rate: number
  max_members: number
  is_private: boolean
  created_at: string
}

export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  role: string
  joined_at: string
  is_active: boolean
}

export interface LoanFormData {
  selectedGroup: string
  amount: string
  purpose: string
  dueDate: string
  repaymentSchedule: string
  selectedBorrower: string
  autoApprove: boolean
}

export interface LoanFilters {
  status: string
  searchTerm: string
}

export type LoanStatus = 'pending' | 'approved' | 'rejected' | 'active' | 'completed' | 'defaulted'
export type RepaymentSchedule = 'monthly' | 'weekly' | 'quarterly' | 'annually'
export type GroupRole = 'admin' | 'treasurer' | 'member'
