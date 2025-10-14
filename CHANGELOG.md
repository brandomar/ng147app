# Changelog

All notable changes to the Dashboard Undeniable project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed - 2025-01-22

- **Data Retrieval and Display Issues**
  - Fixed critical bug in `getConfiguredMetricEntries` where config query processing logic was mismatched
  - Config query was selecting `metric_name` from metrics table but processing code expected `metric_configs` JSONB field
  - Updated processing logic to directly use `record.metric_name` from query results
  - Fixed issue where sync was working (36 metrics stored) but dashboard showed no data
  - Added comprehensive debug logging to track data flow from sync to UI display
  - Fixed ReferenceError: endDate is not defined in logging statements

- **Debug Settings Persistence**
  - Fixed issue where debug settings were being reset during development hot reloads
  - Made debug settings persistent using localStorage to survive module reloads
  - Added automatic restoration of debug settings when logger module reloads
  - Enhanced client debugging interface with persistent configuration

### Fixed - 2025-01-22
- **Sheet Deletion Functionality**
  - Fixed issue where delete buttons on sheets were not actually removing data from database
  - Added proper `deleteStaffSheetData` function that removes all associated data:
    - Metric configurations for the sheet
    - Metric entries for the sheet's metrics
    - Sync status records for the sheet
  - Updated SheetManager component to use proper deletion with confirmation dialog
  - Added comprehensive error handling and user feedback for deletion operations
  - Fixed issue where "Power Magazine" sheet and other sheets would persist despite deletion attempts

- **Database Structure Refactoring**
  - Removed `metric_configurations` table - metrics are now directly tied to sheets
  - Enhanced `discovered_metrics` table now stores metric configurations in `metric_configs` JSONB column
  - Added automatic metric deletion when sheets are deleted (CASCADE behavior)
  - Improved support for multiple sheets with same metric names - each sheet maintains independent configurations
  - Updated all application code to use new sheet-based metric structure
  - Added database helper functions `get_metric_configs_for_sheet` and `update_metric_configs_for_sheet`
  - Enhanced metric configuration UI with smaller buttons, better layout, and "no metrics selected" message
  - Fixed performance issues with metric configuration menu opening
  - Fixed duplicate useEffect calls causing multiple API requests
  - Updated UndeniableDashboard and DynamicMetricConfigurationModal to use new structure

### Fixed - 2025-01-20
- **Critical Supabase Edge Function Issues**
  - Fixed 503 (Service Unavailable) and 500 (Internal Server Error) responses in `sync-client-tab` function
  - Reduced function timeout from 30 seconds to 8 seconds to stay within Supabase limits
  - Limited Google Sheets data range from `A:ZZ` (702 columns) to `A:Z` (26 columns) to prevent timeouts
  - Added row processing limits (max 100 rows per sync) to prevent function timeouts
  - Implemented proper timeout handling for Google OAuth token requests (5 second timeout)
  - Added timeout handling for Google Sheets API requests (10 second timeout)
  - Enhanced error handling with try-catch blocks around individual metric processing
  - Added proper JSON parsing error handling in request body processing
  - Improved Supabase client configuration validation with proper error responses
  - Added AbortController for all external API calls to prevent hanging requests
  - Enhanced logging and error messages for better debugging and monitoring

### Improved - 2025-01-20
- **Simplified Metric Calculator**
  - Created new `simpleMetricCalculator.ts` for per-client calculations only
  - Removed complex cross-client aggregation logic and large dataset limits
  - Improved performance by eliminating unnecessary 10,000 metric processing limits
  - Streamlined calculation functions for better maintainability
  - Updated `calculateDerivedMetrics` to use simplified calculator when `clientId` is provided

- **Removed Combined Performance Sheet UI**
  - Removed "Combined" tab functionality from `TabbedOverview` component
  - Removed combined metrics calculation and display from `MultiSheetOverview` component
  - Simplified UI to focus on individual client tab performance only
  - Cleaned up unused state variables and functions related to cross-sheet aggregation

### Fixed - 2025-01-20
- **Critical Infinite Loop Issue**
  - Resolved "Maximum update depth exceeded" error in `EnhancedClientDashboard`
  - Implemented `useRef` pattern to store function references and avoid dependency issues
  - Fixed `useEffect` dependency arrays that were causing infinite re-renders
  - Improved React component performance and stability

- **Google Sheets Authentication**
  - Enhanced error handling for "unknown/unsupported ASN.1 DER tag" errors
  - Added clear error messages and conversion instructions for PKCS#1 to PKCS#8 key format
  - Improved private key processing and validation in Supabase Edge Functions
  - Better user feedback for authentication issues

