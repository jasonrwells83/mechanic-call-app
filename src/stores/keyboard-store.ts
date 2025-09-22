// Keyboard Shortcuts Store
// Manages global keyboard shortcuts and their handlers

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface KeyboardShortcut {
  key: string;
  description: string;
  handler: () => void;
  modifiers?: {
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    meta?: boolean;
  };
  context?: string; // Optional context (e.g., 'jobs', 'calendar', 'global')
  disabled?: boolean;
}

export interface KeyboardState {
  shortcuts: Record<string, KeyboardShortcut>;
  isEnabled: boolean;
  currentContext: string;
  pressedKeys: Set<string>;
}

export interface KeyboardActions {
  // Shortcut management
  registerShortcut: (id: string, shortcut: KeyboardShortcut) => void;
  unregisterShortcut: (id: string) => void;
  updateShortcut: (id: string, updates: Partial<KeyboardShortcut>) => void;
  
  // Context management
  setContext: (context: string) => void;
  
  // Enable/disable
  enable: () => void;
  disable: () => void;
  
  // Key tracking
  addPressedKey: (key: string) => void;
  removePressedKey: (key: string) => void;
  clearPressedKeys: () => void;
  
  // Execution
  executeShortcut: (id: string) => void;
  handleKeyDown: (event: KeyboardEvent) => boolean; // Returns true if handled
}

export type KeyboardStore = KeyboardState & KeyboardActions;

// Initial state with default shortcuts
const initialState: KeyboardState = {
  shortcuts: {},
  isEnabled: true,
  currentContext: 'global',
  pressedKeys: new Set(),
};

// Create the store
export const useKeyboardStore = create<KeyboardStore>()(
  devtools(
    (set, get) => ({
      ...initialState,
      
      // Shortcut management
      registerShortcut: (id: string, shortcut: KeyboardShortcut) =>
        set((state) => ({
          shortcuts: {
            ...state.shortcuts,
            [id]: shortcut,
          }
        }), false, 'registerShortcut'),
        
      unregisterShortcut: (id: string) =>
        set((state) => {
          const { [id]: removed, ...rest } = state.shortcuts;
          return { shortcuts: rest };
        }, false, 'unregisterShortcut'),
        
      updateShortcut: (id: string, updates: Partial<KeyboardShortcut>) =>
        set((state) => ({
          shortcuts: {
            ...state.shortcuts,
            [id]: state.shortcuts[id] ? { ...state.shortcuts[id], ...updates } : state.shortcuts[id],
          }
        }), false, 'updateShortcut'),
      
      // Context management
      setContext: (context: string) =>
        set({ currentContext: context }, false, 'setContext'),
      
      // Enable/disable
      enable: () =>
        set({ isEnabled: true }, false, 'enable'),
        
      disable: () =>
        set({ isEnabled: false }, false, 'disable'),
      
      // Key tracking
      addPressedKey: (key: string) =>
        set((state) => ({
          pressedKeys: new Set([...state.pressedKeys, key.toLowerCase()])
        }), false, 'addPressedKey'),
        
      removePressedKey: (key: string) =>
        set((state) => {
          const newSet = new Set(state.pressedKeys);
          newSet.delete(key.toLowerCase());
          return { pressedKeys: newSet };
        }, false, 'removePressedKey'),
        
      clearPressedKeys: () =>
        set({ pressedKeys: new Set() }, false, 'clearPressedKeys'),
      
      // Execution
      executeShortcut: (id: string) => {
        const shortcut = get().shortcuts[id];
        if (shortcut && !shortcut.disabled) {
          shortcut.handler();
        }
      },
      
      handleKeyDown: (event: KeyboardEvent): boolean => {
        const state = get();
        
        if (!state.isEnabled) return false;
        
        // Don't handle shortcuts when typing in inputs
        if (event.target instanceof HTMLInputElement || 
            event.target instanceof HTMLTextAreaElement ||
            event.target instanceof HTMLSelectElement ||
            (event.target as HTMLElement)?.contentEditable === 'true') {
          return false;
        }
        
        const key = event.key.toLowerCase();
        const modifiers = {
          ctrl: event.ctrlKey,
          alt: event.altKey,
          shift: event.shiftKey,
          meta: event.metaKey,
        };
        
        // Find matching shortcuts
        for (const [id, shortcut] of Object.entries(state.shortcuts)) {
          if (shortcut.disabled) continue;
          
          // Check context
          if (shortcut.context && shortcut.context !== state.currentContext && shortcut.context !== 'global') {
            continue;
          }
          
          // Check key match
          if (shortcut.key.toLowerCase() !== key) continue;
          
          // Check modifiers
          const requiredModifiers = shortcut.modifiers || {};
          const modifierMatch = Object.entries(requiredModifiers).every(([mod, required]) => {
            return modifiers[mod as keyof typeof modifiers] === required;
          });
          
          // Check that no extra modifiers are pressed (unless explicitly allowed)
          const extraModifiers = Object.entries(modifiers).some(([mod, pressed]) => {
            return pressed && !requiredModifiers[mod as keyof typeof requiredModifiers];
          });
          
          if (modifierMatch && !extraModifiers) {
            event.preventDefault();
            event.stopPropagation();
            shortcut.handler();
            return true;
          }
        }
        
        return false;
      },
    }),
    {
      name: 'keyboard-store',
    }
  )
);

