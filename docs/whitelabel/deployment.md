# Whitelabel Deployment Guide

This guide explains how to deploy whitelabel versions of the Dashboard application.

## Overview

The Dashboard application supports whitelabeling through environment-based configuration. Each whitelabel version can have its own:

- Company branding and colors
- Logo and favicon
- Feature set
- Default configuration
- Custom domain

## Quick Start

### 1. Create Whitelabel Build

```bash
# Build for a specific brand
node scripts/build-whitelabel.js <brand-key> [output-dir]

# Examples
node scripts/build-whitelabel.js undeniable dist-undeniable
node scripts/build-whitelabel.js acme dist-acme
node scripts/build-whitelabel.js techcorp dist-techcorp
```

### 2. Configure Environment

Each whitelabel build includes a `.env.local` file with brand-specific settings:

```bash
# Navigate to the whitelabel directory
cd dist-whitelabel-undeniable

# Update Supabase configuration
nano .env.local
```

### 3. Deploy

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Deploy the dist/ folder to your hosting platform
```

## Deployment Platforms

### Vercel

1. **Connect Repository**: Link your whitelabel repository to Vercel
2. **Environment Variables**: Add all required environment variables in Vercel dashboard
3. **Build Settings**: 
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. **Deploy**: Automatic deployment on git push

### Netlify

1. **Connect Repository**: Link your whitelabel repository to Netlify
2. **Build Settings**:
   - Build Command: `npm run build`
   - Publish Directory: `dist`
3. **Environment Variables**: Add in Netlify dashboard
4. **Deploy**: Automatic deployment on git push

### AWS S3 + CloudFront

1. **Build Application**: `npm run build`
2. **Upload to S3**: Upload `dist/` contents to S3 bucket
3. **Configure CloudFront**: Set up CDN with custom domain
4. **Environment Variables**: Use AWS Systems Manager Parameter Store

### Docker

Create a `Dockerfile` for each whitelabel version:

```dockerfile
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Environment Configuration

### Required Variables

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Sheets (if using Google integration)
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=your_private_key
```

### Brand Configuration

```bash
# Company Information
VITE_COMPANY_NAME=Your Company
VITE_COMPANY_SLUG=your-company
VITE_SUPPORT_EMAIL=support@yourcompany.com

# Visual Branding
VITE_PRIMARY_COLOR=#7B61FF
VITE_SECONDARY_COLOR=#00FFB2
VITE_LOGO_URL=/logo.svg
VITE_FAVICON_URL=/favicon.ico

# Features
VITE_FEATURES=user-management,client-management,analytics
```

## Custom Domains

### SSL Certificates

For production deployments, ensure SSL certificates are configured:

- **Vercel**: Automatic SSL with custom domains
- **Netlify**: Automatic SSL with custom domains
- **AWS CloudFront**: Use AWS Certificate Manager
- **Docker**: Configure reverse proxy (nginx/traefik)

### DNS Configuration

1. **A Record**: Point to hosting platform IP
2. **CNAME**: Point to hosting platform domain
3. **SSL**: Ensure HTTPS is enabled

## Database Configuration

### Supabase Setup

Each whitelabel version needs its own Supabase project:

1. **Create Project**: New Supabase project for each brand
2. **Database Schema**: Run migrations from main project
3. **Row Level Security**: Configure RLS policies
4. **Environment Variables**: Update with new project credentials

### Multi-tenant vs Single-tenant

- **Multi-tenant**: Single database, multiple brands
- **Single-tenant**: Separate database per brand

## Monitoring and Analytics

### Application Monitoring

```bash
# Add monitoring service
VITE_ANALYTICS_ID=your_analytics_id
VITE_SENTRY_DSN=your_sentry_dsn
```

### Performance Monitoring

- **Vercel Analytics**: Built-in performance monitoring
- **Google Analytics**: Custom tracking per whitelabel
- **New Relic**: Application performance monitoring

## Security Considerations

### Environment Security

1. **Secrets Management**: Use platform-specific secret stores
2. **Access Control**: Limit access to production environments
3. **Audit Logging**: Enable audit logs for all deployments

### Data Isolation

1. **Database Isolation**: Separate databases or strong RLS policies
2. **User Isolation**: Role-based access control
3. **API Security**: Rate limiting and authentication

## Troubleshooting

### Common Issues

1. **Build Failures**: Check environment variables and dependencies
2. **Runtime Errors**: Verify Supabase configuration
3. **Styling Issues**: Ensure Tailwind CSS is properly configured

### Debug Mode

```bash
# Enable debug logging
VITE_DEBUG=true
VITE_LOG_LEVEL=debug
```

## Maintenance

### Updates

1. **Code Updates**: Pull latest changes from main repository
2. **Dependency Updates**: Regular security updates
3. **Database Migrations**: Apply schema changes

### Backup

1. **Database Backups**: Regular Supabase backups
2. **Code Backups**: Git repository backups
3. **Asset Backups**: Logo and branding assets

## Support

For whitelabel deployment support:

1. **Documentation**: Check main project documentation
2. **Issues**: Create GitHub issues for bugs
3. **Community**: Join project community channels
4. **Professional Support**: Contact for enterprise deployments
