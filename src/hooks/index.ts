// Hooks Export
// Central export file for all custom hooks

// Customer hooks
export {
  useCustomers,
  useCustomer,
  useCustomerVehicles,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  useCustomerSearch,
  usePrefetchCustomer,
  useCustomerStats,
} from './use-customers';

// Job hooks
export {
  useJobs,
  useJob,
  useJobsByStatus,
  useJobsByCustomer,
  useJobsByVehicle,
  useCreateJob,
  useUpdateJob,
  useUpdateJobStatus,
  useDeleteJob,
  useJobStats,
  usePrefetchJob,
} from './use-jobs';

// Call hooks
export {
  useCalls,
  useCall,
  useCallsByCustomer,
  useCallsByOutcome,
  useCreateCall,
  useUpdateCall,
  useDeleteCall,
  useCallStats,
  useCallsNeedingFollowUp,
  useConvertCallToJob,
  usePrefetchCall,
} from './use-calls';

// Vehicle hooks
export {
  useVehicles,
  useVehicle,
  useVehiclesByCustomer,
  useCreateVehicle,
  useUpdateVehicle,
  useDeleteVehicle,
  useVehicleServiceHistory,
  useVehicleSearch,
  useVehicleStats,
  usePrefetchVehicle,
  useVehiclesWithAlerts,
} from './use-vehicles';

// Appointment hooks
export {
  useAppointments,
  useAppointment,
  useCreateAppointment,
  useUpdateAppointment,
  useDeleteAppointment,
  useAppointmentsByCustomer,
  useAppointmentsByDateRange,
  useAppointmentAvailability,
  useAppointmentSearch,
  useAppointmentStats,
  usePrefetchAppointment,
  useAppointmentsWithConflicts,
  useRescheduleAppointment,
  useCancelAppointment,
} from './use-appointments';

// Real-time hooks
export {
  // Customer real-time
  useRealtimeCustomers,
  useRealtimeCustomer,
  useRealtimeCustomerNotifications,
  useRealtimeCustomerVehicles,
  useRealtimeCustomerStats,
  useRealtimeCustomerManager,
  
  // Job real-time
  useRealtimeJobs,
  useRealtimeJob,
  useRealtimeJobsByStatus,
  useRealtimeJobNotifications,
  useRealtimeJobStats,
  useRealtimeJobsByCustomer,
  useRealtimeBayStatus,
  
  // Call real-time
  useRealtimeCalls,
  useRealtimeCall,
  useRealtimeCallNotifications,
  useRealtimeFollowUpCalls,
  useRealtimeCallStats,
  useRealtimeCallsByCustomer,
  useRealtimeCallsByOutcome,
  useRealtimeCallVolume,
  
  // Appointment real-time
  useRealtimeAppointments,
  useRealtimeAppointment,
  useRealtimeAppointmentNotifications,
  useRealtimeAppointmentsByDateRange,
  useRealtimeAppointmentConflicts,
  useRealtimeAppointmentsByJob,
  useRealtimeBayUtilization,
  
  // Dashboard real-time
  useRealtimeDashboard,
  useRealtimeAlerts,
  useRealtimePerformanceMetrics,
  
  // Real-time utilities
  useRealtimeProvider,
  useRealtimeSubscriptions,
  useRealtimeConnectionStatus,
  realtimeManager,
  realtimeSync,
  realtimeHandlers,
  realtimeUtils,
} from './use-realtime';

// Calendar hooks
export {
  useCalendarAppointments,
  useSchedulingSuggestions,
  useConflictDetection,
  useCalendarView,
  useBayUtilization,
} from './use-calendar';

// Re-export types for convenience
export type {
  Customer, CreateCustomerData, UpdateCustomerData, CustomerFilters,
  Job, CreateJobData, UpdateJobData, JobFilters, JobStatus,
  Call, CreateCallData, UpdateCallData, CallFilters, CallOutcome,
} from '@/types/database';
