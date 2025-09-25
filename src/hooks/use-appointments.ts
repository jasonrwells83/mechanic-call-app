// Appointments Hooks
// Custom hooks for managing appointment data with TanStack Query

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { appointmentApi } from '@/lib/api-client';
import { queryKeys, invalidateQueries } from '@/lib/query-client';
import { useUIStore } from '@/stores';
import type { Appointment } from '@/types/database';

// Fetch all appointments
export function useAppointments(filters?: {
  customerId?: string;
  vehicleId?: string;
  technicianId?: string;
  bay?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  return useQuery({
    queryKey: queryKeys.appointments.filtered(filters),
    queryFn: () => appointmentApi.getAll(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Fetch single appointment
export function useAppointment(appointmentId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.appointments.detail(appointmentId),
    queryFn: () => appointmentApi.getById(appointmentId),
    enabled: enabled && !!appointmentId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Create appointment mutation
export function useCreateAppointment() {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  return useMutation({
    mutationFn: appointmentApi.create,
    onSuccess: (appointment) => {
      // Invalidate and refetch appointment queries
      invalidateQueries.appointments();
      invalidateQueries.appointment(appointment.id);
      
      // Also invalidate related queries
      if (appointment.customerId) {
        invalidateQueries.customer(queryClient, appointment.customerId);
      }
      if (appointment.jobId) {
        invalidateQueries.job(queryClient, appointment.jobId);
      }

      addToast({
        type: 'success',
        title: 'Appointment Created',
        message: `Appointment scheduled for ${appointment.customerName || 'customer'}`,
        duration: 3000,
      });
    },
    onError: (error) => {
      console.error('Failed to create appointment:', error);
      addToast({
        type: 'error',
        title: 'Failed to Create Appointment',
        message: 'There was an error creating the appointment. Please try again.',
        duration: 5000,
      });
    },
  });
}

// Update appointment mutation
export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Appointment> }) =>
      appointmentApi.update(id, data),
    onSuccess: (appointment) => {
      // Invalidate and refetch appointment queries
      invalidateQueries.appointments();
      invalidateQueries.appointment(appointment.id);
      
      // Also invalidate related queries
      if (appointment.customerId) {
        invalidateQueries.customer(queryClient, appointment.customerId);
      }
      if (appointment.jobId) {
        invalidateQueries.job(queryClient, appointment.jobId);
      }

      addToast({
        type: 'success',
        title: 'Appointment Updated',
        message: 'Appointment has been updated successfully',
        duration: 3000,
      });
    },
    onError: (error) => {
      console.error('Failed to update appointment:', error);
      addToast({
        type: 'error',
        title: 'Failed to Update Appointment',
        message: 'There was an error updating the appointment. Please try again.',
        duration: 5000,
      });
    },
  });
}

// Delete appointment mutation
export function useDeleteAppointment() {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  return useMutation({
    mutationFn: appointmentApi.delete,
    onSuccess: (_, appointmentId) => {
      // Invalidate and refetch appointment queries
      invalidateQueries.appointments();
      
      // Remove the specific appointment from cache
      queryClient.removeQueries({
        queryKey: queryKeys.appointments.detail(appointmentId),
      });

      addToast({
        type: 'success',
        title: 'Appointment Deleted',
        message: 'Appointment has been deleted successfully',
        duration: 3000,
      });
    },
    onError: (error) => {
      console.error('Failed to delete appointment:', error);
      addToast({
        type: 'error',
        title: 'Failed to Delete Appointment',
        message: 'There was an error deleting the appointment. Please try again.',
        duration: 5000,
      });
    },
  });
}

// Get appointments by customer
export function useAppointmentsByCustomer(customerId: string) {
  return useQuery({
    queryKey: queryKeys.appointments.byCustomer(customerId),
    queryFn: () => appointmentApi.getByCustomer(customerId),
    enabled: !!customerId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Get appointments by date range
export function useAppointmentsByDateRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: queryKeys.appointments.byDateRange(startDate, endDate),
    queryFn: () => appointmentApi.getByDateRange(startDate, endDate),
    enabled: !!startDate && !!endDate,
    staleTime: 1000 * 60 * 2, // 2 minutes for calendar data
  });
}

// Get appointment availability
export function useAppointmentAvailability(date: string, bay?: string) {
  return useQuery({
    queryKey: queryKeys.appointments.availability(date, bay),
    queryFn: () => appointmentApi.getAvailability(date, bay),
    enabled: !!date,
    staleTime: 1000 * 60 * 1, // 1 minute for availability data
  });
}

// Search appointments
export function useAppointmentSearch(query: string) {
  return useQuery({
    queryKey: queryKeys.appointments.search(query),
    queryFn: () => appointmentApi.search(query),
    enabled: !!query && query.length >= 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Get appointment statistics
export function useAppointmentStats(filters?: {
  dateFrom?: string;
  dateTo?: string;
  technicianId?: string;
  bay?: string;
}) {
  return useQuery({
    queryKey: queryKeys.appointments.stats(filters),
    queryFn: () => appointmentApi.getStats(filters),
    staleTime: 1000 * 60 * 10, // 10 minutes for stats
  });
}

// Prefetch appointment data
export function usePrefetchAppointment() {
  const queryClient = useQueryClient();

  return (appointmentId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.appointments.detail(appointmentId),
      queryFn: () => appointmentApi.getById(appointmentId),
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
  };
}

// Get appointments with conflicts
export function useAppointmentsWithConflicts() {
  return useQuery({
    queryKey: queryKeys.appointments.withConflicts(),
    queryFn: () => appointmentApi.getWithConflicts(),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Reschedule appointment mutation
export function useRescheduleAppointment() {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  return useMutation({
    mutationFn: ({ id, newDate, newTime, bay }: { 
      id: string; 
      newDate: string; 
      newTime: string; 
      bay?: string;
    }) => appointmentApi.reschedule(id, { date: newDate, time: newTime, bay }),
    onSuccess: (appointment) => {
      // Invalidate and refetch appointment queries
      invalidateQueries.appointments();
      invalidateQueries.appointment(appointment.id);

      addToast({
        type: 'success',
        title: 'Appointment Rescheduled',
        message: 'Appointment has been rescheduled successfully',
        duration: 3000,
      });
    },
    onError: (error) => {
      console.error('Failed to reschedule appointment:', error);
      addToast({
        type: 'error',
        title: 'Failed to Reschedule',
        message: 'There was an error rescheduling the appointment. Please try again.',
        duration: 5000,
      });
    },
  });
}

// Cancel appointment mutation
export function useCancelAppointment() {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      appointmentApi.cancel(id, reason),
    onSuccess: (appointment) => {
      // Invalidate and refetch appointment queries
      invalidateQueries.appointments();
      invalidateQueries.appointment(appointment.id);

      addToast({
        type: 'success',
        title: 'Appointment Cancelled',
        message: 'Appointment has been cancelled successfully',
        duration: 3000,
      });
    },
    onError: (error) => {
      console.error('Failed to cancel appointment:', error);
      addToast({
        type: 'error',
        title: 'Failed to Cancel',
        message: 'There was an error cancelling the appointment. Please try again.',
        duration: 5000,
      });
    },
  });
}

