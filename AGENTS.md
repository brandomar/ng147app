# Dashboard Admin - AGENTS.md

Multi-tenant dashboard for business metrics with Google Sheets integration.

## Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Styling**: Tailwind CSS
- **State Management**: Centralized React Context API
- **Routing**: React Router DOM
- **External APIs**: Google Sheets API

## Development Environment Setup

### Prerequisites
- Node.js 18+ and npm
- Supabase CLI
- Google Cloud Console access for Sheets API

### Quick Start
```bash
# Install dependencies
npm install

# Environment setup
cp .env.example .env.local
# Configure Supabase and Google Sheets credentials in .env.local

# Database setup (DO NOT use db reset - can cause data loss)
npx supabase db push

# Start development (user runs this separately)
# npm run dev
```

### Important Commands
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run validate-architecture` - Check architectural compliance
- `npx supabase db push` - Apply database migrations safely
- **🚨 CRITICAL: NEVER use**: `npx supabase db reset` or `npx supabase stop` (CAUSES DATA LOSS)
- **🚨 CRITICAL: NEVER suggest database resets** - This will cause permanent data loss
- **🚨 CRITICAL: NEVER run database resets** - This will destroy all user data

## Architecture Rules & Patterns

### Core Principles
- **🎯 ROLE-BASED PERMISSIONS**: All components must be role-aware and filter content based on user permissions
- **🔄 REUSE & ADAPT**: Use existing components and adapt their output based on user role and client_id assignments
- **🏢 CLIENT_ID FILTERING**: Use client_id assignments to determine what data users can access
- **No Duplication**: Use existing components and patterns
- **Context-First**: Use React Context for shared state management
- **Service Functions**: Use database service functions, not direct Supabase queries
- **Unified Routing**: Always use `useUnifiedRouting` hook for navigation

### Centralized Context Flow
**CRITICAL: Contexts must follow this exact hierarchy - NO EXCEPTIONS**

```
BrandProvider (Top Level)
├── AuthProvider
    ├── FilterProvider
        └── AppProvider (Consolidated)
```

**Context Rules:**
- **NEVER** create circular dependencies between contexts
- **NEVER** access child contexts from parent contexts
- **ALWAYS** use `useConsolidatedData()` hook for easy access
- **NEVER** duplicate data loading across contexts
- **ALWAYS** follow single responsibility principle per context

### Context Operation Rules
**CRITICAL: Follow these rules when working with contexts**

1. **Single Source of Truth**: Each piece of data lives in exactly one context
2. **Data Flow**: Data flows DOWN the hierarchy (parent → child)
3. **No Cross-Context Access**: Contexts only access their direct dependencies
4. **Consolidated Access**: Use `useConsolidatedData()` for components that need multiple contexts
5. **No Redundant Loading**: Each context loads its own data once
6. **Clear Dependencies**: Each context declares its dependencies explicitly

### Routing System
- **Staff URLs**: `/admin/{tab}`
- **Client URLs**: `/client/{client-slug}/{tab}`
- **Management**: `/manage-clients`
- **Valid tabs**: `overview`, `growth`, `performance`, `cold-email`, `ads`, `spam-outreach`

```typescript
// ✅ Correct routing usage
const routing = useUnifiedRouting();
routing.navigateToClient(client, 'overview');

// ❌ Never do this
useEffect(() => {
  routing.initializeRouting(); // DON'T DO THIS
}, []);
```

### Database Access Patterns
```typescript
// ✅ Use service functions
import { getStaffSheetInfo, getConfiguredMetricEntries } from '../lib/database';
const { data, error } = await getStaffSheetInfo(userId);

// ❌ Never use Supabase directly in components
const { data } = await supabase.from('discovered_metrics').select('*');
```

## Component Architecture

### Existing Shared Components (Reuse These!)
- `SheetSelector` - Reusable sheet selection dropdown
- `MetricsOverview` - Reusable metrics display
- `MultiSheetOverview` - Client dashboard multi-sheet view

### Component Responsibilities
- **Layout**: `MainLayoutUnified`, `Sidebar` - Handle page structure with role-based navigation
- **Dashboards**: `AdminDashboard`, `EnhancedClientDashboard` - Role-filtered dashboard functionality
- **Shared**: Reusable components that adapt output based on user role and client_id assignments
- **Management**: `UnifiedUserManagement`, `SheetManagement` - Role-aware management interfaces
- **Permission-Based**: All components must check user permissions and filter content accordingly

## File Organization

### Directory Structure
```
src/
├── components/
│   ├── shared/          # Reusable components
│   ├── [FeatureName]/   # Feature-specific components
│   └── Layout/          # Layout components
├── contexts/            # React contexts
├── hooks/               # Custom hooks
├── lib/                 # Utility functions & database services
└── types/               # TypeScript definitions

