// Call to Job Converter Component
// One-click conversion from call records to scheduled jobs with intelligent pre-population

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Calendar,
  CalendarDays,
  Clock,
  Wrench,
  User,
  Car,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Zap,
  ArrowRight,
  Plus,
  Edit,
  Save,
  X,
  Star,
  Target,
  TrendingUp,
  FileText,
  Phone,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addDays, addHours, startOfDay } from 'date-fns';
import { useUIStore } from '@/stores';
import { useCreateJob } from '@/hooks/use-jobs';
import { useCreateAppointment } from '@/hooks/use-appointments';
import type { Call } from './CallList';
import type { Job } from '@/types/database';

interface ConversionOptions {
  createJob: boolean;
  scheduleAppointment: boolean;
  sendConfirmation: boolean;
  updateCallStatus: boolean;
  assignTechnician: boolean;
  setReminders: boolean;
}

interface JobConversionData {
  // Job Information
  title: string;
  description: string;
  serviceCategory: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'incoming-call' | 'scheduled' | 'confirmed';
  estHours: number;
  estCost: number;
  
  // Customer & Vehicle (inherited from call)
  customerId: string;
  customerName: string;
  vehicleId?: string;
  vehicleInfo: string;
  
  // Scheduling
  scheduledDate?: Date;
  scheduledTime?: string;
  bay?: string;
  assignedTechnicianId?: string;
  
  // Additional Details
  notes: string;
  customerConcerns: string[];
  urgentFlags: string[];
  
  // Conversion Options
  options: ConversionOptions;
}

interface CallToJobConverterProps {
  call: Call;
  onConversionComplete?: (job: Job, appointment?: any) => void;
  onCancel?: () => void;
  className?: string;
}

// Service categories with estimated hours and costs
const serviceEstimates = {
  'oil-change': { hours: 0.5, cost: 75 },
  'brake-service': { hours: 2, cost: 300 },
  'tire-rotation': { hours: 0.75, cost: 50 },
  'engine-diagnostic': { hours: 1, cost: 150 },
  'transmission-service': { hours: 3, cost: 450 },
  'ac-service': { hours: 1.5, cost: 200 },
  'battery-replacement': { hours: 0.5, cost: 120 },
  'alignment': { hours: 1, cost: 100 },
  'inspection': { hours: 0.5, cost: 30 },
  'general-repair': { hours: 2, cost: 200 },
};

// Available bays and technicians
const availableBays = ['Bay 1', 'Bay 2', 'Bay 3', 'Bay 4'];
const availableTechnicians = [
  { id: 'tech1', name: 'Mike Johnson', specialties: ['engine', 'transmission'] },
  { id: 'tech2', name: 'Sarah Wilson', specialties: ['brakes', 'suspension'] },
  { id: 'tech3', name: 'David Chen', specialties: ['electrical', 'ac'] },
  { id: 'tech4', name: 'Lisa Rodriguez', specialties: ['general', 'inspection'] },
];

