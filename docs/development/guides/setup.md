# Development Setup

Complete guide to setting up your Dashboard Undeniable development environment.

## 📋 Prerequisites

### System Requirements
- **Node.js**: Version 18 or higher
- **npm**: Version 8 or higher
- **Git**: For version control
- **Code Editor**: VS Code recommended

### Required Accounts
- **Supabase Account**: For backend services
- **Google Cloud Console**: For Sheets API access
- **GitHub Account**: For code repository access

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone <repository-url>
cd dashboardundeniable
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
```bash
cp .env.example .env.local
```

### 4. Configure Environment Variables
Edit `.env.local` with your configuration:
```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Sheets API
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email
GOOGLE_PRIVATE_KEY=your_private_key
```

### 5. Database Setup
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your_project_ref

# Apply migrations
npx supabase db push
```

### 6. Start Development Server
```bash
npm run dev
```

## 🔧 Detailed Setup

### Supabase Configuration

#### 1. Create Supabase Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Note your project URL and anon key

#### 2. Configure Database
1. Run database migrations:
   ```bash
   npx supabase db push
   ```
2. Verify tables are created correctly
3. Set up Row Level Security policies

#### 3. Configure Authentication
1. Set up email authentication
2. Configure redirect URLs
3. Set up user management

### Google Sheets API Setup

#### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable Google Sheets API

#### 2. Create Service Account
1. Go to IAM & Admin > Service Accounts
2. Create a new service account
3. Download the JSON key file
4. Extract email and private key

#### 3. Configure Service Account
1. Share your Google Sheets with the service account email
2. Grant appropriate permissions
3. Test API access

### Development Tools Setup

#### VS Code Extensions
Install recommended extensions:
- **ES7+ React/Redux/React-Native snippets**
- **TypeScript Importer**
- **Tailwind CSS IntelliSense**
- **Prettier - Code formatter**
- **ESLint**

#### Git Configuration
```bash
# Configure Git user
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Set up SSH keys (optional)
ssh-keygen -t ed25519 -C "your.email@example.com"
```

## 🧪 Testing Setup

### Unit Testing
```bash
# Install testing dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom

# Run tests
npm test
```

### End-to-End Testing
```bash
# Install Cypress
npm install --save-dev cypress

# Open Cypress
npx cypress open
```

## 🔍 Troubleshooting

### Common Issues

#### Database Connection Issues
- Verify Supabase URL and key
- Check network connectivity
- Verify RLS policies

#### Google Sheets API Issues
- Verify service account credentials
- Check API quotas and limits
- Ensure sheets are shared with service account

#### Build Issues
- Clear node_modules and reinstall
- Check Node.js version compatibility
- Verify environment variables

### Debug Mode
Enable debug logging:
```env
VITE_DEBUG=true
VITE_LOG_LEVEL=debug
```

## 📚 Additional Resources

### Documentation
- [Supabase Documentation](https://supabase.com/docs)
- [Google Sheets API Documentation](https://developers.google.com/sheets/api)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

### Community
- [Supabase Discord](https://discord.supabase.com)
- [React Community](https://react.dev/community)
- [Stack Overflow](https://stackoverflow.com)

---

*This setup guide ensures you have everything needed to start developing with Dashboard Undeniable.*
