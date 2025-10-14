import React from 'react';
import { User, Client } from '../../types';

interface UserOverviewTabProps {
  users: User[];
  clients: Client[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  roleFilter: string;
  setRoleFilter: (filter: string) => void;
  clientFilter: string;
  setClientFilter: (filter: string) => void;
  canManageUser: (user: User) => boolean;
  getRoleBadgeColor: (role: string) => string;
  selectedUsers: Set<string>;
  bulkEditData: { role: string; clientAssignments: string[] };
  bulkEditLoading: boolean;
  bulkEditError: string | null;
  permissions: any;
  onToggleUserSelection: (userId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkSave: () => void;
  onBulkDelete: () => void;
  onToggleClientAssignment: (clientId: string) => void;
  onUpdateRole: (role: string) => void;
}

const UserOverviewTab: React.FC<UserOverviewTabProps> = ({ 
  users, 
  clients, 
  searchTerm, 
  setSearchTerm, 
  roleFilter, 
  setRoleFilter, 
  clientFilter, 
  setClientFilter, 
  canManageUser, 
  getRoleBadgeColor,
  selectedUsers,
  bulkEditData,
  bulkEditLoading,
  bulkEditError,
  permissions,
  onToggleUserSelection,
  onSelectAll,
  onDeselectAll,
  onBulkSave,
  onBulkDelete,
  onToggleClientAssignment,
  onUpdateRole
}) => {
  const manageableUsers = users.filter(user => canManageUser(user));
  const allSelected = manageableUsers.length > 0 && manageableUsers.every(user => selectedUsers.has(user.id));
  const someSelected = selectedUsers.size > 0;

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Users
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by email..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-undeniable-violet focus:border-transparent"
            />
          </div>

          {/* Role Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Role
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-undeniable-violet focus:border-transparent"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
              <option value="client">Client</option>
            </select>
          </div>

          {/* Client Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Client
            </label>
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-undeniable-violet focus:border-transparent"
            >
              <option value="all">All Clients</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Edit Controls */}
      {someSelected && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">
              Bulk Edit ({selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected)
            </h3>
            <button
              onClick={onDeselectAll}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear Selection
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Set Role
              </label>
              <select
                value={bulkEditData.role}
                onChange={(e) => onUpdateRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-undeniable-violet focus:border-transparent"
              >
                <option value="">No change</option>
                {permissions.isAdmin && <option value="admin">Admin</option>}
                {permissions.isAdmin && <option value="staff">Staff</option>}
                <option value="client">Client</option>
              </select>
            </div>

            {/* Client Assignments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Set Client Assignments
              </label>
              <div className="max-h-20 overflow-y-auto border border-gray-300 rounded-lg p-2 bg-white">
                {clients.length === 0 ? (
                  <span className="text-sm text-gray-500 italic">No clients available</span>
                ) : (
                  clients.map(client => (
                    <label key={client.id} className="flex items-center space-x-2 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={bulkEditData.clientAssignments.includes(client.id)}
                        onChange={() => onToggleClientAssignment(client.id)}
                        className="rounded border-gray-300 text-undeniable-violet focus:ring-undeniable-violet"
                      />
                      <span className="text-gray-900">{client.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-2">
              <button
                onClick={onBulkSave}
                disabled={bulkEditLoading}
                className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50 transition-colors"
                title="Apply changes to selected users"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button
                onClick={onBulkDelete}
                disabled={bulkEditLoading}
                className="p-1 text-red-600 hover:text-red-700 disabled:opacity-50 transition-colors"
                title="Delete selected users"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {bulkEditError && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{bulkEditError}</p>
            </div>
          )}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={allSelected ? onDeselectAll : onSelectAll}
                    className="rounded border-gray-300 text-undeniable-violet focus:ring-undeniable-violet"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client Assignments
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => {
                const isSelected = selectedUsers.has(user.id);
                const canManage = canManageUser(user);

                return (
                  <tr 
                    key={user.id} 
                    className={`hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 ${
                      isSelected ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleUserSelection(user.id)}
                        disabled={!canManage}
                        className="rounded border-gray-300 text-undeniable-violet focus:ring-undeniable-violet disabled:opacity-50"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-undeniable-violet to-undeniable-mint flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {user.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.email}</div>
                          <div className="text-sm text-gray-500">
                            Created: {new Date(user.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {user.client_assignments && user.client_assignments.length > 0 ? user.client_assignments.map((assignment, index) => (
                          <span
                            key={`${user.id}-${assignment.client_id}-${index}`}
                            className="px-3 py-1 text-xs bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 rounded-full border border-blue-200"
                          >
                            {assignment.client_name}
                          </span>
                        )) : (
                          <span className="text-xs text-gray-500 italic">No assignments</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserOverviewTab;
