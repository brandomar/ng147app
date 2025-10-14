# New Instance Setup Guide

Complete walkthrough for deploying this dashboard application to a new Supabase project and Google account.

## 📋 Prerequisites
    - Supabase account -> new project
    - Google Cloud Platform account -> new credentials and service account
    - Github account -> new repository

## Part 1: Supabase Project Setup

- Create New Supabase Project
    - Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
    - Click "New Project"
    - Fill in:
        - Name: Your client name (e.g., "Acme Analytics")
        - Database Password: Generate a strong password (save this!)
    - Click "Create new project"

- Get Supabase Credentials
    - Go to connect in the top supabase dashboard
    - Go to the App Frameworks tab
        - Select Framework -> React
        - Select Using -> Vite
        - Copy these values:
            - **Project URL** (e.g., `https://xxxxx.supabase.co`)
            - **anon/public key** (starts with `eyJ...`)
            - **service_role key** (starts with `eyJ...`) - Keep this secret!

## Part 2: Local Environment Setup

- Go to Github
- Clone the repository to your local desktop
    - Install dependencies -> npm install
- Configure Environment Variables
    - Create `.env` file in the project root
        - Paste the content you copied from the Supabase Framework section
    - Create `.env.local` file in the project root
        - Paste the content from your .env file

## Part 3: Google Cloud Console Setup

    - Create New Google Cloud Project
        - Go to [https://console.cloud.google.com](https://console.cloud.google.com)
        - Click project dropdown → "New Project"
        -  Enter project name (e.g., "Acme Dashboard")
        - Click "Create"
        - Wait for project creation
    -  Go to APIs & Services → Library
        - Search and enable these APIs:
            - Google Sheets API
            - Google Drive API (optional, for file access)
    - Create Service Account
        -  Go to APIs & Services → Credentials
        -  Click + CREATE CREDENTIALS → "Service account"
        -  Fill in:
            - Service account name: dashboard-sheets-sync
            - Service account ID: (auto-generated)
            - Description: Service account for dashboard Google Sheets sync
        -  Click Create and Continue
            - Grant this service account access to project (optional, skip)
        - Click "Continue" → "Done"
        - Generate Service Account Key

         - Click on the newly created service account email
         - Go to Keys tab
         - Click Add Key → Create new key
         - Select JSON format
         - Click Create
         - Save the downloaded JSON file securely
     - The JSON file will contain your credentials:
         - type: service_account
         - project_id: your-project-id
         - private_key_id: ...
         - private_key: -----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
         - client_email: dashboard-sheets-sync@your-project.iam.gserviceaccount.com
         - client_id: ...
         - auth_uri and token_uri
     - Update Environment Variables
         - Add to .env.local file:
             - VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL=dashboard-sheets-sync@your-project.iam.gserviceaccount.com
             - VITE_GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
         - Important: Keep the private key with \n for newlines, enclosed in quotes

## Part 4: Edge Functions Deployment
 
    - Configure Edge Function Secrets
        - Set the Google credentials as Supabase secrets on the edge function
    - Deploy Edge Functions
        - Deploy the Google Sheets sync function:
        - npx supabase functions deploy google-metric-sync-enhanced
    - Deploy the user invitation function:
        - npx supabase functions deploy invite-user
    - Verify Deployment
        - Command: npx supabase functions list
        - You should see:
            - google-metric-sync-enhanced
            - invite-user

## Part 6: Google Sheets Setup
 
    - Share with Service Account - **CRITICAL STEP - Without this, syncing will fail!**
        - Click Share button in Google Sheets
        - Add the service account email
        - Set permission to Viewer (read-only)
        - Click Share
    - Format Your Sheet
        - Set up your spreadsheet with proper structure

     - Requirements:
         - First column must be Date (case-insensitive)
         - Date format: YYYY-MM-DD or MM/DD/YYYY
         - Metric columns: any name

## Part 7: Application Configuration
 

 
 - Configure Branding (Optional)
     - Go to Management Console → Brand
     - Configure:
         - Application Name: Your company name
         - Primary Color: Your brand color
         - Logo: Upload company logo
         - Favicon: Upload favicon
     - Click Save Changes

## Security Checklist
 
 Before going live, verify:
 
 - RLS (Row Level Security) is enabled on all tables
 - Service role key is kept secret (never in frontend code)
 - Google service account has minimal permissions (Viewer only)
 - Admin email is set up correctly
 - Password reset emails work
 - CORS is configured in Supabase (if needed)
 - Environment variables are set in production
 - Database backups are enabled in Supabase
 - SSL/HTTPS is enabled on your domain
