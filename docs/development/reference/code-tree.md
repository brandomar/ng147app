# Code Tree Documentation

Complete overview of the Dashboard Undeniable codebase structure and organization.

## 📁 Project Structure

```
dashboardundeniable/
├── src/                           # Frontend source code
│   ├── components/                # React components
│   │   ├── auth/                 # Authentication components
│   │   ├── dashboard/            # Dashboard components
│   │   ├── layout/               # Layout components
│   │   ├── management/           # Management components
│   │   ├── settings/             # Settings components
│   │   └── shared/               # Shared components
│   ├── contexts/                 # React context providers
│   ├── hooks/                    # Custom React hooks
│   ├── lib/                      # Utility libraries
│   ├── types/                    # TypeScript definitions
│   ├── App.tsx                   # Root application component
│   ├── main.tsx                  # Application entry point
│   └── index.css                 # Global styles
├── supabase/                     # Backend services
│   ├── functions/                # Edge Functions
│   ├── migrations/               # Database migrations
│   ├── migration-history/        # Historical migrations (77 files)
│   ├── backups/                  # Database backups
│   │   └── sql-scripts/          # SQL backup files
│   └── seeds/                    # Database seeds
├── docs/                         # Documentation
│   ├── README.md                 # Main documentation index
│   ├── architecture/             # System architecture
│   ├── api/                      # API documentation
│   ├── development/
│   │   ├── guides/               # Development guides
│   │   └── reference/            # Reference documentation
│   └── whitelabel/               # Whitelabel documentation
├── scripts/                     # Build and utility scripts
│   ├── build-whitelabel.js      # Whitelabel build script
│   ├── discover-tables.js       # Database table discovery
│   ├── export-database.js       # Database export script
│   ├── test-application.js       # Application testing
│   └── validate-architecture.js  # Architecture validation
├── public/                      # Static assets
└── [config files]               # Configuration files
```

## 🎨 Component Architecture

### Authentication Components (`src/components/auth/`)
- **`AcceptInvitationPage.tsx`** - User invitation acceptance
- **`LoginForm.tsx`** - User login interface
- **`PasswordResetForm.tsx`** - Password reset initiation
- **`PasswordResetPage.tsx`** - Password reset completion
- **`SignupForm.tsx`** - User registration

### Dashboard Components (`src/components/dashboard/`)
- **`Dashboard.tsx`** - Main unified dashboard component
- **`MultiSourceOverviewDisplay.tsx`** - Multi-source data display
- **`OverviewTab.tsx`** - Overview tab implementation

### Layout Components (`src/components/layout/`)
- **`MainLayout.tsx`** - Root application layout
- **`Sidebar.tsx`** - Navigation sidebar

### Management Components (`src/components/management/`)
- **`ClientAssignmentManager.tsx`** - Client assignment management
- **`ClientDebugInterface.tsx`** - Client debugging interface
- **`ClientManagement.tsx`** - Client management interface
- **`DataSourceManager.tsx`** - Data source management
- **`UserManagementTabbed.tsx`** - User management interface

### Settings Components (`src/components/settings/`)
- **`DebugSettings.tsx`** - Debug settings interface
- **`DebugSettingsTab.tsx`** - Debug settings tab
- **`NotificationSettings.tsx`** - Notification settings
- **`ProfileSettings.tsx`** - Profile settings
- **`SettingsPage.tsx`** - Main settings page

### Shared Components (`src/components/shared/`)
- **`DateFilter.tsx`** - Date filtering component
- **`HierarchicalSheetSelector.tsx`** - Hierarchical sheet selection
- **`MultiSheetSelector.tsx`** - Multi-sheet selection
- **`MultiSourceOverviewSelector.tsx`** - Multi-source selection
- **`NetworkStatus.tsx`** - Network status indicator
- **`NotificationToast.tsx`** - Toast notifications
- **`RoleBasedWrapper.tsx`** - Role-based access wrapper
- **`TaskQueueDisplay.tsx`** - Task queue display
- **`UnifiedMetricsDisplay.tsx`** - Unified metrics display

