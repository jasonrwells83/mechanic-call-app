// TanStack Query Client Configuration
// Configures the global query client with proper defaults and error handling

import { QueryClient } from '@tanstack/react-query';
import { useUIStore } from '@/stores';

// Create a query client with optimized defaults
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes by default
      staleTime: 1000 * 60 * 5,
      
      // Keep data in cache for 10 minutes
      gcTime: 1000 * 60 * 10,
      
      // Retry failed requests up to 2 times
      retry: (failureCount, error: any) => {
        // Don't retry for 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
      
      // Retry with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Refetch on window focus for important data
      refetchOnWindowFocus: true,
      
      // Refetch on reconnect
      refetchOnReconnect: true,
      
      // Don't refetch on mount if data is fresh
      refetchOnMount: 'always',
    },
    mutations: {
      // Retry mutations once
      retry: 1,
      
      // Global error handler for mutations
      onError: (error: any) => {
        console.error('Mutation error:', error);
        
        // Add error toast notification
        const { addToast } = useUIStore.getState();
        addToast({
          type: 'error',
          title: 'Operation Failed',
          message: error?.message || 'An unexpected error occurred',
          duration: 5000,
        });
      },
    },
  },
});

// Query key factories for consistent cache management
export const queryKeys = {
  // Customers
  customers: {
    all: ['customers'] as const,
    lists: () => [...queryKeys.customers.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.customers.lists(), filters] as const,
    details: () => [...queryKeys.customers.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.customers.details(), id] as const,
    vehicles: (customerId: string) => [...queryKeys.customers.detail(customerId), 'vehicles'] as const,
  },
  
  // Vehicles
  vehicles: {
    all: ['vehicles'] as const,
    lists: () => [...queryKeys.vehicles.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.vehicles.lists(), filters] as const,
    filtered: (filters?: any) => [...queryKeys.vehicles.lists(), 'filtered', filters] as const,
    details: () => [...queryKeys.vehicles.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.vehicles.details(), id] as const,
    search: (query: string) => [...queryKeys.vehicles.all, 'search', query] as const,
    stats: (customerId?: string) => [...queryKeys.vehicles.all, 'stats', customerId] as const,
    serviceHistory: (vehicleId: string) => [...queryKeys.vehicles.detail(vehicleId), 'service-history'] as const,
    withAlerts: () => [...queryKeys.vehicles.all, 'with-alerts'] as const,
  },
  
  // Jobs
  jobs: {
    all: ['jobs'] as const,
    lists: () => [...queryKeys.jobs.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.jobs.lists(), filters] as const,
    details: () => [...queryKeys.jobs.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.jobs.details(), id] as const,
    byStatus: (status: string) => [...queryKeys.jobs.all, 'status', status] as const,
    byCustomer: (customerId: string) => [...queryKeys.jobs.all, 'customer', customerId] as const,
    byVehicle: (vehicleId: string) => [...queryKeys.jobs.all, 'vehicle', vehicleId] as const,
  },
  
  // Appointments
  appointments: {
    all: ['appointments'] as const,
    lists: () => [...queryKeys.appointments.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.appointments.lists(), filters] as const,
    filtered: (filters?: any) => [...queryKeys.appointments.lists(), 'filtered', filters] as const,
    details: () => [...queryKeys.appointments.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.appointments.details(), id] as const,
    byJob: (jobId: string) => [...queryKeys.appointments.all, 'job', jobId] as const,
    byCustomer: (customerId: string) => [...queryKeys.appointments.all, 'customer', customerId] as const,
    byDateRange: (start: string, end: string) => [...queryKeys.appointments.all, 'dateRange', start, end] as const,
    availability: (date: string, bay?: string) => [...queryKeys.appointments.all, 'availability', date, bay] as const,
    search: (query: string) => [...queryKeys.appointments.all, 'search', query] as const,
    stats: (filters?: any) => [...queryKeys.appointments.all, 'stats', filters] as const,
    withConflicts: () => [...queryKeys.appointments.all, 'conflicts'] as const,
  },

  // Calls
  calls: {
    all: ['calls'] as const,
    lists: () => [...queryKeys.calls.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.calls.lists(), filters] as const,
    details: () => [...queryKeys.calls.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.calls.details(), id] as const,
    byCustomer: (customerId: string) => [...queryKeys.calls.all, 'customer', customerId] as const,
    byOutcome: (outcome: string) => [...queryKeys.calls.all, 'outcome', outcome] as const,
  },
  
  // Settings
  settings: {
    all: ['settings'] as const,
    shop: () => [...queryKeys.settings.all, 'shop'] as const,
  },
  
  // Dashboard/Reports
  dashboard: {
    all: ['dashboard'] as const,
    stats: (dateRange?: { start: string; end: string }) =>
      [...queryKeys.dashboard.all, 'stats', dateRange ?? 'today'] as const,
    kpis: (dateRange?: { start: string; end: string }) =>
      [...queryKeys.dashboard.all, 'kpis', dateRange] as const,
  },
} as const;

