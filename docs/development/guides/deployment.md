# Deployment Guide

Complete guide for deploying Dashboard Undeniable to production.

## 🚀 Production Deployment

### Prerequisites
- **Production Supabase Project**: Configured and ready
- **Domain Name**: For your application
- **SSL Certificate**: For HTTPS
- **CDN Setup**: For static assets (optional)

### Environment Configuration

#### Production Environment Variables
```env
# Supabase Production
VITE_SUPABASE_URL=your_production_supabase_url
VITE_SUPABASE_ANON_KEY=your_production_anon_key

# Google Sheets API (Production)
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_production_service_account
GOOGLE_PRIVATE_KEY=your_production_private_key

# Application Settings
NODE_ENV=production
VITE_APP_URL=https://your-domain.com
```

#### Security Configuration
```env
# Security Settings
VITE_ENABLE_ANALYTICS=true
VITE_LOG_LEVEL=error
VITE_DEBUG=false
```

## 🏗️ Build Process

### 1. Production Build
```bash
# Install dependencies
npm ci

# Run production build
npm run build

# Verify build output
ls -la dist/
```

### 2. Build Optimization
- **Code Splitting**: Automatic with Vite
- **Tree Shaking**: Removes unused code
- **Minification**: JavaScript and CSS compression
- **Asset Optimization**: Image and font optimization

### 3. Build Verification
```bash
# Test production build locally
npm run preview

# Check bundle size
npm run build -- --analyze
```

## 🗄️ Database Deployment

### 1. Production Database Setup
```bash
# Link to production project
supabase link --project-ref your_production_ref

# Apply all migrations
npx supabase db push

# Verify database state
npx supabase db diff
```

### 2. Database Security
- **Row Level Security**: Enable on all tables
- **API Keys**: Rotate and secure
- **Backup Strategy**: Automated backups
- **Monitoring**: Database performance monitoring

### 3. Data Migration
```bash
# Backup existing data (if applicable)
npx supabase db dump --data-only

# Apply schema changes
npx supabase db push

# Verify data integrity
npx supabase db diff
```

## 🌐 Web Server Configuration

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL Configuration
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # Static Files
    location / {
        root /path/to/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API Proxy (if needed)
    location /api/ {
        proxy_pass https://your-supabase-url.supabase.co/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Apache Configuration
```apache
<VirtualHost *:443>
    ServerName your-domain.com
    DocumentRoot /path/to/dist
    
    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /path/to/certificate.crt
    SSLCertificateKeyFile /path/to/private.key
    
    # Security Headers
    Header always set X-Frame-Options DENY
    Header always set X-Content-Type-Options nosniff
    Header always set X-XSS-Protection "1; mode=block"
    
    # Static Files
    <Directory /path/to/dist>
        AllowOverride All
        Require all granted
        
        # Cache static assets
        <FilesMatch "\.(js|css|png|jpg|jpeg|gif|ico|svg)$">
            ExpiresActive On
            ExpiresDefault "access plus 1 year"
            Header set Cache-Control "public, immutable"
        </FilesMatch>
    </Directory>
    
    # SPA Routing
    RewriteEngine On
    RewriteBase /
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</VirtualHost>
```

## 🔒 Security Configuration

### 1. SSL/TLS Setup
- **SSL Certificate**: Obtain from trusted CA
- **HTTPS Redirect**: Force HTTPS connections
- **Security Headers**: Implement security headers
- **Certificate Renewal**: Automated renewal setup

### 2. Authentication Security
- **JWT Configuration**: Secure token settings
- **Session Management**: Proper session handling
- **Password Policies**: Strong password requirements
- **Rate Limiting**: API rate limiting

### 3. Data Protection
- **Encryption**: Data encryption at rest and in transit
- **Access Control**: Role-based access control
- **Audit Logging**: Comprehensive audit trails
- **Data Backup**: Regular automated backups

## 📊 Monitoring and Analytics

### 1. Application Monitoring
- **Error Tracking**: Sentry or similar service
- **Performance Monitoring**: Real-time performance metrics
- **Uptime Monitoring**: Service availability tracking
- **Log Aggregation**: Centralized logging

### 2. Database Monitoring
- **Query Performance**: Slow query identification
- **Connection Monitoring**: Database connection health
- **Storage Monitoring**: Database size and growth
- **Backup Monitoring**: Backup success verification

### 3. User Analytics
- **Usage Tracking**: User behavior analytics
- **Performance Metrics**: Page load times
- **Error Rates**: Application error tracking
- **Conversion Tracking**: User journey analysis

## 🚀 CI/CD Pipeline

### 1. Automated Deployment
```yaml
# GitHub Actions Example
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - name: Deploy to server
        run: |
          # Your deployment commands
```

### 2. Database Migrations
```yaml
# Automated Migration Job
- name: Run Database Migrations
  run: |
    npx supabase db push
    npx supabase db diff
```

### 3. Health Checks
```yaml
# Health Check Job
- name: Health Check
  run: |
    curl -f https://your-domain.com/health || exit 1
```

## 🔧 Maintenance

### 1. Regular Updates
- **Dependencies**: Keep dependencies updated
- **Security Patches**: Apply security updates
- **Database Updates**: Regular database maintenance
- **Performance Optimization**: Continuous optimization

### 2. Backup Strategy
- **Database Backups**: Daily automated backups
- **File Backups**: Static asset backups
- **Configuration Backups**: Environment configuration
- **Recovery Testing**: Regular recovery testing

### 3. Performance Optimization
- **CDN Setup**: Content delivery network
- **Caching Strategy**: Application caching
- **Database Optimization**: Query optimization
- **Asset Optimization**: Image and asset optimization

## 🆘 Troubleshooting

### Common Deployment Issues
- **Build Failures**: Check environment variables
- **Database Connection**: Verify Supabase configuration
- **SSL Issues**: Check certificate configuration
- **Performance Issues**: Monitor resource usage

### Recovery Procedures
- **Database Recovery**: Restore from backups
- **Application Recovery**: Redeploy from source
- **Configuration Recovery**: Restore from backups
- **Data Recovery**: Point-in-time recovery

---

*This deployment guide ensures a secure, scalable, and maintainable production deployment.*
