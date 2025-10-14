# Whitelabel Migration Guide

This guide helps you migrate existing deployments to use the new whitelabel system.

## 🚨 **Important Notes**

- **Backup First**: Always backup your database and code before migration
- **Test Environment**: Test the migration in a development environment first
- **Gradual Migration**: Consider migrating one whitelabel at a time
- **Rollback Plan**: Have a rollback plan ready

## 📋 **Migration Checklist**

### **Pre-Migration**
- [ ] Backup database
- [ ] Backup code repository
- [ ] Test in development environment
- [ ] Document current configuration
- [ ] Plan rollback strategy

### **During Migration**
- [ ] Update environment variables
- [ ] Update database functions (if needed)
- [ ] Update edge functions (if needed)
- [ ] Test all functionality
- [ ] Verify whitelabel configuration

### **Post-Migration**
- [ ] Verify all features work
- [ ] Test user permissions
- [ ] Test data synchronization
- [ ] Monitor for errors
- [ ] Update documentation

## 🔄 **Migration Steps**

### **Step 1: Update Environment Variables**

Add the new whitelabel configuration to your `.env.local`:

```bash
# Add these new environment variables
VITE_ADMIN_ROLE=undeniable
VITE_ADMIN_SECTION=undeniable
VITE_SYNC_FUNCTION=syncGoogleSheetsUndeniable
VITE_SYNC_STATUS_FUNCTION=getUndeniableSyncStatus
VITE_UPDATE_SYNC_FUNCTION=updateUndeniableSyncStatus
VITE_METRIC_CONFIG_FUNCTION=getUndeniableMetricConfigurations
```

### **Step 2: Update Database Functions (Optional)**

If you want to rename database functions for whitelabeling:

```sql
-- Example: Rename functions for ACME brand
ALTER FUNCTION syncGoogleSheetsUndeniable RENAME TO syncGoogleSheetsAdmin;
ALTER FUNCTION getUndeniableSyncStatus RENAME TO getAdminSyncStatus;
ALTER FUNCTION updateUndeniableSyncStatus RENAME TO updateAdminSyncStatus;
ALTER FUNCTION getUndeniableMetricConfigurations RENAME TO getAdminMetricConfigurations;
```

### **Step 3: Update Edge Functions (Optional)**

If you have edge functions that use hardcoded names:

```typescript
// Before
const result = await syncGoogleSheetsUndeniable(userId, sheetId);

// After
const result = await syncGoogleSheets(userId, sheetId); // Uses whitelabel config
```

### **Step 4: Test Migration**

1. **Start Development Server**:
   ```bash
   npm run dev
   ```

2. **Test Core Functionality**:
   - [ ] User login/logout
   - [ ] Role-based permissions
   - [ ] Dashboard navigation
   - [ ] Data synchronization
   - [ ] Client management

3. **Test Whitelabel Features**:
   - [ ] Brand configuration loading
   - [ ] Dynamic theming
   - [ ] Role-based UI text
   - [ ] Function name resolution

### **Step 5: Deploy to Production**

1. **Build Application**:
   ```bash
   npm run build
   ```

2. **Deploy to Hosting Platform**:
   - Update environment variables
   - Deploy new code
   - Monitor for errors

## 🛠️ **Advanced Migration Scenarios**

### **Scenario 1: Multiple Whitelabel Versions**

If you have multiple whitelabel versions:

1. **Create Separate Deployments**:
   ```bash
   # Create whitelabel builds
   npm run build:undeniable
   npm run build:acme
   npm run build:techcorp
   ```

2. **Configure Each Deployment**:
   - Update environment variables for each
   - Deploy to separate domains
   - Configure separate databases

### **Scenario 2: Database Function Renaming**

If you want to rename database functions:

1. **Create Migration Script**:
   ```sql
   -- Create new functions with generic names
   CREATE OR REPLACE FUNCTION syncGoogleSheets(
     p_user_id TEXT,
     p_google_sheet_id TEXT,
     p_sheet_name TEXT DEFAULT NULL,
     p_selected_tabs JSONB DEFAULT NULL
   ) RETURNS JSONB AS $$
   BEGIN
     -- Implementation here
   END;
   $$ LANGUAGE plpgsql;
   ```

