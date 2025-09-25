# Launch Readiness Plan

## 1. Backend & Data Services
- Stand up the server in `server/` (install deps, configure `.env`, run migrations/seed data) so InstantDB/api hooks resolve real entities.
- Confirm REST/InstantDB endpoints align with client expectations (`useJob`, `useUpdateJob`, `useCustomer`, etc.) and that job note mutations persist back to storage.
- Provide production-ready configuration for InstantDB (app id, API keys, rules) and document how to switch between mock and live data.

### Task 1 kickoff notes (complete)
- Verified existing backend tooling and commands:
  - `npm run setup` installs both frontend and backend dependencies.
  - `npm run dev:backend` (or `cd server && npm run dev`) starts the Express server expected by the frontend hooks.
- Documented environment variable requirements in `env.example` and `INSTANTDB_SETUP.md`; live InstantDB credentials now belong in `server/.env` so `server/src/config/instantdb.ts` initializes against production data.
- Confirmed REST endpoints already map to the client APIs (e.g., `jobApi` uses `/jobs`, `/jobs/:id`, `/jobs/:id/status` implemented in `server/src/routes/jobs.ts`), establishing parity ahead of live-database validation for mutations like `useUpdateJob`.

### Task 2 kickoff notes (in progress)
- **Pre-flight checklist**
  - Reuse the backend setup from Task 1 and launch both layers with `npm run dev:full` to mirror the operator stack (Vite frontend + Express API with InstantDB credentials in `server/.env`).
  - Seed a handful of canonical entities in InstantDB (jobs, calls, customers, vehicles) so React Query hooks such as `useJobs`, `useCalls`, and `useCustomers` resolve realistic payloads during smoke runs.
- **Smoke test matrix**
  - **Jobs Kanban** (`src/pages/JobsPage.tsx` + `KanbanBoard`): drag jobs between columns, create/edit jobs via `useCreateJob`/`useUpdateJob`, then confirm status transitions propagate through `/api/jobs/:id` and `/api/jobs/:id/status` responses and surface in the Right Dock job payload.
  - **Right Dock navigation** (`src/components/layout/RightDockPanel.tsx`): validate selection-store interactions (pin, collapse, context swap) while hopping between job, customer, call, and vehicle contexts to ensure optimistic selections resolve once TanStack Query refetches complete.
  - **Call-to-job flows** (`src/components/calls/CallToJobConverter.tsx` and scheduling widgets): convert an inbound call into a scheduled job, ensure appointment slots post through the scheduling APIs, and verify the resulting job appears in the Kanban board and dock views.
- **Data integrity spot-checks**
  - Exercise job note mutations from the dock (`RightDockPanel` note composer) and confirm the optimistic note entry reconciles with the InstantDB record after the `/api/jobs/:id` PUT completes.
  - Navigate auxiliary panels (vehicle/customer timelines, appointment calendar) to confirm cross-entity fetches (`useVehicles`, `useAppointments`, `useRealtime-*` hooks) hydrate without console errors and that stale cache entries invalidate when related mutations succeed.
- **Issue triage protocol**
  - Capture console logs, network traces, and backend responses for any mismatch between optimistic UI state and persisted data; file issues with reproduction steps plus relevant request/response payloads.
  - Record coverage gaps (e.g., automated regression candidates, missing InstantDB indexes/rules) to feed into Task 3’s operational checklist.

## 2. Integration QA
- Run end-to-end smoke tests exercising selection flows, dock menu navigation, and job-note editing against live data.
- Validate optimistic updates reconcile correctly once backend responses return; handle failure toasts/state if the API rejects updates.
- Verify other panel contexts (vehicle, customer, call, appointment) populate from real data and expose required callbacks.

## 3. Operational Checklist
- Document combined dev workflow (`npm run dev` + backend process) and any required environment variables.
- Audit logging/toast handling for backend errors so operators receive actionable feedback.
- Prepare deployment notes: hosting targets for frontend/backend, build commands, environment provisioning.

## 4. Future Enhancements (Optional)
- Expand automated test coverage (component or integration) to cover live backend scenarios.
- Revisit selection history persistence requirements once backend is stable.
- Gather design feedback on dock interactions post-live data integration.
