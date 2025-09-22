// Job Form Component
// Comprehensive form for creating and editing jobs with unified intake flow

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Save, 
  X, 
  AlertTriangle, 
  Clock, 
  User, 
  Car,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  PhoneCall,
  UserPlus,
  CarFront,
  Plus
} from 'lucide-react';
import { useCustomers, useCreateCustomer } from '@/hooks/use-customers';
import { useVehicles, useCreateVehicle } from '@/hooks/use-vehicles';
import { useCreateJob, useUpdateJob } from '@/hooks/use-jobs';
import { useCreateCall } from '@/hooks/use-calls';
import { useUIStore } from '@/stores';
import { JobStatusTransitionService } from '@/lib/job-status-transitions';
import { GlobalCustomerSearch } from '@/components/search/GlobalCustomerSearch';
import type { Job, JobStatus, JobPriority, CreateJobData, UpdateJobData, Customer, Vehicle, CreateCustomerData, CreateVehicleData, CreateCallData } from '@/types/database';

const invoiceNumberPattern = /^[A-Za-z0-9\-\/]{1,20}$/;

// Form validation schema
const jobFormSchema = z.object({
  title: z.string().min(1, 'Job title is required').max(100, 'Title too long'),
  customerId: z.string().optional(),
  vehicleId: z.string().optional(),
  estHours: z.number().min(0.5, 'Minimum 0.5 hours').max(40, 'Maximum 40 hours'),
  priority: z.enum(['low', 'medium', 'high']),
  status: z.enum(['intake', 'scheduled', 'in-progress', 'waiting-parts', 'completed']),
  notes: z.string().optional(),
  invoiceNumber: z.union([z.string().regex(invoiceNumberPattern, 'Use 1-20 characters: letters, numbers, dash, or slash.'), z.literal('')]).optional(),
  
  // Customer creation fields
  isNewCustomer: z.boolean().default(false),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email().optional().or(z.literal('')),
  customerAddress: z.string().optional(),
  
  // Vehicle creation fields
  isNewVehicle: z.boolean().default(false),
  vehicleYear: z.string().optional(),
  vehicleMake: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehicleLicense: z.string().optional(),
  vehicleMileage: z.string().optional(),
  vehicleColor: z.string().optional(),
  vehicleVin: z.string().optional(),
  
  // Intake-specific fields
  isIntakeMode: z.boolean().default(false),
  callOutcome: z.enum(['scheduled', 'quote-requested', 'follow-up', 'no-action', 'transferred', 'incomplete']).optional(),
  complaintDescription: z.string().optional(),
  customerConcerns: z.array(z.string()).default([]),
  followUpRequired: z.boolean().default(false),
  followUpDate: z.string().optional(),
  appointmentRequested: z.boolean().default(false),
  quoteRequested: z.boolean().default(false),
  
  // Scheduling fields
  estimatedCost: z.number().optional(),
  appointmentDate: z.string().optional(),
  appointmentTime: z.string().optional(),
}).refine((data) => {
  // If it's a new customer, require customer name and phone
  if (data.isNewCustomer) {
    return data.customerName && data.customerPhone;
  }
  // If it's not a new customer, require customerId
  if (!data.isNewCustomer) {
    return data.customerId;
  }
  return true;
}, {
  message: "Customer information is required",
  path: ["customerId"],
}).refine((data) => {
  // If it's a new vehicle, require basic vehicle info
  if (data.isNewVehicle) {
    return data.vehicleYear && data.vehicleMake && data.vehicleModel;
  }
  return true;
}, {
  message: "Vehicle information is required for new vehicles",
  path: ["vehicleYear"],
});

type JobFormData = z.infer<typeof jobFormSchema>;

interface JobFormProps {
  isOpen: boolean;
  onClose: () => void;
  job?: Job; // If provided, form is in edit mode
  initialStatus?: JobStatus;
  intakeMode?: boolean; // If true, form is in call intake mode
  initialCustomer?: Customer; // Pre-populate customer data
  initialVehicle?: Vehicle; // Pre-populate vehicle data
}