// Helper function to create shortcut key combinations
export const createShortcutKey = (
  key: string, 
  modifiers?: { ctrl?: boolean; alt?: boolean; shift?: boolean; meta?: boolean }
): string => {
  const parts: string[] = [];
  
  if (modifiers?.ctrl) parts.push('Ctrl');
  if (modifiers?.alt) parts.push('Alt');
  if (modifiers?.shift) parts.push('Shift');
  if (modifiers?.meta) parts.push('Cmd');
  
  parts.push(key.toUpperCase());
  
  return parts.join(' + ');
};

// Default shortcuts that should be registered on app startup
export const defaultShortcuts: Record<string, Omit<KeyboardShortcut, 'handler'>> = {
  'global-search': {
    key: '/',
    description: 'Open global search',
    context: 'global',
  },
  'command-palette': {
    key: 'k',
    description: 'Open command palette',
    modifiers: { ctrl: true },
    context: 'global',
  },
  'new-contextual': {
    key: 'n',
    description: 'Create new (contextual)',
    context: 'global',
  },
  'schedule': {
    key: 's',
    description: 'Schedule job',
    context: 'global',
  },
  'waiting-parts': {
    key: 'w',
    description: 'Mark as waiting for parts',
    context: 'global',
  },
  'complete': {
    key: 'c',
    description: 'Mark as complete',
    context: 'global',
  },
  'nav-home': {
    key: '1',
    description: 'Navigate to Home',
    modifiers: { alt: true },
    context: 'global',
  },
  'nav-calendar': {
    key: '2',
    description: 'Navigate to Calendar',
    modifiers: { alt: true },
    context: 'global',
  },
  'nav-jobs': {
    key: '3',
    description: 'Navigate to Jobs',
    modifiers: { alt: true },
    context: 'global',
  },
  'nav-calls': {
    key: '4',
    description: 'Navigate to Calls',
    modifiers: { alt: true },
    context: 'global',
  },
  'nav-customers': {
    key: '5',
    description: 'Navigate to Customers',
    modifiers: { alt: true },
    context: 'global',
  },
  'escape': {
    key: 'Escape',
    description: 'Close modal/panel',
    context: 'global',
  },
};

// Selectors
export const selectShortcuts = (state: KeyboardStore) => state.shortcuts;
export const selectCurrentContext = (state: KeyboardStore) => state.currentContext;
export const selectIsEnabled = (state: KeyboardStore) => state.isEnabled;
