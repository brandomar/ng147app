#!/usr/bin/env node

/**
 * Architecture Validation Script
 * 
 * This script validates that the application follows the established
 * architectural patterns and whitelabel configuration.
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

function checkFileExists(filePath, description) {
  const fullPath = path.join(__dirname, '..', filePath);
  if (fs.existsSync(fullPath)) {
    log(`✅ ${description}: ${filePath}`, colors.green);
    return true;
  } else {
    log(`❌ ${description}: ${filePath}`, colors.red);
    return false;
  }
}

function checkImportExists(filePath, importPath, description) {
  const fullPath = path.join(__dirname, '..', filePath);
  if (!fs.existsSync(fullPath)) {
    log(`❌ File not found: ${filePath}`, colors.red);
    return false;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  if (content.includes(importPath)) {
    log(`✅ ${description}: ${importPath}`, colors.green);
    return true;
  } else {
    log(`❌ ${description}: ${importPath}`, colors.red);
    return false;
  }
}

function validateWhitelabelConfiguration() {
  log('\n🔍 Validating Whitelabel Configuration...', colors.blue);
  
  const checks = [
    checkFileExists('src/config/branding.ts', 'Brand configuration'),
    checkFileExists('src/lib/whitelabelDatabase.ts', 'Whitelabel database service'),
    checkFileExists('src/components/shared/BrandedHeader.tsx', 'Branded header component'),
    checkFileExists('src/components/auth/BrandedLoginForm.tsx', 'Branded login form'),
    checkFileExists('scripts/build-whitelabel.js', 'Whitelabel build script'),
  ];

  return checks.every(check => check);
}

function validateComponentStructure() {
  log('\n🔍 Validating Component Structure...', colors.blue);
  
  const checks = [
    checkFileExists('src/components/layout/MainLayout.tsx', 'Main layout'),
    checkFileExists('src/components/layout/Sidebar.tsx', 'Sidebar component'),
    checkFileExists('src/components/dashboard/Dashboard.tsx', 'Dashboard component'),
    checkFileExists('src/components/management/ManagementConsole.tsx', 'User management'),
    checkFileExists('src/components/shared/MetricsDisplay.tsx', 'Metrics display'),
  ];

  return checks.every(check => check);
}

function validateContextStructure() {
  log('\n🔍 Validating Context Structure...', colors.blue);
  
  const checks = [
    checkFileExists('src/contexts/AppContext.tsx', 'App context'),
    checkFileExists('src/contexts/AuthContext.tsx', 'Auth context'),
    checkFileExists('src/contexts/FilterContext.tsx', 'Filter context'),
  ];

  return checks.every(check => check);
}

function validateHooksStructure() {
  log('\n🔍 Validating Hooks Structure...', colors.blue);
  
  const checks = [
    checkFileExists('src/hooks/useUnifiedRouting.ts', 'Unified routing hook'),
    checkFileExists('src/hooks/useGlobalPermissions.ts', 'Role-based permissions hook'),
    checkFileExists('src/hooks/useTaskQueue.ts', 'Task queue hook'),
  ];

  return checks.every(check => check);
}

function validateDatabaseStructure() {
  log('\n🔍 Validating Database Structure...', colors.blue);
  
  const checks = [
    checkFileExists('src/lib/database.ts', 'Database service'),
    checkFileExists('src/lib/whitelabelDatabase.ts', 'Whitelabel database service'),
    checkFileExists('src/lib/supabase.ts', 'Supabase client'),
    checkFileExists('src/lib/logger.ts', 'Logger utility'),
  ];

  return checks.every(check => check);
}

function validateWhitelabelImports() {
  log('\n🔍 Validating Whitelabel Imports...', colors.blue);
  
  const checks = [
    checkImportExists('src/components/layout/MainLayout.tsx', 'getAdminSection', 'Admin section import'),
    checkImportExists('src/components/layout/Sidebar.tsx', 'getAdminDashboardTitle', 'Admin dashboard title import'),
    checkImportExists('src/components/management/ClientManagement.tsx', 'getClientTypeOptions', 'Client type options import'),
    checkImportExists('src/components/dashboard/Dashboard.tsx', 'getMetricConfigurations', 'Metric configurations import'),
  ];

  return checks.every(check => check);
}

function validateBrandConfiguration() {
  log('\n🔍 Validating Brand Configuration...', colors.blue);
  
  const brandingPath = path.join(__dirname, '..', 'src', 'config', 'branding.ts');
  if (!fs.existsSync(brandingPath)) {
    log('❌ Brand configuration file not found', colors.red);
    return false;
  }

  const content = fs.readFileSync(brandingPath, 'utf8');
  
  const requiredExports = [
    'BRAND_CONFIG',
    'useBrandConfig',
    'BrandUtils',
  ];

  const requiredInterfaces = [
    'BrandConfig',
  ];

  let allFound = true;

  requiredExports.forEach(exportName => {
    if (content.includes(exportName)) {
      log(`✅ Brand export: ${exportName}`, colors.green);
    } else {
      log(`❌ Missing brand export: ${exportName}`, colors.red);
      allFound = false;
    }
  });

  requiredInterfaces.forEach(interfaceName => {
    if (content.includes(interfaceName)) {
      log(`✅ Brand interface: ${interfaceName}`, colors.green);
    } else {
      log(`❌ Missing brand interface: ${interfaceName}`, colors.red);
      allFound = false;
    }
  });

  return allFound;
}

function validatePackageJson() {
  log('\n🔍 Validating Package.json...', colors.blue);
  
  const packagePath = path.join(__dirname, '..', 'package.json');
  if (!fs.existsSync(packagePath)) {
    log('❌ Package.json not found', colors.red);
    return false;
  }

  const content = fs.readFileSync(packagePath, 'utf8');
  const packageJson = JSON.parse(content);

  const requiredScripts = [
    'build:whitelabel',
    'build:undeniable',
    'build:acme',
    'build:techcorp',
  ];

  let allFound = true;

  requiredScripts.forEach(script => {
    if (packageJson.scripts && packageJson.scripts[script]) {
      log(`✅ Script: ${script}`, colors.green);
    } else {
      log(`❌ Missing script: ${script}`, colors.red);
      allFound = false;
    }
  });

  return allFound;
}

function main() {
  log('🏗️  Dashboard Architecture Validation', colors.cyan);
  log('=====================================', colors.cyan);

  const validations = [
    { name: 'Whitelabel Configuration', fn: validateWhitelabelConfiguration },
    { name: 'Component Structure', fn: validateComponentStructure },
    { name: 'Context Structure', fn: validateContextStructure },
    { name: 'Hooks Structure', fn: validateHooksStructure },
    { name: 'Database Structure', fn: validateDatabaseStructure },
    { name: 'Whitelabel Imports', fn: validateWhitelabelImports },
    { name: 'Brand Configuration', fn: validateBrandConfiguration },
    { name: 'Package.json', fn: validatePackageJson },
  ];

  let allPassed = true;

  validations.forEach(({ name, fn }) => {
    const passed = fn();
    if (!passed) {
      allPassed = false;
    }
  });

  log('\n📊 Validation Summary', colors.blue);
  log('====================', colors.blue);

  if (allPassed) {
    log('✅ All validations passed! Architecture is compliant.', colors.green);
    process.exit(0);
  } else {
    log('❌ Some validations failed. Please fix the issues above.', colors.red);
    process.exit(1);
  }
}

main();
