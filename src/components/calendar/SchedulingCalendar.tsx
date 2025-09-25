// Scheduling Calendar Component
// Main calendar component for the mechanic shop scheduling system

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import type { 
  CalendarApi, 
  EventApi,
  EventClickArg, 
  EventDropArg, 
  EventResizeArg, 
  DateSelectArg,
  EventChangeArg,
  EventReceiveArg,
  EventLeaveArg,
  DatesSetArg,
} from '@fullcalendar/core';
import { defaultCalendarConfig, checkBayAvailability, createCalendarEvent } from '@/lib/calendar-config';
import { openPrintableSchedule, type PrintScope } from '@/lib/print-schedule';
import { ApiError, appointmentApi, customerApi, jobApi, vehicleApi } from '@/lib/api-client';
import { useRealtimeAppointmentsByDateRange, useRealtimeAppointmentNotifications } from '@/hooks';
import { useUIStore, usePreferencesStore } from '@/stores';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar, Clock } from 'lucide-react';
import { ConflictResolutionModal, type ConflictResolution } from './ConflictResolutionModal';
import type { CalendarEvent, Bay } from '@/types/database';

interface SchedulingCalendarProps {
  onEventClick?: (event: CalendarEvent) => void;
  onEventDrop?: (info: EventDropArg) => void;
  onEventResize?: (info: EventResizeArg) => void;
  onDateSelect?: (selectInfo: DateSelectArg) => void;
  onEventChange?: (info: EventChangeArg) => void;
  onEventReceive?: (info: EventReceiveArg) => void;
  onEventLeave?: (info: EventLeaveArg) => void;
  onEventDragStart?: (info: any) => void;
  onEventDragStop?: (info: any) => void;
  height?: string | number;
  className?: string;
}

export interface CalendarEventSnapshot {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resourceId: string | null;
  extendedProps: Record<string, unknown>;
}

export interface SchedulingCalendarHandle {
  changeView: (viewName: string) => void;
  navigateToDate: (date: Date) => void;
  getCurrentView: () => string;
  getCurrentDate: () => Date;
  getEvents: () => CalendarEventSnapshot[];
  printSchedule: (options?: { viewName?: string; date?: Date; scope?: PrintScope; title?: string }) => void;
}

type MutableEventApi = EventApi & {
  setProp?: (name: string, value: unknown) => void;
  setResources?: (resources: string[]) => void;
  setExtendedProp?: (name: string, value: unknown) => void;
};

interface ConflictJobDetails {
  title?: string;
  estHours?: number;
  status?: string;
  priority?: string;
}


interface ConflictModalState {
  isOpen: boolean;
  conflictingEvents: CalendarEvent[];
  newJobData: {
    job: ConflictJobDetails;
    requestedStartTime: Date;
    requestedEndTime: Date;
    requestedBay: Bay;
  } | null;
  pendingReceiveInfo?: EventReceiveArg;
}

const VIEW_SCOPE_MAP: Record<string, PrintScope> = {
  resourceTimeGridDay: 'day',
  timeGridDay: 'day',
  dayGridDay: 'day',
  resourceTimeGridWeek: 'week',
  timeGridWeek: 'week',
  dayGridWeek: 'week',
  dayGridMonth: 'month',
  timeGridMonth: 'month',
};

