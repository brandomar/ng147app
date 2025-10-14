# Write Metrics Feature - Future Implementation

## Overview

This document describes the planned write-metrics feature that will allow users to add and edit metrics from the UI and have those changes sync back to Google Sheets.

**Status**: Planned - Requires Google service account with write access to spreadsheets

---

## Prerequisites

Before implementing this feature:

1. **Google Service Account Permissions**
   - Update service account scope from `spreadsheets.readonly` to `spreadsheets` (read/write)
   - Verify in Google Cloud Console → IAM & Admin → Service Accounts
   - Ensure service account has "Editor" access to target spreadsheets

2. **Database**
   - `metric_type` column already added to metrics table ✅
   - RLS policies allow authenticated users to insert metrics ✅

3. **Permissions System**
   - `canSyncData` permission for guarding write operations ✅

---

## Phase 1: Write-Metric Edge Function

### Create New Edge Function

**File**: `supabase/functions/write-metric/index.ts` (NEW)

### Request Interface

```typescript
interface WriteMetricRequest {
  user_id: string;
  client_id: string;
  google_sheet_id: string;
  sheet_name: string;
  tab_name: string;
  metric_name: string;
  value: number;
  date: string;
  category: string;
  metric_type: 'currency' | 'percentage' | 'number';
}
```

### Operations Flow

1. **Validate JWT and Permissions**
   ```typescript
   const { data: { user }, error: authError } = await supabase.auth.getUser(token);
   const { data: hasSyncPermission } = await supabase.rpc('has_permission', {
     p_user_id: user.id,
     p_permission: 'canSyncData'
   });
   ```

2. **Verify User Has Access to Client**
   ```typescript
   const { data: hasAccess } = await supabase.rpc('can_access_client', {
     p_user_id: user.id,
     p_client_id: request.client_id
   });
   ```

3. **Insert/Update in Database**
   ```typescript
   const { error } = await supabase
     .from('metrics')
     .upsert({
       user_id: request.user_id,
       client_id: request.client_id,
       google_sheet_id: request.google_sheet_id,
       sheet_name: request.sheet_name,
       tab_name: request.tab_name,
       metric_name: request.metric_name,
       value: request.value,
       date: request.date,
       category: request.category,
       metric_type: request.metric_type,
       data_source_type: 'google_sheets',
       created_at: new Date().toISOString()
     });
   ```

