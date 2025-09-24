# Right Panel Refactor Plan

## Objectives
- Restore a clear `Menu` state for the right dock so users can always return to the original overview via a persistent Menu button.
- Remove placeholder data and wire each detail view to real records sourced from our query hooks / stores, keeping sample fallbacks only for loading states.
- Unify how selections from elsewhere in the app hydrate the dock so that context, entity id, and fetched data remain in sync.
- Respect the "no photos" constraint by relying on text, status badges, and icons only.

## Current Pain Points
- `src/components/layout/RightDockPanel.tsx` mirrors the selection store but relies on local `panelState` plus hard-coded defaults like `job-001`, which breaks after the first context switch.
- Once a context such as vehicle details renders, there is no action that resets the panel to the menu/overview state.
- `JobDetailsView` and `VehicleDetailsView` import large mock payloads instead of consuming the `data` passed in from the dock, so the panel shows sample content unrelated to the active selection.
- Selection flows are inconsistent; many list/detail components never call the `use*Selection` helpers, leaving the dock orphaned or out of sync with current focus.

## Panel State Model
- Extend `DockPanelContext` to include an explicit `'menu'` view (separate from `'empty'`/null) and track a `dockView: 'menu' | 'context'` flag in `src/stores/selection-store.ts`.
- Replace the local `panelState` duplication in `RightDockPanel` with derived state from the selection store (width/max pin can stay local) so context changes propagate from a single source of truth.
- Add a persistent Menu button in the dock header that calls `setDockContext('menu')` and `clearSelection()`, resetting to the overview tiles without collapsing the dock.
- When app features (calendar, lists, search, etc.) call `selectItem`, the store should set `{ dockView: 'context', dockContext: mappedContext, entity: { type, id, initialData } }`.

## Menu & Layout Plan
- Default dock view shows the Menu screen composed of:
  - **Primary Tiles**: quick navigation to `job`, `customer`, `vehicle`, `call`, `appointment` contexts (same tile visuals as the current empty state cards).
  - **Pinned Items**: render `selectionStore.pinnedItems` with `title`, `subtitle`, and a jump action to rehydrate the associated context.
  - **Recent Items**: list the last ~5 selections for fast return; clicking one should call `selectItem`.
  - **Quick Actions**: keep call/email/schedule buttons but wire them to real actions (or disable until implemented) instead of placeholders.
- No image slots; reuse icon + badge patterns already in place.

## Data Linking & Loading Strategy
- Introduce a typed `DockPayload` that the selection store carries: `{ entityType, entityId, initialData, source?: string }`.
- Each context view loads data through existing hooks:
  - Jobs -> `useJob(entityId)` returning `JobWithRelations`.
  - Vehicles -> `useVehicle(entityId)` + `useVehicleServiceHistory(entityId)` for timelines.
  - Customers -> `useCustomer(entityId)` + `useCustomerVehicles` / `useJobsByCustomer`.
  - Calls -> `useCall(entityId)`.
  - Appointments -> `useAppointment(entityId)`.
- Pass hook results into the dedicated detail components instead of letting them import mock objects; keep optimistic placeholder sections behind loading/empty states.
- Prefetch data on hover using the existing `usePrefetch*` helpers to keep the dock responsive when switching contexts.

## Detail View Data Contracts
- **Job Details** (`JobWithRelations`): require `id`, `title`, `status`, `priority`, `customer`, `vehicle`, `estimatedDuration`, `createdAt`, `updatedAt`, optional `milestones`, `notes`, `attachments` (text/doc only), `appointment`.
- **Vehicle Details** (`VehicleWithHistory`): require `id`, `make`, `model`, `year`, `vin`, `licensePlate`, linked `customer`, `serviceHistory` list, related `jobs` summary. Enforce text-only service history entries.
- **Customer Details** (`CustomerWithVehicles`): require `name`, `phone`, optional `email`, `address`, `preferredContact`, associated `vehicles`, `jobs`, `calls` counts.
- **Call Details** (`Call`): require `callOutcome`, `callStartTime`, `callDuration`, `callReason`, `callNotes`, `followUp` flags, referencing customer/job ids.
- **Appointment Details** (`Appointment`): require `startAt`, `endAt`, `bay`, `jobId`, plus resolved job/customer snippets for context.
- Each view should render loading, empty, and error states to handle missing data gracefully.

## Implementation Roadmap
1. **State Refactor**
   - Update `DockPanelContext` union and selection store shape (`dockView`, `payload`).
   - Add helper actions: `showMenu()`, `openContext(payload)`, `resetDock()`.
   - Audit existing components to ensure they call the new helpers instead of manually mutating dock state.
2. **RightDockPanel Cleanup**
   - Remove redundant `panelState.context` duplication; subscribe to the store using selectors.
   - Add Menu button in header; ensure header/pin/max controls still work.
   - Update Menu rendering to pull from store for pinned/recent items.
3. **Detail Components**
   - Refactor `JobDetailsView` and `VehicleDetailsView` to accept typed props (`job?: JobWithRelations`, etc.) and eliminate inline mock constants.
   - Implement lightweight skeletons/empty states while data loads.
   - Build `CustomerDetailsPanel`, `CallDetailsPanel`, `AppointmentDetailsPanel` components (or refactor existing inline sections) that consume hook data instead of static text.
4. **Data Wiring**
   - For each context, call the corresponding hook keyed by `payload.entityId` with proper `enabled` flags.
   - Prefetch related entities when hovering menu tiles or list rows using `usePrefetch*` helpers.
   - Ensure selections in calendar, kanban, search, etc. invoke `openContext` with real ids and optional cached data.
5. **QA & Follow-up**
   - Verify menu button returns to overview without collapsing the dock.
  - Confirm dock contents stay synced when navigating via history/pinned/recent lists.
  - Add unit/integration coverage for the selection store state transitions if feasible.

## Open Questions / Dependencies
- Confirm which API endpoints (REST vs InstantDB) are authoritative so the detail components know which hook to favor when both exist.
   WE WILL USE INSTANDdb
- Do we need optimistic updates in the dock (e.g., editing job notes from the panel) in this iteration or just read-only views?
  WE WILL WANT TO EDIT JOB NOTES IN THE PANEL
- Should pinned/recent items persist across sessions (current store partially persists history/pins)? Validate with product expectations before finalizing storage shape.
   NO PINNING IS NOT NEEDED
- Align with design on exact copy/icons for the Menu button and tile labels
   YES 

## Next Steps
- Stakeholder review of this plan.
- Once approved, implement Phase 1 (state refactor) behind a feature branch, then proceed sequentially.
