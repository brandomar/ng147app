# Whitelabel Dashboard System

This document explains how to create and deploy whitelabel versions of the Dashboard application.

## Overview

The Dashboard application has been architected to support whitelabeling through a comprehensive configuration system. This allows you to create multiple branded versions of the same application with different:

- Company branding and colors
- Logos and visual assets
- Feature sets
- Default configurations
- Custom domains

## Architecture

### Configuration System

The whitelabel system is built on three main components:

1. **Brand Configuration** (`src/config/branding.ts`)
   - Centralized brand settings
   - Environment variable support
   - Runtime configuration

2. **Dynamic Theming** (`src/config/tailwind.config.js`)
   - Dynamic color schemes
   - Brand-specific CSS classes
   - Custom utilities

3. **Whitelabel Components** (`src/components/shared/`)
   - Branded header, logo, footer
   - Dynamic text and styling
   - Fallback mechanisms

### File Structure

```
src/
├── config/
│   ├── branding.ts              # Brand configuration
│   └── tailwind.config.js      # Dynamic Tailwind config
├── components/
│   ├── shared/
│   │   ├── BrandedHeader.tsx   # Branded header component
│   │   └── BrandedLoginForm.tsx # Branded login form
│   └── auth/
│       └── BrandedLoginForm.tsx # Whitelabel login
└── ...

scripts/
└── build-whitelabel.js         # Whitelabel build script

docs/whitelabel/
├── README.md                   # This file
└── deployment.md              # Deployment guide

.env.whitelabel.example        # Environment template
```

## Quick Start

### 1. Create a Whitelabel Build

```bash
# Build for a specific brand
npm run build:whitelabel <brand-key> [output-dir]

# Examples
npm run build:undeniable
npm run build:acme
npm run build:techcorp
```

### 2. Configure Environment

Each whitelabel build includes a `.env.local` file. Update it with your settings:

```bash
# Navigate to the whitelabel directory
cd dist-whitelabel-undeniable

# Edit environment variables
nano .env.local
```

### 3. Deploy

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Deploy the dist/ folder
```

## Configuration Options

### Company Information

```bash
VITE_COMPANY_NAME=Your Company Name
VITE_COMPANY_SLUG=your-company
VITE_COMPANY_DESCRIPTION=Your company description
VITE_SUPPORT_EMAIL=support@yourcompany.com
```

### Visual Branding

```bash
# Brand Colors (hex codes)
VITE_PRIMARY_COLOR=#7B61FF
VITE_SECONDARY_COLOR=#00FFB2
VITE_ACCENT_COLOR=#F3C969
VITE_BACKGROUND_COLOR=#F5F5F5
VITE_TEXT_COLOR=#171717

# Brand Assets
VITE_LOGO_URL=/logo.svg
VITE_FAVICON_URL=/favicon.ico
VITE_BACKGROUND_IMAGE=/background.jpg
```

### Dashboard Configuration

```bash
# Default Sheets (comma-separated)
VITE_DEFAULT_SHEETS=Sheet1,Sheet2,Sheet3

# Metric Categories (comma-separated)
VITE_METRIC_CATEGORIES=ads,growth,performance,cold-email,spam-outreach

# Default Time Frame
VITE_DEFAULT_TIME_FRAME=30d
```

### Feature Flags

```bash
# Available Features (comma-separated)
# Options: user-management,client-management,analytics,export,notifications
VITE_FEATURES=user-management,client-management,analytics,notifications
```

### Role Configuration

```bash
# Customize role names if needed
VITE_ADMIN_ROLE=undeniable
VITE_STAFF_ROLE=staff
VITE_CLIENT_ROLE=client
```

### UI Text Customization

```bash
VITE_DASHBOARD_TITLE=Your Dashboard
VITE_LOGIN_TITLE=Welcome to Your Dashboard
VITE_WELCOME_MESSAGE=Welcome to your personalized dashboard
VITE_FOOTER_TEXT=© 2024 Your Company. All rights reserved.
```

## Pre-configured Brands

The system includes several pre-configured brand templates:

### Undeniable (Default)
- **Colors**: Purple (#7B61FF), Mint (#00FFB2), Gold (#F3C969)
- **Features**: Full feature set
- **Sheets**: Cold Email UNDL, P.O.W.E.R Magazine, UNDL Meta Ads

### ACME Corporation
- **Colors**: Blue (#3B82F6), Green (#10B981), Orange (#F59E0B)
- **Features**: Full feature set including export
- **Sheets**: Sales Data, Marketing Metrics, Performance

### TechCorp Analytics
- **Colors**: Purple (#8B5CF6), Cyan (#06B6D4), Orange (#F97316)
- **Features**: Analytics and notifications only
- **Sheets**: KPIs, Revenue, User Metrics

## Custom Brand Creation

### 1. Add Brand Configuration

Edit `scripts/build-whitelabel.js` to add your brand:

```javascript
const BRAND_CONFIGS = {
  'your-brand': {
    name: 'Your Company Dashboard',
    slug: 'your-company',
    primaryColor: '#your-color',
    secondaryColor: '#your-color',
    accentColor: '#your-color',
    logoUrl: '/logo-your-company.svg',
    defaultSheets: 'Your,Sheet,Names',
    features: 'user-management,client-management,analytics',
  },
  // ... existing brands
};
```

### 2. Create Brand Assets

Add your brand assets to the `public/` directory:

```
public/
├── logo-your-company.svg
├── favicon-your-company.ico
└── background-your-company.jpg
```

### 3. Build Custom Brand

```bash
npm run build:whitelabel your-brand dist-your-brand
```

## Component Usage

### Using Brand Configuration

```typescript
import { useBrandConfig, BrandUtils } from '../config/branding';

