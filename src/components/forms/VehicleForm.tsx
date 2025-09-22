// Vehicle Form Component
// Comprehensive form for creating and editing vehicles with detailed information

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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Save, 
  X, 
  Car, 
  Plus,
  Calendar,
  Gauge,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
  Wrench
} from 'lucide-react';
import { useCreateVehicle, useUpdateVehicle } from '@/hooks/use-vehicles';
import { useCustomers } from '@/hooks/use-customers';
import { useUIStore } from '@/stores';
import type { Vehicle, CreateVehicleData, UpdateVehicleData, Customer } from '@/types/database';

// Form validation schema
const vehicleFormSchema = z.object({
  // Basic vehicle information
  customerId: z.string().min(1, 'Customer is required'),
  year: z.number().min(1900, 'Invalid year').max(new Date().getFullYear() + 2, 'Invalid year'),
  make: z.string().min(1, 'Make is required').max(50, 'Make too long'),
  model: z.string().min(1, 'Model is required').max(50, 'Model too long'),
  
  // Vehicle identification
  vin: z.string().optional(),
  licensePlate: z.string().optional(),
  color: z.string().optional(),
  
  // Engine and specifications
  engine: z.string().optional(),
  transmission: z.enum(['manual', 'automatic', 'cvt', 'dual-clutch']).optional(),
  fuelType: z.enum(['gasoline', 'diesel', 'hybrid', 'electric', 'flex-fuel']).optional(),
  
  // Mileage and condition
  mileage: z.number().min(0, 'Mileage cannot be negative').optional(),
  condition: z.enum(['excellent', 'good', 'fair', 'poor']).optional(),
  
  // Insurance and registration
  insuranceCompany: z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
  registrationExpiry: z.string().optional(),
  
  // Service information
  lastServiceDate: z.string().optional(),
  nextServiceDue: z.string().optional(),
  preferredServiceBay: z.enum(['bay-1', 'bay-2', 'any']).optional(),
  
  // Notes and special instructions
  notes: z.string().optional(),
  specialInstructions: z.string().optional(),
});

type VehicleFormData = z.infer<typeof vehicleFormSchema>;

interface VehicleFormProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle?: Vehicle; // If provided, form is in edit mode
  customerId?: string; // Pre-selected customer for new vehicles
}

