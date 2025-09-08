import { useRouter } from 'next/navigation'
import { 
  Users, 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  Settings,
  Eye,
  Lock,
  Globe,
  Trash2
} from 'lucide-react'
import { formatCurrency } from '../../lib/utils'
import { Group } from '../../types/groups'

interface GroupCardProps {
  group: Group
  onViewGroup: (groupId: string) => void
  onEditGroup?: (groupId: string) => void
  onDeleteGroup?: (groupId: string) => void
}

export default function GroupCard({ 
  group, 
  onViewGroup, 
  onEditGroup, 
  onDeleteGroup 
}: GroupCardProps) {
  const router = useRouter()

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200'
      case 'treasurer': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'member': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case 'weekly': return 'bg-purple-100 text-purple-800'
      case 'monthly': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
              {group.name}
            </h3>
            {group.is_private ? (
              <Lock className="w-4 h-4 text-gray-400" />
            ) : (
              <Globe className="w-4 h-4 text-gray-400" />
            )}
          </div>
          <p className="text-gray-600 text-sm line-clamp-2">
            {group.description || 'No description available.'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {group.userRole && (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRoleColor(group.userRole)}`}>
              {group.userRole}
            </span>
          )}
        </div>
      </div>

      {/* Group Details */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-600">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm">Contribution</span>
          </div>
          <span className="font-semibold text-gray-900">
            {formatCurrency(group.contribution_amount)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">Frequency</span>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getFrequencyColor(group.contribution_frequency)}`}>
            {group.contribution_frequency}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-600">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Interest Rate</span>
          </div>
          <span className="font-semibold text-blue-600">
            {group.interest_rate}%
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-600">
            <Users className="w-4 h-4" />
            <span className="text-sm">Members</span>
          </div>
          <span className="font-semibold text-purple-600">
            {group.member_count || 0}/{group.max_members}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">Created</span>
          </div>
          <span className="text-sm text-gray-500">
            {formatDate(group.created_at)}
          </span>
        </div>
      </div>

      {/* Financial Summary */}
      {(group.total_contributions || group.active_loans) && (
        <div className="border-t border-gray-100 pt-4 mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Financial Summary</h4>
          <div className="grid grid-cols-2 gap-4">
            {group.total_contributions && (
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(group.total_contributions)}
                </p>
                <p className="text-xs text-gray-500">Total Contributions</p>
              </div>
            )}
            {group.active_loans && (
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {group.active_loans}
                </p>
                <p className="text-xs text-gray-500">Active Loans</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onViewGroup(group.id)}
          className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
        >
          <Eye className="w-4 h-4" />
          View Group
        </button>
        
        {group.userRole === 'admin' && (
          <div className="flex gap-1">
            {onEditGroup && (
              <button
                onClick={() => onEditGroup(group.id)}
                className="px-3 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center"
                title="Edit Group"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
            
            {onDeleteGroup && (
              <button
                onClick={() => onDeleteGroup(group.id)}
                className="px-3 py-2 bg-red-200 text-red-800 rounded-lg hover:bg-red-300 transition-colors flex items-center justify-center"
                title="Delete Group"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Privacy: {group.is_private ? 'Private' : 'Public'}</span>
          <span>Max: {group.max_members} members</span>
        </div>
      </div>
    </div>
  )
}
