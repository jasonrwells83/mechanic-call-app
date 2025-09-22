# Mechanic Shop OS

Modern, operator-first shop management system designed specifically for 2-bay automotive repair shops.

## 🚀 Features

- **Calendar Scheduling**: Drag-and-drop scheduling with 2-bay resource management
- **Job Management**: Kanban-style workflow from intake to completion
- **Customer Management**: Comprehensive customer and vehicle history
- **Call Management**: Rapid intake with one-click conversion to jobs
- **Real-time Updates**: Powered by InstantDB for live synchronization
- **Keyboard-First**: Extensive keyboard shortcuts for operator efficiency

## 🛠 Tech Stack

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

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- InstantDB account (free tier available)

## 🚀 Quick Start

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

### 3. Run Development Servers
```bash
# Run both frontend and backend
npm run dev:full

# Or run separately:
npm run dev          # Frontend only (port 5174)
npm run dev:backend  # Backend only (port 3001)
```

### 4. Access the Application
- **Frontend**: http://localhost:5174
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## 📁 Project Structure

```
mechanic-shop-os/
├── src/                    # Frontend source
│   ├── components/         # React components
│   ├── hooks/             # Custom hooks
│   ├── stores/            # Zustand stores
│   └── types/             # TypeScript types
├── server/                # Backend source
│   ├── src/
│   │   ├── config/        # Database & app config
│   │   ├── routes/        # API routes
│   │   └── types/         # Backend types
│   └── dist/              # Built backend
├── tasks/                 # Project documentation
└── public/                # Static assets
```

## 🔧 Development Scripts

```bash
npm run dev          # Start frontend dev server
npm run dev:backend  # Start backend dev server
npm run dev:full     # Start both servers concurrently
npm run build        # Build frontend for production
npm run build:backend # Build backend for production
npm run setup        # Install all dependencies
npm run lint         # Run ESLint
```

## 🎯 Roadmap

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

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- Check `INSTANTDB_SETUP.md` for database setup
- Review task list in `tasks/tasks-prd-mechanic-shop-os.md`
- Open an issue for bugs or feature requests