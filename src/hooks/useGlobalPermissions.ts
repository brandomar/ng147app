import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from "../contexts/PermissionContext";

export interface UserPermissions {
  // Global role
  role: "admin" | "staff" | "client";

  // Permission flags
  isAdmin: boolean;
  isStaff: boolean;
  isClient: boolean;

  // Client access
  assignedClientIds: string[];
  canAccessClient: (clientId: string) => boolean;
  canManageClient: (clientId: string) => boolean;

  // Feature permissions
  canManageUsers: boolean;
  canManageAllUsers: boolean;
  canManageClients: boolean;
  canViewAllData: boolean;
  canInviteUsers: boolean;
  canAssignClients: boolean;

  // Data filtering
  getAccessibleClientIds: () => string[];
  getManageableClientIds: () => string[];

  // Loading state
  loading: boolean;
  error: string | null;
}

/**
 * useGlobalPermissions hook that uses the new PermissionContext
 * Provides clean interface to new permission system
 */
export const useGlobalPermissions = (): UserPermissions => {
  const { user } = useAuth();
  const {
    permissions,
    roles,
    isGlobalAdmin,
    accessibleClients,
    loading,
    error,
    hasPermission,
    canAccessClient,
  } = usePermissions();

  // Map new permission system to clean interface
  const userPermissions: UserPermissions = {
    // Global role (determine from roles)
    role: (() => {
      if (isGlobalAdmin) return "admin";
      if (!roles || roles.length === 0) return "client";
      const primaryRole = roles.find((r) => !r.is_global) || roles[0];
      if (!primaryRole || !primaryRole.role) return "client";
      return (
        (primaryRole.role.name as "admin" | "staff" | "client") || "client"
      );
    })(),

    // Permission flags
    isAdmin: isGlobalAdmin,
    isStaff: hasPermission("canManageClients") || isGlobalAdmin,
    isClient: !hasPermission("canManageClients") && !isGlobalAdmin,

    // Client access
    assignedClientIds: accessibleClients.map((c) => c.client_id),
    canAccessClient: (clientId: string) => canAccessClient(clientId),
    canManageClient: (clientId: string) => {
      if (isGlobalAdmin) return true;
      const clientRole = roles.find((r) => r.client_id === clientId);
      return (
        clientRole?.role.name === "admin" || clientRole?.role.name === "staff"
      );
    },

    // Feature permissions
    canManageUsers: hasPermission("canManageUsers"),
    canManageAllUsers: isGlobalAdmin,
    canManageClients: hasPermission("canManageClients"),
    canViewAllData: hasPermission("canViewAllData"),
    canInviteUsers: hasPermission("canInviteUsers"),
    canAssignClients: hasPermission("canManageClients"),

    // Data filtering
    getAccessibleClientIds: () => accessibleClients.map((c) => c.client_id),
    getManageableClientIds: () => {
      if (isGlobalAdmin) return [];
      return roles
        .filter(
          (r) =>
            !r.is_global && (r.role.name === "admin" || r.role.name === "staff")
        )
        .map((r) => r.client_id!);
    },

    // Loading state
    loading,
    error,
  };

  return userPermissions;
};

// Clear global permissions (for logout, etc.) - now just a no-op since we use context
export const clearGlobalPermissions = () => {
  // No-op since we use PermissionContext now
};