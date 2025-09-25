// Calendar Hooks
// Custom hooks for calendar scheduling functionality

import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { EventDropArg, EventResizeArg, DateSelectArg, EventReceiveArg } from '@fullcalendar/core';
import { appointmentApi, jobApi } from '@/lib/api-client';
import { queryKeys, invalidateQueries } from '@/lib/query-client';
import { generateTimeSlots, checkBayAvailability, createCalendarEvent } from '@/lib/calendar-config';
import { useUIStore } from '@/stores';
import type { 
  CalendarEvent, 
  Appointment, 
  CreateAppointmentData, 
  UpdateAppointmentData,
  Bay 
} from '@/types/database';

// Hook for managing calendar appointments
export function useCalendarAppointments(dateRange?: { start: string; end: string }) {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: (data: CreateAppointmentData) => appointmentApi.create(data),
    onSuccess: (response) => {
      invalidateQueries.appointments();
      addToast({
        type: 'success',
        title: 'Appointment Scheduled',
        message: 'New appointment has been created',
        duration: 4000,
      });
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Failed to Create Appointment',
        message: error instanceof Error ? error.message : 'An error occurred',
        duration: 5000,
      });
    },
  });

  // Update appointment mutation
  const updateAppointmentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAppointmentData }) => 
      appointmentApi.update(id, data),
    onSuccess: () => {
      invalidateQueries.appointments();
      addToast({
        type: 'success',
        title: 'Appointment Updated',
        message: 'Appointment has been updated successfully',
        duration: 4000,
      });
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Failed to Update Appointment',
        message: error instanceof Error ? error.message : 'An error occurred',
        duration: 5000,
      });
    },
  });

  // Delete appointment mutation
  const deleteAppointmentMutation = useMutation({
    mutationFn: (id: string) => appointmentApi.delete(id),
    onSuccess: () => {
      invalidateQueries.appointments();
      addToast({
        type: 'success',
        title: 'Appointment Cancelled',
        message: 'Appointment has been cancelled',
        duration: 4000,
      });
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Failed to Cancel Appointment',
        message: error instanceof Error ? error.message : 'An error occurred',
        duration: 5000,
      });
    },
  });

  // Handle event drop (drag and drop)
  const handleEventDrop = useCallback(async (dropInfo: EventDropArg) => {
    const { event, oldResource, newResource } = dropInfo;
    // Try multiple ways to get the appointment ID
    const appointmentId = event.extendedProps.appointmentId || event.id;
    
    if (!appointmentId) {
      console.error('Event drop failed - no appointment ID found. Event details:', {
        eventId: event.id,
        extendedProps: event.extendedProps,
        title: event.title
      });
      throw new Error('No appointment ID found');
    }

    const updateData: UpdateAppointmentData = {
      startAt: event.start!.toISOString(),
      endAt: event.end!.toISOString(),
      bay: (newResource?.id || oldResource?.id || 'bay-1') as Bay,
    };

    await updateAppointmentMutation.mutateAsync({
      id: appointmentId,
      data: updateData,
    });
  }, [updateAppointmentMutation]);

  // Handle event resize
  const handleEventResize = useCallback(async (resizeInfo: EventResizeArg) => {
    const { event } = resizeInfo;
    // Try multiple ways to get the appointment ID
    const appointmentId = event.extendedProps.appointmentId || event.id;
    
    if (!appointmentId) {
      console.error('Event resize failed - no appointment ID found. Event details:', {
        eventId: event.id,
        extendedProps: event.extendedProps,
        title: event.title
      });
      throw new Error('No appointment ID found');
    }

    const updateData: UpdateAppointmentData = {
      startAt: event.start!.toISOString(),
      endAt: event.end!.toISOString(),
    };

    await updateAppointmentMutation.mutateAsync({
      id: appointmentId,
      data: updateData,
    });
  }, [updateAppointmentMutation]);

  // Handle date selection for new appointments
  const handleDateSelect = useCallback((selectInfo: DateSelectArg) => {
    // This would typically open a modal or form to create a new appointment
    const appointmentData = {
      bay: (selectInfo.resource?.id || 'bay-1') as Bay,
      startAt: selectInfo.start.toISOString(),
      endAt: selectInfo.end.toISOString(),
      selectedDate: selectInfo.start,
      selectedBay: selectInfo.resource?.id || 'bay-1',
    };

    // Trigger UI to show appointment creation form
    useUIStore.getState().openModal('create-appointment');
    
    // Store the selection data for the form
    queryClient.setQueryData(['temp-appointment-data'], appointmentData);
  }, [queryClient]);

  // Job status update mutation
  const updateJobStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      jobApi.updateStatus(id, status as any),
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Failed to Update Job Status',
        message: error instanceof Error ? error.message : 'An error occurred',
        duration: 5000,
      });
    },
  });

  // Handle external job drops (from draggable job list)
  const handleJobDrop = useCallback(async (receiveInfo: EventReceiveArg) => {
    const { event } = receiveInfo;
    const jobId = event.extendedProps.jobId;
    const currentStatus = event.extendedProps.status;
    
    if (!jobId) {
      throw new Error('No job ID found in dropped event');
    }

    try {
      // Create appointment data from the dropped event
      const appointmentData: CreateAppointmentData = {
        jobId,
        bay: (event.getResources()[0]?.id || 'bay-1') as Bay,
        startAt: event.start!.toISOString(),
        endAt: event.end!.toISOString(),
      };

      // Create the appointment first
      await createAppointmentMutation.mutateAsync(appointmentData);
      
      // Update job status to 'scheduled' if it was 'incoming-call'
      if (currentStatus === 'incoming-call') {
        await updateJobStatusMutation.mutateAsync({
          id: jobId,
          status: 'scheduled',
        });

        addToast({
          type: 'success',
          title: 'Job Status Updated',
          message: 'Job moved from incoming call to scheduled',
          duration: 3000,
        });
      }

      // Invalidate job queries to refresh the draggable list
      invalidateQueries.jobs();
    } catch (error) {
      // If anything fails, remove the event from calendar
      event.remove();
      throw error;
    }
  }, [createAppointmentMutation, updateJobStatusMutation, addToast]);

  return {
    calendarEvents,
    setCalendarEvents,
    handleEventDrop,
    handleEventResize,
    handleDateSelect,
    handleJobDrop,
    createAppointment: createAppointmentMutation.mutateAsync,
    updateAppointment: updateAppointmentMutation.mutateAsync,
    deleteAppointment: deleteAppointmentMutation.mutateAsync,
    isCreating: createAppointmentMutation.isPending,
    isUpdating: updateAppointmentMutation.isPending,
    isDeleting: deleteAppointmentMutation.isPending,
  };
}

