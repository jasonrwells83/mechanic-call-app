// Conflict Resolution Modal Component
// Modal for resolving scheduling conflicts when appointments overlap

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertTriangle,
  Clock,
  Calendar,
  ArrowRight,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateTimeSlots } from '@/lib/calendar-config';
import type { CalendarEvent, Bay } from '@/types/database';

interface ConflictJobDetails {
  title?: string;
  estHours?: number;
  priority?: string;
  status?: string;
}

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflictingEvents: CalendarEvent[];
  newJobData: {
    job: ConflictJobDetails;
    requestedStartTime: Date;
    requestedEndTime: Date;
    requestedBay: Bay;
  };
  onResolve: (resolution: ConflictResolution) => void;
  onCancel: () => void;
}

interface ConflictResolution {
  action: 'reschedule-existing' | 'reschedule-new' | 'force-schedule' | 'cancel';
  rescheduledEvents?: Array<{
    eventId: string;
    newStartTime: Date;
    newEndTime: Date;
    newBay?: Bay;
  }>;
  newEventTime?: {
    startTime: Date;
    endTime: Date;
    bay: Bay;
  };
}

interface SuggestionOption {
  id: string;
  type: 'reschedule-existing' | 'reschedule-new';
  title: string;
  description: string;
  changes: Array<{
    eventId: string;
    eventTitle: string;
    currentTime: string;
    newTime: string;
    bay: Bay;
    newStart: Date;
    newEnd: Date;
  }>;
  priority: number;
}

