# InstantDB Setup Guide

To complete Task 1.5, you need to set up InstantDB and get your app credentials. Follow these steps:

## Step 1: Create InstantDB Account

1. Go to [https://instantdb.com/](https://instantdb.com/)
2. Sign up for a free account
3. Verify your email if required

## Step 2: Create a New App

1. After logging in, click "Create App" or "New Project"
2. Name your app: **"Mechanic Shop OS"**
3. Choose the appropriate plan (free tier should work for development)

## Step 3: Get Your Credentials

Once your app is created, you'll need two pieces of information:

1. **App ID** - This will be visible in your dashboard
2. **Admin Token** - Look for "Admin Token" or "Server Token" in your app settings

## Step 4: Configure Environment Variables

### Frontend (.env.local)
Create a `.env.local` file in the project root with:
```
VITE_API_URL=http://localhost:3001
VITE_INSTANT_DB_APP_ID=your_app_id_here
```

### Backend (server/.env)
Create a `server/.env` file with:
```
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5174
INSTANT_DB_APP_ID=your_app_id_here
INSTANT_DB_ADMIN_TOKEN=your_admin_token_here
ALLOWED_ORIGINS=http://localhost:5174,http://localhost:5173
```

## Step 5: Test the Connection

After setting up the environment variables:

1. Restart the backend server: `cd server && npm run dev`
2. Test the database connection: `http://localhost:3001/api/test-db`

You should see a success message indicating InstantDB is connected.

## Troubleshooting

- Make sure both environment files are created and have the correct values
- Restart both frontend and backend servers after adding environment variables
- Check the console for any error messages
- Verify your InstantDB credentials are correct in the dashboard

---

**Next Steps**: Once InstantDB is configured, we'll move to Task 1.6 to complete the project setup infrastructure.

