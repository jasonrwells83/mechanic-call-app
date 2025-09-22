// Zustand Stores Export
// Central export file for all application stores

// UI Store - Global UI state management
export {
  useUIStore,
  selectSelectedItem,
  selectIsRightDockCollapsed,
  selectActiveFilters,
  selectIsLoading,
  selectToasts,
  selectCalendarState,
} from './ui-store';

export type {
  UIState,
  UIActions,
  UIStore,
  SelectedItem,
} from './ui-store';

// Keyboard Store - Global keyboard shortcuts
export {
  useKeyboardStore,
  createShortcutKey,
  defaultShortcuts,
  selectShortcuts,
  selectCurrentContext,
  selectIsEnabled,
} from './keyboard-store';

export type {
  KeyboardState,
  KeyboardActions,
  KeyboardStore,
  KeyboardShortcut,
} from './keyboard-store';

// Navigation Store - Navigation and routing state
export {
  useNavigationStore,
  createBreadcrumb,
  createNavigationItem,
  getPathSegments,
  generateBreadcrumbsFromPath,
  selectCurrentPath,
  selectNavigationItems,
  selectBreadcrumbs,
  selectPageTitle,
  selectIsNavigating,
  selectRouteHistory,
} from './navigation-store';

export type {
  NavigationState,
  NavigationActions,
  NavigationStore,
  NavigationItem,
  Breadcrumb,
} from './navigation-store';

// Preferences Store - User preferences and settings
export {
  usePreferencesStore,
  selectTheme,
  selectCalendarPreferences,
  selectNotificationPreferences,
  selectDataPreferences,
  selectUIPreferences,
  selectShopSettings,
  selectUserPreferences,
  selectFeatureFlags,
  selectRecentItems,
  selectQuickActions,
} from './preferences-store';

export type {
  PreferencesState,
  PreferencesActions,
  PreferencesStore,
  ThemeConfig,
  CalendarPreferences,
  NotificationPreferences,
  DataPreferences,
  UIPreferences,
} from './preferences-store';

// Selection Store - Global selection state management
export { 
  useSelectionStore,
  useJobSelection,
  useCustomerSelection,
  useVehicleSelection,
  useCallSelection,
  useAppointmentSelection,
} from './selection-store';

export type {
  SelectionState,
  SelectionItem,
  SelectionHistory,
} from './selection-store';

// Store initialization helper
export const initializeStores = () => {
  // For now, just log that initialization was called
  // The actual initialization will happen when stores are first used
  console.log('Store initialization called - stores will be initialized on first use');
};

// Store reset helper (useful for testing or logout)
export const resetAllStores = () => {
  useUIStore.getState().clearSelection();
  useUIStore.getState().clearToasts();
  useKeyboardStore.getState().clearPressedKeys();
  useNavigationStore.getState().clearHistory();
  // Note: Don't reset preferences store as it contains user settings
  
  console.log('Stores reset successfully');
};

// Store debugging helpers (development only)
export const getStoreStates = () => {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return {
    ui: useUIStore.getState(),
    keyboard: useKeyboardStore.getState(),
    navigation: useNavigationStore.getState(),
    preferences: usePreferencesStore.getState(),
  };
};

export const logStoreStates = () => {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }
  
  console.group('Store States');
  console.log('UI Store:', useUIStore.getState());
  console.log('Keyboard Store:', useKeyboardStore.getState());
  console.log('Navigation Store:', useNavigationStore.getState());
  console.log('Preferences Store:', usePreferencesStore.getState());
  console.groupEnd();
};
