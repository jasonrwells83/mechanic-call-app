// Availability Suggestions Component
// Smart suggestions for optimal appointment scheduling

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Lightbulb, 
  Clock, 
  Calendar, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle,
  ArrowRight,
  Zap,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateTimeSlots, checkBayAvailability } from '@/lib/calendar-config';
import type { CalendarEvent, Job, Bay } from '@/types/database';

interface AvailabilitySuggestionsProps {
  job?: Job;
  existingEvents: CalendarEvent[];
  selectedDate?: Date;
  onSuggestionSelect: (suggestion: SchedulingSuggestion) => void;
  className?: string;
}

interface SchedulingSuggestion {
  id: string;
  type: 'optimal' | 'alternative' | 'next-available' | 'efficiency';
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  bay: Bay;
  score: number;
  reasons: string[];
  benefits: string[];
  warnings?: string[];
}

interface SuggestionEngine {
  generateSuggestions: (
    job: Job,
    existingEvents: CalendarEvent[],
    targetDate: Date,
    preferences?: SuggestionPreferences
  ) => SchedulingSuggestion[];
}

interface SuggestionPreferences {
  preferredBay?: Bay;
  avoidLunchHours?: boolean;
  minimizeGaps?: boolean;
  balanceWorkload?: boolean;
  prioritizeEarlySlots?: boolean;
}

// Suggestion scoring weights
const SCORING_WEIGHTS = {
  timeOptimality: 0.25,
  bayUtilization: 0.20,
  workflowEfficiency: 0.20,
  customerPreference: 0.15,
  gapMinimization: 0.10,
  bufferTime: 0.10,
};

class SmartSuggestionEngine implements SuggestionEngine {
  generateSuggestions(
    job: Job,
    existingEvents: CalendarEvent[],
    targetDate: Date,
    preferences: SuggestionPreferences = {}
  ): SchedulingSuggestion[] {
    const suggestions: SchedulingSuggestion[] = [];
    const jobDuration = job.estHours;
    
    // Generate time slots for the target date
    const timeSlots = generateTimeSlots(targetDate, jobDuration, 0.5);
    const bays: Bay[] = ['bay-1', 'bay-2'];

    // Filter events for the target date
    const dayEvents = existingEvents.filter(event => 
      new Date(event.start).toDateString() === targetDate.toDateString()
    );

    // Generate suggestions for each bay and time slot
    bays.forEach(bay => {
      const bayEvents = dayEvents.filter(event => event.resourceId === bay);
      
      timeSlots.forEach((slot, slotIndex) => {
        const isAvailable = checkBayAvailability(bay, slot.start, slot.end, existingEvents);
        
        if (isAvailable) {
          const suggestion = this.createSuggestion(
            job,
            slot,
            bay,
            bayEvents,
            existingEvents,
            slotIndex,
            preferences
          );
          
          if (suggestion) {
            suggestions.push(suggestion);
          }
        }
      });
    });

    // Sort by score and return top suggestions
    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }

  private createSuggestion(
    job: Job,
    slot: { start: Date; end: Date },
    bay: Bay,
    bayEvents: CalendarEvent[],
    allEvents: CalendarEvent[],
    slotIndex: number,
    preferences: SuggestionPreferences
  ): SchedulingSuggestion | null {
    const score = this.calculateScore(slot, bay, bayEvents, allEvents, job, preferences);
    const analysis = this.analyzeSlot(slot, bay, bayEvents, allEvents, job);
    
    if (score < 0.3) return null; // Skip very low-scoring suggestions

    let type: SchedulingSuggestion['type'] = 'alternative';
    let title = 'Available Slot';

    if (score >= 0.8) {
      type = 'optimal';
      title = 'Optimal Slot';
    } else if (score >= 0.6) {
      type = 'efficiency';
      title = 'Efficient Slot';
    } else if (slotIndex === 0) {
      type = 'next-available';
      title = 'Next Available';
    }

    return {
      id: `${bay}-${slot.start.getTime()}`,
      type,
      title,
      description: this.generateDescription(analysis, job),
      startTime: slot.start,
      endTime: slot.end,
      bay,
      score,
      reasons: analysis.reasons,
      benefits: analysis.benefits,
      warnings: analysis.warnings,
    };
  }

