// Real-time Appointment Hooks
// Hooks for real-time appointment data subscriptions and calendar updates

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { realtimeManager, realtimeSync, realtimeHandlers } from '@/lib/realtime-client';
import { queryKeys } from '@/lib/query-client';
import { useUIStore } from '@/stores';
import type { Appointment } from '@/types/database';

// Hook for real-time appointment list updates
export function useRealtimeAppointments(filters: any = {}) {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<string | null>(null);

  useEffect(() => {
    const subscriptionId = realtimeManager.subscribeToEntity(
      'appointments',
      filters,
      (appointments: Appointment[]) => {
        // Update the query cache with fresh data
        queryClient.setQueryData(
          queryKeys.appointments.list(filters),
          {
            success: true,
            data: appointments,
            count: appointments.length,
          }
        );

        // Also update dashboard since appointments affect scheduling metrics
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      }
    );

    subscriptionRef.current = subscriptionId;

    return () => {
      if (subscriptionRef.current) {
        realtimeManager.unsubscribe(subscriptionRef.current);
      }
    };
  }, [queryClient, JSON.stringify(filters)]);

  return {
    isSubscribed: !!subscriptionRef.current,
  };
}

// Hook for real-time single appointment updates
export function useRealtimeAppointment(appointmentId: string, enabled: boolean = true) {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<string | null>(null);
  const { addToast } = useUIStore();

  useEffect(() => {
    if (!enabled || !appointmentId) return;

    const subscriptionId = realtimeManager.subscribeToEntity(
      'appointments',
      { id: appointmentId },
      (appointments: Appointment[]) => {
        const appointment = appointments[0];
        if (appointment) {
          // Update the specific appointment query
          queryClient.setQueryData(
            queryKeys.appointments.detail(appointmentId),
            {
              success: true,
              data: appointment,
            }
          );

          // Update lists that might contain this appointment
          queryClient.invalidateQueries({ queryKey: queryKeys.appointments.lists() });
          
          // Trigger appointment change handler
          realtimeHandlers.onAppointmentChange(appointmentId, 'update');
        }
      }
    );

    subscriptionRef.current = subscriptionId;

    return () => {
      if (subscriptionRef.current) {
        realtimeManager.unsubscribe(subscriptionRef.current);
      }
    };
  }, [appointmentId, enabled, queryClient, addToast]);

  return {
    isSubscribed: !!subscriptionRef.current,
  };
}

// Hook for real-time appointment notifications
export function useRealtimeAppointmentNotifications() {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();
  const subscriptionRef = useRef<string | null>(null);
  const previousAppointmentsRef = useRef<Appointment[]>([]);

  useEffect(() => {
    const subscriptionId = realtimeManager.subscribeToEntity(
      'appointments',
      {},
      (appointments: Appointment[]) => {
        const previousAppointments = previousAppointmentsRef.current;
        
        if (previousAppointments.length > 0) {
          // Check for new appointments
          const newAppointments = appointments.filter(apt => 
            !previousAppointments.find(prev => prev.id === apt.id)
          );

          newAppointments.forEach(appointment => {
            realtimeHandlers.onAppointmentChange(appointment.id, 'create');
            
            const startTime = new Date(appointment.startAt).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            });
            
            addToast({
              type: 'info',
              title: 'New Appointment Scheduled',
              message: `${appointment.bay} at ${startTime}`,
              duration: 5000,
            });
          });

          // Check for updated appointments (time changes)
          const updatedAppointments = appointments.filter(apt => {
            const previous = previousAppointments.find(prev => prev.id === apt.id);
            return previous && (
              previous.startAt !== apt.startAt || 
              previous.endAt !== apt.endAt || 
              previous.bay !== apt.bay
            );
          });

          updatedAppointments.forEach(appointment => {
            const startTime = new Date(appointment.startAt).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            });
            
            addToast({
              type: 'warning',
              title: 'Appointment Rescheduled',
              message: `Moved to ${appointment.bay} at ${startTime}`,
              duration: 5000,
            });
          });

          // Check for deleted appointments
          const deletedAppointments = previousAppointments.filter(prev => 
            !appointments.find(apt => apt.id === prev.id)
          );

          deletedAppointments.forEach(appointment => {
            realtimeHandlers.onAppointmentChange(appointment.id, 'delete');
            
            addToast({
              type: 'error',
              title: 'Appointment Cancelled',
              message: `${appointment.bay} appointment cancelled`,
              duration: 4000,
            });
          });
        }

        previousAppointmentsRef.current = appointments;

        // Update the cache
        queryClient.setQueryData(
          queryKeys.appointments.lists(),
          {
            success: true,
            data: appointments,
            count: appointments.length,
          }
        );
      }
    );

    subscriptionRef.current = subscriptionId;

    return () => {
      if (subscriptionRef.current) {
        realtimeManager.unsubscribe(subscriptionRef.current);
      }
    };
  }, [queryClient, addToast]);

  return {
    isSubscribed: !!subscriptionRef.current,
  };
}

