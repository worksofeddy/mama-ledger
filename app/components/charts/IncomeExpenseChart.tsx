import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'
import { Transaction } from '../../types'

interface ChartData {
  date: string
  income: number
  expenses: number
  net: number
}

interface IncomeExpenseChartProps {
  transactions: Transaction[]
  height?: number
}

export default function IncomeExpenseChart({ 
  transactions, 
  height = 300 
}: IncomeExpenseChartProps) {
  // Process transactions into chart data
  const processData = (): ChartData[] => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      return date.toISOString().split('T')[0]
    }).reverse()

    return last30Days.map(date => {
      const dayTransactions = transactions.filter(t => 
        t.date === date
      )

      const income = dayTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0)

      const expenses = dayTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0)

      return {
        date: new Date(date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }),
        income,
        expenses,
        net: income - expenses,
      }
    })
  }

  const chartData = processData()

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-gray-600 font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              style={{ color: entry.color }}
              className="text-sm"
            >
              {entry.name}: ${entry.value.toFixed(2)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Income vs Expenses (Last 30 Days)
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            stroke="#6b7280"
            fontSize={12}
          />
          <YAxis 
            stroke="#6b7280"
            fontSize={12}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Area
            type="monotone"
            dataKey="income"
            stackId="1"
            stroke="#10b981"
            fill="#10b981"
            fillOpacity={0.3}
            name="Income"
          />
          <Area
            type="monotone"
            dataKey="expenses"
            stackId="1"
            stroke="#ef4444"
            fill="#ef4444"
            fillOpacity={0.3}
            name="Expenses"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