4. **Write to Google Sheets**
   ```typescript
   // Get access token with write scope
   const accessToken = await getAccessToken('https://www.googleapis.com/auth/spreadsheets');
   
   // Find the row with matching date or append new row
   const response = await fetch(
     `https://sheets.googleapis.com/v4/spreadsheets/${googleSheetId}/values/${sheetName}!A:Z`,
     { headers: { 'Authorization': `Bearer ${accessToken}` } }
   );
   
   // Update or append row logic here
   ```

5. **Return Success/Failure**

### Google Sheets Write Logic

Two approaches:

**A. Update Existing Row** (if date exists):
```typescript
// Find row index where Date column matches
// Update the specific metric column in that row
await fetch(
  `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
  {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [[value]] })
  }
);
```

**B. Append New Row** (if date doesn't exist):
```typescript
await fetch(
  `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:Z:append?valueInputOption=USER_ENTERED`,
  {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [[date, ...metricValues]] })
  }
);
```

---

## Phase 2: UI Modal Component

### Create Metric Entry Modal

**File**: `src/components/shared/MetricEntryModal.tsx` (NEW)

### Features

- **Date Picker**: Display as MM/DD/YYYY, store as YYYY-MM-DD
- **Metric Name Input**: Text field with autocomplete of existing metrics
- **Value Input**: Numeric input with auto-formatting based on type
- **Type Selector**: Dropdown for Currency, Percentage, Number
- **Category Selector**: Dropdown for existing categories
- **Validation**: Ensure all required fields are filled

### Component Structure

```typescript
interface MetricEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  googleSheetId: string;
  sheetName: string;
  tabName: string;
  onSave?: () => void;
}

export const MetricEntryModal: React.FC<MetricEntryModalProps> = ({
  isOpen,
  onClose,
  clientId,
  googleSheetId,
  sheetName,
  tabName,
  onSave
}) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    metricName: '',
    value: '',
    category: '',
    metricType: 'number' as 'number' | 'currency' | 'percentage'
  });
  
  const handleSubmit = async () => {
    // Call writeMetricToSheet service function
    // Handle success/error
    // Refresh dashboard data
    // Close modal
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {/* Form fields */}
    </Modal>
  );
};
```

### Auto-Formatting Based on Type

```typescript
const formatValueDisplay = (value: string, type: string) => {
  const numeric = parseFloat(value);
  if (isNaN(numeric)) return value;
  
  switch (type) {
    case 'currency':
      return `$${numeric.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    case 'percentage':
      return `${numeric}%`;
    default:
      return value;
  }
};
```

---

## Phase 3: Service Function

### Create Write Service

**File**: `src/lib/database/metrics.ts` (NEW or add to existing)

```typescript
export async function writeMetricToSheet(metricData: {
  clientId: string;
  googleSheetId: string;
  sheetName: string;
  tabName: string;
  metricName: string;
  value: number;
  date: string;
  category: string;
  metricType: 'currency' | 'percentage' | 'number';
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.access_token) throw new Error('No session token');
    
    // Call write-metric Edge Function
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/write-metric`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: user.id,
          client_id: metricData.clientId,
          google_sheet_id: metricData.googleSheetId,
          sheet_name: metricData.sheetName,
          tab_name: metricData.tabName,
          metric_name: metricData.metricName,
          value: metricData.value,
          date: metricData.date,
          category: metricData.category,
          metric_type: metricData.metricType
        })
      }
    );
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to write metric');
    }
    
    logger.info('✅ Metric written successfully:', metricData);
    return { success: true, data: result };
    
  } catch (error) {
    logger.error('❌ Error writing metric:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
```

---

## Phase 4: Dashboard Integration

### Add "Add Metric" Button

**File**: `src/components/dashboard/Dashboard.tsx`

```typescript
import { MetricEntryModal } from '../shared/MetricEntryModal';
import { usePermissions } from '../../contexts/PermissionContext';

export const Dashboard = () => {
  const { hasPermission } = usePermissions();
  const canAddMetrics = hasPermission('canSyncData');
  const [showMetricModal, setShowMetricModal] = useState(false);
  
  return (
    <div>
      {/* Existing dashboard content */}
      
      {canAddMetrics && (
        <button
          onClick={() => setShowMetricModal(true)}
          className="btn-primary"
        >
          <Plus size={16} />
          Add Metric
        </button>
      )}
      
      <MetricEntryModal
        isOpen={showMetricModal}
        onClose={() => setShowMetricModal(false)}
        clientId={selectedClient?.id}
        googleSheetId={selectedClient?.google_sheets_url}
        sheetName={selectedSheet}
        tabName={selectedTab}
        onSave={() => {
          // Refresh dashboard data
          refreshDashboardData();
          setShowMetricModal(false);
        }}
      />
    </div>
  );
};
```

---

## Testing Checklist

### Prerequisites
- [ ] Verify Google service account has write scope
- [ ] Verify service account has Editor access to test spreadsheet
- [ ] Ensure user has `canSyncData` permission

### Edge Function
- [ ] Test with valid JWT token
- [ ] Test permission check (should fail for users without `canSyncData`)
- [ ] Test client access check
- [ ] Test database insert/update
- [ ] Test Google Sheets write (update existing row)
- [ ] Test Google Sheets write (append new row)
- [ ] Test error handling for invalid data

### UI Modal
- [ ] Modal opens correctly
- [ ] Date picker displays MM/DD/YYYY format
- [ ] Value auto-formats based on type selection
- [ ] Category dropdown populated with existing categories
- [ ] Validation works (required fields)
- [ ] Submit triggers service function
- [ ] Success message displayed
- [ ] Error message displayed on failure
- [ ] Dashboard refreshes after successful save

### Integration
- [ ] "Add Metric" button only shows for users with permission
- [ ] Clicking button opens modal
- [ ] Saving metric updates database
- [ ] Saving metric updates Google Sheet
- [ ] Dashboard shows new metric immediately
- [ ] Sync still works (doesn't conflict with manual entries)

---

## Security Considerations

1. **Permission Guards**
   - Edge Function validates `canSyncData` permission
   - UI button hidden for users without permission
   - RLS policies ensure users can only write to their accessible clients

2. **Data Validation**
   - Validate date format
   - Validate numeric values
   - Validate metric type enum
   - Sanitize metric names (prevent injection)

3. **Rate Limiting**
   - Consider adding rate limiting to Edge Function
   - Prevent abuse of Google Sheets API quota

4. **Audit Trail**
   - Log all write operations
   - Track who wrote what and when
   - Consider adding `updated_by` column to metrics table

---

## Future Enhancements

1. **Bulk Edit**
   - Allow editing multiple metrics at once
   - Support copying rows

2. **Metric History**
   - Track changes to metrics over time
   - Show audit log in UI

3. **Validation Rules**
   - Define expected ranges for metrics
   - Alert on anomalies

4. **Rollback**
   - Ability to revert changes
   - Restore from backup

---

## Deployment Steps (When Ready)

1. Update Google service account scope:
   ```bash
   # Update in Google Cloud Console
   # Or regenerate service account with spreadsheets (not readonly) scope
   ```

2. Update environment variable:
   ```bash
   # In Supabase dashboard or .env
   GOOGLE_SHEETS_SCOPE=https://www.googleapis.com/auth/spreadsheets
   ```

3. Deploy Edge Function:
   ```bash
   supabase functions deploy write-metric
   ```

4. Test with development spreadsheet first

5. Deploy to production after thorough testing

---

**Created**: October 12, 2025  
**Status**: Planned for future implementation  
**Blocked By**: Google service account needs write access to spreadsheets

