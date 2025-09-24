# Right Panel Refactor To-Do

## Phase 1 – Selection Store & State Model
- [ ] Extend `DockPanelContext` with a `'menu'` option and add a `dockView: 'menu' | 'context'` flag plus `dockPayload` in `src/stores/selection-store.ts`.
- [ ] Implement actions: `showMenu()`, `openContext(payload)`, `resetDock()`, and update `selectItem` to populate `dockPayload` with InstantDB entity ids and any initial data.
- [ ] Remove pinning-related state/actions (per updated requirements) and tidy persistence configuration accordingly.
- [ ] Update components that call the store so they use the new helpers instead of manually mutating dock context.

## Phase 2 – Right Dock Panel Structure
- [ ] Refactor `src/components/layout/RightDockPanel.tsx` to derive context from the selection store instead of maintaining duplicate `panelState.contextData`.
- [ ] Add a persistent Menu button in the header that triggers `showMenu()` without collapsing the dock.
- [ ] Rebuild the Menu view to show primary tiles and recent history (omit pinned section); ensure tiles call `openContext` with the correct payloads.
- [ ] Keep width/pin/max state local but guard pin logic behind the new requirement (pinning disabled/hidden).

## Phase 3 – Data Contracts & Detail Components
- [ ] Update `JobDetailsView` and `VehicleDetailsView` to accept typed props and drop static mock data; surface loading/empty/error states.
- [ ] Create/adjust dedicated components for Customer, Call, and Appointment contexts that consume props rather than hard-coded samples.
- [ ] Ensure detail views expose callback(s) for editing where needed (e.g., job notes editor UI) while still honoring the no-photos constraint.

## Phase 4 – Data Wiring (InstantDB Source)
- [ ] For each context, connect to the InstantDB-backed hooks (`useJob`, `useVehicle`, `useCustomer`, `useCall`, `useAppointment`, etc.), passing `dockPayload.entityId` and enabling based on `dockView === 'context'`.
- [ ] Prefetch relevant entities using the `usePrefetch*` helpers when hovering tiles or results to keep the dock responsive.
- [ ] Propagate fetched data into the detail components and support refreshing when edits (e.g., job notes) succeed.

## Phase 5 – Editing & QA
- [ ] Implement job notes editing within the dock (likely via `useUpdateJob`/InstantDB mutation) and ensure optimistic updates keep the panel in sync.
- [ ] Validate navigation flows: menu -> context, recent item re-entry, and the global Menu action.
- [ ] Add regression coverage or smoke tests for the selection store transitions and critical dock interactions.
- [ ] Review UI copy/icons with design to confirm the approved Menu button labeling.
