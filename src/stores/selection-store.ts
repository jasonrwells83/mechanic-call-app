// Selection State Management Store
// Manages global selection state for context switching and dock panel integration

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DockPanelContext } from '@/components/layout/RightDockPanel';

export type SelectionType = 'job' | 'customer' | 'vehicle' | 'call' | 'appointment';
export type DockView = 'menu' | 'context';

export interface SelectionItem {
  id: string;
  type: SelectionType;
  title: string;
  subtitle?: string;
  data: any;
  timestamp: Date;
}

export interface DockPayload {
  entityType: SelectionType;
  entityId: string;
  initialData?: any;
  source?: string;
}

export interface SelectionHistory {
  items: SelectionItem[];
  maxItems: number;
}

export interface SelectionState {
  // Current Selection
  currentSelection: SelectionItem | null;

  // Selection History
  history: SelectionHistory;

  // Dock Panel State
  dockContext: DockPanelContext;
  dockData: any;
  isDockOpen: boolean;
  dockView: DockView;
  dockPayload: DockPayload | null;

  // Quick Access
  recentItems: SelectionItem[];

  // Actions
  selectItem: (item: Omit<SelectionItem, 'timestamp'>) => void;
  clearSelection: () => void;
  setDockContext: (context: DockPanelContext, data?: any) => void;
  toggleDock: () => void;
  openDock: () => void;
  closeDock: () => void;
  showMenu: () => void;
  openContext: (payload: DockPayload) => void;
  resetDock: () => void;

  // History Management
  addToHistory: (item: SelectionItem) => void;
  clearHistory: () => void;
  removeFromHistory: (id: string) => void;

  // Recent Items
  addToRecent: (item: SelectionItem) => void;
  clearRecent: () => void;

  // Utilities
  getContextFromType: (type: SelectionType) => DockPanelContext;
  canSelectType: (type: string) => boolean;
  getSelectionTitle: (item: SelectionItem) => string;
  getSelectionIcon: (type: SelectionType) => string;
}

const MAX_HISTORY_ITEMS = 50;
const MAX_RECENT_ITEMS = 10;

// Map selection types to dock contexts
const TYPE_TO_CONTEXT_MAP: Record<SelectionType, DockPanelContext> = {
  job: 'job-details',
  customer: 'customer-details',
  vehicle: 'vehicle-details',
  call: 'call-details',
  appointment: 'appointment-details',
};

// Supported selection types
const SUPPORTED_TYPES: SelectionType[] = ['job', 'customer', 'vehicle', 'call', 'appointment'];

const createInitialHistory = (): SelectionHistory => ({
  items: [],
  maxItems: MAX_HISTORY_ITEMS,
});

