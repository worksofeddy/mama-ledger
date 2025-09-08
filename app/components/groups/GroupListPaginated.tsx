import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Group } from '../../types/groups'
import GroupCard from './GroupCard'

interface GroupListPaginatedProps {
  groups: Group[]
  loading: boolean
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  hasNextPage: boolean
  hasPrevPage: boolean
  showingFrom: number
  showingTo: number
  onViewGroup: (groupId: string) => void
  onEditGroup?: (groupId: string) => void
  onDeleteGroup?: (groupId: string) => void
  onPageChange: (page: number) => void
  onNextPage: () => void
  onPrevPage: () => void
}

export default function GroupListPaginated({ 
  groups, 
  loading, 
  pagination,
  hasNextPage,
  hasPrevPage,
  showingFrom,
  showingTo,
  onViewGroup, 
  onEditGroup, 
  onDeleteGroup,
  onPageChange,
  onNextPage,
  onPrevPage
}: GroupListPaginatedProps) {
  if (loading && groups.length === 0) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(pagination.limit)].map((_, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
                <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
              </div>
              <div className="space-y-3 mb-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  </div>
                ))}
              </div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (groups.length === 0 && !loading) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No groups found</h3>
        <p className="text-gray-600 mb-6">
          Create your first group to start table banking with your community.
        </p>
      </div>
    )
  }

  // Generate page numbers for pagination
  const generatePageNumbers = () => {
    const pages = []
    const { page, totalPages } = pagination
    
    // Always show first page
    if (page > 3) {
      pages.push(1)
      if (page > 4) pages.push('...')
    }
    
    // Show pages around current page
    const start = Math.max(1, page - 2)
    const end = Math.min(totalPages, page + 2)
    
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    
    // Always show last page
    if (page < totalPages - 2) {
      if (page < totalPages - 3) pages.push('...')
      pages.push(totalPages)
    }
    
    return pages
  }

  return (
    <div className="space-y-6">
      {/* Results info */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div>
          Showing {showingFrom} to {showingTo} of {pagination.total} groups
        </div>
        <div>
          Page {pagination.page} of {pagination.totalPages}
        </div>
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group) => (
          <GroupCard
            key={group.id}
            group={group}
            onViewGroup={onViewGroup}
            onEditGroup={onEditGroup}
            onDeleteGroup={onDeleteGroup}
          />
        ))}
      </div>

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-6 py-4 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(1)}
              disabled={!hasPrevPage}
              className="p-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="First page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={onPrevPage}
              disabled={!hasPrevPage}
              className="p-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            {generatePageNumbers().map((pageNum, index) => (
              <button
                key={index}
                onClick={() => typeof pageNum === 'number' ? onPageChange(pageNum) : undefined}
                disabled={pageNum === '...'}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pageNum === pagination.page
                    ? 'bg-indigo-600 text-white'
                    : pageNum === '...'
                    ? 'text-gray-400 cursor-default'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {pageNum}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNextPage}
              disabled={!hasNextPage}
              className="p-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(pagination.totalPages)}
              disabled={!hasNextPage}
              className="p-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Last page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Loading overlay for page changes */}
      {loading && groups.length > 0 && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
          <div className="flex items-center gap-2 text-gray-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
            Loading...
          </div>
        </div>
      )}
    </div>
  )
}
