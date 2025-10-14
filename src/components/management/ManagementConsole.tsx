/**
 * Tabbed User Management Component
 * 
 * Full-page user management interface with tabbed navigation.
 * Uses the existing working tab components from UserManagement.tsx
 */
import React, { useState, useEffect } from 'react';
import { useGlobalPermissions } from '../../hooks/useGlobalPermissions';
import { usePermissions } from "../../contexts/PermissionContext";
import { RoleBasedWrapper } from "../shared/RoleBasedWrapper";
import { User, Users, Building2, Mail, Palette } from "lucide-react";
import { BrandSettings } from "../settings/BrandSettings";
import { supabase } from "../../lib/supabase";
import { logger } from "../../lib/logger";
import { useApp } from "../../contexts/AppContext";
import { useUnifiedRouting } from "../../hooks/useUnifiedRouting";
import { ClientManagement } from "./ClientManagement";
// Note: createMagicLinkInvitation function removed with new permission system
import UserOverviewTab from "./UserOverviewTabMultiSelect";

interface ManagementTab {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  component: React.ComponentType<any>;
  requiresRole?: "admin" | "staff" | "client";
}

// Import the existing working tab components from UserManagement.tsx
// We'll define them here to avoid circular imports

interface User {
  id: string;
  email: string;
  role: "admin" | "staff" | "client";
  client_assignments: Array<{
    client_id: string;
    client_name: string;
    role: string;
  }>;
  last_sign_in_at: string;
  created_at: string;
  is_active: boolean;
}

interface Client {
  id: string;
  name: string;
  slug: string;
}

// UserOverviewTab moved to separate file: UserOverviewTabMultiSelect.tsx