// Hook for real-time appointments by date range (for calendar views)
export function useRealtimeAppointmentsByDateRange(startDate: string, endDate: string) {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<string | null>(null);

  useEffect(() => {
    const subscriptionId = realtimeManager.subscribeToEntity(
      'appointments',
      {
        startAt: { $gte: startDate },
        endAt: { $lte: endDate },
      },
      (appointments: Appointment[]) => {
        // Update date range specific query
        queryClient.setQueryData(
          queryKeys.appointments.byDateRange(startDate, endDate),
          {
            success: true,
            data: appointments,
            count: appointments.length,
          }
        );

        // Also update calendar-specific cache
        queryClient.setQueryData(
          [...queryKeys.appointments.all, 'calendar', startDate, endDate],
          appointments.map(apt => ({
            id: apt.id,
            title: `Job: ${apt.jobId}`,
            start: new Date(apt.startAt),
            end: new Date(apt.endAt),
            resourceId: apt.bay,
            backgroundColor: getBayColor(apt.bay),
            borderColor: getBayColor(apt.bay, true),
            extendedProps: {
              jobId: apt.jobId,
              bay: apt.bay,
              appointmentId: apt.id,
            },
          }))
        );
      }
    );

    subscriptionRef.current = subscriptionId;

    return () => {
      if (subscriptionRef.current) {
        realtimeManager.unsubscribe(subscriptionRef.current);
      }
    };
  }, [startDate, endDate, queryClient]);

  return {
    isSubscribed: !!subscriptionRef.current,
  };
}

// Hook for real-time appointment conflicts detection
export function useRealtimeAppointmentConflicts() {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<string | null>(null);
  const { addToast } = useUIStore();

  useEffect(() => {
    const subscriptionId = realtimeManager.subscribeToEntity(
      'appointments',
      {},
      (appointments: Appointment[]) => {
        // Check for scheduling conflicts
        const conflicts: Array<{
          appointments: Appointment[];
          bay: string;
          timeRange: string;
        }> = [];

        const appointmentsByBay = appointments.reduce((acc, apt) => {
          if (!acc[apt.bay]) acc[apt.bay] = [];
          acc[apt.bay].push(apt);
          return acc;
        }, {} as Record<string, Appointment[]>);

        Object.entries(appointmentsByBay).forEach(([bay, bayAppointments]) => {
          // Sort by start time
          const sorted = bayAppointments.sort((a, b) => 
            new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
          );

          // Check for overlaps
          for (let i = 0; i < sorted.length - 1; i++) {
            const current = sorted[i];
            const next = sorted[i + 1];
            
            if (new Date(current.endAt) > new Date(next.startAt)) {
              conflicts.push({
                appointments: [current, next],
                bay,
                timeRange: `${new Date(current.startAt).toLocaleTimeString()} - ${new Date(next.endAt).toLocaleTimeString()}`,
              });

              // Notify about conflict
              addToast({
                type: 'error',
                title: 'Scheduling Conflict Detected',
                message: `${bay} has overlapping appointments`,
                duration: 8000,
              });
            }
          }
        });

        // Update conflicts cache
        queryClient.setQueryData(
          [...queryKeys.appointments.all, 'conflicts'],
          conflicts
        );
      }
    );

    subscriptionRef.current = subscriptionId;

    return () => {
      if (subscriptionRef.current) {
        realtimeManager.unsubscribe(subscriptionRef.current);
      }
    };
  }, [queryClient, addToast]);

  return {
    isSubscribed: !!subscriptionRef.current,
  };
}