  private calculateScore(
    slot: { start: Date; end: Date },
    bay: Bay,
    bayEvents: CalendarEvent[],
    allEvents: CalendarEvent[],
    job: Job,
    preferences: SuggestionPreferences
  ): number {
    let score = 0;

    // Time optimality (morning slots preferred)
    const hour = slot.start.getHours();
    const timeScore = hour <= 10 ? 1 : hour <= 14 ? 0.8 : hour <= 16 ? 0.6 : 0.3;
    score += timeScore * SCORING_WEIGHTS.timeOptimality;

    // Bay utilization balance
    const bay1Events = allEvents.filter(e => e.resourceId === 'bay-1').length;
    const bay2Events = allEvents.filter(e => e.resourceId === 'bay-2').length;
    const utilizationScore = bay === 'bay-1' 
      ? bay1Events <= bay2Events ? 1 : 0.5
      : bay2Events <= bay1Events ? 1 : 0.5;
    score += utilizationScore * SCORING_WEIGHTS.bayUtilization;

    // Workflow efficiency (minimize gaps)
    const gapScore = this.calculateGapScore(slot, bayEvents);
    score += gapScore * SCORING_WEIGHTS.workflowEfficiency;

    // Priority boost for high-priority jobs
    if (job.priority === 'high') {
      score += 0.1;
    }

    // Preference adjustments
    if (preferences.preferredBay === bay) {
      score += 0.1;
    }

    if (preferences.avoidLunchHours && hour >= 12 && hour <= 13) {
      score -= 0.2;
    }

    return Math.min(1, Math.max(0, score));
  }

  private calculateGapScore(
    slot: { start: Date; end: Date },
    bayEvents: CalendarEvent[]
  ): number {
    if (bayEvents.length === 0) return 0.5;

    // Find events before and after this slot
    const eventsBefore = bayEvents.filter(e => new Date(e.end) <= slot.start);
    const eventsAfter = bayEvents.filter(e => new Date(e.start) >= slot.end);

    // Calculate gaps
    let gapScore = 0.5;

    if (eventsBefore.length > 0) {
      const lastEvent = eventsBefore[eventsBefore.length - 1];
      const gapBefore = (slot.start.getTime() - new Date(lastEvent.end).getTime()) / (1000 * 60);
      gapScore += gapBefore <= 30 ? 0.3 : gapBefore <= 60 ? 0.1 : -0.1;
    }

    if (eventsAfter.length > 0) {
      const nextEvent = eventsAfter[0];
      const gapAfter = (new Date(nextEvent.start).getTime() - slot.end.getTime()) / (1000 * 60);
      gapScore += gapAfter <= 30 ? 0.3 : gapAfter <= 60 ? 0.1 : -0.1;
    }

    return Math.min(1, Math.max(0, gapScore));
  }

  private analyzeSlot(
    slot: { start: Date; end: Date },
    bay: Bay,
    bayEvents: CalendarEvent[],
    allEvents: CalendarEvent[],
    job: Job
  ) {
    const reasons: string[] = [];
    const benefits: string[] = [];
    const warnings: string[] = [];

    const hour = slot.start.getHours();
    const dayOfWeek = slot.start.getDay();

    // Time-based analysis
    if (hour <= 10) {
      reasons.push('Early morning slot - optimal productivity');
      benefits.push('Fresh technician focus');
    } else if (hour >= 16) {
      warnings.push('Late afternoon - may affect completion time');
    }

    // Workload analysis
    const bay1Count = allEvents.filter(e => e.resourceId === 'bay-1').length;
    const bay2Count = allEvents.filter(e => e.resourceId === 'bay-2').length;

    if (bay === 'bay-1' && bay1Count <= bay2Count) {
      reasons.push('Balances workload between bays');
      benefits.push('Even bay utilization');
    } else if (bay === 'bay-2' && bay2Count <= bay1Count) {
      reasons.push('Balances workload between bays');
      benefits.push('Even bay utilization');
    }

    // Gap analysis
    const previousEvent = bayEvents
      .filter(e => new Date(e.end) <= slot.start)
      .sort((a, b) => new Date(b.end).getTime() - new Date(a.end).getTime())[0];

    if (previousEvent) {
      const gapMinutes = (slot.start.getTime() - new Date(previousEvent.end).getTime()) / (1000 * 60);
      if (gapMinutes <= 30) {
        reasons.push('Minimal gap between appointments');
        benefits.push('Efficient schedule flow');
      } else if (gapMinutes >= 120) {
        warnings.push('Large gap in schedule');
      }
    }

    // Job priority considerations
    if (job.priority === 'high') {
      benefits.push('Priority job - expedited scheduling');
    }

    // Day of week considerations
    if (dayOfWeek === 1) {
      benefits.push('Monday morning - week starts fresh');
    } else if (dayOfWeek === 5 && hour >= 15) {
      warnings.push('Friday afternoon - may rush completion');
    }

    return { reasons, benefits, warnings };
  }

