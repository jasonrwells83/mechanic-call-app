# Task List: Mechanic Shop OS Implementation

Based on the PRD analysis, this is a greenfield project requiring a complete React + Vite frontend with Node.js + Express backend, using InstantDB for data persistence and shadcn/ui for the interface.

## Relevant Files

### Frontend (React + Vite)
- `package.json` - Frontend dependencies and scripts
- `vite.config.ts` - Vite configuration with path aliases
- `tailwind.config.js` - Tailwind CSS configuration
- `src/main.tsx` - React app entry point
- `src/App.tsx` - Root application component with routing
- `src/lib/utils.ts` - Utility functions for shadcn/ui
- `src/lib/query-client.ts` - TanStack Query client configuration and cache management
- `src/lib/api-client.ts` - HTTP client with error handling and type safety
- `src/lib/realtime-client.ts` - InstantDB real-time client and subscription management
- `src/components/providers/QueryProvider.tsx` - TanStack Query provider component
- `components.json` - shadcn/ui configuration
- `src/components/ui/` - shadcn/ui component library
- `src/hooks/` - Custom React hooks
  - `src/hooks/use-customers.ts` - Customer data management hooks
  - `src/hooks/use-jobs.ts` - Job data management hooks  
  - `src/hooks/use-calls.ts` - Call data management hooks
  - `src/hooks/use-realtime-customers.ts` - Real-time customer subscriptions
  - `src/hooks/use-realtime-jobs.ts` - Real-time job subscriptions with status tracking
  - `src/hooks/use-realtime-calls.ts` - Real-time call subscriptions and notifications
  - `src/hooks/use-realtime-appointments.ts` - Real-time appointment and calendar updates
  - `src/hooks/use-realtime-dashboard.ts` - Real-time dashboard and KPI tracking
  - `src/hooks/use-realtime.ts` - Real-time utilities and connection management
  - `src/hooks/index.ts` - Hook exports
- `src/components/calendar/` - Calendar components and scheduling system
  - `src/components/calendar/SchedulingCalendar.tsx` - Main FullCalendar component with 2-bay resource view and external job drops
  - `src/components/calendar/DraggableJobList.tsx` - Sidebar component with draggable unscheduled jobs
  - `src/components/calendar/ConflictResolutionModal.tsx` - Modal for resolving scheduling conflicts
  - `src/components/calendar/AvailabilitySuggestions.tsx` - Smart scheduling suggestions with AI-powered optimization
  - `src/components/calendar/calendar.css` - Calendar styling, drag feedback, animations, and theme customization
- `src/lib/calendar-config.ts` - FullCalendar configuration and utilities
- `src/lib/job-status-transitions.ts` - Job status transition logic, validation, and workflow management
- `src/components/kanban/` - Kanban board system for job management
  - `src/components/kanban/KanbanBoard.tsx` - Main kanban board with drag-and-drop status transitions
  - `src/components/kanban/KanbanColumn.tsx` - Individual status lane components with capacity management
  - `src/components/kanban/KanbanCard.tsx` - Job card components with rich information display
  - `src/components/kanban/kanban.css` - Kanban board animations and styling
- `src/components/forms/` - Form components for data entry
  - `src/components/forms/JobForm.tsx` - Comprehensive job creation and editing form
  - `src/components/forms/CustomerForm.tsx` - Multi-section customer creation and editing form with validation
- `src/components/customers/` - Customer management components
  - `src/components/customers/CustomerList.tsx` - Customer list with search, filtering, and statistics
  - `src/components/customers/CustomerDetailView.tsx` - Comprehensive customer detail view with service history
- `src/components/vehicles/` - Vehicle management components
  - `src/components/vehicles/VehicleManagement.tsx` - Vehicle management with service tracking and quick actions
- `src/components/timeline/` - Service history and timeline components
  - `src/components/timeline/ServiceHistoryTimeline.tsx` - Chronological service history with status progression
- `src/components/search/` - Advanced search and filtering components
  - `src/components/search/AdvancedCustomerSearch.tsx` - Comprehensive customer search with multi-criteria filtering
  - `src/components/search/GlobalCustomerSearch.tsx` - Quick customer search for navigation and global access