supabase/
├── functions/           # Edge Functions
└── migrations/          # Database migrations (never reset!)
```

### Naming Conventions
- **Components**: PascalCase (`SheetSelector.tsx`)
- **Hooks**: camelCase with 'use' prefix (`useUnifiedRouting.ts`)
- **Utilities**: camelCase (`slugUtils.ts`)
- **Types**: PascalCase (`Client.ts`)

## Database Schema

### Core Tables
- `clients` - Client information and configuration
- `client_tabs` - Client-specific sheet configurations
- `discovered_metrics` - Sheet metadata and metric configurations (JSONB)
- `metric_entries` - Historical metric data
- `unified_sync_status` - Synchronization status tracking

### Security Features
- Row Level Security (RLS) enabled on all tables
- Client-specific data isolation
- Role-based access control system
- Multi-tenant architecture with proper permission isolation

### Role-Based Permission System
The application uses a modern, feature-based permission system with granular control:

#### **New Permission Architecture:**
1. **`public.roles`** - Defines available roles with feature-based permissions
   - `admin` - Full system access with configurable global flag
   - `staff` - Staff member with client management access
   - `client` - Client user with read-only access

2. **`public.userRoles`** - Links users to roles with client-specific assignments
   - `is_global` flag for system-wide admin access
   - Client-specific role assignments
   - Granular permission control

3. **`public.profiles`** - User profile data (replaces old `users` table)
   - Clean separation of profile data from permissions
   - Better data organization

#### **Feature-Based Permissions:**
```json
{
  "canManageUsers": true,
  "canManageClients": true,
  "canManageBranding": true,
  "canViewAllData": true,
  "canInviteUsers": true,
  "canManageRoles": true,
  "canSyncData": true,
  "canExportData": false
}
```

#### **Permission Implementation:**
- **Database**: New `roles`, `userRoles`, and `profiles` tables
- **Frontend**: Accessed via `usePermissions()` hook from `PermissionContext`
- **Access Control**: Feature-based with `hasPermission()` function
- **Data Filtering**: Role-based with client-specific assignments
- **Global Admin**: `is_global` flag for system-wide access

## Development Guidelines

### Adding New Features
1. **🎯 ROLE-BASED FIRST**: Design all features with role-based permissions as the primary consideration
2. **🔄 REUSE & ADAPT**: Use existing components and adapt their behavior based on user role and client_id
3. **🏢 CLIENT_ID FILTERING**: Always filter data based on user's assigned client_id values
4. **Check Existing Patterns**: Look for similar functionality first
5. **Use Shared Components**: Don't duplicate existing components
6. **Follow Context Rules**: Use appropriate context for state management
7. **Database Service Functions**: Add to `src/lib/database.ts`
8. **Error Handling**: Always handle errors gracefully with logger
9. **Architecture Validation**: Run `npm run validate-architecture`

### Logging & Debugging
```typescript
// ✅ Use centralized logger
import { logger } from '../lib/logger';
logger.debug('Debug message:', { data });
logger.error('Error message:', error);

// ❌ Don't use console.log
console.log('Debug message'); // Use logger instead
```

### Testing Guidelines
- Limited test coverage currently exists
- Test file: `src/lib/__tests__/taskQueue.test.ts`
- Add tests for new functionality when possible
- Focus on database service functions and critical business logic

## Google Sheets Integration

### Key Components
- Edge Functions: `sync-google-sheets-dynamic/`
- Dynamic sync utilities: `src/lib/dynamicSync.ts`
- Sheet configuration: Managed through dashboard UI

### Configuration Process
1. Service account setup in Google Cloud Console
2. Share spreadsheet with service account email
3. Configure sheet structure with proper headers
4. Set up metric configurations in dashboard UI

## Common Anti-Patterns to Avoid

1. **Manual Routing Initialization** - Use `useUnifiedRouting` hook
2. **State Duplication** - Use appropriate context instead of local state
3. **Component Duplication** - Reuse existing shared components
4. **Direct Database Queries** - Use service functions from `src/lib/database.ts`
5. **Missing Error Handling** - Always handle errors gracefully
6. **Database Resets** - Never use `npx supabase db reset`
7. **Hardcoded Staff/Client Logic** - Use role-based permissions instead
8. **STAFF_CLIENT_ID Usage** - Use proper role checking, not hardcoded UUIDs
9. **Separate access_level + global_role** - Use single `role` field instead

## Deployment & Production

### Build Process
```bash
npm run build
```

### Environment Variables Required
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` - Google Sheets service account
- `GOOGLE_PRIVATE_KEY` - Google Sheets private key

