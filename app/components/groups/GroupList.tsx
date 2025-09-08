import { Group } from '../../types/groups'
import GroupCard from './GroupCard'

interface GroupListProps {
  groups: Group[]
  loading: boolean
  onViewGroup: (groupId: string) => void
  onEditGroup?: (groupId: string) => void
  onDeleteGroup?: (groupId: string) => void
}

export default function GroupList({ 
  groups, 
  loading, 
  onViewGroup, 
  onEditGroup, 
  onDeleteGroup 
}: GroupListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, index) => (
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
    )
  }

  if (groups.length === 0) {
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

  return (
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
  )
}
