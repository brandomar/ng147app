# Dashboard Undeniable

Multi-tenant dashboard application for tracking business metrics with Google Sheets integration.

## 🚀 Current Status

**Status**: 🟢 **PRODUCTION READY** - Core functionality complete and optimized

### Latest Updates
- ✅ **Projections & Pacing**: Goal tracking with progress bars and performance summaries
- ✅ **Permission System Refactor**: Migrated to feature-based permission system
- ✅ **Database Schema Update**: New roles, userRoles, and profiles tables
- ✅ **Component Architecture**: Updated all components to use new permission system
- ✅ **Backward Compatibility**: Maintained compatibility during migration
- ✅ **Codebase Cleanup**: Removed unused components and optimized structure
- ✅ **Metric Filtering**: Fixed metric display and configuration system
- ✅ **Logging System**: Replaced console.log with centralized logger

### Key Features
- Multi-tenant architecture with role-based access
- Dynamic Google Sheets synchronization
- Configurable metric tracking with real-time updates
- Goal tracking with projections and pacing insights
- Modern, responsive UI with Tailwind CSS
- Secure authentication and data isolation

### 📚 Documentation
- **[New Instance Setup Guide](docs/deployment/NEW_INSTANCE_SETUP.md)** - Complete walkthrough for deploying to a new Supabase project and Google account
- **[AGENTS.md](AGENTS.md)** - Comprehensive architecture guide for AI agents and developers
- **[CHANGELOG.md](CHANGELOG.md)** - Detailed version history

## Features

### 🔐 Authentication & Security
- Secure user authentication with Supabase
- **NEW**: Feature-based permission system with granular control
- **NEW**: Role-based access control (admin, staff, client)
- **NEW**: Global admin flag for system-wide access
- Session persistence across page refreshes
- Password reset functionality
- Row Level Security (RLS) for multi-tenant data isolation

### 📊 Dynamic Metrics System
- User-configurable metric selection from Google Sheets columns
- Automatic metric discovery and configuration
- Real-time Google Sheets synchronization
- Metric type support (currency, percentage, count, number)
- Sheet-based metric organization with independent configurations

### 🎯 Projections & Pacing
- Monthly goal target setting for key metrics
- Real-time progress tracking with visual indicators
- Over/under target arrows and color-coded progress bars
- Performance summary with ROAS and ATV calculations
- Synchronized with date filter for accurate tracking

### 🎨 Modern User Interface
- Clean, responsive design with Tailwind CSS
- Enhanced client dashboards with toggle functionality
- Error boundaries and network status monitoring
- Loading states and visual feedback
- Debounced interactions for better UX

### 🔄 Google Sheets Integration
- Automatic data synchronization
- Dynamic column detection
- Support for custom sheet names and ranges
- Error handling and retry mechanisms
- Fallback sync options

### 🏢 Multi-Tenant Architecture
- Client-specific data isolation
- Configurable metric permissions
- Staff and client user roles
- Scalable database design

## Quick Start

**For a complete deployment guide**, see **[New Instance Setup Guide](docs/deployment/NEW_INSTANCE_SETUP.md)**

### Development Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   ```bash
   # Copy example environment file
   cp .env.example .env.local
   
   # Edit .env.local and add your credentials:
   # - VITE_SUPABASE_URL
   # - VITE_SUPABASE_ANON_KEY
   # - VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL
   # - VITE_GOOGLE_PRIVATE_KEY
   ```

3. **Database Setup**
   ```bash
   # Link to your Supabase project
   npx supabase link --project-ref your-project-ref
   
   # Run all migrations
   npx supabase db push
   ```

4. **Development Server**
   ```bash
   npm run dev
   ```

5. **Access the Application**
   - Open [http://localhost:5173](http://localhost:5173)
   - Sign up for an admin account
   - Configure your first client and Google Sheet

## Project Structure

```
src/
├── components/          # React components
│   ├── shared/         # Reusable shared components
│   ├── UndeniableDashboard.tsx
│   ├── ClientDashboard.tsx
│   ├── UserManagement.tsx
│   └── MainLayout.tsx
├── contexts/           # React contexts
│   ├── AuthContext.tsx
│   ├── AppContext.tsx
│   └── DashboardContext.tsx
├── hooks/             # Custom React hooks
│   ├── useUnifiedRouting.ts
│   ├── useRoleBasedPermissions.ts
│   └── useTaskQueue.ts
├── lib/               # Utility libraries
│   ├── database.ts
│   ├── logger.ts
│   └── supabase.ts
└── types/             # TypeScript definitions

supabase/
├── functions/         # Edge Functions
│   ├── google-metric-sync/
│   └── invite-user/
└── migrations/        # Database migrations
```

## Key Components

### Core Dashboards
- **UndeniableDashboard**: Staff dashboard with full system access
- **ClientDashboard**: Client-specific dashboard with limited access
- **UserManagement**: Unified user and client management interface

### Shared Components
- **UnifiedMetricsDisplay**: Reusable metrics display with filtering
- **SheetSelector**: Google Sheets selection component

### Context System
- **AuthContext**: Authentication and user session management
- **AppContext**: Global application state and client management
- **DashboardContext**: Dashboard-specific state and sheet configuration

### Edge Functions
- **google-metric-sync**: Handles Google Sheets data synchronization
- **invite-user**: User invitation and access management

## Database Schema

### Core Tables
- `clients` - Client information and configuration
- `client_tabs` - Client-specific sheet configurations
- `discovered_metrics` - Sheet metadata and metric configurations (JSONB)
- `metric_entries` - Historical metric data
- `unified_sync_status` - Synchronization status tracking

### Security
- Row Level Security (RLS) enabled on all tables
- Client-specific data isolation
- Role-based access control

## Development

### Adding New Metrics
1. Update the `AVAILABLE_METRICS` array in `MetricSelector.tsx`
2. Add corresponding database migration if needed
3. Update Edge Function column mappings
4. Test with sample data

### Database Migrations
```bash
# Create new migration
supabase migration new migration_name

# Apply migrations
supabase db push
```

### Edge Functions
```bash
# Deploy Edge Function
supabase functions deploy sync-google-sheets-dynamic
```

## Configuration

### Environment Variables
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` - Google Sheets service account
- `GOOGLE_PRIVATE_KEY` - Google Sheets private key

### Google Sheets Setup
1. Create service account in Google Cloud Console
2. Share spreadsheet with service account email
3. Configure sheet structure with proper headers
4. Set up metric configurations in dashboard

## Contributing

1. Follow the existing code style and patterns
2. Add tests for new functionality
3. Update documentation and changelog
4. Ensure all migrations are reversible

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for detailed version history and changes.

## License

[Add your license information here]

---

*Built with React, TypeScript, Supabase, and Tailwind CSS*
