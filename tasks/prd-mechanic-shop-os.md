# Product Requirements Document: Mechanic Shop OS

## Introduction/Overview

**Mechanic Shop OS** is a modern, operator-first shop management system designed specifically for 2-bay automotive repair shops. The system addresses the core problem of inefficient scheduling, poor job tracking, and fragmented customer communication that plague small independent shops. 

**Goal**: Create a streamlined, keyboard-first interface that allows shop operators to manage their entire workflow—from incoming calls to completed jobs—without navigating away from their primary workspace.

## Goals

1. **Reduce scheduling conflicts** by providing real-time, drag-and-drop calendar management with conflict resolution
2. **Improve job visibility** through a kanban-style status board showing all work from intake to completion
3. **Eliminate context switching** via a persistent right dock panel that shows relevant details for any selected item
4. **Increase operator efficiency** with keyboard shortcuts and command palette for all primary actions
5. **Maintain comprehensive records** with integrated customer/vehicle history and service tracking

## User Stories

**As a shop operator, I want to:**

- Quickly log incoming calls and convert them to scheduled jobs in one click
- See both bays' schedules at a glance and drag jobs between time slots and bays
- View job details, customer info, and vehicle history without leaving my current screen
- Track job status from "Scheduled" through "Completed" with visual indicators
- Access any function via keyboard shortcuts to keep my hands on the keyboard
- Generate simple reports showing upcoming work and completed jobs

**As a shop owner, I want to:**

- See daily KPIs (cars scheduled, hours booked vs capacity, jobs waiting on parts)
- Maintain service history for each customer's vehicles
- Export job data for basic accounting and record-keeping
- Customize shop hours, bay names, and default job settings

## Functional Requirements

### Core System Requirements

1. **The system must support exactly 2 bays** with independent scheduling capabilities
2. **The system must allow overlapping appointments** in the same bay (e.g., diagnostic while waiting for parts)
3. **The system must provide non-linear status transitions** (jobs can skip statuses as needed)
4. **The system must archive completed jobs indefinitely** for historical reference
5. **The system must operate with a single user role** (no permission system required)

### Application Shell Requirements

6. **The system must provide a left navigation rail** with: Home, Calendar, Jobs, Calls, Customers, Reports, Settings
7. **The system must include a top bar** with: date picker, Command Palette (⌘/Ctrl K), and user menu
8. **The system must feature a collapsible right dock panel** showing context for selected items
9. **The system must implement a global command palette** accessible via ⌘/Ctrl K
10. **The system must support keyboard shortcuts**: N=new, S=schedule, W=waiting parts, C=complete, /=search

### Calendar & Scheduling Requirements

11. **The system must display a resource-based calendar** with Bay 1 and Bay 2 as columns
12. **The system must support drag-and-drop scheduling** with visual feedback
13. **The system must handle scheduling conflicts** by prompting: Swap/Next Free/Move to Other Bay
14. **The system must show availability suggestions** when scheduling new appointments
15. **The system must color-code jobs by status**: Scheduled (primary-soft), In-Bay (success-solid), Waiting Parts (warning-striped), Completed (muted-subtle)
16. **The system must resize appointment blocks** based on estimated job duration

### Job Management Requirements

17. **The system must provide a kanban board view** with swimlanes: Incoming Calls → Scheduled → In Bay → Waiting on Parts → Completed
18. **The system must allow drag-and-drop between status lanes**
19. **The system must display job cards** with: title, customer name, vehicle info, estimated hours, priority
20. **The system must support job creation** from the kanban board or calendar views
21. **The system must track job data**: id, title, customerId, vehicleId, estHours, status, priority, notes

### Call Management Requirements

22. **The system must provide rapid call intake** with fields: name/phone, vehicle YMM, complaint
23. **The system must track call outcomes**: quote given, scheduled, follow-up needed
24. **The system must allow one-click conversion** from call to scheduled job
25. **The system must suggest available time slots** when converting calls to appointments

### Customer & Vehicle Management Requirements

26. **The system must maintain customer records** with: id, name, phone, email, preferredContact
27. **The system must support multiple vehicles per customer**
28. **The system must track vehicle data**: id, customerId, year, make, model, mileage
29. **The system must maintain service history** for each vehicle
30. **The system must provide a unified customer timeline** showing calls, jobs, and service history

### Right Dock Panel Requirements

31. **The system must show job details** when a job is selected: full job info, customer details, vehicle history
32. **The system must display customer information** when a customer is selected: contact info, vehicles, service history
33. **The system must show vehicle details** when a vehicle is selected: specs, service history, current jobs
34. **The system must remain contextual** - panel content updates based on current selection

### Communication Requirements

35. **The system must provide email integration** via simple links that open default email client (Gmail, Outlook, etc.)
36. **The system must generate email templates** for appointment reminders and job status updates
37. **The system must not send automatic communications** (all emails are manual/prompted)

### Reporting Requirements

