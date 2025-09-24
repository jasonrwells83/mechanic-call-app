import { beforeEach, describe, expect, it } from 'vitest';
import { useSelectionStore } from '@/stores/selection-store';
import type { SelectionType } from '@/stores/selection-store';

interface MinimalItem {
  id: string;
  type: SelectionType;
  title: string;
  data: unknown;
  subtitle?: string;
}

const resetSelectionStore = () => {
  useSelectionStore.persist?.clearStorage?.();
  useSelectionStore.setState({
    currentSelection: null,
    history: { items: [], maxItems: 50 },
    dockContext: 'menu',
    dockData: null,
    dockView: 'menu',
    dockPayload: null,
    isDockOpen: false,
  });
};

const buildSelection = (overrides: Partial<MinimalItem>): MinimalItem => ({
  id: 'entity-1',
  type: 'job',
  title: 'Test Entity',
  data: { title: 'Test Entity' },
  ...overrides,
});

beforeEach(() => {
  resetSelectionStore();
});

describe('selection store dock transitions', () => {
  it('selectItem hydrates the dock context and history', () => {
    const { selectItem } = useSelectionStore.getState();

    selectItem(buildSelection({ id: 'job-123', type: 'job' }));

    const state = useSelectionStore.getState();

    expect(state.dockContext).toBe('job-details');
    expect(state.dockView).toBe('context');
    expect(state.isDockOpen).toBe(true);
    expect(state.dockPayload).toEqual({
      entityType: 'job',
      entityId: 'job-123',
      initialData: { title: 'Test Entity' },
    });
  });

  it('showMenu switches the dock back to menu view without closing it', () => {
    const { selectItem, showMenu } = useSelectionStore.getState();

    selectItem(buildSelection({ id: 'job-123', type: 'job' }));
    showMenu();

    const state = useSelectionStore.getState();

    expect(state.dockContext).toBe('menu');
    expect(state.dockView).toBe('menu');
    expect(state.isDockOpen).toBe(true);
    expect(state.dockPayload).toBeNull();
  });

  it('openContext rehydrates from payload data', () => {
    const { openContext } = useSelectionStore.getState();

    openContext({
      entityType: 'customer',
      entityId: 'cust-42',
      initialData: { name: 'Alice' },
    });

    const state = useSelectionStore.getState();

    expect(state.dockContext).toBe('customer-details');
    expect(state.dockView).toBe('context');
    expect(state.dockData).toEqual({ name: 'Alice' });
    expect(state.dockPayload).toEqual({
      entityType: 'customer',
      entityId: 'cust-42',
      initialData: { name: 'Alice' },
    });
    expect(state.isDockOpen).toBe(true);
  });

  it('resetDock collapses the dock and returns to menu', () => {
    const { selectItem, resetDock } = useSelectionStore.getState();

    selectItem(buildSelection({ id: 'job-123', type: 'job' }));
    resetDock();

    const state = useSelectionStore.getState();

    expect(state.dockContext).toBe('menu');
    expect(state.dockView).toBe('menu');
    expect(state.dockPayload).toBeNull();
    expect(state.isDockOpen).toBe(false);
  });
});

