﻿# Mechanic Shop OS

Modern, operator-first shop management system designed specifically for 2-bay automotive repair shops.

## ðŸš€ Features

- **Calendar Scheduling**: Drag-and-drop scheduling with 2-bay resource management
- **Job Management**: Kanban-style workflow from intake to completion
- **Customer Management**: Comprehensive customer and vehicle history
- **Call Management**: Rapid intake with one-click conversion to jobs
- **Real-time Updates**: Powered by InstantDB for live synchronization
- **Keyboard-First**: Extensive keyboard shortcuts for operator efficiency

## ðŸ›  Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** for styling
- **shadcn/ui** for accessible components
- **Zustand** for state management
- **TanStack Query** for server state

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **InstantDB** for real-time database
- **CORS** enabled for frontend communication

## ðŸ“‹ Prerequisites

- Node.js 18+ 
- npm or yarn
- InstantDB account (free tier available)

## ðŸš€ Quick Start

### 1. Clone and Install
```bash
git clone <repository-url>
cd mechanic-shop-os
npm run setup
```

### 2. Configure InstantDB
1. Create account at [InstantDB.com](https://instantdb.com/)
2. Create new app: "Mechanic Shop OS"
3. Get your App ID and Admin Token
4. Follow setup guide in `INSTANTDB_SETUP.md`
5. Set `VITE_USE_MOCK_DATA=false` in `.env.local` when you want the frontend to use live API data (omit or set to `true` to fall back to mock fixtures).

### 3. Run Development Servers
```bash
# Run both frontend and backend
npm run dev:full

# Or run separately:
npm run dev          # Frontend only (port 5174)
npm run dev:backend  # Backend only (port 3001)
```

### 4. Seed Canonical Data
Once your environment variables are in place, populate InstantDB with the shared dataset so the frontend resolves live entities:
```bash
cd server
npm run seed
```
The seed script is idempotent and will upsert customers, vehicles, jobs, calls, appointments, and shop settings.

### 5. Access the Application
- **Frontend**: http://localhost:5174
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## ðŸ“ Project Structure

```
mechanic-shop-os/
â”œâ”€â”€ src/                    # Frontend source
â”‚   â”œâ”€â”€ components/         # React components
â”‚   â”œâ”€â”€ hooks/             # Custom hooks
â”‚   â”œâ”€â”€ stores/            # Zustand stores
â”‚   â””â”€â”€ types/             # TypeScript types
â”œâ”€â”€ server/                # Backend source
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ config/        # Database & app config
â”‚   â”‚   â”œâ”€â”€ routes/        # API routes
â”‚   â”‚   â””â”€â”€ types/         # Backend types
â”‚   â””â”€â”€ dist/              # Built backend
â”œâ”€â”€ tasks/                 # Project documentation
â””â”€â”€ public/                # Static assets
```

## ðŸ”§ Development Scripts

```bash
npm run dev          # Start frontend dev server
npm run dev:backend  # Start backend dev server
npm run dev:full     # Start both servers concurrently
npm run build        # Build frontend for production
npm run build:backend # Build backend for production
npm run setup        # Install all dependencies
npm run lint         # Run ESLint
```

## ðŸŽ¯ Roadmap

### Phase 1 (MVP) - Current
- [x] Project setup & infrastructure
- [x] Tailwind CSS & shadcn/ui integration
- [x] InstantDB configuration
- [ ] Application shell & navigation
- [ ] Calendar scheduling system
- [ ] Job management & kanban board

### Phase 2 - Advanced Features
- [ ] Advanced reporting
- [ ] Email integration
- [ ] Settings customization

### Phase 3 - Enhancements
- [ ] File uploads
- [ ] Advanced search/filtering

## ðŸ¤ Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## ðŸ“„ License

MIT License - see LICENSE file for details

## ðŸ†˜ Support

- Check `INSTANTDB_SETUP.md` for database setup
- Review task list in `tasks/tasks-prd-mechanic-shop-os.md`
- Open an issue for bugs or feature requests