- **TypeScript Compilation**
  - Fixed `Deno.serve` function signature errors in Supabase Edge Functions
  - Added proper type annotations (`req: Request`) to function parameters
  - Resolved all TypeScript compilation errors

- **Code Quality**
  - Replaced all `any` types with proper TypeScript types
  - Fixed missing dependencies in `useEffect` hooks
  - Removed unused variables and cleaned up linter warnings
  - Improved type safety throughout the codebase

### Technical Improvements - 2025-01-20
- **React Patterns**
  - Implemented proper `useCallback` memoization with correct dependencies
  - Used `useRef` for function storage to prevent dependency issues
  - Optimized `useEffect` dependency management
  - Better separation of concerns in component architecture

- **Error Handling**
  - Enhanced error messages with actionable solutions
  - Added helpful conversion instructions for common issues
  - Improved logging and debugging information
  - Better error boundaries and user feedback

- **Performance**
  - Eliminated unnecessary re-renders
  - Optimized function memoization patterns
  - Improved component lifecycle management
  - Better memory usage and performance

### Added - 2025-09-18
- **Database Architecture Refactoring**
  - Implemented Option 1: Separate tables for staff and client metrics
  - Created `staff_metric_entries` table for staff personal metrics (no client_id)
  - Created `client_metric_entries` table for client-specific metrics (with client_id)
  - Migrated all existing data from old `metric_entries` table to new tables
  - Dropped old `metric_entries` table and cleaned up all related constraints

- **Database Function Improvements**
  - Fixed ambiguous column reference error in `update_staff_sync_status` function
  - Updated function to use prefixed parameter names (p_user_id, p_google_sheet_id, etc.)
  - Updated all database functions to use new table structure
  - Improved error handling and data integrity

- **Sync Function Updates**
  - Updated edge function to use new table structure
  - Modified sync logic to insert into appropriate table based on sync type
  - Staff syncs now use `staff_metric_entries` table
  - Client syncs now use `client_metric_entries` table

- **Data Integrity Improvements**
  - Removed all fake/fallback data generation
  - Eliminated misleading sample data insertion
  - System now fails properly with clear error messages instead of showing fake data
  - Ensured only real data from Google Sheets is displayed

- **Migration System Updates**
  - Updated all migration file names to use correct date (20250918)
  - Created comprehensive migration sequence for database refactoring
  - Added proper data migration verification and rollback safety

### Fixed - 2025-09-18
- **Critical Data Integrity Issue**
  - Removed fallback functions that were inserting fake data
  - Fixed ambiguous column reference errors in database functions
  - Resolved sync status update failures
  - Eliminated misleading fake metrics from being displayed

- **Database Schema Issues**
  - Fixed NULL client_id handling in metric entries
  - Resolved unique constraint conflicts between staff and client metrics
  - Improved table relationships and foreign key constraints

### Changed - 2025-09-18
- **Database Architecture**
  - Replaced single `metric_entries` table with separate `staff_metric_entries` and `client_metric_entries` tables
  - Updated all database queries to use appropriate table based on context
  - Simplified constraints and indexes for better performance
  - Improved data separation and clarity

- **Error Handling**
  - Replaced fallback data generation with proper error handling
  - Improved error messages for better debugging
  - Enhanced logging for sync operations

### Added - 2025-09-17
- **Migration System Improvements**
  - Combined three separate migration files into one comprehensive migration
  - Updated migration file names from 202501* to 20250917* to reflect correct date
  - Made migration idempotent with IF NOT EXISTS checks to handle existing tables
  - Created single deployment-ready migration: `20250917000000_create_metric_configurations_complete.sql`

- **Code Quality Improvements**
  - Fixed linter errors in MetricsOverview.tsx (removed unused TrendingUp import)
  - Cleaned up redundant edge function files (removed old sync-google-sheets, kept sync-google-sheets-dynamic)

- **Metrics Overview Enhancement**
  - Fixed hardcoded "ads" category filter in MetricsOverview component
  - Added `getAllMetricEntries()` function to load metrics from all categories
  - Updated component to show comprehensive metrics across all categories
  - Removed unnecessary "Live Data Display" banner for cleaner UI

- **Dashboard Consistency Improvements**
  - Enhanced ClientDashboard now includes individual metric category tabs
  - Both Legacy and Enhanced dashboards show identical data structure
  - Added individual metric tabs (Growth, Performance, Cold Email, Ads, Spam Outreach)
  - Maintained rollback capability between dashboard versions

- **Date Picker Conflict Resolution**
  - Fixed conflicting date pickers between tenant-level and individual metric tabs
  - Enhanced MetricsDisplay component to accept external timeFrame prop
  - Implemented controlled mode for date picker management
  - Simplified component interface by removing unnecessary hideDatePicker prop

