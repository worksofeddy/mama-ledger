describe('Financial Calculations', () => {
  describe('Currency Formatting', () => {
    it('formats positive amounts correctly', () => {
      const amount = 1234.56
      const formatted = amount.toLocaleString('en-KE', { 
        style: 'currency', 
        currency: 'KES' 
      })
      
      expect(formatted).toBe('Ksh\u00A01,234.56')
    })

    it('formats zero amounts correctly', () => {
      const amount = 0
      const formatted = amount.toLocaleString('en-KE', { 
        style: 'currency', 
        currency: 'KES' 
      })
      
      expect(formatted).toBe('Ksh\u00A00.00')
    })

    it('formats negative amounts correctly', () => {
      const amount = -567.89
      const formatted = amount.toLocaleString('en-KE', { 
        style: 'currency', 
        currency: 'KES' 
      })
      
      expect(formatted).toBe('-Ksh\u00A0567.89')
    })
  })

  describe('Percentage Calculations', () => {
    it('calculates percentage correctly', () => {
      const part = 25
      const total = 100
      const percentage = (part / total) * 100
      
      expect(percentage).toBe(25)
    })

    it('handles zero total gracefully', () => {
      const part = 25
      const total = 0
      const percentage = total === 0 ? 0 : (part / total) * 100
      
      expect(percentage).toBe(0)
    })

    it('calculates budget progress percentage', () => {
      const spent = 80
      const budget = 100
      const progress = Math.min((spent / budget) * 100, 100)
      
      expect(progress).toBe(80)
    })

    it('caps progress at 100%', () => {
      const spent = 120
      const budget = 100
      const progress = Math.min((spent / budget) * 100, 100)
      
      expect(progress).toBe(100)
    })
  })

  describe('Date Calculations', () => {
    it('calculates date ranges correctly', () => {
      const today = new Date('2024-01-15')
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - today.getDay())
      
      expect(startOfWeek.getDay()).toBe(0) // Sunday
    })

    it('handles month boundaries', () => {
      const date = new Date('2024-01-31')
      const nextMonth = new Date(date)
      nextMonth.setMonth(date.getMonth() + 1)
      
      expect(nextMonth.getMonth()).toBe(2) // March (0-indexed, so 2 = March)
    })

    it('calculates days between dates', () => {
      const start = new Date('2024-01-01')
      const end = new Date('2024-01-15')
      const diffTime = Math.abs(end.getTime() - start.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      expect(diffDays).toBe(14)
    })
  })

  describe('Array Operations', () => {
    it('filters transactions by type', () => {
      const transactions = [
        { type: 'income', amount: 100 },
        { type: 'expense', amount: 50 },
        { type: 'income', amount: 200 },
      ]
      
      const income = transactions.filter(t => t.type === 'income')
      const expenses = transactions.filter(t => t.type === 'expense')
      
      expect(income).toHaveLength(2)
      expect(expenses).toHaveLength(1)
    })

    it('calculates totals correctly', () => {
      const transactions = [
        { amount: 100 },
        { amount: 200 },
        { amount: 300 },
      ]
      
      const total = transactions.reduce((sum, t) => sum + t.amount, 0)
      
      expect(total).toBe(600)
    })

    it('groups transactions by category', () => {
      const transactions = [
        { category: 'Food', amount: 50 },
        { category: 'Transport', amount: 30 },
        { category: 'Food', amount: 25 },
      ]
      
      const grouped = transactions.reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount
        return acc
      }, {} as Record<string, number>)
      
      expect(grouped.Food).toBe(75)
      expect(grouped.Transport).toBe(30)
    })
  })

  describe('Validation Functions', () => {
    it('validates required fields', () => {
      const requiredFields = ['type', 'amount', 'description', 'category']
      const data = { type: 'income', amount: 100, description: 'Test', category: 'Sales' }
      
      const isValid = requiredFields.every(field => data[field as keyof typeof data])
      
      expect(isValid).toBe(true)
    })

    it('detects missing required fields', () => {
      const requiredFields = ['type', 'amount', 'description', 'category']
      const data = { type: 'income', amount: 100 } // Missing description and category
      
      const isValid = requiredFields.every(field => data[field as keyof typeof data])
      
      expect(isValid).toBe(false)
    })

    it('validates amount is positive', () => {
      const amount = 100
      const isValid = amount > 0
      
      expect(isValid).toBe(true)
    })

    it('rejects negative amounts', () => {
      const amount = -50
      const isValid = amount > 0
      
      expect(isValid).toBe(false)
    })
  })
})
