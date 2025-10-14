# Centralized Context Architecture

## Overview
This document outlines the centralized context flow that eliminates redundant systems and establishes proper separation of concerns. The architecture now uses the new permission system exclusively.

## Context Hierarchy

The contexts are ordered by dependency, with each context depending only on the ones above it:

```
BrandProvider (Top Level)
├── AuthProvider
    ├── FilterProvider
        ├── PermissionProvider
            └── AppProvider (Consolidated)
```

## Context Responsibilities

### 1. BrandProvider (Top Level)
- **Purpose**: Global branding and theming
- **Dependencies**: None
- **Data**: Brand configuration, colors, logos, settings
- **Scope**: Application-wide

### 2. AuthProvider
- **Purpose**: Authentication and user management
- **Dependencies**: BrandProvider
- **Data**: User session, authentication state, user profile (from new profiles table)
- **Scope**: Application-wide
- **Note**: Now uses new permission system for profile management

### 3. FilterProvider
- **Purpose**: Data filtering and selection state
- **Dependencies**: BrandProvider, AuthProvider
- **Data**: Sheet filters, metric categories, date ranges, UI state
- **Scope**: Dashboard-specific

### 4. PermissionProvider
- **Purpose**: Centralized permission management using new permission system
- **Dependencies**: BrandProvider, AuthProvider, FilterProvider
- **Data**: 
  - User permissions and roles (from roles, userRoles, profiles tables)
  - Global admin status
  - Accessible clients
  - Feature-based permissions
- **Scope**: Application-wide
- **Note**: This is the single source of truth for all permission checks

### 5. AppProvider (Consolidated)
- **Purpose**: Core application state and data management
- **Dependencies**: BrandProvider, AuthProvider, FilterProvider, PermissionProvider
- **Data**: 
  - Navigation state (activeSection, selectedClient, activeTab)
  - Core data (dashboardData, userRole, userClientAccess)
  - Database status and configuration
  - Data caching and sync status
  - Loading states and errors
- **Scope**: Application-wide
- **Note**: Now uses PermissionProvider for all permission-related data

## New Permission System Integration

### Database Tables
- **`auth.users`**: Supabase native users table
- **`public.roles`**: Role definitions with feature-based permissions
- **`public.userRoles`**: User-role assignments with client-specific and global flags
- **`public.profiles`**: User profile data (replaces old users table)

### Permission Features
- **Feature-based permissions**: Granular control over specific application features
- **Global admin flag**: `is_global` flag for system-wide admin access
- **Client-specific roles**: Users can have different roles for different clients
- **Hierarchical permissions**: Admin > Staff > Client with configurable features

### Permission Context Usage
```typescript
import { usePermissions } from '../contexts/PermissionContext';

const MyComponent = () => {
  const { 
    permissions, 
    hasPermission, 
    canAccessClient, 
    isGlobalAdmin,
    accessibleClients 
  } = usePermissions();
  
  // Check specific permissions
  if (hasPermission('canManageUsers')) {
    // Show user management UI
  }
  
  // Check client access
  if (canAccessClient(clientId)) {
    // Show client-specific data
  }
};
```

## Key Changes Made

### 1. Consolidated AppContext
- Merged OptimizedAppContext into AppContext (renamed for simplicity)
- Eliminated redundant data loading
- Single source of truth for core application data
- Now uses new permission system exclusively

### 2. New Permission System
- **PermissionProvider**: Centralized permission management
- **Feature-based permissions**: Granular control over application features
- **Database integration**: Uses new roles, userRoles, and profiles tables
- **Backward compatibility**: Legacy permission interface maintained through useGlobalPermissions hook

### 3. Proper Dependency Flow
- Each context only depends on contexts above it
- No circular dependencies
- Clear data flow from top to bottom
- PermissionProvider provides permission data to AppProvider

### 4. Separation of Concerns
- **Brand**: Visual theming and configuration
- **Auth**: User authentication and session management
- **Filter**: Data filtering and selection UI state
- **Permission**: Permission management and role-based access control
- **App**: Core application state and data management

### 5. Eliminated Redundancy
- Removed all legacy permission code
- Consolidated cache management
- Single refresh mechanism
- No more fallback to old permission system

## Usage Patterns

### For Components (Recommended)
```typescript
// Use the consolidated hook for easy access
import { useConsolidatedData } from '../hooks/useConsolidatedData';

const MyComponent = () => {
  const { 
    user, 
    dashboardData, 
    refreshData, 
    loading,
    hasPermission,
    canAccessClient,
    isGlobalAdmin
  } = useConsolidatedData();
  
  // Component logic with permission checks
  if (hasPermission('canManageUsers')) {
    // Show user management features
  }
};
```

### For Direct Context Access
```typescript
// Access specific contexts when needed
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionContext';

const MyComponent = () => {
  const app = useApp();
  const auth = useAuth();
  const permissions = usePermissions();
  
  // Component logic
};
```

### For Legacy Compatibility
```typescript
// Use the legacy-compatible hook
import { useGlobalPermissions } from '../hooks/useGlobalPermissions';

const MyComponent = () => {
  const permissions = useGlobalPermissions();
  
  // Legacy interface still works
  if (permissions.isAdmin) {
    // Show admin features
  }
};
```

## Benefits

1. **Single Source of Truth**: No more duplicate data loading or permission checks
2. **Clear Dependencies**: Each context has a clear purpose and dependencies
3. **Better Performance**: Eliminated redundant API calls and permission checks
4. **Easier Debugging**: Clear data flow and separation of concerns
5. **Maintainable**: Each context has a single responsibility
6. **Feature-based Permissions**: Granular control over application features
7. **Scalable**: Easy to add new permissions and roles
8. **Secure**: All permission checks go through centralized system

## Migration Notes

- **Legacy code removed**: All references to old `users` and `user_client_access` tables removed
- **Permission system**: All components now use new permission system exclusively
- **Context hierarchy**: PermissionProvider added between FilterProvider and AppProvider
- **Database**: New tables (roles, userRoles, profiles) are the only source of permission data
- **Backward compatibility**: Legacy permission interface maintained through useGlobalPermissions hook
- **No fallbacks**: System no longer falls back to legacy permission system

## Database Schema

### New Tables
- **`public.roles`**: Role definitions with JSONB permissions
- **`public.userRoles`**: User-role assignments with client_id and is_global flags
- **`public.profiles`**: User profile data (replaces public.users)

### Removed Tables
- **`public.users`**: Replaced by public.profiles
- **`public.user_client_access`**: Replaced by public.userRoles

### Permission Functions
- **`has_permission(user_id, permission)`**: Check if user has specific permission
- **`get_user_permissions(user_id)`**: Get all user permissions
- **`is_global_admin(user_id)`**: Check if user is global admin
- **`get_accessible_clients(user_id)`**: Get clients user can access