function inferScopeFromView(viewName: string): PrintScope {
  if (VIEW_SCOPE_MAP[viewName]) {
    return VIEW_SCOPE_MAP[viewName];
  }

  const normalized = viewName.toLowerCase();
  if (normalized.includes('month')) {
    return 'month';
  }
  if (normalized.includes('week')) {
    return 'week';
  }
  return 'day';
}
export const SchedulingCalendar = forwardRef<SchedulingCalendarHandle, SchedulingCalendarProps>(function SchedulingCalendar(
  {
    onEventClick,
    onEventDrop,
    onEventResize,
    onDateSelect,
    onEventChange,
    onEventReceive,
    onEventLeave,
    onEventDragStart,
    onEventDragStop,
    height = 'auto',
    className = '',
  }: SchedulingCalendarProps,
  ref
) {
  const calendarRef = useRef<FullCalendar>(null);
  const [currentView, setCurrentView] = useState('resourceTimeGridDay');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conflictModal, setConflictModal] = useState<ConflictModalState>({
    isOpen: false,
    conflictingEvents: [],
    newJobData: null,
    pendingReceiveInfo: undefined,
  });

  // Store hooks
  const { selectItem, addToast } = useUIStore();
  const calendarPreferences = usePreferencesStore(state => state.calendar);
  // Calendar API access helper
  const getCalendarApi = useCallback((): CalendarApi | null => {
    return calendarRef.current?.getApi() ?? null;
  }, []);


  // Calculate date range for data fetching
  const getDateRange = useCallback(() => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    switch (currentView) {
      case 'resourceTimeGridDay':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'resourceTimeGridWeek':
        start.setDate(start.getDate() - start.getDay() + 1); // Start of week (Monday)
        start.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() - end.getDay() + 7); // End of week (Sunday)
        end.setHours(23, 59, 59, 999);
        break;
      case 'dayGridMonth':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        break;
      default:
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
    }

    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }, [currentDate, currentView]);

  const dateRange = getDateRange();

  const refreshEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchAppointments = async () => {
        try {
          return await appointmentApi.getAll({ startDate: dateRange.start, endDate: dateRange.end });
        } catch (err) {
          if (err instanceof ApiError && err.message.includes('Mock endpoint not implemented')) {
            const fallback = await appointmentApi.getAll();
            if (!fallback.success) {
              throw new Error(fallback.error || 'Failed to load appointments');
            }
            const rangeStart = new Date(dateRange.start);
            const rangeEnd = new Date(dateRange.end);
            const filtered = (fallback.data ?? []).filter(appointment => {
              const startAt = new Date(appointment.startAt);
              return startAt >= rangeStart && startAt <= rangeEnd;
            });
            return { ...fallback, data: filtered };
          }
          throw err;
        }
      };

      const [appointmentsRes, jobsRes, customersRes, vehiclesRes] = await Promise.all([
        fetchAppointments(),
        jobApi.getAll(),
        customerApi.getAll(),
        vehicleApi.getAll(),
      ]);

      if (!appointmentsRes.success) {
        throw new Error(appointmentsRes.error || 'Failed to load appointments');
      }
      if (!jobsRes.success) {
        throw new Error(jobsRes.error || 'Failed to load jobs');
      }
      if (!customersRes.success) {
        throw new Error(customersRes.error || 'Failed to load customers');
      }
      if (!vehiclesRes.success) {
        throw new Error(vehiclesRes.error || 'Failed to load vehicles');
      }

      const rangeStart = new Date(dateRange.start);
      const rangeEnd = new Date(dateRange.end);
      const appointments = (appointmentsRes.data ?? []).filter(appointment => {
        const startAt = new Date(appointment.startAt);
        return startAt >= rangeStart && startAt <= rangeEnd;
      });
      const jobs = jobsRes.data ?? [];
      const customers = customersRes.data ?? [];
      const vehicles = vehiclesRes.data ?? [];

      const jobMap = new Map(jobs.map(job => [job.id, job]));
      const customerMap = new Map(customers.map(customer => [customer.id, customer]));
      const vehicleMap = new Map(vehicles.map(vehicle => [vehicle.id, vehicle]));

      const events = appointments.map(appointment => {
        const job = jobMap.get(appointment.jobId);
        const customer = job ? customerMap.get(job.customerId) : undefined;
        const vehicle = job ? vehicleMap.get(job.vehicleId) : undefined;

        return createCalendarEvent(appointment, job, customer, vehicle);
      });

      setCalendarEvents(events);
    } catch (error) {
      console.error('Failed to refresh calendar events:', error);
      addToast({
        type: 'error',
        title: 'Calendar Refresh Failed',
        message: error instanceof Error ? error.message : 'Unable to refresh calendar events.',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [addToast, dateRange.end, dateRange.start]);

  // Real-time appointment subscriptions
  const { isSubscribed } = useRealtimeAppointmentsByDateRange(
    dateRange.start,
    dateRange.end
  );

  // Global appointment notifications
  useRealtimeAppointmentNotifications();

  useEffect(() => {
    refreshEvents();
  }, [refreshEvents]);

  // Event handlers
  const handleEventClick = useCallback((clickInfo: EventClickArg) => {
    const event = clickInfo.event;
    
    // Prevent default selection behavior
    clickInfo.jsEvent.preventDefault();
    clickInfo.jsEvent.stopPropagation();
    
    // Force remove any selection styling
    setTimeout(() => {
      const eventEl = clickInfo.el;
      if (eventEl) {
        eventEl.classList.remove('fc-event-selected');
        // Force style reset
        eventEl.style.background = '';
        eventEl.style.borderColor = '';
        eventEl.style.boxShadow = '';
        eventEl.style.filter = '';
        eventEl.style.opacity = '';
        eventEl.style.transform = '';
      }
    }, 0);
    
    const calendarEvent: CalendarEvent = {
      id: event.id,
      title: event.title,
      start: event.start!,
      end: event.end!,
      resourceId: event.getResources()[0]?.id || 'bay-1',
      backgroundColor: event.backgroundColor,
      borderColor: event.borderColor,
      extendedProps: event.extendedProps,
    };

    // Select the item in the UI store for right panel display
    if (event.extendedProps.jobId) {
      selectItem({
        type: 'job',
        id: event.extendedProps.jobId,
        data: event.extendedProps,
      });
    }

    onEventClick?.(calendarEvent);
  }, [onEventClick, selectItem]);

  const handleEventDrop = useCallback(async (dropInfo: EventDropArg) => {
    const { event, oldResource, newResource } = dropInfo;
    
    setIsLoading(true);
    try {
      // Check for conflicts
      const newBayId = newResource?.id || oldResource?.id || 'bay-1';
      const isAvailable = checkBayAvailability(
        newBayId,
        event.start!,
        event.end!,
        calendarEvents,
        event.id
      );

      if (!isAvailable) {
        // Revert the drop
        dropInfo.revert();
        addToast({
          type: 'error',
          title: 'Scheduling Conflict',
          message: 'This time slot is already occupied',
          duration: 5000,
        });
        return;
      }

      // Call the handler
      await onEventDrop?.(dropInfo);

      addToast({
        type: 'success',
        title: 'Appointment Moved',
        message: `Moved to ${newResource?.title || 'new time'}`,
        duration: 3000,
      });
    } catch (error) {
      // Revert on error
      dropInfo.revert();
      addToast({
        type: 'error',
        title: 'Failed to Move Appointment',
        message: error instanceof Error ? error.message : 'An error occurred',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [onEventDrop, calendarEvents, addToast]);

  const handleEventResize = useCallback(async (resizeInfo: EventResizeArg) => {
    const { event } = resizeInfo;
    
    setIsLoading(true);
    try {
      // Check for conflicts with the new duration
      const bayId = event.getResources()[0]?.id || 'bay-1';
      const isAvailable = checkBayAvailability(
        bayId,
        event.start!,
        event.end!,
        calendarEvents,
        event.id
      );

      if (!isAvailable) {
        resizeInfo.revert();
        addToast({
          type: 'error',
          title: 'Scheduling Conflict',
          message: 'Cannot extend into occupied time slot',
          duration: 5000,
        });
        return;
      }

      await onEventResize?.(resizeInfo);

      addToast({
        type: 'success',
        title: 'Appointment Updated',
        message: 'Duration has been updated',
        duration: 3000,
      });
    } catch (error) {
      resizeInfo.revert();
      addToast({
        type: 'error',
        title: 'Failed to Update Appointment',
        message: error instanceof Error ? error.message : 'An error occurred',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [onEventResize, calendarEvents, addToast]);

  const handleDateSelect = useCallback((selectInfo: DateSelectArg) => {
    // Check if the selected time slot is available
    const bayId = selectInfo.resource?.id || 'bay-1';
    const isAvailable = checkBayAvailability(
      bayId,
      selectInfo.start,
      selectInfo.end,
      calendarEvents
    );

    if (!isAvailable) {
      addToast({
        type: 'warning',
        title: 'Time Slot Occupied',
        message: 'This time slot is already booked',
        duration: 4000,
      });
      return;
    }

    onDateSelect?.(selectInfo);
  }, [onDateSelect, calendarEvents, addToast]);

  // Handle external job drops onto calendar
  const handleEventReceive = useCallback(async (receiveInfo: EventReceiveArg) => {
    const { event } = receiveInfo;
    
    setIsLoading(true);
    try {
      // Check for conflicts
      const bayId = event.getResources()[0]?.id || 'bay-1';
      const isAvailable = checkBayAvailability(
        bayId,
        event.start!,
        event.end!,
        calendarEvents
      );

      if (!isAvailable) {
        // Find conflicting events
        const conflictingEvents = calendarEvents.filter(existingEvent => {
          if (existingEvent.resourceId !== bayId) return false;
          
          const eventStart = new Date(existingEvent.start);
          const eventEnd = new Date(existingEvent.end);
          const newStart = event.start!;
          const newEnd = event.end!;
          
          return (
            (newStart >= eventStart && newStart < eventEnd) ||
            (newEnd > eventStart && newEnd <= eventEnd) ||
            (newStart <= eventStart && newEnd >= eventEnd)
          );
        });

        // Show conflict resolution modal
        setConflictModal({
          isOpen: true,
          conflictingEvents,
          newJobData: {
            job: {
              title: event.title,
              estHours: typeof event.extendedProps?.estimatedHours === 'number' ? event.extendedProps.estimatedHours : event.extendedProps?.estHours,
              priority: typeof event.extendedProps?.priority === 'string' ? event.extendedProps.priority : undefined,
              status: typeof event.extendedProps?.status === 'string' ? event.extendedProps.status : undefined,
            },
            requestedStartTime: event.start!,
            requestedEndTime: event.end!,
            requestedBay: bayId as Bay,
          },
          pendingReceiveInfo: receiveInfo,
        });

        // Don't remove the event yet - let the modal handle it
        return;
      }

      // No conflicts - proceed with scheduling
      await onEventReceive?.(receiveInfo);

      addToast({
        type: 'success',
        title: 'Job Scheduled',
        message: `Job scheduled in ${event.getResources()[0]?.title || 'selected bay'}`,
        duration: 3000,
      });
    } catch (error) {
      // Remove the event on error
      event.remove();
      addToast({
        type: 'error',
        title: 'Failed to Schedule Job',
        message: error instanceof Error ? error.message : 'An error occurred',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [onEventReceive, calendarEvents, addToast]);

  // Handle when external events leave the calendar
  const handleEventLeave = useCallback((leaveInfo: EventLeaveArg) => {
    // Set up drag data for unscheduling
    const event = leaveInfo.event;
    const appointmentId = event.extendedProps?.appointmentId || event.id;
    const jobId = event.extendedProps?.jobId;
    
    if (appointmentId && jobId) {
      // Store data in the drag event for the unschedule zone
      const dragData = {
        appointmentId,
        jobId,
      };
      
      // Use a custom data attribute to pass the data
      const dragEvent = (leaveInfo as any).jsEvent;
      if (dragEvent && dragEvent.dataTransfer) {
        dragEvent.dataTransfer.setData('text/plain', JSON.stringify(dragData));
      }
    }
    
    onEventLeave?.(leaveInfo);
  }, [onEventLeave]);

  // Handle conflict resolution
  const handleConflictResolution = useCallback(async (resolution: ConflictResolution) => {
    const { pendingReceiveInfo } = conflictModal;
    
    if (!pendingReceiveInfo) return;

    try {
      setIsLoading(true);
      
      switch (resolution.action) {
        case 'reschedule-existing': {
          if (!resolution.rescheduledEvents || resolution.rescheduledEvents.length === 0) {
            addToast({
              type: 'warning',
              title: 'No Changes Applied',
              message: 'Could not determine how to reschedule conflicting appointments.',
              duration: 4000,
            });
            break;
          }

          const calendarApi = getCalendarApi();
          const updatedEventMap = new Map<string, { start: Date; end: Date; resourceId: string }>();

          await Promise.all(
            resolution.rescheduledEvents.map(async rescheduled => {
              const existingEvent = calendarEvents.find(event => event.id === rescheduled.eventId);
              if (!existingEvent) {
                return;
              }

              const targetStart = new Date(rescheduled.newStartTime);
              const targetEnd = new Date(rescheduled.newEndTime);
              const targetBay = (rescheduled.newBay || existingEvent.resourceId) as Bay;

              if (Number.isNaN(targetStart.getTime()) || Number.isNaN(targetEnd.getTime())) {
                throw new Error('Invalid reschedule time provided');
              }

              const appointmentId = existingEvent.extendedProps?.appointmentId || existingEvent.id;
              await appointmentApi.update(appointmentId, {
                startAt: targetStart.toISOString(),
                endAt: targetEnd.toISOString(),
                bay: targetBay,
              });

              if (calendarApi) {
                const fcEvent = calendarApi.getEventById(existingEvent.id);
                if (fcEvent) {
                  fcEvent.setStart(targetStart);
                  fcEvent.setEnd(targetEnd);
                  if (targetBay && targetBay !== existingEvent.resourceId) {
                    const mutableEventApi = fcEvent as MutableEventApi;
                    if (typeof mutableEventApi.setProp === 'function') {
                      mutableEventApi.setProp('resourceIds', [targetBay]);
                      mutableEventApi.setProp('resourceId', targetBay);
                    } else if (typeof mutableEventApi.setResources === 'function') {
                      mutableEventApi.setResources([targetBay]);
                    } else if (typeof mutableEventApi.setExtendedProp === 'function') {
                      mutableEventApi.setExtendedProp('resourceId', targetBay);
                    }
                  }
                }
              }

              updatedEventMap.set(existingEvent.id, {
                start: targetStart,
                end: targetEnd,
                resourceId: targetBay,
              });
            })
          );

          if (updatedEventMap.size > 0) {
            setCalendarEvents(prev =>
              prev.map(event => {
                const updates = updatedEventMap.get(event.id);
                if (!updates) return event;
                return {
                  ...event,
                  start: updates.start,
                  end: updates.end,
                  resourceId: updates.resourceId,
                };
              })
            );

            addToast({
              type: 'success',
              title: 'Appointments Rescheduled',
              message: 'Conflicting appointments moved to new time slots.',
              duration: 4000,
            });
          }
          break;
        }
          
        case 'reschedule-new': {
          if (resolution.newEventTime) {
            const { event } = pendingReceiveInfo;
            const { startTime, endTime, bay } = resolution.newEventTime;

            const newStart = new Date(startTime);
            const newEnd = new Date(endTime);
            event.setStart(Number.isNaN(newStart.getTime()) ? startTime : newStart);
            event.setEnd(Number.isNaN(newEnd.getTime()) ? endTime : newEnd);

            const currentResource = event.getResources()[0]?.id;
            if (bay && bay !== currentResource) {
              const mutableEvent = event as MutableEventApi;
              if (typeof mutableEvent.setProp === 'function') {
                mutableEvent.setProp('resourceIds', [bay]);
                mutableEvent.setProp('resourceId', bay);
              } else if (typeof mutableEvent.setResources === 'function') {
                mutableEvent.setResources([bay]);
              } else if (typeof mutableEvent.setExtendedProp === 'function') {
                mutableEvent.setExtendedProp('resourceId', bay);
              }
            }
          }
          break;
        }
          
        case 'force-schedule':
          // Proceed despite conflicts
          addToast({
            type: 'warning',
            title: 'Force Scheduled',
            message: 'Job scheduled with conflicts - please review',
            duration: 5000,
          });
          break;
          
        default:
          return;
      }

      // Proceed with the original handler
      await onEventReceive?.(pendingReceiveInfo);
      
      // Close modal
      setConflictModal(prev => ({ ...prev, isOpen: false }));
      
      addToast({
        type: 'success',
        title: 'Conflict Resolved',
        message: 'Job has been scheduled successfully',
        duration: 3000,
      });
      
    } catch (error) {
      // Remove the event on error
      pendingReceiveInfo.event.remove();
      addToast({
        type: 'error',
        title: 'Resolution Failed',
        message: error instanceof Error ? error.message : 'Failed to resolve conflict',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [addToast, calendarEvents, conflictModal, getCalendarApi, onEventReceive]);

  const handleConflictCancel = useCallback(() => {
    const { pendingReceiveInfo } = conflictModal;
    
    if (pendingReceiveInfo) {
      // Remove the event from calendar
      pendingReceiveInfo.event.remove();
    }
    
    // Close modal
    setConflictModal(prev => ({ ...prev, isOpen: false }));
    
    addToast({
      type: 'info',
      title: 'Scheduling Cancelled',
      message: 'Job scheduling was cancelled due to conflicts',
      duration: 3000,
    });
  }, [conflictModal, addToast]);

  // Calendar API methods
  const navigateToDate = useCallback((date: Date) => {
    const api = getCalendarApi();
    if (api) {
      api.gotoDate(date);
      setCurrentDate(date);
    }
  }, [getCalendarApi]);

  const changeView = useCallback((viewName: string) => {
    const api = getCalendarApi();
    if (api) {
      api.changeView(viewName);
      setCurrentView(viewName);
    }
  }, [getCalendarApi]);

  const getEventSnapshots = useCallback((): CalendarEventSnapshot[] => {
    const api = getCalendarApi();
    if (!api) {
      return [];
    }

    return api
      .getEvents()
      .map((eventApi) => {
        const start = eventApi.start ? new Date(eventApi.start) : null;
        const end = eventApi.end ? new Date(eventApi.end) : null;

        if (!start || !end) {
          return null;
        }

        const resources = typeof eventApi.getResources === 'function' ? eventApi.getResources() : [];
        const resourceId = resources.length > 0 ? resources[0]?.id ?? null : (eventApi.extendedProps?.bay ?? null);

        return {
          id: eventApi.id,
          title: eventApi.title,
          start,
          end,
          resourceId: resourceId ?? null,
          extendedProps: { ...eventApi.extendedProps },
        } as CalendarEventSnapshot;
      })
      .filter((event): event is CalendarEventSnapshot => event !== null);
  }, [getCalendarApi]);

  const printSchedule = useCallback(
    (options: { viewName?: string; date?: Date; scope?: PrintScope; title?: string } = {}) => {
      const api = getCalendarApi();
      const anchorBase = options.date ?? api?.getDate() ?? currentDate;
      const viewName = options.viewName ?? api?.view?.type ?? currentView;
      const scope = options.scope ?? inferScopeFromView(viewName);
      const events = getEventSnapshots();
      const defaultTitle =
        typeof document !== 'undefined' && typeof document.title === 'string' && document.title.trim().length > 0
          ? document.title
          : 'Mechanic Call App';

      openPrintableSchedule({
        scope,
        anchorDate: new Date(anchorBase),
        events,
        title: options.title ?? defaultTitle,
      });
    },
    [currentDate, currentView, getCalendarApi, getEventSnapshots]
  );

  useImperativeHandle(
    ref,
    () => ({
      changeView,
      navigateToDate,
      getCurrentView: () => currentView,
      getCurrentDate: () => new Date(currentDate),
      getEvents: getEventSnapshots,
      printSchedule,
    }),
    [changeView, navigateToDate, currentView, currentDate, getEventSnapshots, printSchedule]
  );

  // Calendar configuration with event handlers
  const calendarConfig = {
    ...defaultCalendarConfig,
    height,
    initialView: calendarPreferences.defaultView || 'resourceTimeGridDay',
    events: calendarEvents,
    eventClick: handleEventClick,
    eventDrop: handleEventDrop,
    eventResize: handleEventResize,
    eventReceive: handleEventReceive,
    eventLeave: handleEventLeave,
    eventDragStart: onEventDragStart,
    eventDragStop: onEventDragStop,
    select: handleDateSelect,
    eventChange: onEventChange,
    loading: setIsLoading,
    // Completely disable event selection
    selectAllow: () => false,
    eventAllow: (dropInfo: any) => true, // Allow drops but not selection
    datesSet: (dateInfo: DatesSetArg) => {
      setCurrentDate(dateInfo.start);
      setCurrentView(dateInfo.view.type);
    },
  };

  return (
    <div className={`scheduling-calendar ${className}`}>
      {/* Calendar Status Bar */}
      <div className="flex items-center justify-between p-4 bg-muted/30 border-b">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {currentDate.toLocaleDateString(undefined, { 
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${isSubscribed ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-muted-foreground">
              {isSubscribed ? 'Live Updates' : 'Offline'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshEvents}
                  disabled={isLoading}
                >
                  <Clock className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh Calendar</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateToDate(new Date())}
          >
            Today
          </Button>
        </div>
      </div>

      {/* Calendar Component */}
      <Card className="border-0 shadow-none">
        <CardContent className="p-0">
          <FullCalendar
            ref={calendarRef}
            {...calendarConfig}
          />
        </CardContent>
      </Card>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-50">
          <div className="flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
            <span className="text-sm">Updating calendar...</span>
          </div>
        </div>
      )}

      {/* Conflict Resolution Modal */}
      <ConflictResolutionModal
        isOpen={conflictModal.isOpen}
        onClose={() => setConflictModal(prev => ({ ...prev, isOpen: false }))}
        conflictingEvents={conflictModal.conflictingEvents}
        newJobData={conflictModal.newJobData}
        onResolve={handleConflictResolution}
        onCancel={handleConflictCancel}
      />
    </div>
  );
});

// Enhanced calendar legend component
export function CalendarLegend() {
  return (
    <Card className="p-4">
      <h4 className="font-semibold mb-3 flex items-center gap-2">
        <Badge variant="outline" className="p-1">
          <Calendar className="h-3 w-3" />
        </Badge>
        Calendar Legend
      </h4>
      
      <div className="space-y-4">
        {/* Job Status */}
        <div>
          <h5 className="text-sm font-medium mb-2">Job Status</h5>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 rounded border-2 border-slate-500 bg-slate-100 relative">
                <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-slate-500 rounded-full transform translate-x-0.5 -translate-y-0.5" />
              </div>
              <span>Incoming Call</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 rounded border-2 border-blue-600 bg-blue-100 relative">
                <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-blue-600 rounded-full transform translate-x-0.5 -translate-y-0.5" />
              </div>
              <span>Scheduled</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 rounded border-2 border-green-600 bg-green-100 relative">
                <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-green-600 rounded-full transform translate-x-0.5 -translate-y-0.5 animate-pulse" />
              </div>
              <span>In Bay</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 rounded border-2 border-orange-600 bg-orange-100 relative" 
                   style={{backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 1px, rgba(234, 88, 12, 0.1) 1px, rgba(234, 88, 12, 0.1) 3px)'}}>
                <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-orange-600 rounded-full transform translate-x-0.5 -translate-y-0.5 animate-pulse" />
              </div>
              <span>Waiting Parts</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 rounded border-2 border-gray-500 bg-gray-100 opacity-80 relative">
                <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-gray-500 rounded-full transform translate-x-0.5 -translate-y-0.5" />
              </div>
              <span>Completed</span>
            </div>
          </div>
        </div>

        {/* Priority Levels */}
        <div>
          <h5 className="text-sm font-medium mb-2">Priority Levels</h5>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 rounded border-2 border-gray-400 bg-gray-100" />
              <span>Low Priority</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 rounded border-3 border-blue-500 bg-blue-100 shadow-sm" />
              <span>Medium Priority</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-4 h-3 rounded border-4 border-red-500 bg-red-100 shadow-md" />
                <div className="absolute -top-0.5 -left-0.5 w-0 h-0 border-l-2 border-b-2 border-l-red-600 border-b-transparent" />
              </div>
              <span>High Priority</span>
            </div>
          </div>
        </div>

        {/* Time Indicators */}
        <div>
          <h5 className="text-sm font-medium mb-2">Time Indicators</h5>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 rounded border-2 border-red-600 bg-red-100 animate-pulse" />
              <span>Overdue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 rounded border-2 border-amber-600 bg-amber-100" />
              <span>Due Soon (&lt;2h)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 rounded border-2 border-gray-400 bg-gray-100 opacity-75" />
              <span>Future (&gt;24h)</span>
            </div>
          </div>
        </div>

        {/* Visual Elements */}
        <div>
          <h5 className="text-sm font-medium mb-2">Visual Elements</h5>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Status indicators</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-0 h-0 border-l-2 border-b-2 border-l-red-600 border-b-transparent" />
              <span>High priority flag</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded bg-orange-200 animate-pulse" />
              <span>Active status pulse</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// Export calendar utilities for external use
export type { SchedulingCalendarProps, SchedulingCalendarHandle, CalendarEventSnapshot };
