'use client'

import { X } from 'lucide-react'

interface KeypadProps {
  amount: string
  onAmountChange: (newAmount: string) => void
}

export default function Keypad({ amount, onAmountChange }: KeypadProps) {
  const handleKeyPress = (key: string) => {
    if (key === 'backspace') {
      onAmountChange(amount.slice(0, -1))
      return
    }

    if (key === '.' && amount.includes('.')) {
      // Prevent multiple decimal points
      return
    }

    const parts = amount.split('.')
    if (parts.length > 1 && parts[1].length >= 2) {
      // Limit to 2 decimal places
      return
    }
    
    if (amount === '0' && key !== '.') {
        onAmountChange(key)
        return
    }

    onAmountChange(amount + key)
  }

  const keypadButtons = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    '.', '0', 'backspace'
  ]

  return (
    <div className="grid grid-cols-3 gap-2">
      {keypadButtons.map((key) => (
        <button
          key={key}
          onClick={() => handleKeyPress(key)}
          className="py-4 text-2xl font-bold bg-white rounded-lg shadow-sm hover:bg-gray-100 active:bg-gray-200 transition-colors"
        >
          {key === 'backspace' ? <X className="mx-auto" /> : key}
        </button>
      ))}
    </div>
  )
}
