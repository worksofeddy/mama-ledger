'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { Camera, Upload, Eye, Trash2, Plus, Search, Filter } from 'lucide-react'

interface Receipt {
  id: string
  image_url: string
  description: string
  amount: number
  category: string
  date: string
  created_at: string
  transaction_id?: string
}

interface Transaction {
  id: string
  type: string
  amount: number
  category: string
  description: string
  date: string
}

export default function ReceiptsPage() {
  const [user, setUser] = useState<any>(null)
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  
  // Form states
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [date, setDate] = useState('')
  const [linkToTransaction, setLinkToTransaction] = useState(false)
  const [selectedTransactionId, setSelectedTransactionId] = useState('')
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user?.id) {
      fetchReceipts()
      fetchTransactions()
    }
  }, [user])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      window.location.href = '/login'
    } else {
      setUser(session.user)
    }
  }

  const fetchReceipts = async () => {
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setReceipts(data || [])
    } catch (err) {
      console.error('Error fetching receipts:', err)
    }
  }

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTransactions(data || [])
    } catch (err) {
      console.error('Error fetching transactions:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile || !description || !amount) return

    try {
      setUploading(true)

      // Upload image to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, selectedFile)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName)

      // Save receipt to database
      const receiptData: any = {
        user_id: user.id,
        image_url: publicUrl,
        description,
        amount: parseFloat(amount),
        category,
        date: date || new Date().toISOString().split('T')[0]
      }

      if (linkToTransaction && selectedTransactionId) {
        receiptData.transaction_id = selectedTransactionId
      }

      const { error: insertError } = await supabase
        .from('receipts')
        .insert(receiptData)

      if (insertError) throw insertError

      // Reset form and refresh
      resetForm()
      fetchReceipts()
      setShowUploadForm(false)

    } catch (err) {
      console.error('Error uploading receipt:', err)
      alert('Error uploading receipt. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const resetForm = () => {
    setSelectedFile(null)
    setPreviewUrl('')
    setDescription('')
    setAmount('')
    setCategory('')
    setDate('')
    setLinkToTransaction(false)
    setSelectedTransactionId('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDeleteReceipt = async (receiptId: string) => {
    if (!confirm('Are you sure you want to delete this receipt?')) return

    try {
      const { error } = await supabase
        .from('receipts')
        .delete()
        .eq('id', receiptId)

      if (error) throw error
      fetchReceipts()

    } catch (err) {
      console.error('Error deleting receipt:', err)
    }
  }

  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch = searchTerm === '' || 
      receipt.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.category.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = categoryFilter === 'all' || receipt.category === categoryFilter
    
    const matchesDate = dateFilter === 'all' || 
      (dateFilter === 'today' && receipt.date === new Date().toISOString().split('T')[0]) ||
      (dateFilter === 'week' && new Date(receipt.date) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) ||
      (dateFilter === 'month' && new Date(receipt.date) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))

    return matchesSearch && matchesCategory && matchesDate
  })

  const getUniqueCategories = () => {
    const categories = receipts.map(r => r.category)
    return ['all', ...Array.from(new Set(categories))]
  }

  if (loading) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your receipts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Photo Receipts</h1>
          <p className="text-gray-600">Keep visual records of your business transactions</p>
        </div>

        {/* Upload Button */}
        <div className="mb-8">
          <button
            onClick={() => setShowUploadForm(true)}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
          >
            <Plus className="w-5 h-5 inline mr-2" />
            Add New Receipt
          </button>
        </div>

        {/* Upload Form */}
        {showUploadForm && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Upload New Receipt</h2>
              <p className="text-sm text-gray-600 mt-1">Take a photo or upload an image of your receipt</p>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleUpload} className="space-y-6">
                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Receipt Image</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      required
                    />
                    {!previewUrl ? (
                      <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer">
                        <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-2">Click to select or drag and drop</p>
                        <p className="text-sm text-gray-500">PNG, JPG, JPEG up to 10MB</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <img 
                          src={previewUrl} 
                          alt="Preview" 
                          className="max-w-xs mx-auto rounded-lg shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFile(null)
                            setPreviewUrl('')
                            if (fileInputRef.current) fileInputRef.current.value = ''
                          }}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Remove Image
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What is this receipt for?"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-gray-500">$</span>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      <option value="">Select category</option>
                      <option value="Stock">Stock</option>
                      <option value="Transport">Transport</option>
                      <option value="Rent">Rent</option>
                      <option value="Utilities">Utilities</option>
                      <option value="Food">Food</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Link to Transaction */}
                <div className="border-t pt-6">
                  <div className="flex items-center mb-4">
                    <input
                      type="checkbox"
                      id="linkToTransaction"
                      checked={linkToTransaction}
                      onChange={(e) => setLinkToTransaction(e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="linkToTransaction" className="ml-2 text-sm text-gray-700">
                      Link to existing transaction
                    </label>
                  </div>
                  
                  {linkToTransaction && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Select Transaction</label>
                      <select
                        value={selectedTransactionId}
                        onChange={(e) => setSelectedTransactionId(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">Choose a transaction</option>
                        {transactions.map((transaction) => (
                          <option key={transaction.id} value={transaction.id}>
                            {transaction.date} - {transaction.category} - ${transaction.amount} ({transaction.type})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadForm(false)
                      resetForm()
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || !selectedFile}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {uploading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Uploading...
                      </div>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 inline mr-2" />
                        Upload Receipt
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search receipts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Category Filter */}
              <div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {getUniqueCategories().map((cat) => (
                    <option key={cat} value={cat}>
                      {cat === 'all' ? 'All Categories' : cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Filter */}
              <div>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Receipts Grid */}
        {filteredReceipts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No receipts found</h3>
            <p className="text-gray-600 mb-6">
              {receipts.length === 0 
                ? "Start by uploading your first receipt to keep track of your business expenses"
                : "Try adjusting your search or filters to find what you're looking for"
              }
            </p>
            {receipts.length === 0 && (
              <button
                onClick={() => setShowUploadForm(true)}
                className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-5 h-5 inline mr-2" />
                Upload Your First Receipt
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredReceipts.map((receipt) => (
              <div key={receipt.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Receipt Image */}
                <div className="aspect-square bg-gray-100 relative group">
                  <img
                    src={receipt.image_url}
                    alt={receipt.description}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => window.open(receipt.image_url, '_blank')}
                      className="bg-white text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Receipt Details */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                    {receipt.description}
                  </h3>
                  
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex justify-between">
                      <span>Amount:</span>
                      <span className="font-medium text-gray-900">${receipt.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Category:</span>
                      <span className="font-medium text-gray-900">{receipt.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Date:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(receipt.date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between">
                    <button
                      onClick={() => handleDeleteReceipt(receipt.id)}
                      className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {receipt.transaction_id && (
                      <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                        Linked
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tips */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">💡 Receipt Management Tips</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <p className="font-medium mb-2">📱 Use Your Phone</p>
              <p>Take clear photos of receipts immediately after purchase for best quality.</p>
            </div>
            <div>
              <p className="font-medium mb-2">🏷️ Add Details</p>
              <p>Include description, amount, and category to make receipts easily searchable.</p>
            </div>
            <div>
              <p className="font-medium mb-2">🔗 Link Transactions</p>
              <p>Connect receipts to existing transactions for better record keeping.</p>
            </div>
            <div>
              <p className="font-medium mb-2">🗂️ Organize Regularly</p>
              <p>Review and organize your receipts monthly to maintain clean records.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
