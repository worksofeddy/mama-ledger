import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Bookkeeping - Mama Ledger',
  description: 'Daily financial management and record keeping',
}

export default function BookkeepingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 mr-4">
                ← Back to Dashboard
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">Daily Money</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Manage your daily finances</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content - Full width since navigation is handled by the page itself */}
      <main className="w-full">
        {children}
      </main>
    </div>
  )
}
