// UI State Management Store
// Manages global UI state like panels, selections, modals, etc.

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Job, Customer, Vehicle, Call } from '@/types/database';

// Types for UI state
export interface SelectedItem {
  type: 'job' | 'customer' | 'vehicle' | 'call';
  id: string;
  data: Job | Customer | Vehicle | Call;
}

export interface UIState {
  // Panel states
  isRightDockCollapsed: boolean;
  leftNavWidth: number;
  rightDockWidth: number;
  
  // Selection state for context panel
  selectedItem: SelectedItem | null;
  
  // Modal states
  isCommandPaletteOpen: boolean;
  activeModal: string | null;
  
  // Calendar view state
  calendarView: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'resourceTimeGridDay';
  selectedDate: Date;
  
  // Filter states
  activeFilters: {
    jobs: {
      status: string[];
      priority: string[];
      bay: string[];
      dateRange: { start: string; end: string } | null;
    };
    customers: {
      search: string;
      hasActiveJobs: boolean;
    };
    calls: {
      outcome: string[];
      dateRange: { start: string; end: string } | null;
    };
  };
  
  // Loading states
  isLoading: {
    jobs: boolean;
    customers: boolean;
    calls: boolean;
    vehicles: boolean;
  };
  
  // Toast notifications
  toasts: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
    duration?: number;
  }>;
}

export interface UIActions {
  // Panel actions
  toggleRightDock: () => void;
  setRightDockCollapsed: (collapsed: boolean) => void;
  setLeftNavWidth: (width: number) => void;
  setRightDockWidth: (width: number) => void;
  
  // Selection actions
  selectItem: (item: SelectedItem | null) => void;
  clearSelection: () => void;
  
  // Modal actions
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  
  // Calendar actions
  setCalendarView: (view: UIState['calendarView']) => void;
  setSelectedDate: (date: Date) => void;
  
  // Filter actions
  setJobFilters: (filters: Partial<UIState['activeFilters']['jobs']>) => void;
  setCustomerFilters: (filters: Partial<UIState['activeFilters']['customers']>) => void;
  setCallFilters: (filters: Partial<UIState['activeFilters']['calls']>) => void;
  clearAllFilters: () => void;
  
  // Loading actions
  setLoading: (key: keyof UIState['isLoading'], loading: boolean) => void;
  