function MyComponent() {
  const config = useBrandConfig();
  
  return (
    <div style={{ color: config.primaryColor }}>
      <h1>{config.ui.dashboardTitle}</h1>
      <img src={config.logoUrl} alt={config.companyName} />
    </div>
  );
}
```

### Using Branded Components

```typescript
import { BrandedHeader, BrandedLogo, BrandedFooter } from '../shared/BrandedHeader';

function Dashboard() {
  return (
    <div>
      <BrandedHeader 
        title="Custom Title"
        subtitle="Custom Subtitle"
        showLogo={true}
      />
      
      <main>
        <BrandedLogo size="lg" />
        {/* Your content */}
      </main>
      
      <BrandedFooter />
    </div>
  );
}
```

### Using Brand Utilities

```typescript
import { BrandUtils } from '../config/branding';

function MyComponent() {
  const isAnalyticsEnabled = BrandUtils.isFeatureEnabled('analytics');
  const roleDisplayName = BrandUtils.getRoleDisplayName('undeniable');
  const companyText = BrandUtils.getCompanyText('dashboardTitle');
  
  return (
    <div>
      {isAnalyticsEnabled && <AnalyticsComponent />}
      <h1>{companyText}</h1>
      <p>Role: {roleDisplayName}</p>
    </div>
  );
}
```

## Deployment

### Supported Platforms

- **Vercel**: Automatic deployment with environment variables
- **Netlify**: Static site deployment with build hooks
- **AWS S3 + CloudFront**: CDN deployment with custom domains
- **Docker**: Containerized deployment
- **Traditional Hosting**: Any static hosting platform

### Environment Setup

1. **Supabase**: Each whitelabel needs its own Supabase project
2. **Google Sheets**: Configure service account for each brand
3. **Custom Domain**: Set up DNS and SSL certificates
4. **Monitoring**: Configure analytics and error tracking

### Security Considerations

1. **Data Isolation**: Separate databases or strong RLS policies
2. **Access Control**: Role-based permissions per brand
3. **API Security**: Rate limiting and authentication
4. **Environment Security**: Secure secret management

## Maintenance

### Updates

1. **Code Updates**: Pull latest changes from main repository
2. **Dependency Updates**: Regular security updates
3. **Database Migrations**: Apply schema changes
4. **Asset Updates**: Update logos and branding

### Monitoring

1. **Performance**: Monitor application performance
2. **Errors**: Track and resolve errors
3. **Usage**: Monitor user activity and engagement
4. **Security**: Monitor for security issues

## Troubleshooting

### Common Issues

1. **Build Failures**: Check environment variables and dependencies
2. **Styling Issues**: Verify Tailwind CSS configuration
3. **Runtime Errors**: Check Supabase configuration
4. **Asset Loading**: Verify asset paths and URLs

### Debug Mode

```bash
# Enable debug logging
VITE_DEBUG=true
VITE_LOG_LEVEL=debug
```

## Support

For whitelabel support:

1. **Documentation**: Check this guide and deployment docs
2. **Issues**: Create GitHub issues for bugs
3. **Community**: Join project community channels
4. **Professional Support**: Contact for enterprise deployments

## Examples

### Complete Whitelabel Example

```bash
# 1. Create whitelabel build
npm run build:whitelabel acme dist-acme

# 2. Navigate to whitelabel directory
cd dist-acme

# 3. Update environment variables
nano .env.local

# 4. Install dependencies
npm install

# 5. Build for production
npm run build

# 6. Deploy dist/ folder to your hosting platform
```

### Custom Brand Example

```bash
# 1. Add your brand to build script
# Edit scripts/build-whitelabel.js

# 2. Create brand assets
# Add logo and favicon to public/

# 3. Build custom brand
npm run build:whitelabel your-brand dist-your-brand

# 4. Deploy
cd dist-your-brand
npm install
npm run build
# Deploy dist/ folder
```

This whitelabel system provides a comprehensive solution for creating multiple branded versions of the Dashboard application while maintaining code consistency and deployment simplicity.
