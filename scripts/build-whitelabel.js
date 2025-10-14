#!/usr/bin/env node

/**
 * Whitelabel Build Script
 * 
 * This script builds the application with whitelabel configuration.
 * It can be used to create multiple branded versions of the dashboard.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const BRAND_CONFIGS = {
  'undeniable': {
    name: 'Undeniable Dashboard',
    slug: 'undeniable',
    primaryColor: '#7B61FF',
    secondaryColor: '#00FFB2',
    accentColor: '#F3C969',
    logoUrl: '/logo-undeniable.svg',
    defaultSheets: 'Cold Email UNDL,P.O.W.E.R Magazine,UNDL Meta Ads',
    features: 'user-management,client-management,analytics,notifications',
    adminRole: 'undeniable',
    adminSection: 'undeniable',
    syncFunction: 'syncGoogleSheetsUndeniable',
    syncStatusFunction: 'getUndeniableSyncStatus',
    updateSyncFunction: 'updateUndeniableSyncStatus',
    metricConfigFunction: 'getUndeniableMetricConfigurations',
  },
  'acme': {
    name: 'ACME Dashboard',
    slug: 'acme',
    primaryColor: '#3B82F6',
    secondaryColor: '#10B981',
    accentColor: '#F59E0B',
    logoUrl: '/logo-acme.svg',
    defaultSheets: 'Sales Data,Marketing Metrics,Performance',
    features: 'user-management,client-management,analytics,export,notifications',
    adminRole: 'admin',
    adminSection: 'admin',
    syncFunction: 'syncGoogleSheetsAdmin',
    syncStatusFunction: 'getAdminSyncStatus',
    updateSyncFunction: 'updateAdminSyncStatus',
    metricConfigFunction: 'getAdminMetricConfigurations',
  },
  'techcorp': {
    name: 'TechCorp Analytics',
    slug: 'techcorp',
    primaryColor: '#8B5CF6',
    secondaryColor: '#06B6D4',
    accentColor: '#F97316',
    logoUrl: '/logo-techcorp.svg',
    defaultSheets: 'KPIs,Revenue,User Metrics',
    features: 'user-management,analytics,export,notifications',
    adminRole: 'supervisor',
    adminSection: 'supervisor',
    syncFunction: 'syncGoogleSheetsSupervisor',
    syncStatusFunction: 'getSupervisorSyncStatus',
    updateSyncFunction: 'updateSupervisorSyncStatus',
    metricConfigFunction: 'getSupervisorMetricConfigurations',
  },
};

function createEnvFile(brandKey, outputDir) {
  const config = BRAND_CONFIGS[brandKey];
  if (!config) {
    throw new Error(`Unknown brand: ${brandKey}`);
  }

  const envContent = `# ${config.name} Configuration
VITE_COMPANY_NAME=${config.name}
VITE_COMPANY_SLUG=${config.slug}
VITE_PRIMARY_COLOR=${config.primaryColor}
VITE_SECONDARY_COLOR=${config.secondaryColor}
VITE_ACCENT_COLOR=${config.accentColor}
VITE_LOGO_URL=${config.logoUrl}
VITE_DEFAULT_SHEETS=${config.defaultSheets}
VITE_FEATURES=${config.features}
VITE_DASHBOARD_TITLE=${config.name}
VITE_LOGIN_TITLE=Welcome to ${config.name}
VITE_WELCOME_MESSAGE=Welcome to your ${config.name} dashboard
VITE_FOOTER_TEXT=© 2024 ${config.name}. All rights reserved.

# Role Configuration
VITE_ADMIN_ROLE=${config.adminRole}
VITE_ADMIN_SECTION=${config.adminSection}

# Function Names
VITE_SYNC_FUNCTION=${config.syncFunction}
VITE_SYNC_STATUS_FUNCTION=${config.syncStatusFunction}
VITE_UPDATE_SYNC_FUNCTION=${config.updateSyncFunction}
VITE_METRIC_CONFIG_FUNCTION=${config.metricConfigFunction}

# Supabase Configuration (update these for each deployment)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
`;

  const envPath = path.join(outputDir, '.env.local');
  fs.writeFileSync(envPath, envContent);
  console.log(`✅ Created environment file: ${envPath}`);
}

function buildWhitelabel(brandKey, outputDir) {
  console.log(`🏗️  Building whitelabel version for: ${brandKey}`);
  
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Create environment file
  createEnvFile(brandKey, outputDir);
  
  // Copy source files
  const sourceDir = process.cwd();
  const whitelabelSourceDir = path.join(outputDir, 'src');
  
  if (!fs.existsSync(whitelabelSourceDir)) {
    fs.mkdirSync(whitelabelSourceDir, { recursive: true });
  }
  
  // Copy essential files
  const filesToCopy = [
    'package.json',
    'vite.config.ts',
    'tailwind.config.js',
    'tsconfig.json',
    'tsconfig.app.json',
    'tsconfig.node.json',
    'postcss.config.js',
    'eslint.config.js',
  ];
  
  filesToCopy.forEach(file => {
    const sourcePath = path.join(sourceDir, file);
    const destPath = path.join(outputDir, file);
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`📁 Copied: ${file}`);
    }
  });
  
  // Copy src directory
  execSync(`cp -r src ${outputDir}/`, { stdio: 'inherit' });
  console.log(`📁 Copied: src/`);
  
  // Copy public directory if it exists
  if (fs.existsSync('public')) {
    execSync(`cp -r public ${outputDir}/`, { stdio: 'inherit' });
    console.log(`📁 Copied: public/`);
  }
  
  // Copy docs directory
  if (fs.existsSync('docs')) {
    execSync(`cp -r docs ${outputDir}/`, { stdio: 'inherit' });
    console.log(`📁 Copied: docs/`);
  }
  
  // Create whitelabel-specific files
  const whitelabelReadme = `# ${BRAND_CONFIGS[brandKey].name}

This is a whitelabel version of the Dashboard application customized for ${BRAND_CONFIGS[brandKey].name}.

## Configuration

The application is configured with the following brand settings:
- Company: ${BRAND_CONFIGS[brandKey].name}
- Primary Color: ${BRAND_CONFIGS[brandKey].primaryColor}
- Secondary Color: ${BRAND_CONFIGS[brandKey].secondaryColor}
- Features: ${BRAND_CONFIGS[brandKey].features}

## Setup

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Configure environment variables in \`.env.local\`

3. Start development server:
   \`\`\`bash
   npm run dev
   \`\`\`

4. Build for production:
   \`\`\`bash
   npm run build
   \`\`\`

## Deployment

This whitelabel version can be deployed to any hosting platform that supports static sites or Node.js applications.

## Customization

To further customize this whitelabel version:
1. Update the \`.env.local\` file
2. Modify the \`src/config/branding.ts\` file
3. Update assets in the \`public/\` directory
4. Rebuild the application

## Support

For support with this whitelabel version, contact the original developers or refer to the main documentation.
`;

  fs.writeFileSync(path.join(outputDir, 'README.md'), whitelabelReadme);
  console.log(`📝 Created: README.md`);
  
  console.log(`✅ Whitelabel build completed for: ${brandKey}`);
  console.log(`📁 Output directory: ${outputDir}`);
}

function main() {
  const args = process.argv.slice(2);
  const brandKey = args[0];
  const outputDir = args[1] || `dist-whitelabel-${brandKey}`;
  
  if (!brandKey) {
    console.log('Usage: node scripts/build-whitelabel.js <brand-key> [output-dir]');
    console.log('');
    console.log('Available brands:');
    Object.keys(BRAND_CONFIGS).forEach(key => {
      console.log(`  - ${key}: ${BRAND_CONFIGS[key].name}`);
    });
    process.exit(1);
  }
  
  if (!BRAND_CONFIGS[brandKey]) {
    console.error(`❌ Unknown brand: ${brandKey}`);
    console.log('Available brands:', Object.keys(BRAND_CONFIGS).join(', '));
    process.exit(1);
  }
  
  try {
    buildWhitelabel(brandKey, outputDir);
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

main();