export function VehicleForm({ isOpen, onClose, vehicle, customerId }: VehicleFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState<'basic' | 'identification' | 'specs' | 'service' | 'notes'>('basic');
  const isEditMode = Boolean(vehicle);

  // Hooks
  const { mutateAsync: createVehicle } = useCreateVehicle();
  const { mutateAsync: updateVehicle } = useUpdateVehicle();
  const { data: customersResponse } = useCustomers();
  const { addToast } = useUIStore();

  const customers = customersResponse?.data || [];

  // Form setup
  const form = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      customerId: vehicle?.customerId || customerId || '',
      year: vehicle?.year || new Date().getFullYear(),
      make: vehicle?.make || '',
      model: vehicle?.model || '',
      vin: vehicle?.vin || '',
      licensePlate: vehicle?.licensePlate || '',
      color: '',
      engine: '',
      transmission: 'automatic',
      fuelType: 'gasoline',
      mileage: vehicle?.mileage || 0,
      condition: 'good',
      insuranceCompany: '',
      insurancePolicyNumber: '',
      registrationExpiry: '',
      lastServiceDate: '',
      nextServiceDue: '',
      preferredServiceBay: 'any',
      notes: '',
      specialInstructions: '',
    },
  });

  // Reset form when vehicle changes
  useEffect(() => {
    if (vehicle) {
      form.reset({
        customerId: vehicle.customerId,
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        vin: vehicle.vin || '',
        licensePlate: vehicle.licensePlate || '',
        color: '',
        engine: '',
        transmission: 'automatic',
        fuelType: 'gasoline',
        mileage: vehicle.mileage || 0,
        condition: 'good',
        insuranceCompany: '',
        insurancePolicyNumber: '',
        registrationExpiry: '',
        lastServiceDate: '',
        nextServiceDue: '',
        preferredServiceBay: 'any',
        notes: '',
        specialInstructions: '',
      });
    } else {
      form.reset({
        customerId: customerId || '',
        year: new Date().getFullYear(),
        make: '',
        model: '',
        vin: '',
        licensePlate: '',
        color: '',
        engine: '',
        transmission: 'automatic',
        fuelType: 'gasoline',
        mileage: 0,
        condition: 'good',
        insuranceCompany: '',
        insurancePolicyNumber: '',
        registrationExpiry: '',
        lastServiceDate: '',
        nextServiceDue: '',
        preferredServiceBay: 'any',
        notes: '',
        specialInstructions: '',
      });
    }
  }, [vehicle, customerId, form]);

  const handleSubmit = async (data: VehicleFormData) => {
    setIsSubmitting(true);

    try {
      if (isEditMode && vehicle) {
        // Update existing vehicle
        const updateData: UpdateVehicleData = {
          year: data.year,
          make: data.make,
          model: data.model,
          vin: data.vin || undefined,
          licensePlate: data.licensePlate || undefined,
          mileage: data.mileage || undefined,
        };

        await updateVehicle({ id: vehicle.id, data: updateData });

        addToast({
          type: 'success',
          title: 'Vehicle Updated',
          message: `${data.year} ${data.make} ${data.model} has been updated`,
          duration: 3000,
        });
      } else {
        // Create new vehicle
        const createData: CreateVehicleData = {
          customerId: data.customerId,
          year: data.year,
          make: data.make,
          model: data.model,
          vin: data.vin || undefined,
          licensePlate: data.licensePlate || undefined,
          mileage: data.mileage || undefined,
        };

        await createVehicle(createData);

        addToast({
          type: 'success',
          title: 'Vehicle Added',
          message: `${data.year} ${data.make} ${data.model} has been added`,
          duration: 3000,
        });
      }

      onClose();
      form.reset();
    } catch (error) {
      addToast({
        type: 'error',
        title: isEditMode ? 'Failed to Update Vehicle' : 'Failed to Add Vehicle',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setActiveSection('basic');
    onClose();
  };

  // Form validation state
  const formState = form.formState;
  const hasErrors = Object.keys(formState.errors).length > 0;
  const isDirty = formState.isDirty;

  // Section completion status
  const sectionStatus = {
    basic: !formState.errors.customerId && !formState.errors.year && !formState.errors.make && !formState.errors.model &&
           form.watch('customerId') && form.watch('make') && form.watch('model'),
    identification: true, // Optional fields
    specs: true, // Optional fields
    service: true, // Optional fields
    notes: true, // Optional fields
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditMode ? (
              <>
                <Car className="h-5 w-5" />
                Edit Vehicle: {vehicle?.year} {vehicle?.make} {vehicle?.model}
              </>
            ) : (
              <>
                <Plus className="h-5 w-5" />
                Add New Vehicle
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? 'Update vehicle information and service details'
              : 'Enter vehicle details to add it to the customer record'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Section Navigation */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Vehicle Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant={activeSection === 'basic' ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setActiveSection('basic')}
                >
                  <div className="flex items-center gap-2">
                    {sectionStatus.basic ? (
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    ) : (
                      <Clock className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span>Basic Info</span>
                  </div>
                </Button>
                
                <Button
                  variant={activeSection === 'identification' ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setActiveSection('identification')}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-3 w-3" />
                    <span>Identification</span>
                  </div>
                </Button>
                
                <Button
                  variant={activeSection === 'specs' ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setActiveSection('specs')}
                >
                  <div className="flex items-center gap-2">
                    <Settings className="h-3 w-3" />
                    <span>Specifications</span>
                  </div>
                </Button>
                
                <Button
                  variant={activeSection === 'service' ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setActiveSection('service')}
                >
                  <div className="flex items-center gap-2">
                    <Wrench className="h-3 w-3" />
                    <span>Service Info</span>
                  </div>
                </Button>
                
                <Button
                  variant={activeSection === 'notes' ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setActiveSection('notes')}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-3 w-3" />
                    <span>Notes</span>
                  </div>
                </Button>
              </CardContent>
            </Card>

            {/* Form Status */}
            <Card className="mt-4">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    {hasErrors ? (
                      <>
                        <AlertTriangle className="h-3 w-3 text-red-600" />
                        <span className="text-red-600">Has Errors</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span className="text-green-600">Valid</span>
                      </>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    {isDirty ? (
                      <>
                        <Clock className="h-3 w-3 text-orange-600" />
                        <span className="text-orange-600">Unsaved Changes</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-3 w-3 text-gray-600" />
                        <span className="text-gray-600">No Changes</span>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Form Content */}
          <div className="lg:col-span-3">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                
                {/* Basic Information Section */}
                {activeSection === 'basic' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        Basic Vehicle Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="customerId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Customer *</FormLabel>
                            <FormControl>
                              <select
                                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                                {...field}
                                disabled={isEditMode} // Can't change customer for existing vehicle
                              >
                                <option value="">Select Customer</option>
                                {customers.map((customer) => (
                                  <option key={customer.id} value={customer.id}>
                                    {customer.name} - {customer.phone}
                                  </option>
                                ))}
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="year"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Year *</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1900" 
                                  max={new Date().getFullYear() + 2}
                                  placeholder="2024" 
                                  {...field} 
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="make"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Make *</FormLabel>
                              <FormControl>
                                <Input placeholder="Toyota" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="model"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Model *</FormLabel>
                              <FormControl>
                                <Input placeholder="Camry" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="color"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Color</FormLabel>
                              <FormControl>
                                <Input placeholder="Silver" {...field} />
                              </FormControl>
                              <FormDescription>
                                Vehicle exterior color
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="mileage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Current Mileage</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Gauge className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input 
                                    type="number" 
                                    min="0"
                                    placeholder="50000" 
                                    className="pl-10"
                                    {...field} 
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  />
                                </div>
                              </FormControl>
                              <FormDescription>
                                Current odometer reading
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Identification Section */}
                {activeSection === 'identification' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Vehicle Identification
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="vin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>VIN (Vehicle Identification Number)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="1HGCM82633A123456" 
                                {...field} 
                                className="font-mono"
                              />
                            </FormControl>
                            <FormDescription>
                              17-character unique vehicle identifier
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="licensePlate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>License Plate</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="ABC-1234" 
                                {...field} 
                                className="font-mono"
                              />
                            </FormControl>
                            <FormDescription>
                              Current license plate number
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="insuranceCompany"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Insurance Company</FormLabel>
                              <FormControl>
                                <Input placeholder="State Farm" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="insurancePolicyNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Policy Number</FormLabel>
                              <FormControl>
                                <Input placeholder="POL-123456789" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="registrationExpiry"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Registration Expiry</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormDescription>
                              Vehicle registration expiration date
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Specifications Section */}
                {activeSection === 'specs' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Vehicle Specifications
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="engine"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Engine</FormLabel>
                            <FormControl>
                              <Input placeholder="2.5L 4-Cylinder" {...field} />
                            </FormControl>
                            <FormDescription>
                              Engine size and type
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="transmission"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Transmission</FormLabel>
                              <FormControl>
                                <select
                                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                                  {...field}
                                >
                                  <option value="automatic">Automatic</option>
                                  <option value="manual">Manual</option>
                                  <option value="cvt">CVT</option>
                                  <option value="dual-clutch">Dual Clutch</option>
                                </select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="fuelType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fuel Type</FormLabel>
                              <FormControl>
                                <select
                                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                                  {...field}
                                >
                                  <option value="gasoline">Gasoline</option>
                                  <option value="diesel">Diesel</option>
                                  <option value="hybrid">Hybrid</option>
                                  <option value="electric">Electric</option>
                                  <option value="flex-fuel">Flex Fuel</option>
                                </select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="condition"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Overall Condition</FormLabel>
                            <FormControl>
                              <select
                                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                                {...field}
                              >
                                <option value="excellent">Excellent</option>
                                <option value="good">Good</option>
                                <option value="fair">Fair</option>
                                <option value="poor">Poor</option>
                              </select>
                            </FormControl>
                            <FormDescription>
                              General condition of the vehicle
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Service Information Section */}
                {activeSection === 'service' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Wrench className="h-4 w-4" />
                        Service Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="lastServiceDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Last Service Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormDescription>
                                When was the last service performed?
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="nextServiceDue"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Next Service Due</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormDescription>
                                When is the next service due?
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="preferredServiceBay"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Preferred Service Bay</FormLabel>
                            <FormControl>
                              <select
                                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                                {...field}
                              >
                                <option value="any">Any Available</option>
                                <option value="bay-1">Bay 1</option>
                                <option value="bay-2">Bay 2</option>
                              </select>
                            </FormControl>
                            <FormDescription>
                              Preferred bay for service appointments
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Notes Section */}
                {activeSection === 'notes' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Notes & Special Instructions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>General Notes</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Any general notes about this vehicle..."
                                className="min-h-[100px]"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              General information about the vehicle
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="specialInstructions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Special Service Instructions</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Special handling instructions, known issues, customer preferences..."
                                className="min-h-[100px]"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Important instructions for service technicians
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                )}
              </form>
            </Form>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasErrors && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Please fix errors
              </Badge>
            )}
            {isDirty && !hasErrors && (
              <Badge variant="secondary" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Unsaved changes
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              type="submit" 
              onClick={form.handleSubmit(handleSubmit)}
              disabled={isSubmitting || hasErrors}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full" />
                  {isEditMode ? 'Updating...' : 'Adding...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditMode ? 'Update Vehicle' : 'Add Vehicle'}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { VehicleFormProps };
