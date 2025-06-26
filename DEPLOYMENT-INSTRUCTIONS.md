# Quick Firebase Deployment Instructions

## 1. Prerequisites
- Node.js 18+ installed
- Firebase CLI: `npm install -g firebase-tools`
- PostgreSQL database (Neon/Supabase recommended)

## 2. Setup
```bash
git clone <your-repo>
cd fullard-property-management
npm install
cd functions && npm install && cd ..
```

## 3. Firebase Configuration
```bash
firebase login
firebase init
# Select: Functions + Hosting
# Use existing functions folder
# Public directory: client/dist
```

## 4. Environment Variables
```bash
firebase functions:config:set database.url="postgresql://user:pass@host/db"
firebase functions:config:set email.user="your-gmail@gmail.com"
firebase functions:config:set email.password="your-gmail-app-password"
firebase functions:config:set session.secret="random-secret-string"
```

## 5. Deploy
```bash
npm run build
firebase deploy
```

## 6. Access
- URL: https://your-project-id.web.app
- Login: admin / admin1234

## Database Options
- **Neon**: https://neon.tech (Free tier)
- **Supabase**: https://supabase.com (Free tier)
- **PlanetScale**: https://planetscale.com (Free tier)

## Gmail Setup
1. Enable 2FA on Gmail account
2. Generate App Password in Google Account Settings
3. Use App Password (not regular password) in config

## Support
Check Firebase Console logs for deployment issues.