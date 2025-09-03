import { Tables } from './supabase'

// Re-export Supabase types for convenience
export type User = Tables<'users'>
export type Transaction = Tables<'transactions'>
export type Category = Tables<'categories'>

// Additional interfaces for the application
export interface DashboardStats {
  totalIncome: number
  totalExpenses: number
  netBalance: number
  monthlyIncome: number
  monthlyExpenses: number
  monthlyBalance: number
}

export interface BookkeepingStats {
  todayIncome: number
  todayExpenses: number
  todayNet: number
  weekIncome: number
  weekExpenses: number
  weekNet: number
}

// Form types for better UX
export interface LoginFormData {
  email: string
  password: string
}

export interface RegisterFormData {
  email: string
  password: string
  fullName: string
}

export interface TransactionFormData {
  type: 'income' | 'expense'
  amount: number
  description: string
  category: string
  date: string
}