2. **Update Application Code**:
   ```typescript
   // Use whitelabel-aware function
   const result = await syncGoogleSheets(userId, sheetId);
   ```

### **Scenario 3: Edge Function Updates**

If you have edge functions that need updating:

1. **Update Edge Function Code**:
   ```typescript
   // Before
   import { syncGoogleSheetsUndeniable } from '../lib/database';
   
   // After
   import { syncGoogleSheets } from '../lib/whitelabelDatabase';
   ```

2. **Deploy Edge Functions**:
   ```bash
   supabase functions deploy your-function-name
   ```

## 🔍 **Troubleshooting**

### **Common Issues**

1. **Environment Variables Not Loading**:
   - Check `.env.local` file exists
   - Verify variable names are correct
   - Restart development server

2. **Function Not Found Errors**:
   - Check function names in configuration
   - Verify database functions exist
   - Check import paths

3. **Role Permission Issues**:
   - Verify role names in configuration
   - Check user role assignments
   - Test permission logic

4. **Styling Issues**:
   - Check Tailwind configuration
   - Verify brand colors are set
   - Test dynamic theming

### **Debug Steps**

1. **Enable Debug Logging**:
   ```bash
   VITE_DEBUG=true
   VITE_LOG_LEVEL=debug
   ```

2. **Check Console Logs**:
   - Look for configuration loading errors
   - Check function resolution errors
   - Monitor permission checks

3. **Test Individual Components**:
   - Test brand configuration loading
   - Test role-based permissions
   - Test function calls

## 📊 **Migration Validation**

### **Validation Checklist**

- [ ] **Brand Configuration**: All brand settings load correctly
- [ ] **Role Permissions**: Users have correct access levels
- [ ] **Navigation**: All navigation works correctly
- [ ] **Data Sync**: Google Sheets sync works
- [ ] **Client Management**: Client operations work
- [ ] **User Management**: User operations work
- [ ] **Settings**: All settings pages work
- [ ] **Styling**: Dynamic theming works
- [ ] **Performance**: No performance degradation

### **Testing Commands**

```bash
# Test brand configuration
npm run validate-architecture

# Test build process
npm run build

# Test whitelabel builds
npm run build:whitelabel your-brand
```

## 🚀 **Post-Migration**

### **Monitoring**

1. **Error Monitoring**: Set up error tracking
2. **Performance Monitoring**: Monitor application performance
3. **User Feedback**: Collect user feedback on changes

### **Documentation Updates**

1. **Update README**: Update project documentation
2. **Update Deployment Docs**: Update deployment instructions
3. **Update User Docs**: Update user-facing documentation

### **Maintenance**

1. **Regular Updates**: Keep whitelabel system updated
2. **Security Updates**: Apply security patches
3. **Feature Updates**: Add new whitelabel features

## 🆘 **Rollback Plan**

If migration fails:

1. **Restore Database**: Restore from backup
2. **Restore Code**: Revert to previous version
3. **Update Environment**: Restore old environment variables
4. **Test Functionality**: Verify everything works
5. **Document Issues**: Document what went wrong

## 📞 **Support**

If you need help with migration:

1. **Check Documentation**: Review this guide and other docs
2. **Check Issues**: Look for similar issues in GitHub
3. **Contact Support**: Reach out for professional help
4. **Community**: Ask in community channels

## 🎯 **Success Criteria**

Migration is successful when:

- ✅ All whitelabel features work correctly
- ✅ No errors in console or logs
- ✅ All user permissions work
- ✅ Data synchronization works
- ✅ Performance is maintained
- ✅ Users can access all features
- ✅ Branding is applied correctly
- ✅ Dynamic theming works
- ✅ Function names are resolved correctly
- ✅ Role-based access works

This migration guide ensures a smooth transition to the whitelabel system while maintaining all existing functionality.
