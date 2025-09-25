import React, { useRef, useState, useEffect } from 'react';
import { SchedulingCalendar, CalendarLegend, type SchedulingCalendarHandle, type CalendarEventSnapshot } from '@/components/calendar/SchedulingCalendar';
import { DraggableJobList } from '@/components/calendar/DraggableJobList';
import { useCalendarAppointments, useCalendarView } from '@/hooks/use-calendar';
import { jobApi, appointmentApi } from '@/lib/api-client';
import { useUIStore } from '@/stores';
import { format, endOfDay, endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CallIntakeForm, type CallIntakeData } from '@/components/calls/CallIntakeForm';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Clock, Users, Layers, Printer, ClipboardList, ChevronDown, Phone } from 'lucide-react';
import type { EventDropArg, EventResizeArg, DateSelectArg, EventReceiveArg } from '@fullcalendar/core';
import '@/components/calendar/calendar.css';

type ReportScope = 'day' | 'week' | 'month';

interface ScheduleReportSummary {
  scope: ReportScope;
  viewLabel: string;
  rangeLabel: string;
  generatedAt: Date;
  totals: {
    appointments: number;
    hours: number;
  };
  byBay: Array<{
    bay: string;
    appointments: number;
    hours: number;
  }>;
  events: CalendarEventSnapshot[];
}

const scopeLabels: Record<ReportScope, string> = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
};