// Cache invalidation helpers
export const invalidateQueries = {
  // Invalidate all customer-related queries
  customers: () => queryClient.invalidateQueries({ queryKey: queryKeys.customers.all }),
  
  // Invalidate specific customer
  customer: (id: string) => queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(id) }),
  
  // Invalidate all job-related queries
  jobs: () => queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all }),
  
  // Invalidate specific job
  job: (id: string) => queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(id) }),
  
  // Invalidate jobs by status
  jobsByStatus: (status: string) => queryClient.invalidateQueries({ queryKey: queryKeys.jobs.byStatus(status) }),
  
  // Invalidate all call-related queries
  calls: () => queryClient.invalidateQueries({ queryKey: queryKeys.calls.all }),
  
  // Invalidate specific call
  call: (id: string) => queryClient.invalidateQueries({ queryKey: queryKeys.calls.detail(id) }),
  
  // Invalidate all appointment-related queries
  appointments: () => queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all }),
  
  // Invalidate specific appointment
  appointment: (id: string) => queryClient.invalidateQueries({ queryKey: queryKeys.appointments.detail(id) }),
  
  // Invalidate appointments by date range
  appointmentsByDateRange: (start: string, end: string) => 
    queryClient.invalidateQueries({ queryKey: queryKeys.appointments.byDateRange(start, end) }),
  
  // Invalidate all vehicle-related queries
  vehicles: () => queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all }),
  
  // Invalidate specific vehicle
  vehicle: (id: string) => queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.detail(id) }),
  
  // Invalidate dashboard data
  dashboard: () => queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
  
  // Invalidate settings
  settings: () => queryClient.invalidateQueries({ queryKey: queryKeys.settings.all }),
};

// Prefetch helpers for better UX
export const prefetchQueries = {
  // Prefetch customer details when hovering over customer link
  customer: (id: string) => {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.customers.detail(id),
      queryFn: () => fetch(`/api/customers/${id}`).then(res => res.json()),
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
  },
  
  // Prefetch job details
  job: (id: string) => {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.jobs.detail(id),
      queryFn: () => fetch(`/api/jobs/${id}`).then(res => res.json()),
      staleTime: 1000 * 60 * 5,
    });
  },
  
  // Prefetch customer vehicles when viewing customer
  customerVehicles: (customerId: string) => {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.customers.vehicles(customerId),
      queryFn: () => fetch(`/api/customers/${customerId}/vehicles`).then(res => res.json()),
      staleTime: 1000 * 60 * 10, // 10 minutes (vehicles don't change often)
    });
  },
};

// Optimistic update helpers
export const optimisticUpdates = {
  // Optimistically update job status
  updateJobStatus: (jobId: string, newStatus: string) => {
    queryClient.setQueryData(queryKeys.jobs.detail(jobId), (old: any) => {
      if (!old) return old;
      return {
        ...old,
        data: {
          ...old.data,
          status: newStatus,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  },
  
  // Optimistically add new customer to list
  addCustomer: (newCustomer: any) => {
    queryClient.setQueryData(queryKeys.customers.lists(), (old: any) => {
      if (!old) return { success: true, data: [newCustomer], count: 1 };
      return {
        ...old,
        data: [newCustomer, ...old.data],
        count: old.count + 1,
      };
    });
  },
  
  // Optimistically update customer
  updateCustomer: (customerId: string, updates: any) => {
    queryClient.setQueryData(queryKeys.customers.detail(customerId), (old: any) => {
      if (!old) return old;
      return {
        ...old,
        data: {
          ...old.data,
          ...updates,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  },
};

// Background sync helpers for real-time updates
export const backgroundSync = {
  // Sync jobs data in background
  syncJobs: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
  },
  
  // Sync appointments data in background
  syncAppointments: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
  },
  
  // Sync dashboard stats
  syncDashboard: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  },
};