- **Security and UX Improvements**
  - Removed disconnect button from client dashboard (staff-only control)
  - Cleaned up unused AdminMigrationTool component and related functions
  - Removed legacy `migrateAllClientsToDynamicSync()` function
  - Improved code organization and removed dead code

### Added
- **Dynamic Metric Configuration System**
  - New `metric_configurations` database table for user-selectable metrics
  - `MetricSelector` component with checkbox interface for metric selection
  - Support for 20+ predefined metrics including "Cold Emails"
  - Custom metric creation with advanced configuration options
  - Drag-and-drop reordering and metric type selection (currency, percentage, count, number)

- **Enhanced Client Dashboard**
  - New `EnhancedClientDashboard` component with modern UI
  - Smart sync detection (dynamic vs standard metrics)
  - Integrated metric configuration interface
  - Visual status indicators for configuration state
  - Toggle button to switch between old and new dashboard

- **Dynamic Edge Function**
  - New `sync-google-sheets-dynamic` Edge Function
  - Reads metric configurations from database instead of hardcoded lists
  - Auto-detects sheet columns and maps to configured metrics
  - Processes only selected metrics for improved performance

- **Authentication System Overhaul**
  - New `AuthContext` for centralized authentication state management
  - Proper session persistence across page refreshes
  - Automatic token refresh and session restoration
  - Eliminated prop drilling for auth state

- **Enhanced User Experience**
  - Error boundaries for better error handling
  - Network status monitoring with offline indicators
  - Password reset functionality with email integration
  - Debounced toggle buttons to prevent rapid clicking issues
  - Loading states and visual feedback throughout the app

### Changed
- **Supabase Client Configuration**
  - Enabled `persistSession: true` for session persistence
  - Enabled `autoRefreshToken: true` for automatic token refresh
  - Added custom localStorage handlers with error handling
  - Maintained PKCE flow for security

- **Google Sheets Integration**
  - Updated hardcoded metric lists to include "Cold Emails" column
  - Extended sheet range from `A1:O100` to `A1:P100` for new column
  - Enhanced error handling and logging in sync functions

- **Component Architecture**
  - Refactored App.tsx to use AuthProvider pattern
  - Updated LoginForm to use auth context instead of direct Supabase calls
  - Simplified MainLayout by removing auth prop drilling
  - Improved component separation and reusability

### Fixed
- **Authentication Persistence**
  - Fixed logout on page refresh issue
  - Resolved session restoration problems
  - Eliminated authentication state inconsistencies

- **Toggle Button Issues**
  - Fixed context closure problems in debounced toggle
  - Resolved rapid clicking causing broken state
  - Added proper visual feedback during state transitions

- **Database Schema**
  - Fixed SQL migration formatting and indentation
  - Added conditional insertion logic to prevent errors on fresh deployments
  - Improved RLS policies for metric configurations

### Technical Improvements
- **State Management**
  - Implemented React Context for global state
  - Added custom hooks for debouncing functionality
  - Improved error handling and loading states

- **Code Quality**
  - Added comprehensive TypeScript types
  - Improved error boundaries and fallback handling
  - Enhanced logging and debugging capabilities
  - Consistent code formatting and linting

- **Performance**
  - Optimized database queries with proper indexing
  - Reduced unnecessary re-renders with proper dependency arrays
  - Improved Edge Function efficiency with dynamic metric processing

## [Previous Versions]

### Legacy Features
- Basic client dashboard with hardcoded metrics
- Standard Google Sheets sync with fixed column mapping
- Simple authentication without session persistence
- Manual metric entry forms
- Basic error handling

---

## Development Notes

### Database Migrations
- `20250114000000_create_metric_configurations.sql` - Creates dynamic metric configuration system
- All migrations include proper RLS policies and error handling

### Edge Functions
- `sync-google-sheets` - Original hardcoded metric sync (maintained for backward compatibility)
- `sync-google-sheets-dynamic` - New dynamic metric sync based on user configurations

### Key Components
- `AuthContext` - Centralized authentication state management
- `MetricSelector` - User interface for metric configuration
- `EnhancedClientDashboard` - Modern dashboard with dynamic metric support
- `ErrorBoundary` - Application-wide error handling
- `NetworkStatus` - Network connectivity monitoring

### Configuration
- Supabase client now properly configured for session persistence
- Environment variables for Google Sheets integration
- Custom storage handlers for robust session management

---

*This changelog is maintained to track all significant changes to the Dashboard Undeniable project. For detailed technical documentation, see the `/docs` directory.*