export function CalendarPage() {
  const calendarRef = useRef<SchedulingCalendarHandle>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportSummary, setReportSummary] = useState<ScheduleReportSummary | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isCallIntakeOpen, setIsCallIntakeOpen] = useState(false);
  
  // Calendar hooks
  const {
    calendarEvents,
    handleEventDrop,
    handleEventResize,
    handleDateSelect,
    handleJobDrop,
  } = useCalendarAppointments();

  const { currentDate } = useCalendarView();
  const { addToast } = useUIStore();

  // Event handlers
  const onEventClick = (event: any) => {
    setSelectedEvent(event);
  };

  const onEventDrop = async (dropInfo: EventDropArg) => {
    try {
      await handleEventDrop(dropInfo);
      // Trigger a re-render to update bay utilization cards
      setSelectedEvent(null);
      setSelectedEvent(dropInfo.event);
    } catch (error) {
      console.error('Failed to handle event drop:', error);
    }
  };

  const onEventResize = async (resizeInfo: EventResizeArg) => {
    try {
      await handleEventResize(resizeInfo);
      // Trigger a re-render to update bay utilization cards
      setSelectedEvent(null);
      setSelectedEvent(resizeInfo.event);
    } catch (error) {
      console.error('Failed to handle event resize:', error);
    }
  };

  const onDateSelect = (selectInfo: DateSelectArg) => {
    handleDateSelect(selectInfo);
  };

  const onJobDrop = async (receiveInfo: EventReceiveArg) => {
    try {
      await handleJobDrop(receiveInfo);
    } catch (error) {
      console.error('Failed to handle job drop:', error);
    }
  };

  // Handle event drag start
  const onEventDragStart = (info: any) => {
    setDraggedEvent(info.event);
    // Add visual feedback to the unschedule zone
    const unscheduleZone = document.getElementById('unschedule-zone');
    if (unscheduleZone) {
      unscheduleZone.classList.add('drop-zone-active');
    }
  };

  // Handle event drag stop
  const onEventDragStop = (info: any) => {
    // Remove visual feedback from the unschedule zone
    const unscheduleZone = document.getElementById('unschedule-zone');
    if (unscheduleZone) {
      unscheduleZone.classList.remove('drop-zone-active');
    }
    
    // Keep the event reference for a moment to allow drop handling
    setTimeout(() => {
      setDraggedEvent(null);
    }, 100);
  };

  // Handle unscheduling jobs
  const handleUnscheduleJob = async (appointmentId: string, jobId: string) => {
    try {
      // Delete the appointment
      await appointmentApi.delete(appointmentId);
      
      // Update job status back to 'incoming-call'
      await jobApi.updateStatus(jobId, 'incoming-call');
      
      addToast({
        type: 'success',
        title: 'Job Unscheduled',
        message: 'Job has been moved back to unscheduled list',
        duration: 3000,
      });
      
      // Refresh the page to update both calendar and unscheduled jobs list
      window.location.reload();
    } catch (error) {
      console.error('Failed to unschedule job:', error);
      addToast({
        type: 'error',
        title: 'Failed to Unschedule',
        message: 'Could not unschedule the job. Please try again.',
        duration: 5000,
      });
    }
  };

  // Store dragged event for unscheduling
  const [draggedEvent, setDraggedEvent] = useState<any>(null);

  // Set up unschedule drop zone with mouse position tracking
  useEffect(() => {
    const unscheduleZone = document.getElementById('unschedule-zone');
    if (!unscheduleZone || !draggedEvent) return;

    let isOverDropZone = false;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = unscheduleZone.getBoundingClientRect();
      const isInZone = (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      );

      if (isInZone && !isOverDropZone) {
        isOverDropZone = true;
        unscheduleZone.classList.add('bg-orange-200/50', 'border-orange-400', 'shadow-lg');
      } else if (!isInZone && isOverDropZone) {
        isOverDropZone = false;
        unscheduleZone.classList.remove('bg-orange-200/50', 'border-orange-400', 'shadow-lg');
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isOverDropZone && draggedEvent) {
        const appointmentId = draggedEvent.extendedProps?.appointmentId || draggedEvent.id;
        const jobId = draggedEvent.extendedProps?.jobId;
        
        if (appointmentId && jobId) {
          // Remove the event from the calendar immediately for visual feedback
          draggedEvent.remove();
          handleUnscheduleJob(appointmentId, jobId);
        }
      }
      
      // Clean up
      unscheduleZone.classList.remove('bg-orange-200/50', 'border-orange-400', 'shadow-lg');
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      unscheduleZone.classList.remove('bg-orange-200/50', 'border-orange-400', 'shadow-lg');
    };
  }, [draggedEvent]);

  const formatBayLabel = (bay: string | null | undefined) => {
    if (!bay) {
      return 'Unassigned';
    }
    if (bay === 'bay-1') {
      return 'Bay 1';
    }
    if (bay === 'bay-2') {
      return 'Bay 2';
    }

    const normalized = bay.replace(/[-_]/g, ' ');
    return normalized.replace(/\w/g, (char) => char.toUpperCase());
  };

  const getRangeForScope = (scope: ReportScope, anchor: Date) => {
    const reference = new Date(anchor);

    switch (scope) {
      case 'day':
        return { start: startOfDay(reference), end: endOfDay(reference) };
      case 'week':
        return {
          start: startOfWeek(reference, { weekStartsOn: 1 }),
          end: endOfWeek(reference, { weekStartsOn: 1 }),
        };
      case 'month':
      default:
        return { start: startOfMonth(reference), end: endOfMonth(reference) };
    }
  };

  const buildReportSummary = (scope: ReportScope, events: CalendarEventSnapshot[], anchor: Date): ScheduleReportSummary => {
    const { start, end } = getRangeForScope(scope, anchor);

    const eventsInRange = events.filter((event) => event.start < end && event.end > start);
    const totalHours = eventsInRange.reduce((acc, event) => {
      const hours = (event.end.getTime() - event.start.getTime()) / 36e5;
      return acc + hours;
    }, 0);

    const bayStats = new Map<string, { appointments: number; hours: number }>();
    eventsInRange.forEach((event) => {
      const extendedBay = (event.extendedProps as { bay?: string }).bay ?? null;
      const rawBay = event.resourceId ?? extendedBay ?? null;
      const bayKey = formatBayLabel(rawBay);
      const hours = (event.end.getTime() - event.start.getTime()) / 36e5;
      const entry = bayStats.get(bayKey) ?? { appointments: 0, hours: 0 };

      entry.appointments += 1;
      entry.hours += hours;
      bayStats.set(bayKey, entry);
    });

    const rangeLabel =
      scope === 'day'
        ? format(start, 'PPP')
        : scope === 'week'
        ? `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
        : format(start, 'MMMM yyyy');

    return {
      scope,
      viewLabel: scopeLabels[scope],
      rangeLabel,
      generatedAt: new Date(),
      totals: {
        appointments: eventsInRange.length,
        hours: totalHours,
      },
      byBay: Array.from(bayStats.entries())
        .map(([bay, stats]) => ({
          bay,
          appointments: stats.appointments,
          hours: stats.hours,
        }))
        .sort((a, b) => (b.appointments - a.appointments) || a.bay.localeCompare(b.bay)),
      events: eventsInRange
        .slice()
        .sort((a, b) => a.start.getTime() - b.start.getTime()),
    };
  };

  const handleRunReport = async (scope: ReportScope) => {
    const calendar = calendarRef.current;
    if (!calendar) {
      return;
    }

    setIsGeneratingReport(true);

    try {
      const anchorDate = calendar.getCurrentDate();
      const events = calendar.getEvents();
      const summary = buildReportSummary(scope, events, anchorDate);

      setReportSummary(summary);
      setIsReportOpen(true);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handlePrintSchedule = (scope: ReportScope) => {
    const calendar = calendarRef.current;
    if (!calendar) {
      return;
    }

    const anchorDate = calendar.getCurrentDate();

    calendar.printSchedule({
      scope,
      date: anchorDate,
      title: 'Mechanic Call App - Schedule',
    });

  };


  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">2-Bay Scheduler</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Drag unscheduled jobs onto calendar slots  Resize and move appointments
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={isGeneratingReport}>
                <ClipboardList className="mr-2 h-4 w-4" />
                {isGeneratingReport ? 'Generating...' : 'Run Report'}
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white text-slate-900 shadow-lg border border-border">
              <DropdownMenuItem onSelect={() => handleRunReport('day')}>Day report</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleRunReport('week')}>Week report</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleRunReport('month')}>Month report</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Printer className="mr-2 h-4 w-4" />
                Print schedule
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white text-slate-900 shadow-lg border border-border">
              <DropdownMenuItem onSelect={() => handlePrintSchedule('day')}>Day view</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handlePrintSchedule('week')}>Week view</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handlePrintSchedule('month')}>Month calendar</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setIsCallIntakeOpen(true)}>
            <Phone className="h-4 w-4 mr-2" />
            New Call
          </Button>
        </div>
      </div>


      {/* Main Calendar Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-6 gap-6">
        {/* Draggable Jobs Sidebar */}
        <div className="xl:col-span-1 print:hidden space-y-4">
          <DraggableJobList />
          
          {/* Unschedule Zone */}
          <Card className="border-dashed border-2 border-orange-300 bg-orange-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-700">
                <Clock className="h-4 w-4" />
                Unschedule Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div 
                id="unschedule-zone"
                className="min-h-[100px] flex items-center justify-center text-center p-4 rounded-lg border-2 border-dashed border-orange-300 bg-orange-100/30 text-orange-600 text-sm transition-all duration-200 hover:bg-orange-100/50"
              >
                <div>
                  <Clock className="h-6 w-6 mx-auto mb-2 opacity-60" />
                  <p className="font-medium">Drop jobs here to unschedule</p>
                  <p className="text-xs opacity-75 mt-1">Jobs will return to unscheduled list</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calendar Component */}
        <div className="xl:col-span-4 print:col-span-6">
          <Card>
            <CardContent className="p-0">
              <SchedulingCalendar ref={calendarRef}
                onEventClick={onEventClick}
                onEventDrop={onEventDrop}
                onEventResize={onEventResize}
                onDateSelect={onDateSelect}
                onEventReceive={onJobDrop}
                onEventDragStart={onEventDragStart}
                onEventDragStop={onEventDragStop}
                height="700px"
                className="rounded-lg"
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar with Legend and Quick Info */}
        <div className="xl:col-span-1 space-y-4 print:hidden">
          <CalendarLegend />
          
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Today's Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Total Appointments</span>
                <Badge variant="secondary">
                  {calendarEvents.filter(event => 
                    new Date(event.start).toDateString() === currentDate.toDateString()
                  ).length}
                </Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Hours Booked</span>
                <Badge variant="secondary">
                  {Math.round(
                    calendarEvents
                      .filter(event => new Date(event.start).toDateString() === currentDate.toDateString())
                      .reduce((total, event) => {
                        const duration = (new Date(event.end).getTime() - new Date(event.start).getTime()) / (1000 * 60 * 60);
                        return total + duration;
                      }, 0) * 10
                  ) / 10}h
                </Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Available Hours</span>
                <Badge variant="outline">
                  {Math.round(
                    (18 - calendarEvents
                      .filter(event => new Date(event.start).toDateString() === currentDate.toDateString())
                      .reduce((total, event) => {
                        const duration = (new Date(event.end).getTime() - new Date(event.start).getTime()) / (1000 * 60 * 60);
                        return total + duration;
                      }, 0)) * 10
                  ) / 10}h
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Selected Event Info */}
          {selectedEvent && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Selected Appointment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="font-medium">{selectedEvent.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedEvent.start.toLocaleTimeString()} - {selectedEvent.end.toLocaleTimeString()}
                  </p>
                </div>
                {selectedEvent.extendedProps && (
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant="secondary">
                        {selectedEvent.extendedProps.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Priority:</span>
                      <Badge variant="outline">
                        {selectedEvent.extendedProps.priority}
                      </Badge>
                    </div>
                    {selectedEvent.extendedProps.customerName && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Customer:</span>
                        <span>{selectedEvent.extendedProps.customerName}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Schedule Report
              {reportSummary ? ` - ${reportSummary.viewLabel}` : ''}
            </DialogTitle>
            <DialogDescription>
              {reportSummary
                ? `${reportSummary.rangeLabel} - Generated ${format(reportSummary.generatedAt, 'PPpp')}`
                : 'Choose a view from the Run Report menu to generate a schedule summary.'}
            </DialogDescription>
          </DialogHeader>
          {reportSummary && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase text-muted-foreground">Appointments</p>
                  <p className="mt-2 text-2xl font-semibold">{reportSummary.totals.appointments}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase text-muted-foreground">Total hours</p>
                  <p className="mt-2 text-2xl font-semibold">{reportSummary.totals.hours.toFixed(1)}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase text-muted-foreground">Generated</p>
                  <p className="mt-2 text-sm font-medium">{format(reportSummary.generatedAt, 'PPpp')}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Bay breakdown</h4>
                {reportSummary.byBay.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No appointments scheduled for this range.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bay</TableHead>
                        <TableHead>Appointments</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportSummary.byBay.map((row) => (
                        <TableRow key={row.bay}>
                          <TableCell>{row.bay}</TableCell>
                          <TableCell>{row.appointments}</TableCell>
                          <TableCell className="text-right">{row.hours.toFixed(1)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Scheduled appointments</h4>
                {reportSummary.events.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No appointments match the selected range.</p>
                ) : (
                  <div className="max-h-72 overflow-y-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Start</TableHead>
                          <TableHead>End</TableHead>
                          <TableHead>Bay</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead className="text-right">Hours</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportSummary.events.map((event) => {
                          const duration = (event.end.getTime() - event.start.getTime()) / 36e5;
                          const extendedBay = (event.extendedProps as { bay?: string }).bay ?? null;
                          const displayBay = formatBayLabel(event.resourceId ?? extendedBay);
                          return (
                            <TableRow key={`${event.id}-${event.start.toISOString()}`}>
                              <TableCell>{format(event.start, 'PP p')}</TableCell>
                              <TableCell>{format(event.end, 'PP p')}</TableCell>
                              <TableCell>{displayBay}</TableCell>
                              <TableCell className="max-w-[220px] truncate">{event.title}</TableCell>
                              <TableCell className="text-right">{duration.toFixed(1)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Call Intake Dialog */}
      <Dialog open={isCallIntakeOpen} onOpenChange={setIsCallIntakeOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Call Intake</DialogTitle>
            <DialogDescription>
              Record incoming customer call and create service request
            </DialogDescription>
          </DialogHeader>
          <CallIntakeForm
            onSubmit={(callData: CallIntakeData) => {
              console.log('Call intake submitted:', callData);
              setIsCallIntakeOpen(false);
              // Here you would typically save the call data and potentially create a job
              // For now, we'll just close the dialog
            }}
            onCancel={() => setIsCallIntakeOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}