// Hook for real-time appointments by job
export function useRealtimeAppointmentsByJob(jobId: string, enabled: boolean = true) {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !jobId) return;

    const subscriptionId = realtimeManager.subscribeToEntity(
      'appointments',
      { jobId },
      (appointments: Appointment[]) => {
        // Update job-specific appointments query
        queryClient.setQueryData(
          queryKeys.appointments.byJob(jobId),
          {
            success: true,
            data: appointments,
            count: appointments.length,
          }
        );

        // Also invalidate job details to update appointment info
        queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(jobId) });
      }
    );

    subscriptionRef.current = subscriptionId;

    return () => {
      if (subscriptionRef.current) {
        realtimeManager.unsubscribe(subscriptionRef.current);
      }
    };
  }, [jobId, enabled, queryClient]);

  return {
    isSubscribed: !!subscriptionRef.current,
  };
}

// Utility function to get bay colors
function getBayColor(bay: string, border: boolean = false): string {
  const colors = {
    'bay-1': border ? '#1976d2' : '#e3f2fd',
    'bay-2': border ? '#388e3c' : '#e8f5e8',
  };
  
  return colors[bay as keyof typeof colors] || (border ? '#757575' : '#f5f5f5');
}

// Hook for real-time bay utilization tracking
export function useRealtimeBayUtilization() {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<string | null>(null);

  useEffect(() => {
    const subscriptionId = realtimeManager.subscribeToEntity(
      'appointments',
      {},
      (appointments: Appointment[]) => {
        const today = new Date().toDateString();
        const todaysAppointments = appointments.filter(apt => 
          new Date(apt.startAt).toDateString() === today
        );

        // Calculate utilization by bay
        const utilization = {
          'bay-1': {
            appointments: todaysAppointments.filter(apt => apt.bay === 'bay-1').length,
            totalHours: todaysAppointments
              .filter(apt => apt.bay === 'bay-1')
              .reduce((sum, apt) => {
                const start = new Date(apt.startAt);
                const end = new Date(apt.endAt);
                return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
              }, 0),
          },
          'bay-2': {
            appointments: todaysAppointments.filter(apt => apt.bay === 'bay-2').length,
            totalHours: todaysAppointments
              .filter(apt => apt.bay === 'bay-2')
              .reduce((sum, apt) => {
                const start = new Date(apt.startAt);
                const end = new Date(apt.endAt);
                return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
              }, 0),
          },
        };

        // Assuming 8-hour work day
        const workingHours = 8;
        utilization['bay-1'].utilizationRate = (utilization['bay-1'].totalHours / workingHours) * 100;
        utilization['bay-2'].utilizationRate = (utilization['bay-2'].totalHours / workingHours) * 100;

        // Update utilization cache
        queryClient.setQueryData(
          [...queryKeys.appointments.all, 'utilization'],
          utilization
        );
      }
    );

    subscriptionRef.current = subscriptionId;

    return () => {
      if (subscriptionRef.current) {
        realtimeManager.unsubscribe(subscriptionRef.current);
      }
    };
  }, [queryClient]);

  return {
    isSubscribed: !!subscriptionRef.current,
  };
}