## 🎣 Context Providers

### Global Contexts (`src/contexts/`)
- **`AppContext.tsx`** - Global application state
- **`AuthContext.tsx`** - Authentication state
- **`DashboardContext.tsx`** - Dashboard-specific state
- **`FilterContext.tsx`** - Filter system state

## 🎣 Custom Hooks

### Application Hooks (`src/hooks/`)
- **`useRoleBasedPermissions.ts`** - Role and permission management
- **`useStateMigration.ts`** - State migration utilities
- **`useTaskQueue.ts`** - Background task management
- **`useUnifiedRouting.ts`** - Navigation and routing

## 🛠️ Utility Libraries

### Core Libraries (`src/lib/`)
- **`authUtils.ts`** - Authentication utilities
- **`database.ts`** - Database service functions
- **`dynamicSync.ts`** - Dynamic synchronization
- **`excelParser.ts`** - Excel file parsing
- **`logger.ts`** - Logging utilities
- **`metricCalculations.ts`** - Metric calculation functions
- **`migration.ts`** - Data migration utilities
- **`sheetDataDebugger.ts`** - Sheet data debugging
- **`slugUtils.ts`** - URL slug utilities
- **`stateCleanup.ts`** - State cleanup utilities
- **`supabase.ts`** - Supabase client configuration
- **`taskQueue.ts`** - Task queue management

## 📊 Type Definitions

### Core Types (`src/types/`)
- **`index.ts`** - Main type definitions
- **`dataSource.ts`** - Data source types

## 🗄️ Database Schema

### Core Tables
- **`users`** - User accounts and authentication
- **`clients`** - Client organizations
- **`metrics`** - Metric definitions and data
- **`user_client_access`** - User-client relationships
- **`metric_entries`** - Historical metric data

### Relationships
- Users can have multiple client access records
- Clients can have multiple metrics
- Metrics can have multiple entries over time
- User access controls data visibility

## 🔄 Data Flow

### 1. Authentication Flow
```
Login → AuthContext → Role Detection → Dashboard Rendering
```

### 2. Data Synchronization Flow
```
Google Sheets → Edge Function → Database → Frontend Display
```

### 3. State Management Flow
```
User Action → Context Update → Component Re-render → UI Update
```

## 🎯 Key Design Patterns

### 1. Unified Dashboard Pattern
- Single `Dashboard` component handles all user types
- Role-based rendering and data filtering
- Consistent UI/UX across all user types

### 2. Context-Based State Management
- Global state in `AppContext`
- Feature-specific state in dedicated contexts
- Local component state for UI-only concerns

### 3. Service Layer Pattern
- Database operations in `lib/database.ts`
- Utility functions in dedicated files
- Clear separation of concerns

### 4. Component Composition
- Shared components for common functionality
- Feature-specific components for unique behavior
- Layout components for structure

## 🔧 Development Guidelines

### File Naming Conventions
- **Components**: PascalCase (`Dashboard.tsx`)
- **Hooks**: camelCase with 'use' prefix (`useRoleBasedPermissions.ts`)
- **Utilities**: camelCase (`database.ts`)
- **Types**: PascalCase (`Client.ts`)

### Import Organization
1. React and external libraries
2. Internal components
3. Context providers
4. Custom hooks
5. Utility functions
6. Type definitions

### Component Structure
1. Imports
2. Type definitions
3. Component definition
4. Event handlers
5. Render logic
6. Export

## 📈 Performance Considerations

### Code Splitting
- Lazy loading of heavy components
- Route-based code splitting
- Dynamic imports for utilities

### State Optimization
- Context value memoization
- Component memoization
- Efficient re-rendering strategies

### Bundle Optimization
- Tree shaking for unused code
- Asset optimization
- Compression and minification

## 🔒 Security Considerations

### Data Protection
- Row Level Security (RLS) in database
- Client-side data validation
- Secure data transmission

### Access Control
- Role-based component rendering
- Permission-based data access
- Secure authentication flow

---

*This code tree provides a comprehensive overview of the Dashboard Undeniable codebase structure and organization.*