// InvitationsTab - extracted from UserManagement.tsx
const InvitationsTab: React.FC<{
  clients: Client[];
  isAdmin: boolean;
  canInviteUsers?: boolean;
}> = ({ clients, isAdmin, canInviteUsers = false }) => {
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: "",
    role: "client",
    clientId: "",
  });

  // Load invitations on component mount
  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
      logger.debug("✅ Loaded invitations", { count: data?.length || 0 });
    } catch (err: any) {
      logger.error("❌ Error loading invitations:", err);
    } finally {
      setLoading(false);
    }
  };

  const copyInvitationLink = (token: string) => {
    const baseUrl = window.location.origin;
    const invitationUrl = `${baseUrl}/accept-invitation?token=${token}`;
    navigator.clipboard.writeText(invitationUrl);
    logger.debug("✅ Magic link copied", { url: invitationUrl });
  };

  const getStatusBadge = (invitation: any) => {
    if (invitation.is_used) {
      return (
        <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 border border-green-200">
          ✅ Accepted
        </span>
      );
    } else if (
      invitation.expires_at &&
      new Date(invitation.expires_at) < new Date()
    ) {
      return (
        <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 border border-red-200">
          ❌ Expired
        </span>
      );
    } else {
      return (
        <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">
          ⏳ Pending
        </span>
      );
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // TODO: Implement invitation system with new permission system
      // For now, show a placeholder message
      const error = { message: 'Invitation system needs to be updated for new permission system' };
      const data = null;

      if (error) {
        logger.error("❌ Error creating magic link invitation:", error);
        return;
      }

      logger.info("✅ Magic link invitation created:", {
        email: inviteData.email,
        magicLink: data?.magicLink,
      });

      setInviteData({ email: "", role: "client", clientId: "" });
      setShowInviteForm(false);
      // Refresh invitations list
      loadInvitations();
    } catch (error) {
      logger.error("❌ Error sending invitation:", error);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-undeniable-violet mx-auto mb-4"></div>
        <p className="text-gray-600 text-lg">Loading invitations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Invitations</h2>
          <p className="text-gray-600 mt-1">
            Send invitations and track their status
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            {invitations.length} total invitations
          </div>
          <button
            onClick={() => setShowInviteForm(true)}
            className="bg-gradient-to-r from-undeniable-violet to-undeniable-mint text-white px-6 py-2 rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-medium flex items-center gap-2"
          >
            <span>+</span>
            Send Invitation
          </button>
        </div>
      </div>

      {/* Invite Form Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-semibold mb-6 text-gray-900">
              Send New Invitation
            </h3>
            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={inviteData.email}
                  onChange={(e) =>
                    setInviteData({ ...inviteData, email: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-undeniable-violet focus:border-transparent transition-all"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={inviteData.role}
                  onChange={(e) =>
                    setInviteData({ ...inviteData, role: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-undeniable-violet focus:border-transparent transition-all"
                >
                  <option value="client">Client</option>
                  <option value="staff">Staff</option>
                  {isAdmin && (
                    <option value="admin">Admin</option>
                  )}
                </select>
              </div>

              {inviteData.role === "client" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign to Client
                  </label>
                  <select
                    value={inviteData.clientId}
                    onChange={(e) =>
                      setInviteData({ ...inviteData, clientId: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-undeniable-violet focus:border-transparent transition-all"
                  >
                    <option value="">Select a client...</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteForm(false)}
                  className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-undeniable-violet to-undeniable-mint text-white px-6 py-2 rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-medium"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invitations Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Invited
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invitations.map((invitation) => (
                <tr
                  key={invitation.id}
                  className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-undeniable-violet to-undeniable-mint flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {invitation.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {invitation.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="capitalize font-medium">
                      {invitation.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {invitation.clients?.name || "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(invitation)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(invitation.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => copyInvitationLink(invitation.token)}
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-medium"
                    >
                      Copy Link
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// export default ManagementConsole; // Moved to end of file

// ClientManagementTab - extracted from UserManagement.tsx
const ClientManagementTab: React.FC<{
  clients: Client[];
  onClientUpdate: () => void;
}> = ({ onClientUpdate }) => {
  return (
    <div>
      <ClientManagement onClientAdded={onClientUpdate} />
    </div>
  );
};

// Helper functions for user management safety checks
const canDeleteUser = (user: User, allUsers: User[]) => {
  // Cannot delete if it's the last user
  if (allUsers.length === 1) return false;

        // Cannot delete if it's the last admin user
        const adminUsers = allUsers.filter((u) => u.role === "admin");
        if (user.role === "admin" && adminUsers.length === 1) return false;

  return true;
};

// canChangeUserRole moved to UserOverviewTabMultiSelect.tsx

const MANAGEMENT_TABS: ManagementTab[] = [
  {
    id: "clients",
    label: "Client Management",
    icon: Building2,
    component: ClientManagementTab,
    requiresRole: "admin", // Admin only
  },
  {
    id: "users",
    label: "Manage Users",
    icon: Users,
    component: UserOverviewTab,
    requiresRole: "staff", // Staff and above
  },
  {
    id: "invitations",
    label: "Invitations",
    icon: Mail,
    component: InvitationsTab,
    requiresRole: "staff", // Staff and above
  },
  {
    id: "brand",
    label: "Brand",
    icon: Palette,
    component: BrandSettings,
    requiresRole: "admin",
  },
];

export const ManagementConsole: React.FC = () => {
  const permissions = useGlobalPermissions();

  // Try to get new permission system, but don't fail if not available
  let newPermissions = null;
  try {
    newPermissions = usePermissions();
  } catch (error) {
    // PermissionContext not available, continue with legacy system
  }

  const app = useApp();
  const routing = useUnifiedRouting();
  const [activeTab, setActiveTab] = useState("clients");

  // State for data - use authoritative state where possible
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use authoritative clients from OptimizedAppContext
  const clients = app.clientsCache;

  // State for user overview tab
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkEditData, setBulkEditData] = useState({
    role: "",
    clientAssignments: [] as string[],
  });
  const [bulkEditLoading, setBulkEditLoading] = useState(false);
  const [bulkEditError, setBulkEditError] = useState<string | null>(null);

  // State for modals - removed unused showInviteModal

  // Load initial data - integrate with authoritative state
  useEffect(() => {
    logger.debug("🔄 UserManagement: useEffect triggered", {
      canManageUsers: permissions.canManageUsers,
      userId: app.user?.id,
      user: app.user,
      clientsCacheLength: app.clientsCache.length,
    });

    if (permissions.canManageUsers && app.user?.id) {
      logger.debug(
        "🔄 UserManagement: Loading users and ensuring clients are loaded"
      );
      loadUsers();

      // Use authoritative client loading from OptimizedAppContext
      if (app.clientsCache.length === 0) {
        logger.debug(
          "🔄 UserManagement: Loading clients via OptimizedAppContext"
        );
        app.loadClients();
      }
    } else if (!permissions.canManageUsers) {
      logger.debug("🔄 UserManagement: No permission to manage users");
      setLoading(false);
    } else {
      logger.debug("🔄 UserManagement: Waiting for user data to load");
    }
  }, [permissions.canManageUsers, app.user?.id, app.clientsCache.length]);

  // Sync active tab with URL
  useEffect(() => {
    const path = window.location.pathname;
    const pathSegments = path.split("/").filter(Boolean);

    if (pathSegments[0] === "management" && pathSegments[1]) {
      const tabFromUrl = pathSegments[1];
      if (["clients", "users", "invitations", "brand"].includes(tabFromUrl)) {
        setActiveTab(tabFromUrl);
        logger.debug("🧭 UserManagement: Synced tab from URL:", {
          tabFromUrl,
          path,
        });
      }
    }
  }, []);

  // Security check: Only allow users with management permissions to access this page
  // Wait for permissions to load before showing access denied
  const isLoading = permissions.loading || newPermissions?.loading || false;
  const canManageUsers =
    newPermissions?.hasPermission("canManageUsers") ||
    permissions.canManageUsers;
  const isGlobalAdmin =
    newPermissions?.isGlobalAdmin || permissions.isAdmin;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading permissions...</p>
        </div>
      </div>
    );
  }

  if (!canManageUsers) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Access Denied
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              You don't have permission to access this page. This area is
              restricted to admin users only.
            </p>
            <button
              onClick={() =>
                routing.navigateToSection("admin", "overview")
              }
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Filter tabs based on user role
  const availableTabs = MANAGEMENT_TABS.filter((tab) => {
    if (!tab.requiresRole) return true;

    const roleHierarchy = { client: 1, staff: 2, admin: 3 };
    const userRoleLevel =
      roleHierarchy[permissions.role as keyof typeof roleHierarchy] || 0;
    const requiredRoleLevel = roleHierarchy[tab.requiresRole];

    return userRoleLevel >= requiredRoleLevel;
  });

  const activeTabConfig = availableTabs.find((tab) => tab.id === activeTab);
  const ActiveComponent = activeTabConfig?.component;

  const loadUsers = async () => {
    try {
      setLoading(true);
      logger.debug("🔄 UserManagement: Starting to load users", {
        userId: app.user?.id,
      });

      if (!app.user?.id) {
        logger.warn("⚠️ UserManagement: No user ID, skipping user load");
        setLoading(false);
        return;
      }

      // Query users from the profiles table
      logger.debug("🔄 UserManagement: Querying profiles table");
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        logger.error("❌ UserManagement: Database error loading users:", error);
        throw error;
      }

      logger.debug("🔄 UserManagement: Raw user data received:", {
        count: data?.length || 0,
        data,
      });

      // Log the actual user data to see what we're working with
      data?.forEach((user: any, index: number) => {
        logger.debug(`🔄 User ${index + 1}:`, {
          id: user.id,
          user_id: user.user_id,
          email: user.email,
        });
      });

      // Transform data - get client access separately for each user
      // Filter out users with null user_id (they exist in auth.users but not in our profiles table)
      // Also filter out duplicates by email
      const validUsers = (data || [])
        .filter((user: any) => user.user_id !== null)
        .filter(
          (user: any, index: number, array: any[]) =>
            array.findIndex((u) => u.email === user.email) === index
        );

      logger.debug("🔄 UserManagement: Filtered valid users:", {
        total: data?.length || 0,
        valid: validUsers.length,
        invalid: (data?.length || 0) - validUsers.length,
        duplicates:
          (data?.length || 0) -
          [...new Set((data || []).map((u: any) => u.email))].length,
      });

      const transformedUsers = await Promise.all(
        validUsers.map(async (user: any) => {
          let clientAccess = [];

          // Query client access for this user
          const { data: accessData } = await supabase
            .from("userroles")
            .select(
              `
              client_id,
              is_global,
              roles (
                name
              ),
              clients (
                id,
                name,
                slug
              )
            `
            )
            .eq("user_id", user.user_id);

          clientAccess = accessData || [];

          // Determine primary role from userroles
          const globalRole = clientAccess.find((access: any) => access.is_global);
          const primaryRole = globalRole?.roles?.name || clientAccess[0]?.roles?.name || "client";

          return {
            id: user.user_id,
            email: user.email || "Unknown",
            role: primaryRole,
            client_assignments: clientAccess.map((access: any) => ({
              client_id: access.client_id,
              client_name: access.clients?.name || "Unknown",
              role: access.roles?.name || "client",
            })),
            last_sign_in_at: "", // Not available in profiles table
            created_at: user.created_at || "",
            is_active: true, // Assume active if in profiles table
          };
        })
      );

      setUsers(transformedUsers);
      logger.debug("✅ UserManagement: Loaded users successfully", {
        count: transformedUsers.length,
        users: transformedUsers,
      });
    } catch (err: any) {
      logger.error("❌ UserManagement: Error loading users:", err);
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  // Removed independent loadClients - using app.loadClients() from OptimizedAppContext

  // Filter users based on search and filters
  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.email
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesClient =
      clientFilter === "all" ||
      user.client_assignments?.some(
        (assignment: any) => assignment.client_id === clientFilter
      );

    return matchesSearch && matchesRole && matchesClient;
  });

  // Helper functions
  const canManageUser = (user: User) => {
    // Use new permission system if available
    if (newPermissions) {
      if (newPermissions.isGlobalAdmin) return true;
      if (newPermissions.hasPermission("canManageUsers")) return true;
      // Staff can manage clients
      if (
        newPermissions.hasPermission("canManageClients") &&
        user.role === "client"
      )
        return true;
      return false;
    }

    // Fall back to legacy system
    if (permissions.isAdmin) return true;
    if (permissions.isStaff && user.role === "client") return true;
    return false;
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-800";
      case "staff":
        return "bg-blue-100 text-blue-800";
      case "client":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Note: handleInviteUser removed - InvitationsTab now uses createMagicLinkInvitation directly

  // Multi-select handlers
  const handleToggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const manageableUsers = filteredUsers.filter((user) => canManageUser(user));
    setSelectedUsers(new Set(manageableUsers.map((u) => u.id)));
  };

  const handleDeselectAll = () => {
    setSelectedUsers(new Set());
  };

  const handleBulkSave = async () => {
    if (selectedUsers.size === 0) return;

    setBulkEditLoading(true);
    setBulkEditError(null);

    try {
      const selectedUsersList = Array.from(selectedUsers);

      // Check if any role changes would lock out admin access
      if (bulkEditData.role) {
        const currentAdminUsers = users.filter(
          (u) => u.role === "admin"
        );
        const selectedAdminUsers = users.filter(
          (u) => selectedUsersList.includes(u.id) && u.role === "admin"
        );

        // If we're changing roles and this would remove all admin users
        if (
          bulkEditData.role !== "admin" &&
          selectedAdminUsers.length === currentAdminUsers.length
        ) {
          throw new Error(
            "Cannot change all admin users to lower roles. At least one admin user must remain to maintain admin access."
          );
        }
      }

      // Update roles for selected users
      if (bulkEditData.role) {
        // Update roles in userroles table instead of profiles table
        // This is more complex as we need to update the role_id based on role name
        const { data: roles } = await supabase
          .from("roles")
          .select("id, name")
          .eq("name", bulkEditData.role);
        
        if (roles && roles.length > 0) {
          const roleId = roles[0].id;
          const { error: roleError } = await supabase
            .from("userroles")
            .update({ role_id: roleId })
            .in("user_id", selectedUsersList);

          if (roleError) {
            throw new Error(`Failed to update user roles: ${roleError.message}`);
          }
        }

        // Apply role-based access inheritance for each user whose role was changed
        try {
          const { applyRoleBasedAccessInheritance } = await import(
            "../../lib/database/users"
          );

          for (const userId of selectedUsersList) {
            try {
              await applyRoleBasedAccessInheritance(userId, bulkEditData.role);
              logger.info("✅ Applied role inheritance for user:", {
                userId,
                role: bulkEditData.role,
              });
            } catch (inheritError) {
              logger.warn("⚠️ Failed to apply role inheritance for user:", {
                userId,
                error: inheritError,
              });
              // Continue with other users even if one fails
            }
          }
        } catch (importError) {
          logger.warn(
            "⚠️ Failed to import role inheritance function:",
            importError
          );
          // Don't fail the bulk operation if inheritance fails
        }
      }

      // Update client assignments for selected users
      if (bulkEditData.clientAssignments.length > 0) {
        // Remove all existing client assignments for selected users
        const { error: removeError } = await supabase
          .from("userroles")
          .delete()
          .in("user_id", selectedUsersList)
          .eq("is_global", false);

        if (removeError) {
          throw new Error(
            `Failed to remove existing client assignments: ${removeError.message}`
          );
        }

        // Add new client assignments
        const { data: clientRole } = await supabase
          .from("roles")
          .select("id")
          .eq("name", "client")
          .single();

        if (clientRole) {
          const assignmentsToInsert = selectedUsersList.flatMap((userId) =>
            bulkEditData.clientAssignments.map((clientId) => ({
              user_id: userId,
              client_id: clientId,
              role_id: clientRole.id,
              is_global: false,
            }))
          );

          if (assignmentsToInsert.length > 0) {
            const { error: addError } = await supabase
              .from("userroles")
              .insert(assignmentsToInsert);

            if (addError) {
              throw new Error(
                `Failed to add client assignments: ${addError.message}`
              );
            }
          }
        }
      }

      logger.info("✅ Bulk update completed successfully:", {
        userCount: selectedUsersList.length,
        role: bulkEditData.role,
        clientAssignments: bulkEditData.clientAssignments.length,
      });

      await loadUsers();
      setSelectedUsers(new Set());
      setBulkEditData({ role: "", clientAssignments: [] });
    } catch (error: any) {
      logger.error("❌ Error in bulk update:", error);
      setBulkEditError(error.message || "Failed to update users");
    } finally {
      setBulkEditLoading(false);
    }
  };

  // Removed handleDeactivateUser - deactivate functionality not implemented in database

  const handleBulkDelete = async () => {
    if (selectedUsers.size === 0) return;

    const selectedUsersList = Array.from(selectedUsers);
    const selectedUsersData = users.filter((u) =>
      selectedUsersList.includes(u.id)
    );

    // Check if any selected users cannot be deleted
    const cannotDelete = selectedUsersData.filter(
      (user) => !canDeleteUser(user, users)
    );
    if (cannotDelete.length > 0) {
      const userEmails = cannotDelete.map((u) => u.email).join(", ");
      alert(
        `⚠️ Cannot delete the following users: ${userEmails}\n\nThese users are either the last user in the system or the last undeniable user.`
      );
      return;
    }

    const confirmMessage = `⚠️ PERMANENT DELETE WARNING ⚠️\n\nYou are about to permanently delete ${
      selectedUsers.size
    } user(s):\n${selectedUsersData
      .map((u) => `• ${u.email}`)
      .join(
        "\n"
      )}\n\nThis action will:\n• Remove the users from the database\n• Delete all their client assignments\n• Make them unable to log in\n\nTHIS ACTION CANNOT BE UNDONE!\n\nType "DELETE" to confirm:`;

    const userInput = window.prompt(confirmMessage);
    if (userInput === "DELETE") {
      setBulkEditLoading(true);
      setBulkEditError(null);

      try {
        // Delete from userroles first
        const { error: accessError } = await supabase
          .from("userroles")
          .delete()
          .in("user_id", selectedUsersList);

        if (accessError) {
          throw new Error(
            `Failed to delete client access: ${accessError.message}`
          );
        }

        // Delete from profiles table
        const { error: userError } = await supabase
          .from("profiles")
          .delete()
          .in("user_id", selectedUsersList);

        if (userError) {
          throw new Error(`Failed to delete users: ${userError.message}`);
        }

        logger.info("✅ Bulk delete completed successfully:", {
          deletedCount: selectedUsersList.length,
          deletedUsers: selectedUsersData.map((u) => u.email),
        });

        await loadUsers();
        setSelectedUsers(new Set());
      } catch (error: any) {
        logger.error("❌ Error in bulk delete:", error);
        setBulkEditError(error.message || "Failed to delete users");
      } finally {
        setBulkEditLoading(false);
      }
    }
  };

  // handleDeleteUser moved to bulk operations in UserOverviewTabMultiSelect.tsx

  const toggleClientAssignment = (clientId: string) => {
    setBulkEditData((prev) => ({
      ...prev,
      clientAssignments: prev.clientAssignments.includes(clientId)
        ? prev.clientAssignments.filter((id) => id !== clientId)
        : [...prev.clientAssignments, clientId],
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading management data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 px-4 sm:px-6 lg:px-8">
      <RoleBasedWrapper requireUserManagement>
        <div className="max-w-7xl mx-auto pt-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-undeniable-violet to-undeniable-mint border-b rounded-t-xl">
            <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
              <div className="flex items-center">
                <div>
                  <h1 className="text-xl font-semibold text-white whitespace-nowrap">
                    User Management
                    <span className="ml-2 text-lg font-normal text-white/80 whitespace-nowrap">
                      | {activeTabConfig?.label || "Users Overview"}
                    </span>
                  </h1>
                </div>
              </div>

              {/* Header Actions - Removed unused Invite User button */}
            </div>
          </div>

          {/* Management Content */}
          <div className="bg-white rounded-b-xl shadow-lg border border-gray-200">
            <div className="flex">
              {/* Management Sidebar */}
              <div className="w-64 bg-gradient-to-b from-gray-50 to-gray-100 border-r border-gray-200">
                <div className="p-6">
                  <nav className="space-y-3">
                    {availableTabs.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;

                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            setActiveTab(tab.id);
                            routing.navigateToTab(tab.id);
                          }}
                          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                            isActive
                              ? "bg-gradient-to-r from-undeniable-violet to-undeniable-mint text-white shadow-lg transform scale-105"
                              : "text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:shadow-md hover:transform hover:scale-102"
                          }`}
                        >
                          <Icon
                            size={20}
                            className={
                              isActive ? "text-white" : "text-gray-500"
                            }
                          />
                          <span className="font-medium whitespace-nowrap">
                            {tab.label}
                          </span>
                        </button>
                      );
                    })}
                  </nav>
                </div>
              </div>

              {/* Management Content */}
              <div className="flex-1 p-8">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                    <p className="text-red-800">{error}</p>
                  </div>
                )}

                {ActiveComponent && (
                  <ActiveComponent
                    // Pass props based on active tab
                    {...(activeTab === "users" && {
                      users: filteredUsers,
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
                      onToggleUserSelection: handleToggleUserSelection,
                      onSelectAll: handleSelectAll,
                      onDeselectAll: handleDeselectAll,
                      onBulkSave: handleBulkSave,
                      onBulkDelete: handleBulkDelete,
                      onToggleClientAssignment: toggleClientAssignment,
                      onUpdateRole: (role: string) =>
                        setBulkEditData((prev) => ({ ...prev, role })),
                    })}
                    {...(activeTab === "invitations" && {
                      clients,
                      isAdmin: permissions.isAdmin,
                      canInviteUsers:
                        newPermissions?.hasPermission("canInviteUsers") ||
                        permissions.canInviteUsers,
                    })}
                    {...(activeTab === "clients" && {
                      clients,
                      onClientUpdate: app.loadClients,
                    })}
                    {...(activeTab === "brand" &&
                      {
                        // BrandSettings expects no props; rendered as-is under Management
                      })}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </RoleBasedWrapper>
    </div>
  );
};

export default ManagementConsole;