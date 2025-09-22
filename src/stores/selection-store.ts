// Selection State Management Store
// Manages global selection state for context switching and dock panel integration

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DockPanelContext } from '@/components/layout/RightDockPanel';

export interface SelectionItem {
  id: string;
  type: 'job' | 'customer' | 'vehicle' | 'call' | 'appointment';
  title: string;
  subtitle?: string;
  data: any;
  timestamp: Date;
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
  
  // Quick Access
  pinnedItems: SelectionItem[];
  recentItems: SelectionItem[];
  
  // Actions
  selectItem: (item: Omit<SelectionItem, 'timestamp'>) => void;
  clearSelection: () => void;
  setDockContext: (context: DockPanelContext, data?: any) => void;
  toggleDock: () => void;
  openDock: () => void;
  closeDock: () => void;
  
  // History Management
  addToHistory: (item: SelectionItem) => void;
  clearHistory: () => void;
  removeFromHistory: (id: string) => void;
  
  // Pinned Items
  pinItem: (item: SelectionItem) => void;
  unpinItem: (id: string) => void;
  isPinned: (id: string) => boolean;
  
  // Recent Items
  addToRecent: (item: SelectionItem) => void;
  clearRecent: () => void;
  
  // Utilities
  getContextFromType: (type: SelectionItem['type']) => DockPanelContext;
  canSelectType: (type: string) => boolean;
  getSelectionTitle: (item: SelectionItem) => string;
  getSelectionIcon: (type: SelectionItem['type']) => string;
}

const MAX_HISTORY_ITEMS = 50;
const MAX_RECENT_ITEMS = 10;
const MAX_PINNED_ITEMS = 5;

// Map selection types to dock contexts
const TYPE_TO_CONTEXT_MAP: Record<SelectionItem['type'], DockPanelContext> = {
  job: 'job-details',
  customer: 'customer-details',
  vehicle: 'vehicle-details',
  call: 'call-details',
  appointment: 'appointment-details',
};

// Supported selection types
const SUPPORTED_TYPES: SelectionItem['type'][] = ['job', 'customer', 'vehicle', 'call', 'appointment'];

export const useSelectionStore = create<SelectionState>()(
  persist(
    (set, get) => ({
      // Initial State
      currentSelection: null,
      history: {
        items: [],
        maxItems: MAX_HISTORY_ITEMS,
      },
      dockContext: 'empty',
      dockData: null,
      isDockOpen: false,
      pinnedItems: [],
      recentItems: [],

      // Selection Actions
      selectItem: (item) => {
        const fullItem: SelectionItem = {
          ...item,
          timestamp: new Date(),
        };

        set((state) => {
          // Update current selection
          const newState = {
            ...state,
            currentSelection: fullItem,
            dockContext: get().getContextFromType(item.type),
            dockData: item.data,
            isDockOpen: true,
          };

          // Add to history if it's a different item
          if (!state.currentSelection || state.currentSelection.id !== item.id) {
            get().addToHistory(fullItem);
            get().addToRecent(fullItem);
          }

          return newState;
        });
      },

      clearSelection: () => {
        set((state) => ({
          ...state,
          currentSelection: null,
          dockContext: 'empty',
          dockData: null,
        }));
      },

      setDockContext: (context, data) => {
        set((state) => ({
          ...state,
          dockContext: context,
          dockData: data,
          isDockOpen: context !== 'empty',
        }));
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

      // History Management
      addToHistory: (item) => {
        set((state) => {
          const existingIndex = state.history.items.findIndex(h => h.id === item.id && h.type === item.type);
          let newItems = [...state.history.items];

          if (existingIndex >= 0) {
            // Update existing item timestamp and move to front
            newItems.splice(existingIndex, 1);
          }

          // Add to front
          newItems.unshift(item);

          // Limit size
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
            items: state.history.items.filter(item => item.id !== id),
          },
        }));
      },

      // Pinned Items Management
      pinItem: (item) => {
        set((state) => {
          if (state.pinnedItems.length >= MAX_PINNED_ITEMS) {
            return state; // Don't add if at max capacity
          }

          const isAlreadyPinned = state.pinnedItems.some(p => p.id === item.id && p.type === item.type);
          if (isAlreadyPinned) {
            return state; // Don't add duplicates
          }

          return {
            ...state,
            pinnedItems: [...state.pinnedItems, item],
          };
        });
      },

      unpinItem: (id) => {
        set((state) => ({
          ...state,
          pinnedItems: state.pinnedItems.filter(item => item.id !== id),
        }));
      },

      isPinned: (id) => {
        const state = get();
        return state.pinnedItems.some(item => item.id === id);
      },

      // Recent Items Management
      addToRecent: (item) => {
        set((state) => {
          const existingIndex = state.recentItems.findIndex(r => r.id === item.id && r.type === item.type);
          let newItems = [...state.recentItems];

          if (existingIndex >= 0) {
            // Remove existing to avoid duplicates
            newItems.splice(existingIndex, 1);
          }

          // Add to front
          newItems.unshift(item);

          // Limit size
          if (newItems.length > MAX_RECENT_ITEMS) {
            newItems = newItems.slice(0, MAX_RECENT_ITEMS);
          }

          return {
            ...state,
            recentItems: newItems,
          };
        });
      },

      clearRecent: () => {
        set((state) => ({
          ...state,
          recentItems: [],
        }));
      },

      // Utility Functions
      getContextFromType: (type) => {
        return TYPE_TO_CONTEXT_MAP[type] || 'empty';
      },

      canSelectType: (type) => {
        return SUPPORTED_TYPES.includes(type as SelectionItem['type']);
      },

      getSelectionTitle: (item) => {
        if (item.title) return item.title;
        
        // Generate title based on type
        switch (item.type) {
          case 'job':
            return `Job ${item.id}`;
          case 'customer':
            return `Customer ${item.data?.name || item.id}`;
          case 'vehicle':
            return `${item.data?.year || ''} ${item.data?.make || ''} ${item.data?.model || ''}`.trim() || `Vehicle ${item.id}`;
          case 'call':
            return `Call ${item.id}`;
          case 'appointment':
            return `Appointment ${item.id}`;
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
        // Only persist certain parts of the state
        history: state.history,
        pinnedItems: state.pinnedItems,
        recentItems: state.recentItems,
        // Don't persist current selection or dock state
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
