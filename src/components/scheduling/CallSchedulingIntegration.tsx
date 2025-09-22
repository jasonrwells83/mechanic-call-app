import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Calendar,
  Clock,
  User,
  MapPin,
  Wrench,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Edit,
  Save,
  RefreshCw,
  Zap,
  Target,
  Settings,
  Activity,
  TrendingUp,
  Users,
  Car,
  Phone,
  FileText,
  Star,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addDays, addHours, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { useUIStore } from '@/stores';

export interface SchedulingSlot {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  duration: number; // minutes
  bay: {
    id: string;
    name: string;
    type: 'general' | 'lift' | 'diagnostic' | 'express';
    capabilities: string[];
  };
  technician: {
    id: string;
    name: string;
    specialties: string[];
    rating: number;
  };
  isAvailable: boolean;
  isOptimal: boolean;
  conflictReason?: string;
  estimatedCost: number;
}

export interface SchedulingConflict {
  id: string;
  type: 'bay_unavailable' | 'technician_unavailable' | 'customer_conflict' | 'resource_conflict';
  severity: 'low' | 'medium' | 'high';
  description: string;
  affectedSlots: string[];
  suggestedResolution: string;
  canAutoResolve: boolean;
}

export interface JobSchedulingData {
  callId: string;
  customerId: string;
  vehicleId: string;
  serviceType: string;
  serviceCategory: 'maintenance' | 'repair' | 'diagnostic' | 'emergency';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedDuration: number;
  requiredSkills: string[];
  requiredEquipment: string[];
  preferredTechnician?: string;
  preferredTimeSlots: {
    date: Date;
    timePreference: 'morning' | 'afternoon' | 'evening' | 'anytime';
  }[];
  notes: string;
  customerRequests: string[];
}

interface CallSchedulingIntegrationProps {
  callId: string;
  jobData: JobSchedulingData;
  onSchedulingComplete?: (appointment: any, job: any) => void;
  onSchedulingCancel?: () => void;
  className?: string;
}

// Mock scheduling data
const mockAvailableSlots: SchedulingSlot[] = [
  {
    id: 'slot-1',
    date: addDays(new Date(), 1),
    startTime: '09:00',
    endTime: '11:00',
    duration: 120,
    bay: {
      id: 'bay-1',
      name: 'Bay 1',
      type: 'general',
      capabilities: ['oil-change', 'brake-service', 'general-repair'],
    },
    technician: {
      id: 'tech-1',
      name: 'Mike Johnson',
      specialties: ['engine', 'transmission', 'general-repair'],
      rating: 4.8,
    },
    isAvailable: true,
    isOptimal: true,
    estimatedCost: 150,
  },
  {
    id: 'slot-2',
    date: addDays(new Date(), 1),
    startTime: '14:00',
    endTime: '16:00',
    duration: 120,
    bay: {
      id: 'bay-2',
      name: 'Bay 2',
      type: 'lift',
      capabilities: ['brake-service', 'suspension', 'undercarriage'],
    },
    technician: {
      id: 'tech-2',
      name: 'Sarah Wilson',
      specialties: ['brakes', 'suspension', 'alignment'],
      rating: 4.9,
    },
    isAvailable: true,
    isOptimal: false,
    estimatedCost: 180,
  },
  {
    id: 'slot-3',
    date: addDays(new Date(), 2),
    startTime: '10:00',
    endTime: '12:00',
    duration: 120,
    bay: {
      id: 'bay-3',
      name: 'Bay 3',
      type: 'diagnostic',
      capabilities: ['diagnostic', 'electrical', 'computer-systems'],
    },
    technician: {
      id: 'tech-3',
      name: 'David Chen',
      specialties: ['electrical', 'diagnostic', 'computer-systems'],
      rating: 4.7,
    },
    isAvailable: false,
    isOptimal: false,
    conflictReason: 'Technician has another appointment',
    estimatedCost: 200,
  },
];

const mockConflicts: SchedulingConflict[] = [
  {
    id: 'conflict-1',
    type: 'technician_unavailable',
    severity: 'medium',
    description: 'Preferred technician Mike Johnson is not available during requested time slots',
    affectedSlots: ['slot-3'],
    suggestedResolution: 'Assign to Sarah Wilson (4.9★) or reschedule to tomorrow morning',
    canAutoResolve: true,
  },
  {
    id: 'conflict-2',
    type: 'bay_unavailable',
    severity: 'low',
    description: 'Preferred service bay is occupied during optimal time slot',
    affectedSlots: ['slot-1'],
    suggestedResolution: 'Use alternative bay with same capabilities',
    canAutoResolve: true,
  },
];

