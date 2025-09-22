// Navigation Store
// Manages navigation state, breadcrumbs, and route history

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface NavigationItem {
  path: string;
  label: string;
  icon?: string;
  badge?: number | string;
  isActive?: boolean;
  children?: NavigationItem[];
}

export interface Breadcrumb {
  label: string;
  path?: string;
  isActive?: boolean;
}

export interface NavigationState {
  // Current navigation state
  currentPath: string;
  previousPath: string | null;
  
  // Navigation items
  navigationItems: NavigationItem[];
  
  // Breadcrumbs
  breadcrumbs: Breadcrumb[];
  
  // Route history
  routeHistory: string[];
  maxHistoryLength: number;
  
  // Page titles
  pageTitle: string;
  documentTitle: string;
  
  // Navigation state
  isNavigating: boolean;
}

export interface NavigationActions {
  // Navigation
  setCurrentPath: (path: string) => void;
  navigateBack: () => void;
  
  // Navigation items
  setNavigationItems: (items: NavigationItem[]) => void;
  updateNavigationItem: (path: string, updates: Partial<NavigationItem>) => void;
  setBadge: (path: string, badge: number | string | undefined) => void;
  
  // Breadcrumbs
  setBreadcrumbs: (breadcrumbs: Breadcrumb[]) => void;
  addBreadcrumb: (breadcrumb: Breadcrumb) => void;
  
  // Page titles
  setPageTitle: (title: string) => void;
  setDocumentTitle: (title: string) => void;
  
  // History
  addToHistory: (path: string) => void;
  clearHistory: () => void;
  
  // Loading state
  setNavigating: (isNavigating: boolean) => void;
}

export type NavigationStore = NavigationState & NavigationActions;

// Default navigation items
const defaultNavigationItems: NavigationItem[] = [
  {
    path: '/',
    label: 'Home',
    icon: 'Home',
  },
  {
    path: '/calendar',
    label: 'Calendar',
    icon: 'Calendar',
  },
  {
    path: '/jobs',
    label: 'Jobs',
    icon: 'Wrench',
  },
  {
    path: '/calls',
    label: 'Calls',
    icon: 'Phone',
  },
  {
    path: '/customers',
    label: 'Customers',
    icon: 'Users',
  },
  {
    path: '/reports',
    label: 'Reports',
    icon: 'BarChart3',
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: 'Settings',
  },
];

// Initial state
const initialState: NavigationState = {
  currentPath: '/',
  previousPath: null,
  navigationItems: defaultNavigationItems,
  breadcrumbs: [],
  routeHistory: ['/'],
  maxHistoryLength: 50,
  pageTitle: 'Home',
  documentTitle: 'Mechanic Shop OS',
  isNavigating: false,
};

// Create the store
export const useNavigationStore = create<NavigationStore>()(
  devtools(
    (set, get) => ({
      ...initialState,
      
      // Navigation
      setCurrentPath: (path: string) => {
        const state = get();
        set({
          previousPath: state.currentPath,
          currentPath: path,
        }, false, 'setCurrentPath');
        
        // Add to history
        get().addToHistory(path);
        
        // Update navigation items active state
        const updatedItems = state.navigationItems.map(item => ({
          ...item,
          isActive: item.path === path,
        }));
        
        set({ navigationItems: updatedItems }, false, 'updateActiveNavigation');
      },
      
      navigateBack: () => {
        const { previousPath } = get();
        if (previousPath) {
          // This would typically integrate with React Router
          window.history.back();
        }
      },
      
      // Navigation items
      setNavigationItems: (items: NavigationItem[]) =>
        set({ navigationItems: items }, false, 'setNavigationItems'),
        
      updateNavigationItem: (path: string, updates: Partial<NavigationItem>) =>
        set((state) => ({
          navigationItems: state.navigationItems.map(item =>
            item.path === path ? { ...item, ...updates } : item
          )
        }), false, 'updateNavigationItem'),
        
      setBadge: (path: string, badge: number | string | undefined) =>
        get().updateNavigationItem(path, { badge }),
      
      // Breadcrumbs
      setBreadcrumbs: (breadcrumbs: Breadcrumb[]) =>
        set({ breadcrumbs }, false, 'setBreadcrumbs'),
        
      addBreadcrumb: (breadcrumb: Breadcrumb) =>
        set((state) => ({
          breadcrumbs: [...state.breadcrumbs, breadcrumb]
        }), false, 'addBreadcrumb'),
      
      // Page titles
      setPageTitle: (title: string) => {
        set({ pageTitle: title }, false, 'setPageTitle');
        
        // Update document title
        const { documentTitle } = get();
        document.title = `${title} - ${documentTitle}`;
      },
      
      setDocumentTitle: (title: string) => {
        set({ documentTitle: title }, false, 'setDocumentTitle');
        document.title = title;
      },
      
      // History
      addToHistory: (path: string) =>
        set((state) => {
          const newHistory = [path, ...state.routeHistory.filter(p => p !== path)]
            .slice(0, state.maxHistoryLength);
          return { routeHistory: newHistory };
        }, false, 'addToHistory'),
        
      clearHistory: () =>
        set({ routeHistory: [get().currentPath] }, false, 'clearHistory'),
      
      // Loading state
      setNavigating: (isNavigating: boolean) =>
        set({ isNavigating }, false, 'setNavigating'),
    }),
    {
      name: 'navigation-store',
      partialize: (state) => ({
        // Only persist certain navigation preferences
        routeHistory: state.routeHistory.slice(0, 10), // Keep last 10 routes
      }),
    }
  )
);

// Helper functions
export const createBreadcrumb = (label: string, path?: string, isActive?: boolean): Breadcrumb => ({
  label,
  path,
  isActive,
});

export const createNavigationItem = (
  path: string,
  label: string,
  icon?: string,
  badge?: number | string
): NavigationItem => ({
  path,
  label,
  icon,
  badge,
});

// Path helpers
export const getPathSegments = (path: string): string[] => {
  return path.split('/').filter(Boolean);
};

export const generateBreadcrumbsFromPath = (path: string, customLabels?: Record<string, string>): Breadcrumb[] => {
  const segments = getPathSegments(path);
  const breadcrumbs: Breadcrumb[] = [
    { label: 'Home', path: '/' },
  ];
  
  let currentPath = '';
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isActive = index === segments.length - 1;
    const label = customLabels?.[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    
    breadcrumbs.push({
      label,
      path: currentPath,
      isActive,
    });
  });
  
  return breadcrumbs;
};

// Selectors
export const selectCurrentPath = (state: NavigationStore) => state.currentPath;
export const selectNavigationItems = (state: NavigationStore) => state.navigationItems;
export const selectBreadcrumbs = (state: NavigationStore) => state.breadcrumbs;
export const selectPageTitle = (state: NavigationStore) => state.pageTitle;
export const selectIsNavigating = (state: NavigationStore) => state.isNavigating;
export const selectRouteHistory = (state: NavigationStore) => state.routeHistory;