export function CallToJobConverter({
  call,
  onConversionComplete,
  onCancel,
  className = '',
}: CallToJobConverterProps) {
  // Initialize conversion data with intelligent pre-population from call
  const [conversionData, setConversionData] = useState<JobConversionData>(() => {
    const serviceKey = call.serviceType.toLowerCase().replace(/\s+/g, '-');
    const estimate = serviceEstimates[serviceKey as keyof typeof serviceEstimates] || 
                    serviceEstimates['general-repair'];
    
    return {
      title: `${call.serviceType} - ${call.vehicleYear} ${call.vehicleMake} ${call.vehicleModel}`,
      description: call.serviceDescription || call.callReason,
      serviceCategory: call.serviceCategory,
      priority: call.servicePriority,
      status: call.appointmentRequested ? 'scheduled' : 'incoming-call',
      estHours: estimate.hours,
      estCost: call.estimatedCost || estimate.cost,
      customerId: call.customerId || '',
      customerName: call.customerName,
      vehicleId: call.vehicleId,
      vehicleInfo: `${call.vehicleYear} ${call.vehicleMake} ${call.vehicleModel}`,
      scheduledDate: call.appointmentRequested ? addDays(new Date(), 1) : undefined,
      scheduledTime: '09:00',
      bay: 'Bay 1',
      notes: call.callNotes || '',
      customerConcerns: call.customerConcerns,
      urgentFlags: call.servicePriority === 'urgent' ? ['urgent-service'] : [],
      options: {
        createJob: true,
        scheduleAppointment: call.appointmentRequested,
        sendConfirmation: call.appointmentRequested,
        updateCallStatus: true,
        assignTechnician: true,
        setReminders: call.appointmentRequested,
      },
    };
  });

  const [isConverting, setIsConverting] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Hooks
  const { mutate: createJob } = useCreateJob();
  const { mutate: createAppointment } = useCreateAppointment();
  const { addToast } = useUIStore();

  // Calculate suggested appointment slots
  const suggestedSlots = useMemo(() => {
    const slots = [];
    const startDate = startOfDay(addDays(new Date(), 1));
    
    for (let day = 0; day < 5; day++) {
      const date = addDays(startDate, day);
      const dayName = format(date, 'EEEE');
      
      // Morning slots
      slots.push({
        date,
        time: '09:00',
        label: `${dayName} 9:00 AM`,
        available: true,
        optimal: day === 0, // Tomorrow is optimal
      });
      
      slots.push({
        date,
        time: '11:00',
        label: `${dayName} 11:00 AM`,
        available: true,
        optimal: false,
      });
      
      // Afternoon slots
      slots.push({
        date,
        time: '14:00',
        label: `${dayName} 2:00 PM`,
        available: day < 2, // Only first 2 days available
        optimal: false,
      });
    }
    
    return slots.filter(slot => slot.available);
  }, []);

  // Handle form updates
  const updateConversionData = useCallback((updates: Partial<JobConversionData>) => {
    setConversionData(prev => ({ ...prev, ...updates }));
  }, []);

  const updateOptions = useCallback((option: keyof ConversionOptions, value: boolean) => {
    setConversionData(prev => ({
      ...prev,
      options: { ...prev.options, [option]: value },
    }));
  }, []);

  // Handle service type change with auto-estimation
  const handleServiceChange = useCallback((serviceType: string) => {
    const serviceKey = serviceType.toLowerCase().replace(/\s+/g, '-');
    const estimate = serviceEstimates[serviceKey as keyof typeof serviceEstimates] || 
                    serviceEstimates['general-repair'];
    
    updateConversionData({
      title: `${serviceType} - ${conversionData.vehicleInfo}`,
      estHours: estimate.hours,
      estCost: conversionData.estCost || estimate.cost,
    });
  }, [conversionData.vehicleInfo, conversionData.estCost, updateConversionData]);

  // Handle quick slot selection
  const handleSlotSelect = useCallback((slot: any) => {
    updateConversionData({
      scheduledDate: slot.date,
      scheduledTime: slot.time,
    });
  }, [updateConversionData]);

  // Handle conversion submission
  const handleConvert = useCallback(async () => {
    setIsConverting(true);
    
    try {
      let createdJob: Job | undefined;
      let createdAppointment: any | undefined;
      
      // Create job if requested
      if (conversionData.options.createJob) {
        const jobData = {
          title: conversionData.title,
          description: conversionData.description,
          customerId: conversionData.customerId,
          vehicleId: conversionData.vehicleId,
          serviceType: conversionData.title.split(' - ')[0],
          category: conversionData.serviceCategory,
          priority: conversionData.priority,
          status: conversionData.status,
          estHours: conversionData.estHours,
          estCost: conversionData.estCost,
          notes: conversionData.notes,
          customerConcerns: conversionData.customerConcerns,
          createdFromCall: call.id,
        };

        await new Promise<void>((resolve, reject) => {
          createJob(jobData, {
            onSuccess: (job) => {
              createdJob = job;
              resolve();
            },
            onError: reject,
          });
        });
      }

      // Create appointment if requested
      if (conversionData.options.scheduleAppointment && conversionData.scheduledDate) {
        const appointmentData = {
          title: conversionData.title,
          customerId: conversionData.customerId,
          vehicleId: conversionData.vehicleId,
          jobId: createdJob?.id,
          date: conversionData.scheduledDate,
          time: conversionData.scheduledTime,
          bay: conversionData.bay,
          technicianId: conversionData.assignedTechnicianId,
          duration: conversionData.estHours,
          notes: conversionData.notes,
          status: 'scheduled',
        };

        await new Promise<void>((resolve, reject) => {
          createAppointment(appointmentData, {
            onSuccess: (appointment) => {
              createdAppointment = appointment;
              resolve();
            },
            onError: reject,
          });
        });
      }

      // Success handling
      addToast({
        type: 'success',
        title: 'Conversion Successful',
        message: `Call has been converted to ${createdJob ? 'job' : ''}${createdJob && createdAppointment ? ' and ' : ''}${createdAppointment ? 'appointment' : ''}`,
        duration: 4000,
      });

      // Trigger completion callback
      onConversionComplete?.(createdJob!, createdAppointment);

      // Additional actions based on options
      if (conversionData.options.sendConfirmation) {
        // In real app, this would send confirmation email/SMS
        addToast({
          type: 'info',
          title: 'Confirmation Sent',
          message: `Appointment confirmation sent to ${conversionData.customerName}`,
          duration: 3000,
        });
      }

      if (conversionData.options.setReminders) {
        // In real app, this would set up automated reminders
        addToast({
          type: 'info',
          title: 'Reminders Set',
          message: 'Appointment reminders have been scheduled',
          duration: 3000,
        });
      }

    } catch (error) {
      console.error('Conversion failed:', error);
      addToast({
        type: 'error',
        title: 'Conversion Failed',
        message: 'There was an error converting the call. Please try again.',
        duration: 5000,
      });
    } finally {
      setIsConverting(false);
    }
  }, [conversionData, call.id, createJob, createAppointment, addToast, onConversionComplete]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Conversion Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              Convert Call to Job
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <Badge variant="outline" className="text-blue-600">
                {call.callId}
              </Badge>
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Badge variant={call.servicePriority === 'urgent' ? 'destructive' : 'secondary'}>
                {call.servicePriority} priority
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Call Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Call Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <span className="text-sm text-muted-foreground">Customer:</span>
                <p className="font-medium">{call.customerName}</p>
              </div>
              
              <div>
                <span className="text-sm text-muted-foreground">Vehicle:</span>
                <p>{call.vehicleYear} {call.vehicleMake} {call.vehicleModel}</p>
              </div>
              
              <div>
                <span className="text-sm text-muted-foreground">Service Requested:</span>
                <p className="font-medium">{call.serviceType}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <span className="text-sm text-muted-foreground">Call Date:</span>
                <p>{format(call.callStartTime, 'PPp')}</p>
              </div>
              
              <div>
                <span className="text-sm text-muted-foreground">Duration:</span>
                <p>{call.callDuration ? `${Math.floor(call.callDuration / 60)}:${(call.callDuration % 60).toString().padStart(2, '0')}` : 'N/A'}</p>
              </div>
              
              <div>
                <span className="text-sm text-muted-foreground">Outcome:</span>
                <Badge variant="outline" className="capitalize">
                  {call.callOutcome.replace('-', ' ')}
                </Badge>
              </div>
            </div>
          </div>
          
          {call.customerConcerns.length > 0 && (
            <div className="mt-4">
              <span className="text-sm text-muted-foreground">Customer Concerns:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {call.customerConcerns.map((concern, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {concern}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Job Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Job Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="jobTitle">Job Title</Label>
            <Input
              id="jobTitle"
              value={conversionData.title}
              onChange={(e) => updateConversionData({ title: e.target.value })}
              placeholder="Enter job title..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={conversionData.priority} 
                onValueChange={(value: any) => updateConversionData({ priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="estHours">Estimated Hours</Label>
              <Input
                id="estHours"
                type="number"
                step="0.25"
                value={conversionData.estHours}
                onChange={(e) => updateConversionData({ estHours: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label htmlFor="estCost">Estimated Cost</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="estCost"
                  type="number"
                  value={conversionData.estCost}
                  onChange={(e) => updateConversionData({ estCost: parseFloat(e.target.value) || 0 })}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Job Description</Label>
            <Textarea
              id="description"
              value={conversionData.description}
              onChange={(e) => updateConversionData({ description: e.target.value })}
              placeholder="Detailed description of the work to be performed..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Scheduling Section */}
      {conversionData.options.scheduleAppointment && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Appointment Scheduling
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick Slot Selection */}
            <div>
              <Label>Suggested Time Slots</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                {suggestedSlots.slice(0, 6).map((slot, index) => (
                  <Button
                    key={index}
                    variant={
                      conversionData.scheduledDate && 
                      format(conversionData.scheduledDate, 'yyyy-MM-dd') === format(slot.date, 'yyyy-MM-dd') &&
                      conversionData.scheduledTime === slot.time
                        ? 'default' 
                        : 'outline'
                    }
                    size="sm"
                    onClick={() => handleSlotSelect(slot)}
                    className="justify-start"
                  >
                    <Clock className="h-3 w-3 mr-2" />
                    {slot.label}
                    {slot.optimal && <Star className="h-3 w-3 ml-2 text-yellow-500" />}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Date/Time */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="scheduleDate">Date</Label>
                <Input
                  id="scheduleDate"
                  type="date"
                  value={conversionData.scheduledDate ? format(conversionData.scheduledDate, 'yyyy-MM-dd') : ''}
                  onChange={(e) => updateConversionData({ 
                    scheduledDate: e.target.value ? new Date(e.target.value) : undefined 
                  })}
                />
              </div>

              <div>
                <Label htmlFor="scheduleTime">Time</Label>
                <Input
                  id="scheduleTime"
                  type="time"
                  value={conversionData.scheduledTime || ''}
                  onChange={(e) => updateConversionData({ scheduledTime: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="bay">Service Bay</Label>
                <Select 
                  value={conversionData.bay || ''} 
                  onValueChange={(value) => updateConversionData({ bay: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select bay..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBays.map((bay) => (
                      <SelectItem key={bay} value={bay}>
                        {bay}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Technician Assignment */}
            {conversionData.options.assignTechnician && (
              <div>
                <Label htmlFor="technician">Assign Technician</Label>
                <Select 
                  value={conversionData.assignedTechnicianId || ''} 
                  onValueChange={(value) => updateConversionData({ assignedTechnicianId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select technician..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTechnicians.map((tech) => (
                      <SelectItem key={tech.id} value={tech.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{tech.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {tech.specialties.join(', ')}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Conversion Options */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Conversion Options</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            >
              {showAdvancedOptions ? 'Hide' : 'Show'} Advanced Options
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Basic Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="createJob"
                checked={conversionData.options.createJob}
                onCheckedChange={(checked) => updateOptions('createJob', !!checked)}
              />
              <Label htmlFor="createJob" className="cursor-pointer">
                Create Job Record
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="scheduleAppointment"
                checked={conversionData.options.scheduleAppointment}
                onCheckedChange={(checked) => updateOptions('scheduleAppointment', !!checked)}
              />
              <Label htmlFor="scheduleAppointment" className="cursor-pointer">
                Schedule Appointment
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="updateCallStatus"
                checked={conversionData.options.updateCallStatus}
                onCheckedChange={(checked) => updateOptions('updateCallStatus', !!checked)}
              />
              <Label htmlFor="updateCallStatus" className="cursor-pointer">
                Update Call Status
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="sendConfirmation"
                checked={conversionData.options.sendConfirmation}
                onCheckedChange={(checked) => updateOptions('sendConfirmation', !!checked)}
              />
              <Label htmlFor="sendConfirmation" className="cursor-pointer">
                Send Confirmation
              </Label>
            </div>
          </div>

          {/* Advanced Options */}
          {showAdvancedOptions && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="assignTechnician"
                  checked={conversionData.options.assignTechnician}
                  onCheckedChange={(checked) => updateOptions('assignTechnician', !!checked)}
                />
                <Label htmlFor="assignTechnician" className="cursor-pointer">
                  Assign Technician
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="setReminders"
                  checked={conversionData.options.setReminders}
                  onCheckedChange={(checked) => updateOptions('setReminders', !!checked)}
                />
                <Label htmlFor="setReminders" className="cursor-pointer">
                  Set Reminders
                </Label>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-4">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={isConverting}>
            Cancel
          </Button>
        )}
        
        <Button 
          onClick={handleConvert} 
          disabled={isConverting || !conversionData.title}
          className="min-w-32"
        >
          {isConverting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Converting...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Convert to Job
            </>
          )}
        </Button>
      </div>

      {/* Conversion Preview */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            Conversion Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {conversionData.options.createJob && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Job will be created: <strong>{conversionData.title}</strong></span>
              </div>
            )}
            
            {conversionData.options.scheduleAppointment && conversionData.scheduledDate && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>
                  Appointment will be scheduled: <strong>
                    {format(conversionData.scheduledDate, 'PPP')} at {conversionData.scheduledTime}
                  </strong>
                </span>
              </div>
            )}
            
            {conversionData.options.sendConfirmation && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Confirmation will be sent to <strong>{conversionData.customerName}</strong></span>
              </div>
            )}
            
            {conversionData.options.updateCallStatus && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Call status will be updated to <strong>Scheduled</strong></span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export type { CallToJobConverterProps, JobConversionData, ConversionOptions };
