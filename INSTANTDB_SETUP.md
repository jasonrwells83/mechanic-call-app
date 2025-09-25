# InstantDB Setup Guide

Follow this guide to connect the Mechanic Shop OS stack to your InstantDB application and populate it with canonical data.

## 1. Create Your InstantDB App

1. Visit [https://instantdb.com/](https://instantdb.com/)
2. Create an account or sign in
3. From the dashboard, choose **Create App** / **New Project** and name it **Mechanic Shop OS**
4. Open the new app and note the **App ID** and **Admin Token** (sometimes called "Server Token")

## 2. Configure Environment Variables

### Frontend (`.env.local` in repo root)
```
VITE_API_URL=http://localhost:3001
VITE_INSTANT_DB_APP_ID=your_app_id_here
VITE_USE_MOCK_DATA=false
```
Setting `VITE_USE_MOCK_DATA=false` switches the client to use real API responses instead of the in-memory mocks.

### Backend (`server/.env`)
```
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5174
INSTANT_DB_APP_ID=your_app_id_here
INSTANT_DB_ADMIN_TOKEN=your_admin_token_here
ALLOWED_ORIGINS=http://localhost:5174,http://localhost:5173
```

> Tip: copy these templates from `env.example` to avoid typos.

## 3. Install & Start the Stack

```bash
npm run setup           # installs frontend + backend dependencies
npm run dev:backend     # starts Express API at http://localhost:3001
npm run dev             # (in a second terminal) starts the Vite frontend
```

## 4. Seed Canonical Data into InstantDB

Once your `.env` files are in place you can load the sample dataset that mirrors the mock UI payloads:

```bash
cd server
npm run seed
```

This command writes customers, vehicles, jobs, appointments, calls, and shop settings to InstantDB using stable IDs so the app has realistic data out of the box. Re-running the command safely upserts the same records.

## 5. Smoke-Test the Connection

1. With the backend running, visit `http://localhost:3001/api/test-db`
2. You should see a JSON success payload confirming InstantDB connectivity
3. Load the frontend (`npm run dev`) and confirm lists such as Jobs, Customers, and Calls resolve real records (no mock badges)

## Troubleshooting Checklist

- `.env.local` and `server/.env` must contain the correct App ID and Admin Token
- Restart both backend and frontend processes after changing environment variables
- The seed script requires valid InstantDB credentials; failures will surface in the terminal
- If the frontend still shows mock data, double-check that `VITE_USE_MOCK_DATA` is set to `false` (or remove the variable)

---

With the backend seeded and environment configured you are ready to execute the launch readiness smoke tests.