  private generateDescription(
    analysis: { reasons: string[]; benefits: string[]; warnings: string[] },
    job: Job
  ): string {
    const parts = [];
    
    if (analysis.reasons.length > 0) {
      parts.push(analysis.reasons[0]);
    }
    
    if (analysis.benefits.length > 0) {
      parts.push(`Benefits: ${analysis.benefits[0]}`);
    }
    
    return parts.join(' • ') || `Available ${job.estHours}h slot`;
  }
}

export function AvailabilitySuggestions({
  job,
  existingEvents,
  selectedDate = new Date(),
  onSuggestionSelect,
  className = '',
}: AvailabilitySuggestionsProps) {
  const [suggestions, setSuggestions] = useState<SchedulingSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
  const preferences = useMemo<SuggestionPreferences>(() => ({
    avoidLunchHours: true,
    minimizeGaps: true,
    balanceWorkload: true,
    prioritizeEarlySlots: true,
  }), []);

  const suggestionEngine = useMemo(() => new SmartSuggestionEngine(), []);

  useEffect(() => {
    if (job) {
      const newSuggestions = suggestionEngine.generateSuggestions(
        job,
        existingEvents,
        selectedDate,
        preferences
      );
      setSuggestions(newSuggestions);
    }
  }, [job, existingEvents, selectedDate, preferences, suggestionEngine]);

  const handleSuggestionClick = (suggestion: SchedulingSuggestion) => {
    setSelectedSuggestion(suggestion.id);
    onSuggestionSelect(suggestion);
  };

  const getSuggestionIcon = (type: SchedulingSuggestion['type']) => {
    switch (type) {
      case 'optimal':
        return <Target className="h-4 w-4 text-green-600" />;
      case 'efficiency':
        return <Zap className="h-4 w-4 text-blue-600" />;
      case 'next-available':
        return <Clock className="h-4 w-4 text-orange-600" />;
      default:
        return <Calendar className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSuggestionBadgeVariant = (type: SchedulingSuggestion['type']) => {
    switch (type) {
      case 'optimal':
        return 'default';
      case 'efficiency':
        return 'secondary';
      case 'next-available':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (!job) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Smart Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Select a job to see scheduling suggestions</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Smart Suggestions
            <Badge variant="secondary" className="ml-1">
              {suggestions.length}
            </Badge>
          </CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">
          Optimal scheduling for {job.title} ({job.estHours}h)
        </p>
      </CardHeader>

      <CardContent className="pt-0">
        {suggestions.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No available slots found</p>
            <p className="text-xs">Try selecting a different date</p>
          </div>
        ) : (
          <ScrollArea className="h-80">
            <div className="space-y-3">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className={cn(
                    'p-3 rounded-lg border cursor-pointer transition-all duration-200',
                    'hover:shadow-md hover:border-primary/30',
                    selectedSuggestion === suggestion.id 
                      ? 'border-primary bg-primary/5 shadow-sm' 
                      : 'border-border hover:bg-muted/30'
                  )}
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <div className="space-y-2">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getSuggestionIcon(suggestion.type)}
                        <span className="font-medium text-sm">{suggestion.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getSuggestionBadgeVariant(suggestion.type)} className="text-xs">
                          {Math.round(suggestion.score * 100)}%
                        </Badge>
                      </div>
                    </div>

                    {/* Time and Bay */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {suggestion.startTime.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })} - {suggestion.endTime.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {suggestion.bay === 'bay-1' ? 'Bay 1' : 'Bay 2'}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-muted-foreground">
                      {suggestion.description}
                    </p>

                    {/* Benefits */}
                    {suggestion.benefits.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {suggestion.benefits.slice(0, 2).map((benefit, index) => (
                          <Badge key={index} variant="outline" className="text-xs px-1 py-0">
                            <CheckCircle className="h-2 w-2 mr-1" />
                            {benefit}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Warnings */}
                    {suggestion.warnings && suggestion.warnings.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {suggestion.warnings.slice(0, 1).map((warning, index) => (
                          <Badge key={index} variant="destructive" className="text-xs px-1 py-0">
                            <AlertCircle className="h-2 w-2 mr-1" />
                            {warning}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {suggestions.length > 0 && (
          <>
            <Separator className="my-3" />
            <div className="text-xs text-muted-foreground">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-3 w-3" />
                <span>Suggestions ranked by efficiency and availability</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowRight className="h-3 w-3" />
                <span>Click a suggestion to schedule the appointment</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export type { AvailabilitySuggestionsProps, SchedulingSuggestion };
