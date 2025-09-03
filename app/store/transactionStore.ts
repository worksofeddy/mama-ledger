import { create } from 'zustand'
import { Transaction, Category } from '../types'

interface TransactionState {
  transactions: Transaction[]
  categories: Category[]
  isLoading: boolean
  error: string | null
  filters: {
    type: 'all' | 'income' | 'expense'
    dateRange: 'all' | 'week' | 'month' | 'year'
    category: string
  }
}

interface TransactionActions {
  setTransactions: (transactions: Transaction[]) => void
  addTransaction: (transaction: Transaction) => void
  updateTransaction: (id: string, updates: Partial<Transaction>) => void
  deleteTransaction: (id: string) => void
  setCategories: (categories: Category[]) => void
  addCategory: (category: Category) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setFilters: (filters: Partial<TransactionState['filters']>) => void
  clearFilters: () => void
  getFilteredTransactions: () => Transaction[]
  getStats: () => {
    totalIncome: number
    totalExpenses: number
    netBalance: number
    monthlyIncome: number
    monthlyExpenses: number
    monthlyBalance: number
  }
}

type TransactionStore = TransactionState & TransactionActions

export const useTransactionStore = create<TransactionStore>((set, get) => ({
  // Initial state
  transactions: [],
  categories: [],
  isLoading: false,
  error: null,
  filters: {
    type: 'all',
    dateRange: 'all',
    category: '',
  },

  // Actions
  setTransactions: (transactions) => set({ transactions }),
  addTransaction: (transaction) => set((state) => ({ 
    transactions: [transaction, ...state.transactions] 
  })),
  updateTransaction: (id, updates) => set((state) => ({
    transactions: state.transactions.map(t => 
      t.id === id ? { ...t, ...updates } : t
    )
  })),
  deleteTransaction: (id) => set((state) => ({
    transactions: state.transactions.filter(t => t.id !== id)
  })),
  setCategories: (categories) => set({ categories }),
  addCategory: (category) => set((state) => ({ 
    categories: [...state.categories, category] 
  })),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters }
  })),
  clearFilters: () => set({
    filters: { type: 'all', dateRange: 'all', category: '' }
  }),

  // Computed values
  getFilteredTransactions: () => {
    const { transactions, filters } = get()
    let filtered = transactions

    // Filter by type
    if (filters.type !== 'all') {
      filtered = filtered.filter(t => t.type === filters.type)
    }

    // Filter by category
    if (filters.category) {
      filtered = filtered.filter(t => t.category === filters.category)
    }

    // Filter by date range
    if (filters.dateRange !== 'all') {
      const now = new Date()
      const startDate = new Date()
      
      switch (filters.dateRange) {
        case 'week':
          startDate.setDate(now.getDate() - 7)
          break
        case 'month':
          startDate.setMonth(now.getMonth() - 1)
          break
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1)
          break
      }
      
      filtered = filtered.filter(t => new Date(t.date) >= startDate)
    }

    return filtered
  },

  getStats: () => {
    const { transactions } = get()
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)

    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)

    const monthlyTransactions = transactions.filter(t => {
      const date = new Date(t.date)
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear
    })

    const monthlyIncome = monthlyTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)

    const monthlyExpenses = monthlyTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)

    return {
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      monthlyIncome,
      monthlyExpenses,
      monthlyBalance: monthlyIncome - monthlyExpenses,
    }
  },
}))