export function JobForm({ 
  isOpen, 
  onClose, 
  job, 
  initialStatus = 'intake',
  intakeMode = false,
  initialCustomer,
  initialVehicle
}: JobFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = Boolean(job);

  // Hooks
  const { data: customersResponse } = useCustomers();
  const { data: vehiclesResponse } = useVehicles();
  const { mutateAsync: createJob } = useCreateJob();
  const { mutateAsync: updateJob } = useUpdateJob();
  const { mutateAsync: createCustomer } = useCreateCustomer();
  const { mutateAsync: createVehicle } = useCreateVehicle();
  const { mutateAsync: createCall } = useCreateCall();
  const { addToast } = useUIStore();

  const customers = customersResponse?.data || [];
  const vehicles = vehiclesResponse?.data || [];

  // Form setup
  const form = useForm<JobFormData>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      title: job?.title || '',
      customerId: job?.customerId || initialCustomer?.id || '',
      vehicleId: job?.vehicleId || initialVehicle?.id || '',
      estHours: job?.estHours || 2,
      priority: job?.priority || 'medium',
      status: job?.status || initialStatus,
      notes: job?.notes || '',
      invoiceNumber: job?.invoiceNumber || '',
      
      // Customer fields
      isNewCustomer: !job?.customerId && !initialCustomer,
      customerName: initialCustomer?.name || '',
      customerPhone: initialCustomer?.phone || '',
      customerEmail: initialCustomer?.email || '',
      customerAddress: initialCustomer?.address || '',
      
      // Vehicle fields
      isNewVehicle: !job?.vehicleId && !initialVehicle,
      vehicleYear: initialVehicle?.year?.toString() || '',
      vehicleMake: initialVehicle?.make || '',
      vehicleModel: initialVehicle?.model || '',
      vehicleLicense: initialVehicle?.licensePlate || '',
      vehicleMileage: initialVehicle?.mileage?.toString() || '',
      vehicleColor: initialVehicle?.color || '',
      vehicleVin: initialVehicle?.vin || '',
      
      // Intake fields
      isIntakeMode: intakeMode,
      callOutcome: 'incomplete',
      complaintDescription: '',
      customerConcerns: [],
      followUpRequired: false,
      followUpDate: '',
      appointmentRequested: false,
      quoteRequested: false,
      
      // Scheduling fields
      estimatedCost: 0,
      appointmentDate: '',
      appointmentTime: '',
    },
  });

  // Reset form when job changes
  useEffect(() => {
    if (job) {
      form.reset({
        title: job.title,
        customerId: job.customerId,
        vehicleId: job.vehicleId,
        estHours: job.estHours,
        priority: job.priority,
        status: job.status,
        notes: job.notes || '',
        invoiceNumber: job.invoiceNumber || '',
        
        // Customer fields
        isNewCustomer: false,
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        customerAddress: '',
        
        // Vehicle fields
        isNewVehicle: false,
        vehicleYear: '',
        vehicleMake: '',
        vehicleModel: '',
        vehicleLicense: '',
        vehicleMileage: '',
        vehicleColor: '',
        vehicleVin: '',
        
        // Intake fields
        isIntakeMode: false,
        callOutcome: 'incomplete',
        complaintDescription: '',
        customerConcerns: [],
        followUpRequired: false,
        followUpDate: '',
        appointmentRequested: false,
        quoteRequested: false,
        
        // Scheduling fields
        estimatedCost: 0,
        appointmentDate: '',
        appointmentTime: '',
      });
    } else {
      form.reset({
        title: '',
        customerId: initialCustomer?.id || '',
        vehicleId: initialVehicle?.id || '',
        estHours: 2,
        priority: 'medium',
        status: initialStatus,
        notes: '',
        invoiceNumber: '',
        
        // Customer fields
        isNewCustomer: !initialCustomer,
        customerName: initialCustomer?.name || '',
        customerPhone: initialCustomer?.phone || '',
        customerEmail: initialCustomer?.email || '',
        customerAddress: initialCustomer?.address || '',
        
        // Vehicle fields
        isNewVehicle: !initialVehicle,
        vehicleYear: initialVehicle?.year?.toString() || '',
        vehicleMake: initialVehicle?.make || '',
        vehicleModel: initialVehicle?.model || '',
        vehicleLicense: initialVehicle?.licensePlate || '',
        vehicleMileage: initialVehicle?.mileage?.toString() || '',
        vehicleColor: initialVehicle?.color || '',
        vehicleVin: initialVehicle?.vin || '',
        
        // Intake fields
        isIntakeMode: intakeMode,
        callOutcome: 'incomplete',
        complaintDescription: '',
        customerConcerns: [],
        followUpRequired: false,
        followUpDate: '',
        appointmentRequested: false,
        quoteRequested: false,
        
        // Scheduling fields
        estimatedCost: 0,
        appointmentDate: '',
        appointmentTime: '',
      });
    }
  }, [job, initialStatus, intakeMode, initialCustomer, initialVehicle, form]);

  // Get available status transitions
  const currentStatus = form.watch('status');
  const availableStatuses = isEditMode 
    ? JobStatusTransitionService.getValidTransitions(currentStatus).map(t => t.to)
    : ['incoming-call', 'scheduled'];

  // Calculate workflow progress
  const workflowProgress = JobStatusTransitionService.getWorkflowProgress(currentStatus);

  const handleSubmit = async (data: JobFormData) => {
    setIsSubmitting(true);

    try {
      let finalCustomerId = data.customerId;
      let finalVehicleId = data.vehicleId;
      const normalizedInvoiceInput = data.invoiceNumber?.trim() ?? '';
      const invoiceNumberForPayload = normalizedInvoiceInput === '' ? undefined : normalizedInvoiceInput;

      if (isEditMode && job) {
        // Update existing job
        const updateData: UpdateJobData = {
          title: data.title,
          customerId: data.customerId || '',
          vehicleId: data.vehicleId || undefined,
          estHours: data.estHours,
          priority: data.priority,
          notes: data.notes || undefined,
          invoiceNumber: invoiceNumberForPayload,
        };

        await updateJob({ id: job.id, data: updateData });

        addToast({
          type: 'success',
          title: 'Job Updated',
          message: `${data.title} has been updated successfully`,
          duration: 3000,
        });
      } else {
        // Create new customer if needed
        if (data.isNewCustomer && data.customerName && data.customerPhone) {
          const customerData: CreateCustomerData = {
            name: data.customerName,
            phone: data.customerPhone,
            email: data.customerEmail || undefined,
            address: data.customerAddress || undefined,
          };

          const newCustomer = await createCustomer(customerData);
          finalCustomerId = newCustomer.id;
        }

        // Create new vehicle if needed
        if (data.isNewVehicle && data.vehicleYear && data.vehicleMake && data.vehicleModel && finalCustomerId) {
          const vehicleData: CreateVehicleData = {
            customerId: finalCustomerId,
            year: parseInt(data.vehicleYear),
            make: data.vehicleMake,
            model: data.vehicleModel,
            licensePlate: data.vehicleLicense || undefined,
            mileage: data.vehicleMileage ? parseInt(data.vehicleMileage) : undefined,
            color: data.vehicleColor || undefined,
            vin: data.vehicleVin || undefined,
          };

          const newVehicle = await createVehicle(vehicleData);
          finalVehicleId = newVehicle.id;
        }

        // Create new job
        const createData: CreateJobData = {
          title: data.title,
          customerId: finalCustomerId || '',
          vehicleId: finalVehicleId || '',
          estHours: data.estHours,
          priority: data.priority,
          status: data.status,
          notes: data.notes || undefined,
          invoiceNumber: invoiceNumberForPayload,
        };

        const newJob = await createJob(createData);

        // Create call record if in intake mode
        if (data.isIntakeMode && finalCustomerId) {
          const callData: CreateCallData = {
            customerId: finalCustomerId,
            jobId: newJob.id,
            phoneNumber: data.customerPhone || '',
            callStartTime: new Date().toISOString(),
            callDuration: 0, // Will be updated when call ends
            callReason: data.complaintDescription || data.title,
            callNotes: data.notes || '',
            customerConcerns: data.customerConcerns,
            followUpRequired: data.followUpRequired,
            followUpDate: data.followUpDate ? new Date(data.followUpDate).toISOString() : undefined,
            appointmentRequested: data.appointmentRequested,
            quoteRequested: data.quoteRequested,
            callOutcome: data.callOutcome || 'incomplete',
            callTakenBy: 'Current User', // This would come from auth
            callSource: 'phone',
          };

          await createCall(callData);
        }

        addToast({
          type: 'success',
          title: data.isIntakeMode ? 'Call Intake Completed' : 'Job Created',
          message: data.isIntakeMode 
            ? `Call intake for ${data.customerName || 'customer'} has been saved and job created`
            : `${data.title} has been created successfully`,
          duration: 3000,
        });
      }

      onClose();
      form.reset();
    } catch (error) {
      addToast({
        type: 'error',
        title: isEditMode ? 'Failed to Update Job' : 'Failed to Create Job',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditMode ? (
              <>
                <Car className="h-5 w-5" />
                Edit Job: {job?.title}
              </>
            ) : intakeMode ? (
              <>
                <PhoneCall className="h-5 w-5" />
                Call Intake - Create Job
              </>
            ) : (
              <>
                <Plus className="h-5 w-5" />
                Create New Job
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? 'Update job details and track progress through the workflow'
              : intakeMode
              ? 'Capture call details and create job record in one unified flow'
              : 'Enter customer information and job details to create a new service request'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Workflow Progress */}
            {isEditMode && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Workflow Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Status: {currentStatus.replace('-', ' ')}</span>
                      <span>{workflowProgress}% Complete</span>
                    </div>
                    <div className="workflow-progress">
                      <div 
                        className="workflow-progress-bar" 
                        style={{ width: `${workflowProgress}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Job Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {intakeMode ? 'Work Description' : 'Job Title'} *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={intakeMode 
                        ? "e.g., Brake inspection, strange noise when braking"
                        : "e.g., Oil change and brake inspection"
                      } 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Customer Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isEditMode && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FormField
                        control={form.control}
                        name="isNewCustomer"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              New Customer
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {!form.watch('isNewCustomer') && !isEditMode ? (
                  <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Existing Customer *</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select customer" />
                            </SelectTrigger>
                            <SelectContent>
                              {customers.map((customer) => (
                                <SelectItem key={customer.id} value={customer.id}>
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    <span>{customer.name}</span>
                                    <span className="text-muted-foreground">
                                      {customer.phone}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (form.watch('isNewCustomer') || isEditMode) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="customerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="John Smith" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="customerPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number *</FormLabel>
                          <FormControl>
                            <Input placeholder="(555) 123-4567" type="tel" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="customerEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="john@example.com" type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="customerAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input placeholder="123 Main St, City, State 12345" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Vehicle Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CarFront className="h-4 w-4" />
                  Vehicle Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isEditMode && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FormField
                        control={form.control}
                        name="isNewVehicle"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              New Vehicle
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {!form.watch('isNewVehicle') && !isEditMode && form.watch('customerId') ? (
                  <FormField
                    control={form.control}
                    name="vehicleId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Vehicle</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select vehicle" />
                            </SelectTrigger>
                            <SelectContent>
                              {vehicles
                                .filter(v => v.customerId === form.watch('customerId'))
                                .map((vehicle) => (
                                  <SelectItem key={vehicle.id} value={vehicle.id}>
                                    {vehicle.year} {vehicle.make} {vehicle.model}
                                    {vehicle.licensePlate && ` - ${vehicle.licensePlate}`}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (form.watch('isNewVehicle') || isEditMode) && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <FormField
                      control={form.control}
                      name="vehicleYear"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year *</FormLabel>
                          <FormControl>
                            <Input placeholder="2020" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="vehicleMake"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Make *</FormLabel>
                          <FormControl>
                            <Input placeholder="Honda" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="vehicleModel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Model *</FormLabel>
                          <FormControl>
                            <Input placeholder="Civic" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="vehicleLicense"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>License Plate</FormLabel>
                          <FormControl>
                            <Input placeholder="ABC-1234" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="vehicleMileage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mileage</FormLabel>
                          <FormControl>
                            <Input placeholder="50,000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="vehicleColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Color</FormLabel>
                          <FormControl>
                            <Input placeholder="Blue" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="vehicleVin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>VIN</FormLabel>
                          <FormControl>
                            <Input placeholder="1HGBH41JXMN109186" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Intake-specific fields */}
            {intakeMode && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PhoneCall className="h-4 w-4" />
                    Call Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="complaintDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Complaint/Concern</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe what the customer is experiencing..."
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="callOutcome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Call Outcome</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select outcome" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="scheduled">Appointment Scheduled</SelectItem>
                                <SelectItem value="quote-requested">Quote Requested</SelectItem>
                                <SelectItem value="follow-up">Follow-up Required</SelectItem>
                                <SelectItem value="no-action">No Action Needed</SelectItem>
                                <SelectItem value="transferred">Call Transferred</SelectItem>
                                <SelectItem value="incomplete">Incomplete Call</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="appointmentRequested"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              Appointment Requested
                            </FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="quoteRequested"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              Quote Requested
                            </FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="followUpRequired"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              Follow-up Required
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {form.watch('followUpRequired') && (
                    <FormField
                      control={form.control}
                      name="followUpDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Follow-up Date</FormLabel>
                          <FormControl>
                            <Input
                              type="datetime-local"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>
            )}

            {/* Job Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Job Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="estHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estimated Hours *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.5"
                            min="0.5"
                            max="40"
                            placeholder="2.0" 
                            {...field} 
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          <Clock className="h-3 w-3 inline mr-1" />
                          Time needed to complete the job
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">
                              <Badge variant="secondary">Low Priority</Badge>
                            </SelectItem>
                            <SelectItem value="medium">
                              <Badge variant="default">Medium Priority</Badge>
                            </SelectItem>
                            <SelectItem value="high">
                              <Badge variant="destructive">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                High Priority
                              </Badge>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="invoiceNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Optional invoice identifier"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Letters, numbers, dash, or slash (max 20 characters).
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="estimatedCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estimated Cost</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                              type="number" 
                              step="0.01"
                              min="0"
                              placeholder="0.00" 
                              className="pl-10"
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Preliminary cost estimate for the customer
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {isEditMode && (
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableStatuses.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status.replace('-', ' ').toUpperCase()}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Only valid transitions are shown
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the work to be performed, customer concerns, special instructions..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Include any special instructions, customer concerns, or additional details
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </form>
        </Form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={form.handleSubmit(handleSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin h-4 w-4 mr-2 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full" />
                {isEditMode ? 'Updating...' : intakeMode ? 'Completing Intake...' : 'Creating...'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditMode ? 'Update Job' : intakeMode ? 'Complete Call Intake' : 'Create Job'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { JobFormProps };
