import React from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import { Transaction } from '../../types'

interface CategoryData {
  name: string
  value: number
  color: string
}

interface CategoryBreakdownChartProps {
  transactions: Transaction[]
  type: 'income' | 'expense'
  height?: number
}

const COLORS = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', 
  '#f59e0b', '#ef4444', '#ec4899', '#84cc16',
  '#f97316', '#6366f1', '#14b8a6', '#f43f5e'
]

export default function CategoryBreakdownChart({ 
  transactions, 
  type, 
  height = 300 
}: CategoryBreakdownChartProps) {
  // Process transactions into chart data
  const processData = (): CategoryData[] => {
    const categoryMap = new Map<string, number>()
    
    transactions
      .filter(t => t.type === type)
      .forEach(transaction => {
        const current = categoryMap.get(transaction.category) || 0
        categoryMap.set(transaction.category, current + transaction.amount)
      })

    return Array.from(categoryMap.entries())
      .map(([name, value], index) => ({
        name,
        value: Number(value.toFixed(2)),
        color: COLORS[index % COLORS.length],
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8) // Show top 8 categories
  }

  const chartData = processData()

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-gray-600 font-medium">{data.name}</p>
          <p className="text-sm font-semibold" style={{ color: data.color }}>
            ${data.value.toFixed(2)}
          </p>
        </div>
      )
    }
    return null
  }

  const CustomLegend = ({ payload }: any) => (
    <div className="flex flex-wrap gap-2 mt-4">
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-gray-600">{entry.value}</span>
        </div>
      ))}
    </div>
  )

  if (chartData.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {type === 'income' ? 'Income' : 'Expense'} Categories
        </h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          No {type} data available
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {type === 'income' ? 'Income' : 'Expense'} Categories
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => 
              `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`
            }
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <CustomLegend payload={chartData.map((item, index) => ({
        value: item.name,
        color: item.color,
        type: 'circle',
      }))} />
    </div>
  )
}