  // Toast actions
  addToast: (toast: Omit<UIState['toasts'][0], 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export type UIStore = UIState & UIActions;

// Initial state
const initialState: UIState = {
  // Panel states
  isRightDockCollapsed: false,
  leftNavWidth: 16,
  rightDockWidth: 24,
  
  // Selection state
  selectedItem: null,
  
  // Modal states
  isCommandPaletteOpen: false,
  activeModal: null,
  
  // Calendar state
  calendarView: 'resourceTimeGridDay',
  selectedDate: new Date(),
  
  // Filter states
  activeFilters: {
    jobs: {
      status: [],
      priority: [],
      bay: [],
      dateRange: null,
    },
    customers: {
      search: '',
      hasActiveJobs: false,
    },
    calls: {
      outcome: [],
      dateRange: null,
    },
  },
  
  // Loading states
  isLoading: {
    jobs: false,
    customers: false,
    calls: false,
    vehicles: false,
  },
  
  // Toast notifications
  toasts: [],
};

// Create the store
export const useUIStore = create<UIStore>()(
  devtools(
    (set, get) => ({
      ...initialState,
      
      // Panel actions
      toggleRightDock: () => 
        set((state) => ({ 
          isRightDockCollapsed: !state.isRightDockCollapsed 
        }), false, 'toggleRightDock'),
        
      setRightDockCollapsed: (collapsed: boolean) => 
        set({ isRightDockCollapsed: collapsed }, false, 'setRightDockCollapsed'),
        
      setLeftNavWidth: (width: number) => 
        set({ leftNavWidth: width }, false, 'setLeftNavWidth'),
        
      setRightDockWidth: (width: number) => 
        set({ rightDockWidth: width }, false, 'setRightDockWidth'),
      
      // Selection actions
      selectItem: (item: SelectedItem | null) => 
        set({ selectedItem: item }, false, 'selectItem'),
        
      clearSelection: () => 
        set({ selectedItem: null }, false, 'clearSelection'),
      
      // Modal actions
      openCommandPalette: () => 
        set({ isCommandPaletteOpen: true }, false, 'openCommandPalette'),
        
      closeCommandPalette: () => 
        set({ isCommandPaletteOpen: false }, false, 'closeCommandPalette'),
        
      openModal: (modalId: string) => 
        set({ activeModal: modalId }, false, 'openModal'),
        
      closeModal: () => 
        set({ activeModal: null }, false, 'closeModal'),
      
      // Calendar actions
      setCalendarView: (view: UIState['calendarView']) => 
        set({ calendarView: view }, false, 'setCalendarView'),
        
      setSelectedDate: (date: Date) => 
        set({ selectedDate: date }, false, 'setSelectedDate'),
      
      // Filter actions
      setJobFilters: (filters: Partial<UIState['activeFilters']['jobs']>) => 
        set((state) => ({
          activeFilters: {
            ...state.activeFilters,
            jobs: { ...state.activeFilters.jobs, ...filters }
          }
        }), false, 'setJobFilters'),
        
      setCustomerFilters: (filters: Partial<UIState['activeFilters']['customers']>) => 
        set((state) => ({
          activeFilters: {
            ...state.activeFilters,
            customers: { ...state.activeFilters.customers, ...filters }
          }
        }), false, 'setCustomerFilters'),
        
      setCallFilters: (filters: Partial<UIState['activeFilters']['calls']>) => 
        set((state) => ({
          activeFilters: {
            ...state.activeFilters,
            calls: { ...state.activeFilters.calls, ...filters }
          }
        }), false, 'setCallFilters'),
        
      clearAllFilters: () => 
        set({ activeFilters: initialState.activeFilters }, false, 'clearAllFilters'),
      
      // Loading actions
      setLoading: (key: keyof UIState['isLoading'], loading: boolean) => 
        set((state) => ({
          isLoading: { ...state.isLoading, [key]: loading }
        }), false, 'setLoading'),
      
      // Toast actions
      addToast: (toast: Omit<UIState['toasts'][0], 'id'>) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newToast = { ...toast, id };
        
        set((state) => ({
          toasts: [...state.toasts, newToast]
        }), false, 'addToast');
        
        // Auto-remove toast after duration (default 5 seconds)
        const duration = toast.duration ?? 5000;
        if (duration > 0) {
          setTimeout(() => {
            get().removeToast(id);
          }, duration);
        }
      },
      
      removeToast: (id: string) => 
        set((state) => ({
          toasts: state.toasts.filter((toast) => toast.id !== id)
        }), false, 'removeToast'),
        
      clearToasts: () => 
        set({ toasts: [] }, false, 'clearToasts'),
    }),
    {
      name: 'ui-store',
      partialize: (state) => ({
        // Only persist certain UI preferences
        calendarView: state.calendarView,
        leftNavWidth: state.leftNavWidth,
        rightDockWidth: state.rightDockWidth,
        isRightDockCollapsed: state.isRightDockCollapsed,
      }),
    }
  )
);

// Selectors for common use cases
export const selectSelectedItem = (state: UIStore) => state.selectedItem;
export const selectIsRightDockCollapsed = (state: UIStore) => state.isRightDockCollapsed;
export const selectActiveFilters = (state: UIStore) => state.activeFilters;
export const selectIsLoading = (state: UIStore) => state.isLoading;
export const selectToasts = (state: UIStore) => state.toasts;
export const selectCalendarState = (state: UIStore) => ({
  view: state.calendarView,
  selectedDate: state.selectedDate,
});
