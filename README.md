# Fullard Property Management System

A comprehensive property management application built for South African property managers, featuring automated invoice generation, tenant management, and email notifications.

## Features

- **Property Management**: Add, edit, and track rental properties
- **Tenant Management**: Manage tenant information and lease agreements
- **Automated Invoicing**: Monthly invoice generation with PDF creation
- **Email Notifications**: Automated email alerts for lease expiry and invoices
- **Dashboard Analytics**: Property statistics and occupancy rates
- **Authentication**: Secure login system
- **Responsive Design**: Mobile-friendly interface

## Technology Stack

- **Frontend**: React 18 + TypeScript + TailwindCSS + Radix UI
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **PDF Generation**: jsPDF for invoice creation
- **Email Service**: Nodemailer with Gmail integration
- **Authentication**: Passport.js with local strategy

## Firebase Deployment

This project is configured for deployment on Firebase Functions and Hosting.

### Prerequisites

1. Node.js 18+ installed
2. Firebase CLI installed: `npm install -g firebase-tools`
3. Google account with Firebase project created
4. PostgreSQL database (recommended: Neon, PlanetScale, or Supabase)

### Deployment Steps

1. **Clone and Setup**
   ```bash
   git clone <your-repo-url>
   cd fullard-property-management
   npm install
   cd functions && npm install && cd ..
   ```

2. **Configure Firebase**
   ```bash
   firebase login
   firebase init
   # Select: Functions, Hosting
   # Choose existing project or create new one
   ```

3. **Environment Variables**
   Set these environment variables in Firebase Functions:
   ```bash
   firebase functions:config:set database.url="your-postgresql-connection-string"
   firebase functions:config:set email.user="your-gmail@gmail.com"
   firebase functions:config:set email.password="your-app-password"
   ```

4. **Build and Deploy**
   ```bash
   npm run build
   firebase deploy
   ```

### Required Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `EMAIL_USER`: Gmail address for sending emails
- `EMAIL_PASSWORD`: Gmail app password
- `SESSION_SECRET`: Random string for session encryption

### Local Development

```bash
npm install
npm run dev
```

The application will be available at `http://localhost:5000`

### Default Login Credentials

- **Username**: admin
- **Password**: admin1234

## Database Schema

The application uses PostgreSQL with the following main tables:
- `properties`: Property information and rent details
- `notifications`: System notifications and alerts
- `invoices`: Generated invoices and billing records
- `company_settings`: Company information for invoices
- `users`: Authentication and user management

## Key Features

### Automated Invoice Generation
- Monthly invoices generated on the 1st of each month
- Professional PDF format with VAT calculations
- Email delivery to tenants with CC options

### Property Status Tracking
- Active, expiring soon, critical, and available statuses
- Automatic lease expiry notifications
- Visual status indicators on dashboard

### Company Settings
- Editable company information
- Dynamic VAT rate configuration
- Custom branding for invoices

## Support

For deployment issues or questions, refer to the Firebase documentation or contact support.

## License

Private software for Fullard Property Management.