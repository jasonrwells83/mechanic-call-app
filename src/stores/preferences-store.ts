// Preferences Store
// Manages user preferences, settings, and app configuration

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { ShopSettings, JobStatus } from '@/types/database';

export interface ThemeConfig {
  mode: 'light' | 'dark' | 'system';
  primaryColor: string;
  fontSize: 'small' | 'medium' | 'large';
  compactMode: boolean;
}

export interface CalendarPreferences {
  defaultView: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'resourceTimeGridDay';
  startOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 1 = Monday, etc.
  workingHours: {
    start: string; // HH:mm format
    end: string;
  };
  timeSlotDuration: 15 | 30 | 60; // minutes
  showWeekends: boolean;
  autoRefresh: boolean;
  refreshInterval: number; // seconds
}

export interface NotificationPreferences {
  enabled: boolean;
  jobReminders: boolean;
  statusChanges: boolean;
  newCalls: boolean;
  completedJobs: boolean;
  soundEnabled: boolean;
  desktopNotifications: boolean;
}

export interface DataPreferences {
  autoSave: boolean;
  autoSaveInterval: number; // seconds
  backupFrequency: 'daily' | 'weekly' | 'monthly' | 'never';
  exportFormat: 'csv' | 'json' | 'pdf';
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12h' | '24h';
  currency: string;
}

export interface UIPreferences {
  showTooltips: boolean;
  animationsEnabled: boolean;
  keyboardShortcutsEnabled: boolean;
  showBadges: boolean;
  compactTables: boolean;
  sidebarCollapsed: boolean;
  rightPanelWidth: number;
  leftPanelWidth: number;
}

export interface PreferencesState {
  // Theme and appearance
  theme: ThemeConfig;
  
  // Calendar preferences
  calendar: CalendarPreferences;
  
  // Notification preferences
  notifications: NotificationPreferences;
  
  // Data preferences
  data: DataPreferences;
  
  // UI preferences
  ui: UIPreferences;
  
  // Shop settings (from database)
  shopSettings: ShopSettings | null;
  
  // User preferences
  userPreferences: {
    name: string;
    email: string;
    role: 'admin' | 'mechanic' | 'receptionist';
    avatar?: string;
  } | null;
  
  // Feature flags
  featureFlags: {
    enableAdvancedReports: boolean;
    enableCustomFields: boolean;
    enableIntegrations: boolean;
    enableMobileApp: boolean;
  };
  
  // Recently used items
  recentItems: {
    customers: string[];
    vehicles: string[];
    jobs: string[];
  };
  
  // Quick actions
  quickActions: Array<{
    id: string;
    label: string;
    action: string;
    icon?: string;
    shortcut?: string;
  }>;
}

export interface PreferencesActions {
  // Theme actions
  setTheme: (theme: Partial<ThemeConfig>) => void;
  setThemeMode: (mode: ThemeConfig['mode']) => void;
  
  // Calendar actions
  setCalendarPreferences: (preferences: Partial<CalendarPreferences>) => void;
  
  // Notification actions
  setNotificationPreferences: (preferences: Partial<NotificationPreferences>) => void;
  
  // Data actions
  setDataPreferences: (preferences: Partial<DataPreferences>) => void;
  
  // UI actions
  setUIPreferences: (preferences: Partial<UIPreferences>) => void;
  
  // Shop settings
  setShopSettings: (settings: ShopSettings | null) => void;
  updateShopSettings: (updates: Partial<ShopSettings>) => void;
  
  // User preferences
  setUserPreferences: (user: PreferencesState['userPreferences']) => void;
  
  // Feature flags
  setFeatureFlag: (flag: keyof PreferencesState['featureFlags'], enabled: boolean) => void;
  
  // Recent items
  addRecentItem: (type: keyof PreferencesState['recentItems'], id: string) => void;
  clearRecentItems: (type?: keyof PreferencesState['recentItems']) => void;
  
  // Quick actions
  setQuickActions: (actions: PreferencesState['quickActions']) => void;
  addQuickAction: (action: PreferencesState['quickActions'][0]) => void;
  removeQuickAction: (id: string) => void;
  
  // Reset
  resetPreferences: () => void;
  resetSection: (section: keyof Omit<PreferencesState, 'shopSettings' | 'userPreferences'>) => void;
}

export type PreferencesStore = PreferencesState & PreferencesActions;

// Default preferences
const defaultPreferences: PreferencesState = {
  theme: {
    mode: 'system',
    primaryColor: '#3b82f6', // blue-500
    fontSize: 'medium',
    compactMode: false,
  },
  
  calendar: {
    defaultView: 'resourceTimeGridDay',
    startOfWeek: 1, // Monday
    workingHours: {
      start: '08:00',
      end: '17:00',
    },
    timeSlotDuration: 30,
    showWeekends: false,
    autoRefresh: true,
    refreshInterval: 30,
  },
  
  notifications: {
    enabled: true,
    jobReminders: true,
    statusChanges: true,
    newCalls: true,
    completedJobs: true,
    soundEnabled: true,
    desktopNotifications: true,
  },
  
  data: {
    autoSave: true,
    autoSaveInterval: 30,
    backupFrequency: 'daily',
    exportFormat: 'csv',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    currency: 'USD',
  },
  
  ui: {
    showTooltips: true,
    animationsEnabled: true,
    keyboardShortcutsEnabled: true,
    showBadges: true,
    compactTables: false,
    sidebarCollapsed: false,
    rightPanelWidth: 300,
    leftPanelWidth: 250,
  },
  
  shopSettings: null,
  userPreferences: null,
  
  featureFlags: {
    enableAdvancedReports: true,
    enableCustomFields: false,
    enableIntegrations: false,
    enableMobileApp: false,
  },
  
  recentItems: {
    customers: [],
    vehicles: [],
    jobs: [],
  },
  
  quickActions: [
    { id: 'new-job', label: 'New Job', action: 'create-job', icon: 'Plus', shortcut: 'N' },
    { id: 'schedule', label: 'Schedule', action: 'open-calendar', icon: 'Calendar', shortcut: 'S' },
    { id: 'search', label: 'Search', action: 'open-search', icon: 'Search', shortcut: '/' },
  ],
};

