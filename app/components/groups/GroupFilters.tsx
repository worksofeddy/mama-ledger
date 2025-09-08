import { Search, Filter, SortAsc, SortDesc } from 'lucide-react'
import { GroupFilters as GroupFiltersType } from '../../types/groups'

interface GroupFiltersProps {
  filters: GroupFiltersType
  onFiltersChange: (filters: GroupFiltersType) => void
  totalGroups: number
  filteredCount: number
}

export default function GroupFilters({ 
  filters, 
  onFiltersChange, 
  totalGroups, 
  filteredCount 
}: GroupFiltersProps) {
  const updateFilter = (key: keyof GroupFiltersType, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const toggleSortOrder = () => {
    updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Filter Groups</h3>
        <div className="text-sm text-gray-500">
          Showing {filteredCount} of {totalGroups} groups
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="lg:col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Groups
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by name or description..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Role Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Role
          </label>
          <select
            value={filters.role}
            onChange={(e) => updateFilter('role', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="treasurer">Treasurer</option>
            <option value="member">Member</option>
          </select>
        </div>

        {/* Frequency Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Frequency
          </label>
          <select
            value={filters.frequency}
            onChange={(e) => updateFilter('frequency', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="all">All Frequencies</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        {/* Privacy Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Privacy
          </label>
          <select
            value={filters.privacy}
            onChange={(e) => updateFilter('privacy', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="all">All Groups</option>
            <option value="private">Private Only</option>
            <option value="public">Public Only</option>
          </select>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Sort by:</label>
            <select
              value={filters.sortBy}
              onChange={(e) => updateFilter('sortBy', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="name">Name</option>
              <option value="created_at">Date Created</option>
              <option value="member_count">Member Count</option>
              <option value="contribution_amount">Contribution Amount</option>
            </select>
          </div>

          <button
            onClick={toggleSortOrder}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {filters.sortOrder === 'asc' ? (
              <SortAsc className="w-4 h-4" />
            ) : (
              <SortDesc className="w-4 h-4" />
            )}
            {filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          </button>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-700">Quick filters:</span>
          <button
            onClick={() => updateFilter('role', 'admin')}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              filters.role === 'admin' 
                ? 'bg-red-100 text-red-800' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            My Admin Groups
          </button>
          <button
            onClick={() => updateFilter('frequency', 'weekly')}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              filters.frequency === 'weekly' 
                ? 'bg-purple-100 text-purple-800' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Weekly Groups
          </button>
          <button
            onClick={() => updateFilter('privacy', 'private')}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              filters.privacy === 'private' 
                ? 'bg-orange-100 text-orange-800' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Private Groups
          </button>
          <button
            onClick={() => onFiltersChange({
              search: '',
              role: 'all',
              frequency: 'all',
              privacy: 'all',
              sortBy: 'created_at',
              sortOrder: 'desc'
            })}
            className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>
    </div>
  )
}