// Hook for scheduling suggestions and availability
export function useSchedulingSuggestions() {
  const [suggestions, setSuggestions] = useState<Array<{
    bay: Bay;
    startTime: Date;
    endTime: Date;
    available: boolean;
  }>>([]);

  // Find available time slots for a job
  const findAvailableSlots = useCallback((
    date: Date,
    duration: number, // in hours
    existingEvents: CalendarEvent[],
    preferredBay?: Bay
  ) => {
    const timeSlots = generateTimeSlots(date, duration);
    const bays: Bay[] = preferredBay ? [preferredBay] : ['bay-1', 'bay-2'];
    const availableSlots: Array<{
      bay: Bay;
      startTime: Date;
      endTime: Date;
      available: boolean;
    }> = [];

    bays.forEach(bay => {
      timeSlots.forEach(slot => {
        const isAvailable = checkBayAvailability(
          bay,
          slot.start,
          slot.end,
          existingEvents
        );

        availableSlots.push({
          bay,
          startTime: slot.start,
          endTime: slot.end,
          available: isAvailable,
        });
      });
    });

    // Sort by availability and time
    availableSlots.sort((a, b) => {
      if (a.available && !b.available) return -1;
      if (!a.available && b.available) return 1;
      return a.startTime.getTime() - b.startTime.getTime();
    });

    setSuggestions(availableSlots);
    return availableSlots;
  }, []);

  // Get next available slot
  const getNextAvailableSlot = useCallback((
    startDate: Date,
    duration: number,
    existingEvents: CalendarEvent[],
    preferredBay?: Bay
  ) => {
    const slots = findAvailableSlots(startDate, duration, existingEvents, preferredBay);
    return slots.find(slot => slot.available) || null;
  }, [findAvailableSlots]);

  return {
    suggestions,
    findAvailableSlots,
    getNextAvailableSlot,
  };
}