export function ConflictResolutionModal({
  isOpen,
  onClose,
  conflictingEvents,
  newJobData,
  onResolve,
  onCancel,
}: ConflictResolutionModalProps) {
  const [selectedResolution, setSelectedResolution] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  // Generate resolution suggestions
  const generateSuggestions = (): SuggestionOption[] => {
    if (!newJobData) {
      return [];
    }

    const suggestions: SuggestionOption[] = [];
    const { job, requestedStartTime, requestedEndTime, requestedBay } = newJobData;
    const jobTitle = job?.title ?? 'New job';
    const jobDuration = typeof job?.estHours === 'number' && job.estHours > 0 ? job.estHours : 1;

    // Option 1: Reschedule conflicting events to later times
    const laterSlots = generateTimeSlots(
      requestedStartTime,
      (requestedEndTime.getTime() - requestedStartTime.getTime()) / (1000 * 60 * 60),
      0.5
    ).slice(1, 6);

    if (laterSlots.length > 0) {
      conflictingEvents.forEach((conflictEvent, index) => {
        const laterSlot = laterSlots[index];
        if (laterSlot) {
          suggestions.push({
            id: `reschedule-existing-${conflictEvent.id}`,
            type: 'reschedule-existing',
            title: 'Move Conflicting Appointment',
            description: `Reschedule "${conflictEvent.title}" to a later time slot`,
            changes: [{
              eventId: conflictEvent.id,
              eventTitle: conflictEvent.title,
              currentTime: `${new Date(conflictEvent.start).toLocaleTimeString()} - ${new Date(conflictEvent.end).toLocaleTimeString()}`,
              newTime: `${laterSlot.start.toLocaleTimeString()} - ${laterSlot.end.toLocaleTimeString()}`,
              bay: requestedBay,
              newStart: laterSlot.start,
              newEnd: laterSlot.end,
            }],
            priority: 1,
          });
        }
      });
    }

    // Option 2: Reschedule new job to later time
    const alternativeSlots = generateTimeSlots(
      new Date(requestedStartTime.getTime() + 30 * 60 * 1000),
      jobDuration,
      0.5
    ).slice(0, 3);

    alternativeSlots.forEach((slot, index) => {
      suggestions.push({
        id: `reschedule-new-${index}`,
        type: 'reschedule-new',
        title: 'Reschedule New Job',
        description: `Schedule "${jobTitle}" at an alternative time`,
        changes: [{
          eventId: 'new-job',
          eventTitle: jobTitle,
          currentTime: `${requestedStartTime.toLocaleTimeString()} - ${requestedEndTime.toLocaleTimeString()}`,
          newTime: `${slot.start.toLocaleTimeString()} - ${slot.end.toLocaleTimeString()}`,
          bay: requestedBay,
          newStart: slot.start,
          newEnd: slot.end,
        }],
        priority: 2,
      });
    });

    // Option 3: Try different bay
    const alternateBay: Bay = requestedBay === 'bay-1' ? 'bay-2' : 'bay-1';
    suggestions.push({
      id: 'different-bay',
      type: 'reschedule-new',
      title: 'Use Different Bay',
      description: `Schedule "${jobTitle}" in ${alternateBay === 'bay-1' ? 'Bay 1' : 'Bay 2'}`,
      changes: [{
        eventId: 'new-job',
        eventTitle: jobTitle,
        currentTime: `${requestedStartTime.toLocaleTimeString()} - ${requestedEndTime.toLocaleTimeString()}`,
        newTime: `${requestedStartTime.toLocaleTimeString()} - ${requestedEndTime.toLocaleTimeString()}`,
        bay: alternateBay,
        newStart: requestedStartTime,
        newEnd: requestedEndTime,
      }],
      priority: 3,
    });

    return suggestions.sort((a, b) => a.priority - b.priority);
  };
  const suggestions = generateSuggestions();

  const handleResolve = async (suggestion: SuggestionOption) => {
    setIsResolving(true);
    
    try {
      let resolution: ConflictResolution;

      if (suggestion.type === 'reschedule-existing') {
        resolution = {
          action: 'reschedule-existing',
          rescheduledEvents: suggestion.changes.map(change => ({
            eventId: change.eventId,
            newStartTime: change.newStart instanceof Date && !Number.isNaN(change.newStart.getTime())
              ? change.newStart
              : new Date(change.newTime.split(' - ')[0]),
            newEndTime: change.newEnd instanceof Date && !Number.isNaN(change.newEnd.getTime())
              ? change.newEnd
              : new Date(change.newTime.split(' - ')[1]),
            newBay: change.bay,
          })),
        };
      } else {
        const change = suggestion.changes[0];
        resolution = {
          action: 'reschedule-new',
          newEventTime: {
            startTime: change.newStart instanceof Date && !Number.isNaN(change.newStart.getTime())
              ? change.newStart
              : new Date(change.newTime.split(' - ')[0]),
            endTime: change.newEnd instanceof Date && !Number.isNaN(change.newEnd.getTime())
              ? change.newEnd
              : new Date(change.newTime.split(' - ')[1]),
            bay: change.bay,
          },
        };
      }

      await onResolve(resolution);
    } finally {
      setIsResolving(false);
    }
  };

  const handleForceSchedule = async () => {
    setIsResolving(true);
    try {
      await onResolve({ action: 'force-schedule' });
    } finally {
      setIsResolving(false);
    }
  };

  const handleCancel = () => {
    onCancel();
    onClose();
  };

  // Don't render if no job data
  if (!newJobData) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Scheduling Conflict Detected
          </DialogTitle>
          <DialogDescription>
            The requested time slot conflicts with existing appointments. 
            Choose how to resolve this conflict.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-96 pr-4">
          <div className="space-y-4">
            {/* Conflict Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-destructive">
                  Conflict Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-medium text-sm">New Job Request</p>
                    <p className="text-sm text-muted-foreground">
                      {newJobData.job?.title ?? 'New job'}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {newJobData.requestedStartTime.toLocaleTimeString()} - {newJobData.requestedEndTime.toLocaleTimeString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {newJobData.requestedBay === 'bay-1' ? 'Bay 1' : 'Bay 2'}
                      </div>
                    </div>
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    {((newJobData.job?.estHours ?? 0)).toFixed(1)}h
                  </Badge>
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="font-medium text-sm">Conflicting Appointments</p>
                  {conflictingEvents.map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{event.title}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(event.start).toLocaleTimeString()} - {new Date(event.end).toLocaleTimeString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {event.resourceId === 'bay-1' ? 'Bay 1' : 'Bay 2'}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {event.extendedProps?.status || 'scheduled'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Resolution Options */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Resolution Options</h4>
              
              {suggestions.map((suggestion) => (
                <Card 
                  key={suggestion.id}
                  className={cn(
                    "cursor-pointer transition-all duration-200 hover:shadow-md",
                    selectedResolution === suggestion.id && "ring-2 ring-primary bg-primary/5"
                  )}
                  onClick={() => setSelectedResolution(suggestion.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        {suggestion.title}
                      </CardTitle>
                      <Badge 
                        variant={suggestion.priority === 1 ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {suggestion.priority === 1 ? "Recommended" : "Alternative"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {suggestion.description}
                    </p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {suggestion.changes.map((change, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs">
                        <span className="font-medium">{change.eventTitle}:</span>
                        <span className="text-muted-foreground">{change.currentTime}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium text-primary">{change.newTime}</span>
                        <Badge variant="outline" className="text-xs">
                          {change.bay === 'bay-1' ? 'Bay 1' : 'Bay 2'}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}

              {/* Force Schedule Option */}
              <Card className="border-destructive/20 bg-destructive/5">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <CardTitle className="text-sm font-medium text-destructive">
                      Force Schedule (Not Recommended)
                    </CardTitle>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Schedule anyway, creating overlapping appointments. This may cause operational issues.
                  </p>
                </CardHeader>
              </Card>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isResolving}
          >
            Cancel
          </Button>
          
          <Button
            variant="destructive"
            onClick={handleForceSchedule}
            disabled={isResolving || !selectedResolution}
            size="sm"
          >
            Force Schedule
          </Button>
          
          <Button
            onClick={() => {
              const suggestion = suggestions.find(s => s.id === selectedResolution);
              if (suggestion) {
                handleResolve(suggestion);
              }
            }}
            disabled={isResolving || !selectedResolution}
            className="min-w-24"
          >
            {isResolving ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full" />
                Resolving...
              </div>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Resolve Conflict
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { ConflictResolutionModalProps, ConflictResolution };