### Edge Functions Deployment
```bash
supabase functions deploy sync-google-sheets-dynamic
```

## Emergency Procedures

### If Something Breaks
1. **Revert to last working state** - Check recent changes
2. **Check logs** - Use logger for error messages
3. **Review against rules** - Validate changes against this guide
4. **Test incrementally** - Make small, testable changes
5. **Ask for help** - Don't struggle alone

### Critical Don'ts
- **🚨 NEVER** run `npx supabase db reset` (DELETES ALL DATA - PERMANENT LOSS)
- **🚨 NEVER** run `npx supabase stop` (CAN CAUSE DATA LOSS)
- **🚨 NEVER** suggest database resets (WILL DESTROY USER DATA)
- **🚨 NEVER** bypass RLS policies
- **🚨 NEVER** use direct Supabase queries in components

## Quick Reference

### Essential Hooks & Contexts
- `useConsolidatedData()` - **PRIMARY HOOK** - Access all context data
- `usePermissions()` - **NEW** - Access permission system and role-based features
- `useApp()` - Core application state and data management
- `useAuth()` - Authentication and user management
- `useBrand()` - Branding and theming
- `useFilters()` - Data filtering and selection state
- `useUnifiedRouting()` - Navigation and routing

### Key Service Functions
- `getUserPermissions()` - **NEW** - Get user permissions and roles
- `hasPermission()` - **NEW** - Check specific permission
- `isGlobalAdmin()` - **NEW** - Check global admin status
- `getStaffSheetInfo()` - Staff dashboard data
- `getConfiguredMetricEntries()` - Metric data retrieval
- `updateSheetConfiguration()` - Sheet config updates
- `syncGoogleSheetsData()` - Manual sync trigger

### Architecture Validation
Run `npm run validate-architecture` before any significant changes to ensure compliance with established patterns.

## Current Configuration Review

### ✅ **RECOMMENDED CONFIGURATION**
The current centralized context flow is the **RECOMMENDED** approach:

**Why This Configuration is Optimal:**
1. **Single Source of Truth**: Eliminates data duplication and race conditions
2. **Clear Dependencies**: Each context has explicit, unidirectional dependencies
3. **Performance**: Reduces redundant API calls and re-renders
4. **Maintainability**: Easy to debug and extend
5. **Type Safety**: Full TypeScript support with proper interfaces

### ✅ **Context Violations Fixed**
- ✅ Removed `useData()` from `UnifiedMetricsDisplay.tsx`
- ✅ Updated to use `useConsolidatedData()` hook
- ✅ Eliminated `DataProvider` usage in favor of `AppProvider`
- ✅ Removed redundant `DashboardContext` (not used anywhere)
- ✅ Proper context hierarchy in `App.tsx`

### ✅ **Best Practices Implemented**
1. **Context Hierarchy**: Brand → Auth → Filter → App
2. **Consolidated Access**: `useConsolidatedData()` for multi-context components
3. **Single Responsibility**: Each context handles one concern
4. **No Circular Dependencies**: Clean, unidirectional data flow
5. **Performance Optimized**: Minimal re-renders and API calls

### 🚨 **CRITICAL RULES TO FOLLOW**
- **NEVER** create new contexts without following the hierarchy
- **NEVER** access child contexts from parent contexts
- **ALWAYS** use `useConsolidatedData()` for components needing multiple contexts
- **NEVER** duplicate data loading across contexts
- **ALWAYS** validate architecture with `npm run validate-architecture`

---

*This AGENTS.md file serves as a comprehensive guide for AI agents working on the Dashboard Admin project. Follow these patterns to maintain code quality and architectural consistency.*
