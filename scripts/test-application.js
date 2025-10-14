#!/usr/bin/env node

/**
 * Comprehensive Application Testing Script
 * 
 * This script tests all major functionality including:
 * - Whitelabel features
 * - Data synchronization
 * - Excel import
 * - Filter layer
 * - Date selector
 * - Metric visibility
 * - User management
 * - Dashboard navigation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function testWhitelabelFeatures() {
  log('\n🎨 Testing Whitelabel Features...', colors.blue);
  
  const tests = [
    {
      name: 'Brand Configuration Loading',
      test: () => {
        const brandingPath = path.join(__dirname, '..', 'src', 'config', 'branding.ts');
        if (!fs.existsSync(brandingPath)) return false;
        
        const content = fs.readFileSync(brandingPath, 'utf8');
        return content.includes('BRAND_CONFIG') && content.includes('useBrandConfig');
      }
    },
    {
      name: 'Whitelabel Database Service',
      test: () => {
        const whitelabelPath = path.join(__dirname, '..', 'src', 'lib', 'whitelabelDatabase.ts');
        if (!fs.existsSync(whitelabelPath)) return false;
        
        const content = fs.readFileSync(whitelabelPath, 'utf8');
        return content.includes('syncGoogleSheets') && content.includes('isAdminRole');
      }
    },
    {
      name: 'Branded Components',
      test: () => {
        const brandedHeader = path.join(__dirname, '..', 'src', 'components', 'shared', 'BrandedHeader.tsx');
        const brandedLogin = path.join(__dirname, '..', 'src', 'components', 'auth', 'BrandedLoginForm.tsx');
        return fs.existsSync(brandedHeader) && fs.existsSync(brandedLogin);
      }
    },
    {
      name: 'Role-based Configuration',
      test: () => {
        const brandingPath = path.join(__dirname, '..', 'src', 'config', 'branding.ts');
        const content = fs.readFileSync(brandingPath, 'utf8');
        return content.includes('roles:') && content.includes('sections:') && content.includes('functions:');
      }
    }
  ];

  let passed = 0;
  tests.forEach(({ name, test }) => {
    if (test()) {
      log(`✅ ${name}`, colors.green);
      passed++;
    } else {
      log(`❌ ${name}`, colors.red);
    }
  });

  return { passed, total: tests.length };
}

function testDataSyncFeatures() {
  log('\n🔄 Testing Data Sync Features...', colors.blue);
  
  const tests = [
    {
      name: 'Edge Function Integration',
      test: () => {
        const edgeFunctionPath = path.join(__dirname, '..', 'supabase', 'functions', 'google-metric-sync-enhanced');
        return fs.existsSync(edgeFunctionPath);
      }
    },
    {
      name: 'Dynamic Sync Utilities',
      test: () => {
        const dynamicSyncPath = path.join(__dirname, '..', 'src', 'lib', 'dynamicSync.ts');
        return fs.existsSync(dynamicSyncPath);
      }
    },
    {
      name: 'Sync Status Tracking',
      test: () => {
        const databasePath = path.join(__dirname, '..', 'src', 'lib', 'database.ts');
        const content = fs.readFileSync(databasePath, 'utf8');
        return content.includes('updateUndeniableSyncStatus') && content.includes('getUndeniableSyncStatus');
      }
    },
    {
      name: 'Multi-sheet Support',
      test: () => {
        const hierarchicalPath = path.join(__dirname, '..', 'src', 'components', 'shared', 'HierarchicalSheetSelector.tsx');
        return fs.existsSync(hierarchicalPath);
      }
    }
  ];

  let passed = 0;
  tests.forEach(({ name, test }) => {
    if (test()) {
      log(`✅ ${name}`, colors.green);
      passed++;
    } else {
      log(`❌ ${name}`, colors.red);
    }
  });

  return { passed, total: tests.length };
}

function testExcelImportFeatures() {
  log('\n📊 Testing Excel Import Features...', colors.blue);
  
  const tests = [
    {
      name: 'Excel Parser',
      test: () => {
        const excelParserPath = path.join(__dirname, '..', 'src', 'lib', 'excelParser.ts');
        return fs.existsSync(excelParserPath);
      }
    },
    {
      name: 'Data Transformation',
      test: () => {
        const excelParserPath = path.join(__dirname, '..', 'src', 'lib', 'excelParser.ts');
        const content = fs.readFileSync(excelParserPath, 'utf8');
        return content.includes('parseExcelFile') && content.includes('transformExcelData');
      }
    },
    {
      name: 'Database Integration',
      test: () => {
        const excelParserPath = path.join(__dirname, '..', 'src', 'lib', 'excelParser.ts');
        const content = fs.readFileSync(excelParserPath, 'utf8');
        return content.includes('insertExcelMetricEntries');
      }
    },
    {
      name: 'Client Management Integration',
      test: () => {
        const clientManagementPath = path.join(__dirname, '..', 'src', 'components', 'management', 'ClientManagement.tsx');
        const content = fs.readFileSync(clientManagementPath, 'utf8');
        return content.includes('excelParser') && content.includes('excel-import');
      }
    }
  ];

  let passed = 0;
  tests.forEach(({ name, test }) => {
    if (test()) {
      log(`✅ ${name}`, colors.green);
      passed++;
    } else {
      log(`❌ ${name}`, colors.red);
    }
  });

  return { passed, total: tests.length };
}

function testFilterLayerFeatures() {
  log('\n🔍 Testing Filter Layer Features...', colors.blue);
  
  const tests = [
    {
      name: 'Filter Context',
      test: () => {
        const filterContextPath = path.join(__dirname, '..', 'src', 'contexts', 'FilterContext.tsx');
        return fs.existsSync(filterContextPath);
      }
    },
    {
      name: 'Unified Filter Integration',
      test: () => {
        const filterIntegrationPath = path.join(__dirname, '..', 'src', 'lib', 'UNIFIED_FILTER_INTEGRATION.md');
        return fs.existsSync(filterIntegrationPath);
      }
    },
    {
      name: 'Date Filter Component',
      test: () => {
        const dateFilterPath = path.join(__dirname, '..', 'src', 'components', 'shared', 'DateFilter.tsx');
        return fs.existsSync(dateFilterPath);
      }
    },
    {
      name: 'Multi-source Overview',
      test: () => {
        const multiSourcePath = path.join(__dirname, '..', 'src', 'components', 'shared', 'MultiSourceOverviewSelector.tsx');
        return fs.existsSync(multiSourcePath);
      }
    }
  ];

  let passed = 0;
  tests.forEach(({ name, test }) => {
    if (test()) {
      log(`✅ ${name}`, colors.green);
      passed++;
    } else {
      log(`❌ ${name}`, colors.red);
    }
  });

  return { passed, total: tests.length };
}

function testMetricVisibilityFeatures() {
  log('\n👁️ Testing Metric Visibility Features...', colors.blue);
  
  const tests = [
    {
      name: 'Unified Metrics Display',
      test: () => {
        const metricsDisplayPath = path.join(__dirname, '..', 'src', 'components', 'shared', 'UnifiedMetricsDisplay.tsx');
        return fs.existsSync(metricsDisplayPath);
      }
    },
    {
      name: 'Role-based Metric Access',
      test: () => {
        const metricsDisplayPath = path.join(__dirname, '..', 'src', 'components', 'shared', 'UnifiedMetricsDisplay.tsx');
        const content = fs.readFileSync(metricsDisplayPath, 'utf8');
        return content.includes('filteredMetrics') && content.includes('selectedMetricsConfig');
      }
    }
  ];

  let passed = 0;
  tests.forEach(({ name, test }) => {
    if (test()) {
      log(`✅ ${name}`, colors.green);
      passed++;
    } else {
      log(`❌ ${name}`, colors.red);
    }
  });

  return { passed, total: tests.length };
}

function testUserManagementFeatures() {
  log('\n👥 Testing User Management Features...', colors.blue);
  
  const tests = [
    {
      name: 'User Management Tabbed Interface',
      test: () => {
        const userManagementPath = path.join(__dirname, '..', 'src', 'components', 'management', 'UserManagementTabbed.tsx');
        return fs.existsSync(userManagementPath);
      }
    },
    {
      name: 'Client Assignment Manager',
      test: () => {
        const clientAssignmentPath = path.join(__dirname, '..', 'src', 'components', 'management', 'ClientAssignmentManager.tsx');
        return fs.existsSync(clientAssignmentPath);
      }
    },
    {
      name: 'Role-based Permissions Hook',
      test: () => {
        const permissionsPath = path.join(__dirname, '..', 'src', 'hooks', 'useRoleBasedPermissions.ts');
        return fs.existsSync(permissionsPath);
      }
    },
    {
      name: 'User Invitation System',
      test: () => {
        const invitationPath = path.join(__dirname, '..', 'src', 'components', 'auth', 'AcceptInvitationPage.tsx');
        return fs.existsSync(invitationPath);
      }
    }
  ];

  let passed = 0;
  tests.forEach(({ name, test }) => {
    if (test()) {
      log(`✅ ${name}`, colors.green);
      passed++;
    } else {
      log(`❌ ${name}`, colors.red);
    }
  });

  return { passed, total: tests.length };
}

function testDashboardNavigationFeatures() {
  log('\n🧭 Testing Dashboard Navigation Features...', colors.blue);
  
  const tests = [
    {
      name: 'Unified Routing Hook',
      test: () => {
        const routingPath = path.join(__dirname, '..', 'src', 'hooks', 'useUnifiedRouting.ts');
        return fs.existsSync(routingPath);
      }
    },
    {
      name: 'Main Layout Component',
      test: () => {
        const mainLayoutPath = path.join(__dirname, '..', 'src', 'components', 'layout', 'MainLayout.tsx');
        return fs.existsSync(mainLayoutPath);
      }
    },
    {
      name: 'Sidebar Navigation',
      test: () => {
        const sidebarPath = path.join(__dirname, '..', 'src', 'components', 'layout', 'Sidebar.tsx');
        return fs.existsSync(sidebarPath);
      }
    },
    {
      name: 'Client Dashboard Support',
      test: () => {
        const dashboardPath = path.join(__dirname, '..', 'src', 'components', 'dashboard', 'Dashboard.tsx');
        const content = fs.readFileSync(dashboardPath, 'utf8');
        return content.includes('client?: Client') && content.includes('permissions.isClient');
      }
    }
  ];

  let passed = 0;
  tests.forEach(({ name, test }) => {
    if (test()) {
      log(`✅ ${name}`, colors.green);
      passed++;
    } else {
      log(`❌ ${name}`, colors.red);
    }
  });

  return { passed, total: tests.length };
}

function main() {
  log('🧪 Comprehensive Application Testing', colors.cyan);
  log('====================================', colors.cyan);

  const testSuites = [
    { name: 'Whitelabel Features', fn: testWhitelabelFeatures },
    { name: 'Data Sync Features', fn: testDataSyncFeatures },
    { name: 'Excel Import Features', fn: testExcelImportFeatures },
    { name: 'Filter Layer Features', fn: testFilterLayerFeatures },
    { name: 'Metric Visibility Features', fn: testMetricVisibilityFeatures },
    { name: 'User Management Features', fn: testUserManagementFeatures },
    { name: 'Dashboard Navigation Features', fn: testDashboardNavigationFeatures },
  ];

  let totalPassed = 0;
  let totalTests = 0;

  testSuites.forEach(({ name, fn }) => {
    const result = fn();
    totalPassed += result.passed;
    totalTests += result.total;
  });

  log('\n📊 Testing Summary', colors.blue);
  log('==================', colors.blue);
  log(`Total Tests: ${totalTests}`, colors.cyan);
  log(`Passed: ${totalPassed}`, colors.green);
  log(`Failed: ${totalTests - totalPassed}`, colors.red);
  log(`Success Rate: ${Math.round((totalPassed / totalTests) * 100)}%`, colors.yellow);

  if (totalPassed === totalTests) {
    log('\n✅ All tests passed! Application is ready for comprehensive testing.', colors.green);
    process.exit(0);
  } else {
    log('\n⚠️  Some tests failed. Please review the issues above.', colors.yellow);
    process.exit(1);
  }
}

main();