38. **The system must display daily KPIs**: cars today, hours booked vs capacity, waiting-on-parts count
39. **The system must show upcoming jobs** in chronological order
40. **The system must export job data to CSV** for external accounting/reporting
41. **The system must provide weekly summary**: jobs completed, booked vs open hours, no-shows

### Settings & Configuration Requirements

42. **The system must allow shop hours configuration** (default: 9-4)
43. **The system must support bay name customization**
44. **The system must allow status color customization**
45. **The system must configure time slot sizes** (default: 30 minutes)
46. **The system must set default job durations** (e.g., 2 hours)

## Non-Goals (Out of Scope)

- **Multi-shop support**: System is designed for single-location operations only
- **Complex user roles/permissions**: Single operator model only
- **Automatic customer notifications**: All communication is manual
- **AI features**: No transcription, summarization, or automated insights
- **Accounting software integration**: Basic CSV export only
- **Offline capability**: Internet connection required
- **Mobile app**: Web-based responsive design only
- **Recurring appointments**: Each job is scheduled individually
- **Automatic lunch break blocking**: Flexible scheduling preferred
- **Inventory management**: Focus on scheduling and job tracking only

## Design Considerations

### UI Framework & Components
- **shadcn/ui component library** for consistent, accessible interface
- **FullCalendar library** for resource-based scheduling with drag-and-drop
- **TanStack Table** for data grids with filtering and sorting
- **Framer Motion** for micro-interactions (100-150ms duration)

### Visual System
- **Typography**: Inter or Geist fonts, 12/14/16/20/24px scale
- **Color scheme**: Neutral gunmetal base with status-specific colors
- **Layout density**: Compact tables (44px rows), generous modals
- **Responsive design**: Works on desktop and tablet (mobile secondary)

### Key Component Map
- App shell: `ResizablePanel`, `ScrollArea`, `Separator`, `Breadcrumb`
- Navigation: `NavigationMenu`, `CommandDialog`, `Avatar`, `DropdownMenu`
- Data display: `Card`, `Badge`, `Tooltip`, `HoverCard`, `DataTable`
- Forms: `Form`, `Input`, `Textarea`, `Select`, `Combobox`, `Calendar`, `Popover`
- Interactions: `Dialog`, `Toast`, drag-and-drop zones

## Technical Considerations

### Technology Stack
- **Frontend**: React + Vite for fast development
- **Backend**: Node.js + Express for API layer
- **Database**: InstantDB for real-time data synchronization
- **State Management**: Zustand for UI state, TanStack Query for server state
- **Styling**: Tailwind CSS with shadcn/ui design tokens

### Database Integration (InstantDB)
- **Setup**: Use `@instantdb/admin` package for server-side operations
- **Initialization**: Requires application ID and admin token
- **Operations**: `query()` for reads, `transact()` for writes
- **Real-time**: Built-in subscriptions for live updates

### Optional Enhancements
- **Email Service**: Integration with SendGrid, Mailgun, or similar for templated emails
- **File Uploads**: Support for job photos, estimates, invoices

### Performance Requirements
- **Loading states**: Skeleton loaders for all data fetching
- **Optimistic updates**: Immediate UI feedback for drag-and-drop
- **Virtualization**: Tables with 200+ rows use virtual scrolling
- **Caching**: TanStack Query for intelligent data caching

## Success Metrics

### Primary Metrics
- **Scheduling efficiency**: Reduce time to schedule a job from call by 50%
- **Context switching**: Eliminate navigation between job details (0 page refreshes for common tasks)
- **Data accuracy**: 100% of jobs have status tracking from intake to completion

### Secondary Metrics
- **User adoption**: Daily active usage of calendar and kanban views
- **Error reduction**: Fewer scheduling conflicts and double-bookings
- **Time savings**: Reduce administrative overhead by 30%

### Measurement Methods
- **Task completion time**: Time from call intake to scheduled appointment
- **Click tracking**: Number of navigation clicks per common workflow
- **User feedback**: Operator satisfaction with keyboard shortcuts and workflow efficiency

## Open Questions

1. **Email Integration Depth**: Simple mailto links vs. integrated email templates with tracking?
2. **Job Duration Estimation**: Should the system learn from historical data to suggest job durations?
3. **Conflict Resolution Default**: What should be the default action when drag-and-drop creates scheduling conflicts?
4. **Data Migration**: If replacing existing software, what import formats should be supported?
5. **Backup Strategy**: Should the system include automated backups or rely on InstantDB's infrastructure?
6. **Customization Level**: How much should operators be able to customize beyond basic settings (bay names, colors, hours)?

---

## Implementation Priority

**Phase 1 (MVP)**: Calendar scheduler, basic job/call management, right dock panel
**Phase 2**: Advanced reporting, email integration, settings customization  
**Phase 3**: File uploads, advanced search/filtering

*This PRD is designed for implementation by a junior developer using modern web technologies with clear, actionable requirements and comprehensive technical guidance.*
