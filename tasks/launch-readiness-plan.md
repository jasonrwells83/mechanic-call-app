# Launch Readiness Plan

## 1. Backend & Data Services
- Stand up the server in `server/` (install deps, configure `.env`, run migrations/seed data) so InstantDB/api hooks resolve real entities.
- Confirm REST/InstantDB endpoints align with client expectations (`useJob`, `useUpdateJob`, `useCustomer`, etc.) and that job note mutations persist back to storage.
- Provide production-ready configuration for InstantDB (app id, API keys, rules) and document how to switch between mock and live data.

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