export const useSelectionStore = create<SelectionState>()(
  persist(
    (set, get) => ({
      // Initial State
      currentSelection: null,
      history: createInitialHistory(),
      dockContext: 'menu',
      dockData: null,
      isDockOpen: false,
      dockView: 'menu',
      dockPayload: null,
      recentItems: [],

      // Selection Actions
      selectItem: (item) => {
        if (!get().canSelectType(item.type)) {
          return;
        }

        const fullItem: SelectionItem = {
          ...item,
          timestamp: new Date(),
        };

        const context = get().getContextFromType(item.type);

        set((state) => {
          const isSameSelection =
            state.currentSelection?.id === item.id && state.currentSelection.type === item.type;

          const nextState = {
            ...state,
            currentSelection: fullItem,
            dockContext: context,
            dockData: item.data,
            dockView: 'context' as DockView,
            dockPayload: {
              entityType: item.type,
              entityId: item.id,
              initialData: item.data,
            },
            isDockOpen: true,
          };

          if (!isSameSelection) {
            get().addToHistory(fullItem);
            get().addToRecent(fullItem);
          }

          return nextState;
        });
      },

      clearSelection: () => {
        set((state) => ({
          ...state,
          currentSelection: null,
          dockContext: 'menu',
          dockData: null,
          dockView: 'menu',
          dockPayload: null,
        }));
      },

      setDockContext: (context, data) => {
        set((state) => {
          const isMenu = context === 'menu';
          const isEmpty = context === 'empty';
          const isContextView = !isMenu && !isEmpty;

          return {
            ...state,
            dockContext: context,
            dockData: data ?? (isMenu || isEmpty ? null : state.dockData),
            dockView: isMenu ? 'menu' : isContextView ? 'context' : state.dockView,
            dockPayload: isContextView ? state.dockPayload : null,
            isDockOpen: isEmpty ? false : true,
          };
        });
      },

      toggleDock: () => {
        set((state) => ({
          ...state,
          isDockOpen: !state.isDockOpen,
        }));
      },

      openDock: () => {
        set((state) => ({
          ...state,
          isDockOpen: true,
        }));
      },

      closeDock: () => {
        set((state) => ({
          ...state,
          isDockOpen: false,
        }));
      },

      showMenu: () => {
        set((state) => ({
          ...state,
          dockContext: 'menu',
          dockData: null,
          dockView: 'menu',
          dockPayload: null,
          isDockOpen: true,
        }));
      },

      openContext: (payload) => {
        if (!get().canSelectType(payload.entityType)) {
          return;
        }

        const context = get().getContextFromType(payload.entityType);

        set((state) => ({
          ...state,
          dockContext: context,
          dockData: payload.initialData ?? null,
          dockView: 'context',
          dockPayload: payload,
          isDockOpen: true,
        }));
      },

      resetDock: () => {
        set((state) => ({
          ...state,
          dockContext: 'menu',
          dockData: null,
          dockView: 'menu',
          dockPayload: null,
          isDockOpen: false,
        }));
      },

      // History Management
      addToHistory: (item) => {
        set((state) => {
          const existingIndex = state.history.items.findIndex(
            (h) => h.id === item.id && h.type === item.type,
          );
          let newItems = [...state.history.items];

          if (existingIndex >= 0) {
            newItems.splice(existingIndex, 1);
          }

          newItems.unshift(item);

          if (newItems.length > state.history.maxItems) {
            newItems = newItems.slice(0, state.history.maxItems);
          }

          return {
            ...state,
            history: {
              ...state.history,
              items: newItems,
            },
          };
        });
      },

      clearHistory: () => {
        set((state) => ({
          ...state,
          history: {
            ...state.history,
            items: [],
          },
        }));
      },

      removeFromHistory: (id) => {
        set((state) => ({
          ...state,
          history: {
            ...state.history,
            items: state.history.items.filter((item) => item.id !== id),
          },
        }));
      },

      // Recent Items
      addToRecent: (item) => {
        set((state) => {
          const existingIndex = state.recentItems.findIndex(
            (recent) => recent.id === item.id && recent.type === item.type,
          );
          let newRecent = [...state.recentItems];

          if (existingIndex >= 0) {
            newRecent.splice(existingIndex, 1);
          }

          newRecent.unshift(item);

          if (newRecent.length > MAX_RECENT_ITEMS) {
            newRecent = newRecent.slice(0, MAX_RECENT_ITEMS);
          }

          return {
            ...state,
            recentItems: newRecent,
          };
        });
      },

      clearRecent: () => {
        set((state) => ({
          ...state,
          recentItems: [],
        }));
      },

      // Utilities
      getContextFromType: (type) => {
        return TYPE_TO_CONTEXT_MAP[type] ?? 'empty';
      },

      canSelectType: (type) => {
        return SUPPORTED_TYPES.includes(type as SelectionType);
      },

      getSelectionTitle: (item) => {
        switch (item.type) {
          case 'job':
            return item.title || `Job ${item.id}`;
          case 'customer':
            return item.data?.name || item.title || `Customer ${item.id}`;
          case 'vehicle': {
            const base = `${item.data?.year || ''} ${item.data?.make || ''} ${item.data?.model || ''}`.trim();
            return base || item.title || `Vehicle ${item.id}`;
          }
          case 'call':
            return item.title || `Call ${item.id}`;
          case 'appointment':
            return item.title || `Appointment ${item.id}`;
          default:
            return item.id;
        }
      },

      getSelectionIcon: (type) => {
        switch (type) {
          case 'job':
            return 'Wrench';
          case 'customer':
            return 'User';
          case 'vehicle':
            return 'Car';
          case 'call':
            return 'Phone';
          case 'appointment':
            return 'Calendar';
          default:
            return 'FileText';
        }
      },
    }),
    {
      name: 'selection-store',
      partialize: (state) => ({
        history: state.history,
        recentItems: state.recentItems,
      }),
    }
  )
);

// Convenience hooks for specific selection types
export const useJobSelection = () => {
  const selectItem = useSelectionStore((state) => state.selectItem);

  return {
    selectJob: (jobId: string, jobData: any, title?: string) => {
      selectItem({
        id: jobId,
        type: 'job',
        title: title || `Job ${jobId}`,
        subtitle: jobData?.status || undefined,
        data: jobData,
      });
    },
  };
};

export const useCustomerSelection = () => {
  const selectItem = useSelectionStore((state) => state.selectItem);

  return {
    selectCustomer: (customerId: string, customerData: any, title?: string) => {
      selectItem({
        id: customerId,
        type: 'customer',
        title: title || customerData?.name || `Customer ${customerId}`,
        subtitle: customerData?.phone || undefined,
        data: customerData,
      });
    },
  };
};

export const useVehicleSelection = () => {
  const selectItem = useSelectionStore((state) => state.selectItem);

  return {
    selectVehicle: (vehicleId: string, vehicleData: any, title?: string) => {
      const vehicleTitle = title || 
        `${vehicleData?.year || ''} ${vehicleData?.make || ''} ${vehicleData?.model || ''}`.trim() ||
        `Vehicle ${vehicleId}`;

      selectItem({
        id: vehicleId,
        type: 'vehicle',
        title: vehicleTitle,
        subtitle: vehicleData?.license || undefined,
        data: vehicleData,
      });
    },
  };
};

export const useCallSelection = () => {
  const selectItem = useSelectionStore((state) => state.selectItem);

  return {
    selectCall: (callId: string, callData: any, title?: string) => {
      selectItem({
        id: callId,
        type: 'call',
        title: title || `Call ${callId}`,
        subtitle: callData?.customerName || undefined,
        data: callData,
      });
    },
  };
};

export const useAppointmentSelection = () => {
  const selectItem = useSelectionStore((state) => state.selectItem);

  return {
    selectAppointment: (appointmentId: string, appointmentData: any, title?: string) => {
      selectItem({
        id: appointmentId,
        type: 'appointment',
        title: title || `Appointment ${appointmentId}`,
        subtitle: appointmentData?.serviceType || undefined,
        data: appointmentData,
      });
    },
  };
};

export default useSelectionStore;
