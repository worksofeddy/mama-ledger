'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, AlertCircle, RefreshCw } from 'lucide-react'
import { useGroups } from '../../hooks/useGroups'
import { GroupFormData } from '../../types/groups'
import GroupList from '../../components/groups/GroupList'
import GroupFilters from '../../components/groups/GroupFilters'
import GroupForm from '../../components/groups/GroupForm'

export default function GroupsPage() {
  const router = useRouter()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState<GroupFormData | null>(null)

  const {
    groups,
    loading,
    saving,
    error,
    user,
    filters,
    setFilters,
    createGroup,
    updateGroup,
    deleteGroup,
    refreshData,
    validateGroupForm,
    totalGroups,
    filteredCount
  } = useGroups()

  const handleViewGroup = (groupId: string) => {
    router.push(`/groups/${groupId}`)
  }

  const handleEditGroup = (groupId: string) => {
    const group = groups.find(g => g.id === groupId)
    if (group) {
      setEditingGroup({
        name: group.name,
        description: group.description,
        contribution_amount: group.contribution_amount,
        contribution_frequency: group.contribution_frequency,
        interest_rate: group.interest_rate,
        max_members: group.max_members,
        is_private: group.is_private
      })
    }
  }

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      return
    }

    const result = await deleteGroup(groupId)
    if (!result.success) {
      alert(`Failed to delete group: ${result.error}`)
    }
  }

  const handleCreateGroup = async (formData: GroupFormData) => {
    const errors = validateGroupForm(formData)
    if (Object.keys(errors).length > 0) {
      return { success: false, error: 'Please fix the form errors' }
    }

    const result = await createGroup(formData)
    if (result.success) {
      setShowCreateModal(false)
    }
    return result
  }

  const handleUpdateGroup = async (formData: GroupFormData) => {
    if (!editingGroup) return { success: false, error: 'No group selected' }

    const errors = validateGroupForm(formData)
    if (Object.keys(errors).length > 0) {
      return { success: false, error: 'Please fix the form errors' }
    }

    // Find the group ID from the current groups
    const group = groups.find(g => 
      g.name === editingGroup.name && 
      g.description === editingGroup.description
    )
    
    if (!group) {
      return { success: false, error: 'Group not found' }
    }

    const result = await updateGroup(group.id, formData)
    if (result.success) {
      setEditingGroup(null)
    }
    return result
  }

  if (loading && groups.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading groups...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
              <p className="text-gray-600">Manage your table banking groups</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={refreshData}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                title="Refresh groups"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Create Group
            </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Filters */}
        <GroupFilters
          filters={filters}
          onFiltersChange={setFilters}
          totalGroups={totalGroups}
          filteredCount={filteredCount}
        />

        {/* Groups List */}
        <GroupList
          groups={groups}
          loading={loading}
          onViewGroup={handleViewGroup}
          onEditGroup={handleEditGroup}
          onDeleteGroup={handleDeleteGroup}
        />
      </div>

      {/* Create Group Modal */}
      <GroupForm
        isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateGroup}
        loading={saving}
        title="Create New Group"
      />

      {/* Edit Group Modal */}
      <GroupForm
        isOpen={!!editingGroup}
        onClose={() => setEditingGroup(null)}
        onSubmit={handleUpdateGroup}
        initialData={editingGroup || undefined}
        loading={saving}
        title="Edit Group"
      />
    </div>
  )
}