- `src/components/communication/` - Customer communication and timeline components
  - `src/components/communication/CustomerCommunicationTimeline.tsx` - Unified timeline for all customer communications
  - `src/components/communication/CommunicationAnalytics.tsx` - Analytics and insights for communication patterns
  - `src/components/communication/QuickCommunicationActions.tsx` - Fast communication templates and actions
- `src/components/calls/` - Call management and intake system
  - `src/components/calls/CallIntakeForm.tsx` - Rapid entry form for incoming customer calls with smart auto-completion
  - `src/components/calls/CallList.tsx` - Comprehensive call management with outcome tracking and filtering
  - `src/components/calls/CallSearchAndFilter.tsx` - Advanced search and filtering system with multi-criteria filtering, quick filters, and date range selection
  - `src/components/calls/CallOutcomeAnalytics.tsx` - Advanced analytics and reporting for call outcomes and performance
  - `src/components/calls/CallFollowUpSystem.tsx` - Automated reminder system for call follow-ups and workflow management
  - `src/components/calls/CallToJobConverter.tsx` - One-click conversion from call records to scheduled jobs with intelligent pre-population
  - `src/components/calls/CallOutcomeManagement.tsx` - Comprehensive outcome management with templates, actions, and workflow automation
- `src/components/scheduling/` - Job scheduling and resource management system
  - `src/components/scheduling/CallSchedulingIntegration.tsx` - Advanced scheduling integration with conflict detection and resource allocation
  - `src/components/scheduling/SchedulingDashboard.tsx` - Unified dashboard for managing appointments, resources, and technician workloads
- `src/components/layout/` - Layout and navigation components
  - `src/components/layout/RightDockPanel.tsx` - Collapsible right dock panel with context-aware content switching and responsive design
- `src/components/dock/` - Dock panel content components
- `src/components/dock/JobDetailsView.tsx` - Comprehensive job details view with timeline, progress tracking, and interactive actions
- `src/components/dock/VehicleDetailsView.tsx` - Detailed vehicle information with service history, maintenance tracking, and documentation
- `src/pages/CallsPage.tsx` - Main call management page with intake and list views
- `src/pages/SettingsPage.tsx` - Settings layout with in-page navigation and configuration sections
- `src/components/settings/` - Settings and configuration UI modules
  - `src/components/settings/ShopHoursSection.tsx` - Weekly hours and exception management interface
  - `src/components/settings/BayConfigurationSection.tsx` - Service bay naming and availability controls
  - `src/components/settings/StatusColorSection.tsx` - Status palette editor with previews
  - `src/components/settings/SchedulingDefaultsSection.tsx` - Scheduling default durations, buffers, and policies
- `src/hooks/useSettingsForm.tsx` - Shared form context, persistence, and validation for settings
- `src/components/forms/VehicleForm.tsx` - Multi-section vehicle creation and editing form
- `src/stores/` - Zustand state management stores
  - `src/stores/ui-store.ts` - Global UI state (panels, selections, modals, filters)
  - `src/stores/keyboard-store.ts` - Keyboard shortcuts and handlers
  - `src/stores/selection-store.ts` - Global selection state management with context switching and history tracking
  - `src/stores/navigation-store.ts` - Navigation state and breadcrumbs
  - `src/stores/preferences-store.ts` - User preferences and settings
  - `src/stores/index.ts` - Store exports and initialization
- `src/types/` - TypeScript type definitions

### Backend (Node.js + Express)
- `server/package.json` - Backend dependencies and scripts
- `server/src/app.ts` - Express server setup
- `server/src/config/instantdb.ts` - InstantDB configuration
- `server/src/routes/` - API route handlers
- `server/src/middleware/` - Express middleware
- `server/src/types/` - Backend TypeScript types

### Configuration
- `.env.local` - Frontend environment variables
- `server/.env` - Backend environment variables
- `.gitignore` - Git ignore patterns
- `README.md` - Project documentation