const BAY_TYPES = {
  general: { label: 'General Service', icon: Wrench, color: 'bg-blue-100 text-blue-800' },
  lift: { label: 'Lift Bay', icon: ArrowRight, color: 'bg-green-100 text-green-800' },
  diagnostic: { label: 'Diagnostic Bay', icon: Activity, color: 'bg-purple-100 text-purple-800' },
  express: { label: 'Express Service', icon: Zap, color: 'bg-orange-100 text-orange-800' },
};

const CONFLICT_TYPES = {
  bay_unavailable: { label: 'Bay Unavailable', icon: MapPin, color: 'text-orange-600' },
  technician_unavailable: { label: 'Technician Unavailable', icon: User, color: 'text-red-600' },
  customer_conflict: { label: 'Customer Conflict', icon: Phone, color: 'text-yellow-600' },
  resource_conflict: { label: 'Resource Conflict', icon: Settings, color: 'text-purple-600' },
};

export function CallSchedulingIntegration({
  callId,
  jobData,
  onSchedulingComplete,
  onSchedulingCancel,
  className = '',
}: CallSchedulingIntegrationProps) {
  const [selectedSlot, setSelectedSlot] = useState<SchedulingSlot | null>(null);
  const [schedulingStep, setSchedulingStep] = useState<'slots' | 'conflicts' | 'confirmation'>('slots');
  const [showConflictResolution, setShowConflictResolution] = useState(false);
  const [resolvedConflicts, setResolvedConflicts] = useState<string[]>([]);
  const [customNotes, setCustomNotes] = useState('');
  const [autoResolveConflicts, setAutoResolveConflicts] = useState(true);
  const [isScheduling, setIsScheduling] = useState(false);

  const { addToast } = useUIStore();

  // Filter available slots based on job requirements
  const filteredSlots = useMemo(() => {
    return mockAvailableSlots.filter(slot => {
      // Check if technician has required skills
      const hasRequiredSkills = jobData.requiredSkills.every(skill =>
        slot.technician.specialties.includes(skill)
      );

      // Check if bay has required capabilities
      const hasRequiredCapabilities = jobData.requiredEquipment.every(equipment =>
        slot.bay.capabilities.includes(equipment)
      );

      // Check duration compatibility
      const durationMatch = slot.duration >= jobData.estimatedDuration;

      return hasRequiredSkills && hasRequiredCapabilities && durationMatch;
    });
  }, [jobData]);

  // Get conflicts for selected slot
  const activeConflicts = useMemo(() => {
    if (!selectedSlot) return [];
    return mockConflicts.filter(conflict =>
      conflict.affectedSlots.includes(selectedSlot.id)
    );
  }, [selectedSlot]);

  // Calculate scheduling statistics
  const schedulingStats = useMemo(() => {
    const totalSlots = filteredSlots.length;
    const availableSlots = filteredSlots.filter(s => s.isAvailable).length;
    const optimalSlots = filteredSlots.filter(s => s.isOptimal && s.isAvailable).length;
    const conflictedSlots = filteredSlots.filter(s => !s.isAvailable).length;

    return {
      totalSlots,
      availableSlots,
      optimalSlots,
      conflictedSlots,
      availabilityRate: totalSlots > 0 ? Math.round((availableSlots / totalSlots) * 100) : 0,
    };
  }, [filteredSlots]);

  const handleSlotSelection = useCallback((slot: SchedulingSlot) => {
    setSelectedSlot(slot);
    
    if (!slot.isAvailable || activeConflicts.length > 0) {
      setSchedulingStep('conflicts');
      setShowConflictResolution(true);
    } else {
      setSchedulingStep('confirmation');
    }
  }, [activeConflicts]);

  const handleConflictResolution = useCallback((conflictId: string, resolve: boolean) => {
    if (resolve) {
      setResolvedConflicts(prev => [...prev, conflictId]);
    } else {
      setResolvedConflicts(prev => prev.filter(id => id !== conflictId));
    }
  }, []);

  const handleScheduleAppointment = useCallback(async () => {
    if (!selectedSlot) return;

    setIsScheduling(true);

    try {
      // Simulate scheduling API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      const appointment = {
        id: `apt-${Date.now()}`,
        callId,
        customerId: jobData.customerId,
        vehicleId: jobData.vehicleId,
        date: selectedSlot.date,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        bayId: selectedSlot.bay.id,
        technicianId: selectedSlot.technician.id,
        serviceType: jobData.serviceType,
        estimatedCost: selectedSlot.estimatedCost,
        notes: customNotes,
        status: 'scheduled',
      };

      const job = {
        id: `job-${Date.now()}`,
        callId,
        customerId: jobData.customerId,
        vehicleId: jobData.vehicleId,
        serviceType: jobData.serviceType,
        priority: jobData.priority,
        status: 'scheduled',
        appointmentId: appointment.id,
        estimatedDuration: jobData.estimatedDuration,
        assignedTechnician: selectedSlot.technician.id,
        notes: jobData.notes,
      };

      onSchedulingComplete?.(appointment, job);

      addToast({
        type: 'success',
        title: 'Appointment Scheduled',
        message: `Service appointment scheduled for ${format(selectedSlot.date, 'MMM d, yyyy')} at ${selectedSlot.startTime}`,
        duration: 5000,
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Scheduling Failed',
        message: 'Failed to schedule appointment. Please try again.',
        duration: 5000,
      });
    } finally {
      setIsScheduling(false);
    }
  }, [selectedSlot, callId, jobData, customNotes, onSchedulingComplete, addToast]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Job Scheduling Integration
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Convert call to scheduled appointment and job
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                Call: {callId}
              </Badge>
              <Badge variant="secondary" className={
                jobData.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                jobData.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                jobData.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }>
                {jobData.priority} Priority
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Scheduling Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Slots</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{schedulingStats.availableSlots}</div>
            <p className="text-xs text-muted-foreground">
              of {schedulingStats.totalSlots} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Optimal Slots</CardTitle>
            <Star className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{schedulingStats.optimalSlots}</div>
            <p className="text-xs text-muted-foreground">
              best matches
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conflicts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{schedulingStats.conflictedSlots}</div>
            <p className="text-xs text-muted-foreground">
              need resolution
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Availability</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{schedulingStats.availabilityRate}%</div>
            <p className="text-xs text-muted-foreground">
              success rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Job Details */}
      <Card>
        <CardHeader>
          <CardTitle>Job Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Service:</span>
                <span>{jobData.serviceType}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Duration:</span>
                <span>{jobData.estimatedDuration} minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Category:</span>
                <Badge variant="outline">{jobData.serviceCategory}</Badge>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <span className="font-medium">Required Skills:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {jobData.requiredSkills.map(skill => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <span className="font-medium">Required Equipment:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {jobData.requiredEquipment.map(equipment => (
                    <Badge key={equipment} variant="secondary" className="text-xs">
                      {equipment}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Scheduling Interface */}
      <Tabs value={schedulingStep} onValueChange={(value) => setSchedulingStep(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="slots">Available Slots</TabsTrigger>
          <TabsTrigger value="conflicts" disabled={activeConflicts.length === 0}>
            Conflicts ({activeConflicts.length})
          </TabsTrigger>
          <TabsTrigger value="confirmation" disabled={!selectedSlot}>
            Confirmation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="slots" className="space-y-4">
          <div className="grid gap-4">
            {filteredSlots.map((slot) => {
              const bayConfig = BAY_TYPES[slot.bay.type];
              const BayIcon = bayConfig.icon;

              return (
                <Card
                  key={slot.id}
                  className={cn(
                    'cursor-pointer transition-all hover:shadow-md',
                    selectedSlot?.id === slot.id && 'border-primary bg-primary/5',
                    !slot.isAvailable && 'opacity-60',
                    slot.isOptimal && slot.isAvailable && 'border-yellow-300 bg-yellow-50'
                  )}
                  onClick={() => handleSlotSelection(slot)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="text-lg font-semibold">
                            {format(slot.date, 'MMM d')}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(slot.date, 'EEE')}
                          </div>
                        </div>
                        
                        <Separator orientation="vertical" className="h-12" />
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {slot.startTime} - {slot.endTime}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              ({slot.duration} min)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <BayIcon className="h-4 w-4 text-muted-foreground" />
                            <span>{slot.bay.name}</span>
                            <Badge variant="outline" className={bayConfig.color}>
                              {bayConfig.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{slot.technician.name}</span>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm">{slot.technician.rating}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-right space-y-2">
                        <div className="text-lg font-semibold">
                          ${slot.estimatedCost}
                        </div>
                        <div className="flex items-center gap-2">
                          {slot.isOptimal && slot.isAvailable && (
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                              <Star className="h-3 w-3 mr-1" />
                              Optimal
                            </Badge>
                          )}
                          {slot.isAvailable ? (
                            <Badge variant="outline" className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Available
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-100 text-red-800">
                              <XCircle className="h-3 w-3 mr-1" />
                              Conflicted
                            </Badge>
                          )}
                        </div>
                        {slot.conflictReason && (
                          <p className="text-xs text-muted-foreground">
                            {slot.conflictReason}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {filteredSlots.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Available Slots</h3>
                  <p className="text-muted-foreground">
                    No scheduling slots match the job requirements. Try adjusting the service type or timing preferences.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="conflicts" className="space-y-4">
          <div className="space-y-4">
            {activeConflicts.map((conflict) => {
              const conflictConfig = CONFLICT_TYPES[conflict.type];
              const ConflictIcon = conflictConfig.icon;
              const isResolved = resolvedConflicts.includes(conflict.id);

              return (
                <Alert key={conflict.id} className={cn(
                  conflict.severity === 'high' && 'border-red-200 bg-red-50',
                  conflict.severity === 'medium' && 'border-orange-200 bg-orange-50',
                  conflict.severity === 'low' && 'border-yellow-200 bg-yellow-50',
                  isResolved && 'border-green-200 bg-green-50'
                )}>
                  <ConflictIcon className="h-4 w-4" />
                  <AlertTitle className="flex items-center justify-between">
                    <span>{conflictConfig.label}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={
                        conflict.severity === 'high' ? 'bg-red-100 text-red-800' :
                        conflict.severity === 'medium' ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      }>
                        {conflict.severity} severity
                      </Badge>
                      {conflict.canAutoResolve && (
                        <Badge variant="outline" className="bg-blue-100 text-blue-800">
                          Auto-resolvable
                        </Badge>
                      )}
                    </div>
                  </AlertTitle>
                  <AlertDescription className="mt-2">
                    <p className="mb-3">{conflict.description}</p>
                    <div className="space-y-2">
                      <p className="font-medium">Suggested Resolution:</p>
                      <p className="text-sm">{conflict.suggestedResolution}</p>
                      
                      <div className="flex items-center gap-4 mt-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`resolve-${conflict.id}`}
                            checked={isResolved}
                            onCheckedChange={(checked) => handleConflictResolution(conflict.id, checked as boolean)}
                          />
                          <Label htmlFor={`resolve-${conflict.id}`} className="text-sm">
                            Apply suggested resolution
                          </Label>
                        </div>
                        
                        {conflict.canAutoResolve && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConflictResolution(conflict.id, true)}
                          >
                            <Zap className="h-3 w-3 mr-1" />
                            Auto-resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              );
            })}

            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="auto-resolve-all"
                  checked={autoResolveConflicts}
                  onCheckedChange={setAutoResolveConflicts}
                />
                <Label htmlFor="auto-resolve-all">
                  Automatically resolve all conflicts when possible
                </Label>
              </div>
              
              <Button
                onClick={() => setSchedulingStep('confirmation')}
                disabled={activeConflicts.length > resolvedConflicts.length}
              >
                Continue to Confirmation
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="confirmation" className="space-y-4">
          {selectedSlot && (
            <div className="space-y-6">
              {/* Appointment Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Appointment Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Date:</span>
                        <span>{format(selectedSlot.date, 'EEEE, MMMM d, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Time:</span>
                        <span>{selectedSlot.startTime} - {selectedSlot.endTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Bay:</span>
                        <span>{selectedSlot.bay.name}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Technician:</span>
                        <span>{selectedSlot.technician.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Service:</span>
                        <span>{jobData.serviceType}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Estimated Cost:</span>
                        <span className="font-semibold">${selectedSlot.estimatedCost}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Additional Notes */}
              <Card>
                <CardHeader>
                  <CardTitle>Additional Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="custom-notes">Scheduling Notes</Label>
                      <Textarea
                        id="custom-notes"
                        value={customNotes}
                        onChange={(e) => setCustomNotes(e.target.value)}
                        placeholder="Add any special instructions or notes for this appointment..."
                        rows={3}
                      />
                    </div>
                    
                    {jobData.notes && (
                      <div>
                        <Label>Original Call Notes</Label>
                        <div className="p-3 bg-muted rounded-lg mt-1">
                          <p className="text-sm">{jobData.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={onSchedulingCancel}
                  disabled={isScheduling}
                >
                  Cancel
                </Button>
                
                <Button
                  onClick={handleScheduleAppointment}
                  disabled={isScheduling}
                  className="min-w-32"
                >
                  {isScheduling ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Schedule Appointment
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
