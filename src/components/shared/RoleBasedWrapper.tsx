import React from 'react';
import { useGlobalPermissions } from '../../hooks/useGlobalPermissions';

interface RoleBasedWrapperProps {
  children: React.ReactNode;
  
  // Role requirements
  requireAdmin?: boolean;
  requireStaff?: boolean;
  requireClient?: boolean;
  
  // Client access requirements
  requireClientAccess?: string | string[]; // client_id(s) that user must have access to
  requireClientManagement?: string | string[]; // client_id(s) that user must be able to manage
  
  // Permission requirements
  requireUserManagement?: boolean;
  requireClientManagement?: boolean;
  requireDataAccess?: boolean;
  
  // Fallback content when requirements not met
  fallback?: React.ReactNode;
  fallbackMessage?: string;
  
  // Loading state
  showLoading?: boolean;
  loadingComponent?: React.ReactNode;
}

export const RoleBasedWrapper: React.FC<RoleBasedWrapperProps> = ({
  children,
  requireAdmin = false,
  requireStaff = false,
  requireClient = false,
  requireClientAccess,
  requireClientManagement,
  requireUserManagement = false,
  requireClientManagement: requireClientMgmt = false,
  requireDataAccess = false,
  fallback,
  fallbackMessage:
    _fallbackMessage = "You don't have permission to access this content.",
  showLoading = true,
  loadingComponent,
}) => {
  const permissions = useGlobalPermissions();

  // Show loading state
  if (permissions.loading && showLoading) {
    return (
      loadingComponent || (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading...</span>
        </div>
      )
    );
  }

  // Check role requirements
  if (requireAdmin && !permissions.isAdmin) {
    return (
      fallback || (
        <AccessDenied message="This feature requires Admin role access." />
      )
    );
  }

  if (requireStaff && !permissions.isStaff) {
    return (
      fallback || (
        <AccessDenied message="This feature requires Staff role access." />
      )
    );
  }

  if (requireClient && !permissions.isClient) {
    return (
      fallback || (
        <AccessDenied message="This feature requires Client role access." />
      )
    );
  }

  // Check client access requirements
  if (requireClientAccess) {
    const requiredClients = Array.isArray(requireClientAccess)
      ? requireClientAccess
      : [requireClientAccess];
    const hasAccess = requiredClients.every((clientId) =>
      permissions.canAccessClient(clientId)
    );

    if (!hasAccess) {
      return (
        fallback || (
          <AccessDenied message="You don't have access to the required client(s)." />
        )
      );
    }
  }

  // Check client management requirements
  if (requireClientManagement) {
    const requiredClients = Array.isArray(requireClientManagement)
      ? requireClientManagement
      : [requireClientManagement];
    const canManage = requiredClients.every((clientId) =>
      permissions.canManageClient(clientId)
    );

    if (!canManage) {
      return (
        fallback || (
          <AccessDenied message="You don't have permission to manage the required client(s)." />
        )
      );
    }
  }

  // Check permission requirements
  if (requireUserManagement && !permissions.canManageUsers) {
    return (
      fallback || (
        <AccessDenied message="You don't have permission to manage users." />
      )
    );
  }

  if (requireClientMgmt && !permissions.canManageClients) {
    return (
      fallback || (
        <AccessDenied message="You don't have permission to manage clients." />
      )
    );
  }

  if (requireDataAccess && !permissions.canViewAllData) {
    return (
      fallback || (
        <AccessDenied message="You don't have permission to view this data." />
      )
    );
  }

  // All requirements met, render children
  return <>{children}</>;
};

// Access Denied Component
const AccessDenied: React.FC<{ message: string }> = ({ message }) => (
  <div className="max-w-md mx-auto p-6">
    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800">Access Restricted</h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>{message}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Higher-order component for role-based rendering
export const withRoleBasedAccess = <P extends object>(
  Component: React.ComponentType<P>,
  requirements: Omit<RoleBasedWrapperProps, 'children'>
) => {
  const WrappedComponent: React.FC<P> = (props) => (
    <RoleBasedWrapper {...requirements}>
      <Component {...props} />
    </RoleBasedWrapper>
  );

  WrappedComponent.displayName = `withRoleBasedAccess(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Hook for conditional rendering based on permissions
export const useRoleBasedRender = () => {
  const permissions = useGlobalPermissions();

  const canRender = (requirements: Partial<RoleBasedWrapperProps>): boolean => {
    // Check role requirements
    if (requirements.requireAdmin && !permissions.isAdmin) return false;
    if (requirements.requireStaff && !permissions.isStaff) return false;
    if (requirements.requireClient && !permissions.isClient) return false;

    // Check client access requirements
    if (requirements.requireClientAccess) {
      const requiredClients = Array.isArray(requirements.requireClientAccess) 
        ? requirements.requireClientAccess 
        : [requirements.requireClientAccess];
      const hasAccess = requiredClients.every(clientId => permissions.canAccessClient(clientId));
      if (!hasAccess) return false;
    }

    // Check client management requirements
    if (requirements.requireClientManagement) {
      const requiredClients = Array.isArray(requirements.requireClientManagement) 
        ? requirements.requireClientManagement 
        : [requirements.requireClientManagement];
      const canManage = requiredClients.every(clientId => permissions.canManageClient(clientId));
      if (!canManage) return false;
    }

    // Check permission requirements
    if (requirements.requireUserManagement && !permissions.canManageUsers) return false;
    if (requirements.requireClientManagement && !permissions.canManageClients) return false;
    if (requirements.requireDataAccess && !permissions.canViewAllData) return false;

    return true;
  };

  return { canRender, permissions };
};

export default RoleBasedWrapper;