### Notes
- Frontend runs on port 5173 (Vite default)
- Backend runs on port 3001 
- InstantDB handles real-time data synchronization
- shadcn/ui provides accessible UI components

## Tasks

- [x] 1.0 Project Setup & Infrastructure
  - [x] 1.1 Initialize React + Vite frontend with TypeScript
  - [x] 1.2 Set up Tailwind CSS and configure design system
  - [x] 1.3 Install and configure shadcn/ui component library
  - [x] 1.4 Initialize Node.js + Express backend with TypeScript
  - [x] 1.5 Set up InstantDB configuration and environment variables
  - [x] 1.6 Configure development scripts and basic project structure

- [x] 2.0 Application Shell & Navigation
  - [x] 2.1 Create main layout component with resizable panels
  - [x] 2.2 Implement left navigation rail with route links
  - [x] 2.3 Build top bar with date picker and user menu
  - [x] 2.4 Implement command palette with keyboard shortcuts
  - [x] 2.5 Set up React Router with protected routes
  - [x] 2.6 Create responsive layout for desktop and tablet

- [x] 3.0 Data Layer & InstantDB Integration
  - [x] 3.1 Define TypeScript types for all data models
  - [x] 3.2 Set up InstantDB schema and relationships
  - [x] 3.3 Create API routes for CRUD operations
  - [x] 3.4 Implement Zustand stores for UI state management
  - [x] 3.5 Set up TanStack Query for server state caching
  - [x] 3.6 Create data hooks for real-time subscriptions

- [x] 4.0 Calendar Scheduling System
  - [x] 4.1 Install and configure FullCalendar with resource view
  - [x] 4.2 Create calendar component with 2-bay columns
  - [x] 4.3 Implement drag-and-drop job scheduling
  - [x] 4.4 Build conflict resolution modal and logic
  - [x] 4.5 Add status-based color coding for appointments
  - [x] 4.6 Create availability suggestion system

- [x] 5.0 Job Management & Kanban Board
  - [x] 5.1 Create kanban board layout with status lanes
  - [x] 5.2 Build job card components with drag-and-drop
  - [x] 5.3 Implement status transition logic
  - [x] 5.4 Create job creation and editing forms
  - [x] 5.5 Add job search and filtering capabilities
  - [x] 5.6 Implement optimistic updates for job operations

- [x] 6.0 Customer & Vehicle Management
  - [x] 6.1 Create customer list and detail views
  - [x] 6.2 Build customer creation and editing forms
  - [x] 6.3 Implement vehicle management for multiple vehicles per customer
  - [x] 6.4 Create service history timeline component
  - [x] 6.5 Add customer search and filtering
  - [x] 6.6 Build unified customer communication timeline

- [x] 7.0 Call Management System
  - [x] 7.1 Create call intake form with rapid entry
  - [x] 7.2 Build call list with outcome tracking
  - [x] 7.3 Implement one-click conversion to scheduled jobs
  - [x] 7.4 Add call search and filtering
  - [x] 7.5 Create call outcome management
  - [x] 7.6 Integrate with job scheduling system

- [x] 8.0 Right Dock Panel & Context System
  - [x] 8.1 Create collapsible right panel component
  - [x] 8.2 Build context-aware content switching
  - [x] 8.3 Implement job details view in dock
  - [x] 8.4 Create customer information panel
  - [x] 8.5 Add vehicle details and history view
  - [x] 8.6 Integrate with selection state management

- [x] 9.0 Reporting & Export Features
  - [x] 9.1 Create daily KPI dashboard component
  - [x] 9.2 Build upcoming jobs report view
  - [x] 9.3 Implement CSV export functionality
  - [x] 9.4 Create weekly summary report
  - [x] 9.5 Add report filtering and date ranges
  - [x] 9.6 Build print-friendly report layouts

- [x] 10.0 Settings & Configuration
  - [x] 10.1 Create settings page layout and navigation
  - [x] 10.2 Build shop hours configuration
  - [x] 10.3 Implement bay name customization
  - [x] 10.4 Add status color configuration
  - [x] 10.5 Create time slot and default duration settings
  - [x] 10.6 Implement settings persistence and validation