// Create the store with persistence
export const usePreferencesStore = create<PreferencesStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...defaultPreferences,
        
        // Theme actions
        setTheme: (theme: Partial<ThemeConfig>) =>
          set((state) => ({
            theme: { ...state.theme, ...theme }
          }), false, 'setTheme'),
          
        setThemeMode: (mode: ThemeConfig['mode']) =>
          set((state) => ({
            theme: { ...state.theme, mode }
          }), false, 'setThemeMode'),
        
        // Calendar actions
        setCalendarPreferences: (preferences: Partial<CalendarPreferences>) =>
          set((state) => ({
            calendar: { ...state.calendar, ...preferences }
          }), false, 'setCalendarPreferences'),
        
        // Notification actions
        setNotificationPreferences: (preferences: Partial<NotificationPreferences>) =>
          set((state) => ({
            notifications: { ...state.notifications, ...preferences }
          }), false, 'setNotificationPreferences'),
        
        // Data actions
        setDataPreferences: (preferences: Partial<DataPreferences>) =>
          set((state) => ({
            data: { ...state.data, ...preferences }
          }), false, 'setDataPreferences'),
        
        // UI actions
        setUIPreferences: (preferences: Partial<UIPreferences>) =>
          set((state) => ({
            ui: { ...state.ui, ...preferences }
          }), false, 'setUIPreferences'),
        
        // Shop settings
        setShopSettings: (settings: ShopSettings | null) =>
          set({ shopSettings: settings }, false, 'setShopSettings'),
          
        updateShopSettings: (updates: Partial<ShopSettings>) =>
          set((state) => ({
            shopSettings: state.shopSettings 
              ? { ...state.shopSettings, ...updates }
              : null
          }), false, 'updateShopSettings'),
        
        // User preferences
        setUserPreferences: (user: PreferencesState['userPreferences']) =>
          set({ userPreferences: user }, false, 'setUserPreferences'),
        
        // Feature flags
        setFeatureFlag: (flag: keyof PreferencesState['featureFlags'], enabled: boolean) =>
          set((state) => ({
            featureFlags: { ...state.featureFlags, [flag]: enabled }
          }), false, 'setFeatureFlag'),
        
        // Recent items
        addRecentItem: (type: keyof PreferencesState['recentItems'], id: string) =>
          set((state) => {
            const currentItems = state.recentItems[type];
            const filteredItems = currentItems.filter(item => item !== id);
            const newItems = [id, ...filteredItems].slice(0, 10); // Keep last 10
            
            return {
              recentItems: {
                ...state.recentItems,
                [type]: newItems,
              }
            };
          }, false, 'addRecentItem'),
          
        clearRecentItems: (type?: keyof PreferencesState['recentItems']) =>
          set((state) => {
            if (type) {
              return {
                recentItems: {
                  ...state.recentItems,
                  [type]: [],
                }
              };
            } else {
              return {
                recentItems: {
                  customers: [],
                  vehicles: [],
                  jobs: [],
                }
              };
            }
          }, false, 'clearRecentItems'),
        
        // Quick actions
        setQuickActions: (actions: PreferencesState['quickActions']) =>
          set({ quickActions: actions }, false, 'setQuickActions'),
          
        addQuickAction: (action: PreferencesState['quickActions'][0]) =>
          set((state) => ({
            quickActions: [...state.quickActions, action]
          }), false, 'addQuickAction'),
          
        removeQuickAction: (id: string) =>
          set((state) => ({
            quickActions: state.quickActions.filter(action => action.id !== id)
          }), false, 'removeQuickAction'),
        
        // Reset
        resetPreferences: () =>
          set(defaultPreferences, false, 'resetPreferences'),
          
        resetSection: (section: keyof Omit<PreferencesState, 'shopSettings' | 'userPreferences'>) =>
          set((state) => ({
            ...state,
            [section]: defaultPreferences[section],
          }), false, 'resetSection'),
      }),
      {
        name: 'preferences-store',
        version: 1,
        // Don't persist shop settings and user preferences as they come from the server
        partialize: (state) => ({
          theme: state.theme,
          calendar: state.calendar,
          notifications: state.notifications,
          data: state.data,
          ui: state.ui,
          featureFlags: state.featureFlags,
          recentItems: state.recentItems,
          quickActions: state.quickActions,
        }),
      }
    ),
    {
      name: 'preferences-store',
    }
  )
);

// Selectors
export const selectTheme = (state: PreferencesStore) => state.theme;
export const selectCalendarPreferences = (state: PreferencesStore) => state.calendar;
export const selectNotificationPreferences = (state: PreferencesStore) => state.notifications;
export const selectDataPreferences = (state: PreferencesStore) => state.data;
export const selectUIPreferences = (state: PreferencesStore) => state.ui;
export const selectShopSettings = (state: PreferencesStore) => state.shopSettings;
export const selectUserPreferences = (state: PreferencesStore) => state.userPreferences;
export const selectFeatureFlags = (state: PreferencesStore) => state.featureFlags;
export const selectRecentItems = (state: PreferencesStore) => state.recentItems;
export const selectQuickActions = (state: PreferencesStore) => state.quickActions;