// Hook for calendar conflict detection
export function useConflictDetection() {
  const [conflicts, setConflicts] = useState<Array<{
    bay: Bay;
    conflictingEvents: CalendarEvent[];
    timeRange: string;
  }>>([]);

  const detectConflicts = useCallback((events: CalendarEvent[]) => {
    const detectedConflicts: Array<{
      bay: Bay;
      conflictingEvents: CalendarEvent[];
      timeRange: string;
    }> = [];

    const eventsByBay = events.reduce((acc, event) => {
      const bay = event.resourceId as Bay;
      if (!acc[bay]) acc[bay] = [];
      acc[bay].push(event);
      return acc;
    }, {} as Record<Bay, CalendarEvent[]>);

    Object.entries(eventsByBay).forEach(([bay, bayEvents]) => {
      // Sort events by start time
      const sortedEvents = bayEvents.sort((a, b) => 
        new Date(a.start).getTime() - new Date(b.start).getTime()
      );

      // Check for overlaps
      for (let i = 0; i < sortedEvents.length - 1; i++) {
        const current = sortedEvents[i];
        const next = sortedEvents[i + 1];
        
        if (new Date(current.end) > new Date(next.start)) {
          detectedConflicts.push({
            bay: bay as Bay,
            conflictingEvents: [current, next],
            timeRange: `${new Date(current.start).toLocaleTimeString()} - ${new Date(next.end).toLocaleTimeString()}`,
          });
        }
      }
    });

    setConflicts(detectedConflicts);
    return detectedConflicts;
  }, []);

  return {
    conflicts,
    detectConflicts,
  };
}

// Hook for calendar view management
export function useCalendarView() {
  const [currentView, setCurrentView] = useState('resourceTimeGridDay');
  const [currentDate, setCurrentDate] = useState(new Date());

  const changeView = useCallback((viewName: string) => {
    setCurrentView(viewName);
  }, []);

  const navigateToDate = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const goToPrevious = useCallback(() => {
    const newDate = new Date(currentDate);
    
    switch (currentView) {
      case 'resourceTimeGridDay':
        newDate.setDate(newDate.getDate() - 1);
        break;
      case 'resourceTimeGridWeek':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'dayGridMonth':
        newDate.setMonth(newDate.getMonth() - 1);
        break;
    }
    
    setCurrentDate(newDate);
  }, [currentDate, currentView]);

  const goToNext = useCallback(() => {
    const newDate = new Date(currentDate);
    
    switch (currentView) {
      case 'resourceTimeGridDay':
        newDate.setDate(newDate.getDate() + 1);
        break;
      case 'resourceTimeGridWeek':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'dayGridMonth':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
    }
    
    setCurrentDate(newDate);
  }, [currentDate, currentView]);

  return {
    currentView,
    currentDate,
    changeView,
    navigateToDate,
    goToToday,
    goToPrevious,
    goToNext,
  };
}

// Hook for bay utilization tracking
export function useBayUtilization(events: CalendarEvent[], date: Date = new Date()) {
  const [utilization, setUtilization] = useState<Record<Bay, {
    totalHours: number;
    bookedHours: number;
    utilizationRate: number;
    appointmentCount: number;
  }>>({
    'bay-1': { totalHours: 9, bookedHours: 0, utilizationRate: 0, appointmentCount: 0 },
    'bay-2': { totalHours: 9, bookedHours: 0, utilizationRate: 0, appointmentCount: 0 },
  });

  useEffect(() => {
    const dateStr = date.toDateString();
    const dayEvents = events.filter(event => 
      new Date(event.start).toDateString() === dateStr
    );

    const bayStats = {
      'bay-1': { totalHours: 9, bookedHours: 0, utilizationRate: 0, appointmentCount: 0 },
      'bay-2': { totalHours: 9, bookedHours: 0, utilizationRate: 0, appointmentCount: 0 },
    };

    dayEvents.forEach(event => {
      const bay = event.resourceId as Bay;
      const startTime = new Date(event.start);
      const endTime = new Date(event.end);
      const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60); // hours

      if (bayStats[bay]) {
        bayStats[bay].bookedHours += duration;
        bayStats[bay].appointmentCount++;
        bayStats[bay].utilizationRate = (bayStats[bay].bookedHours / bayStats[bay].totalHours) * 100;
      }
    });

    setUtilization(bayStats);
  }, [events, date]);

  return utilization;
}
