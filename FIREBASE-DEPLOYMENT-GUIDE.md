# Firebase Deployment Guide for Fullard Property Management

## Overview
This guide provides step-by-step instructions for deploying the Fullard Property Management System to Firebase Functions and Hosting.

## Prerequisites

1. **Node.js 18+** installed on your system
2. **Firebase CLI** installed globally: `npm install -g firebase-tools`
3. **Google/Gmail account** for Firebase project
4. **PostgreSQL database** (recommended providers: Neon, Supabase, PlanetScale)

## Step 1: Clone Repository from GitHub

```bash
git clone https://github.com/yourusername/fullard-property-management.git
cd fullard-property-management
```

## Step 2: Install Dependencies

```bash
# Install root dependencies
npm install

# Install Firebase Functions dependencies
cd functions
npm install
cd ..
```

## Step 3: Firebase Project Setup

```bash
# Login to Firebase
firebase login

# Initialize Firebase in project
firebase init

# Select the following options:
# ✅ Functions: Configure a Cloud Functions for Firebase
# ✅ Hosting: Configure files for Firebase Hosting
# 
# Choose "Use an existing project" or "Create a new project"
# For Functions: Choose TypeScript, use existing functions folder
# For Hosting: Use "client/dist" as public directory, configure as SPA
```

## Step 4: Database Setup

### Option A: Neon Database (Recommended - Free Tier)
1. Go to https://neon.tech and create account
2. Create new project "fullard-property-mgmt"
3. Copy connection string from dashboard
4. Format: `postgresql://username:password@host/database?sslmode=require`

### Option B: Supabase Database
1. Go to https://supabase.com and create account
2. Create new project
3. Go to Settings > Database
4. Copy connection string (Connection pooling mode)

### Option C: PlanetScale Database
1. Go to https://planetscale.com and create account
2. Create new database "fullard-property"
3. Get connection string from Connect tab

## Step 5: Configure Environment Variables

Set Firebase Functions configuration:

```bash
# Database connection
firebase functions:config:set database.url="your-postgresql-connection-string"

# Email configuration (Gmail)
firebase functions:config:set email.user="your-gmail@gmail.com"
firebase functions:config:set email.password="your-gmail-app-password"

# Session secret (generate random string)
firebase functions:config:set session.secret="your-random-session-secret-key"

# Company email for notifications
firebase functions:config:set company.email="fullardpropertymgmt@gmail.com"
```

### Gmail App Password Setup
1. Enable 2FA on your Gmail account
2. Go to Google Account Settings > Security > 2-Step Verification
3. Generate App Password for "Mail"
4. Use this password (not your regular Gmail password)

## Step 6: Build and Deploy

```bash
# Build the frontend
npm run build:client

# Deploy to Firebase
firebase deploy
```

## Step 7: Database Initialization

After deployment, initialize the database:

```bash
# Push database schema
npm run db:push
```

## Step 8: Access Your Application

1. Firebase will provide hosting URL: `https://your-project-id.web.app`
2. Functions will be available at: `https://your-region-your-project-id.cloudfunctions.net/api`

## Default Login Credentials

- **Username**: admin
- **Password**: admin1234

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `database.url` | PostgreSQL connection string | `postgresql://user:pass@host/db` |
| `email.user` | Gmail address for sending emails | `your-email@gmail.com` |
| `email.password` | Gmail App Password | `abcd efgh ijkl mnop` |
| `session.secret` | Random string for session encryption | `your-secret-key-here` |
| `company.email` | Company email for notifications | `company@example.com` |

## Firebase Configuration Files

The project includes:
- `firebase.json`: Firebase project configuration
- `functions/package.json`: Cloud Functions dependencies
- `functions/src/index.ts`: Main Functions entry point

## Troubleshooting

### Common Issues

1. **Build Fails**
   - Ensure Node.js 18+ is installed
   - Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`

2. **Database Connection Issues**
   - Verify connection string format
   - Check database allows external connections
   - Ensure SSL mode is enabled for production databases

3. **Email Not Sending**
   - Verify Gmail App Password is correct
   - Check Gmail account has 2FA enabled
   - Confirm email configuration in Firebase Functions

4. **Functions Deployment Fails**
   - Check Functions dependencies: `cd functions && npm install`
   - Verify TypeScript compilation: `npm run build`

### Useful Commands

```bash
# View Firebase logs
firebase functions:log

# Test functions locally
firebase emulators:start

# Check configuration
firebase functions:config:get

# Redeploy specific services
firebase deploy --only functions
firebase deploy --only hosting
```

## Post-Deployment Setup

1. **Test Authentication**: Login with admin/admin1234
2. **Add Properties**: Create sample properties to test functionality
3. **Test Email**: Send test invoice to verify email configuration
4. **Check Cron Jobs**: Verify monthly invoice generation is scheduled

## Support

For issues with:
- **Firebase**: Check Firebase Console logs and documentation
- **Database**: Verify connection strings and permissions
- **Email**: Confirm Gmail App Password setup
- **Application**: Check browser console for errors

## Security Notes

- Change default admin password after first login
- Use strong database passwords
- Keep Firebase API keys secure
- Enable Firebase Security Rules for production
- Use environment variables for all sensitive data

## Cost Considerations

- **Firebase Functions**: Free tier includes 125K invocations/month
- **Firebase Hosting**: Free tier includes 10GB storage and 360MB/day transfer
- **Database**: Most providers offer free tiers suitable for small applications

This deployment setup provides a production-ready environment for the Fullard Property Management System with automatic scaling and reliable infrastructure.