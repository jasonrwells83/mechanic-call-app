import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RightDockPanel from '@/components/layout/RightDockPanel';
import { useSelectionStore } from '@/stores/selection-store';

vi.mock('@/components/dock/JobDetailsView', () => ({
  JobDetailsView: () => <div data-testid="job-details-view" />,
}));

vi.mock('@/components/dock/VehicleDetailsView', () => ({
  VehicleDetailsView: () => <div data-testid="vehicle-details-view" />,
}));

vi.mock('@/components/dock/CustomerDetailsView', () => ({
  CustomerDetailsView: () => <div data-testid="customer-details-view" />,
}));

vi.mock('@/components/dock/CallDetailsView', () => ({
  CallDetailsView: () => <div data-testid="call-details-view" />,
}));

vi.mock('@/components/dock/AppointmentDetailsView', () => ({
  AppointmentDetailsView: () => <div data-testid="appointment-details-view" />,
}));

vi.mock('@/hooks', () => ({
  useJob: () => ({ data: { data: null }, isLoading: false, error: null, refetch: vi.fn() }),
  useVehicle: () => ({ data: { data: null }, isLoading: false, error: null, refetch: vi.fn() }),
  useCustomer: () => ({ data: { data: null }, isLoading: false, error: null, refetch: vi.fn() }),
  useCall: () => ({ data: { data: null }, isLoading: false, error: null, refetch: vi.fn() }),
  useAppointment: () => ({ data: { data: null }, isLoading: false, error: null, refetch: vi.fn() }),
  usePrefetchJob: () => vi.fn(),
  usePrefetchVehicle: () => vi.fn(),
  usePrefetchCustomer: () => vi.fn(),
  usePrefetchCall: () => vi.fn(),
  usePrefetchAppointment: () => vi.fn(),
  useUpdateJob: () => ({ mutateAsync: vi.fn(), mutate: vi.fn(), reset: vi.fn() }),
}));

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
    recentItems: [],
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  resetSelectionStore();
});

describe('RightDockPanel menu control', () => {
  it('keeps a persistent Menu button that returns to the overview', async () => {
    const user = userEvent.setup();

    act(() => {
      useSelectionStore.setState({
        currentSelection: {
          id: 'job-123',
          type: 'job',
          title: 'Brake Service',
          subtitle: 'In Progress',
          data: { title: 'Brake Service' },
          timestamp: new Date(),
        },
        dockContext: 'job-details',
        dockView: 'context',
        isDockOpen: true,
        dockPayload: {
          entityType: 'job',
          entityId: 'job-123',
          initialData: { title: 'Brake Service' },
        },
        dockData: { title: 'Brake Service' },
      });
    });

    render(<RightDockPanel />);

    const menuButton = screen.getByRole('button', { name: /^menu$/i });
    expect(menuButton).toBeInTheDocument();
    expect(menuButton).toHaveTextContent('Menu');

    await user.click(menuButton);

    const state = useSelectionStore.getState();
    expect(state.dockContext).toBe('menu');
    expect(state.dockView).toBe('menu');
    expect(state.isDockOpen).toBe(true);
  });
});
