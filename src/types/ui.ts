// UI-specific TypeScript types for components and interactions

import { JobStatus, JobPriority, Bay } from './database';

// Component prop types
export interface StatusBadgeProps {
  status: JobStatus;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'secondary';
}

export interface PriorityIndicatorProps {
  priority: JobPriority;
  showLabel?: boolean;
}

export interface BayIndicatorProps {
  bay: Bay;
  isOccupied?: boolean;
  occupiedBy?: string;
}

// Form types
export interface FormFieldError {
  field: string;
  message: string;
}

export interface FormState<T> {
  data: T;
  errors: FormFieldError[];
  isSubmitting: boolean;
  isDirty: boolean;
}

// Modal and dialog types
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface ConfirmDialogProps extends ModalProps {
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

// Table and list types
export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  width?: number | string;
  render?: (value: any, item: T) => React.ReactNode;
}

export interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  error?: string;
  onRowClick?: (item: T) => void;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
}

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

// Search and filter types
export interface SearchConfig {
  placeholder: string;
  fields: string[];
  debounceMs?: number;
}

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'multiselect' | 'date' | 'daterange' | 'boolean';
  options?: FilterOption[];
  placeholder?: string;
}

// Drag and drop types
export interface DragItem {
  id: string;
  type: string;
  data: any;
}

export interface DropResult {
  dragId: string;
  dropId: string;
  position?: 'before' | 'after' | 'inside';
}

// Kanban board types
export interface KanbanColumn {
  id: string;
  title: string;
  items: any[];
  maxItems?: number;
  color?: string;
}

export interface KanbanBoardProps {
  columns: KanbanColumn[];
  onItemMove: (itemId: string, fromColumn: string, toColumn: string, position: number) => void;
  onItemClick?: (item: any) => void;
  renderItem: (item: any) => React.ReactNode;
}

// Calendar types
export interface CalendarViewType {
  type: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'resourceTimeGridWeek';
  label: string;
}

export interface CalendarProps {
  events: any[];
  resources?: any[];
  viewType: CalendarViewType['type'];
  onEventClick?: (event: any) => void;
  onEventDrop?: (info: any) => void;
  onEventResize?: (info: any) => void;
  onDateSelect?: (selectInfo: any) => void;
  businessHours?: any;
}

// Navigation and routing types
export interface NavigationItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  badge?: string | number;
  children?: NavigationItem[];
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

// Notification and toast types
export interface NotificationConfig {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Context panel types
export interface ContextPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: React.ReactNode;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'destructive';
  }>;
}

// Command palette types
export interface Command {
  id: string;
  label: string;
  shortcut?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action: () => void;
  group?: string;
}

export interface CommandGroup {
  label: string;
  commands: Command[];
}

// Loading and error states
export interface LoadingState {
  isLoading: boolean;
  error?: string;
  retry?: () => void;
}

export interface AsyncState<T> extends LoadingState {
  data?: T;
}

// Theme and styling types
export interface ThemeConfig {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
    border: string;
  };
  fonts: {
    sans: string;
    mono: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

// Keyboard shortcut types
export interface KeyboardShortcut {
  key: string;
  modifiers?: ('ctrl' | 'meta' | 'shift' | 'alt')[];
  action: () => void;
  description: string;
  global?: boolean;
}

// Export types
export interface ExportConfig {
  filename: string;
  format: 'csv' | 'xlsx' | 'pdf';
  columns: string[];
  data: any[];
}

// Responsive breakpoint types
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface ResponsiveValue<T> {
  [K in Breakpoint]?: T;
}







