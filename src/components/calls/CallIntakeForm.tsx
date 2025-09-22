// Call Intake Form Component
// Rapid entry form for incoming customer calls with smart auto-completion

import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Phone,
  User,
  Car,
  Clock,
  AlertTriangle,
  CheckCircle,
  Plus,
  Search,
  Calendar,
  Wrench,
  DollarSign,
  FileText,
  Save,
  X,
  ChevronDown,
  MapPin,
  Mail,
  Star,
  Zap,
  Timer,
  PhoneCall,
  UserPlus,
  CarFront
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCustomers } from '@/hooks/use-customers';
import { useVehicles } from '@/hooks/use-vehicles';
import { useUIStore } from '@/stores';
import { GlobalCustomerSearch } from '@/components/search/GlobalCustomerSearch';
import type { Customer, Vehicle } from '@/types/database';

interface CallIntakeData {
  // Call Information
  callId: string;
  phoneNumber: string;
  callStartTime: Date;
  callDuration?: number;
  
  // Customer Information
  customerId?: string;
  customer?: Customer;
  isNewCustomer: boolean;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress?: string;
  
  // Vehicle Information
  vehicleId?: string;
  vehicle?: Vehicle;
  isNewVehicle: boolean;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  vehicleMileage?: string;
  vehicleLicense?: string;
  
  // Service Information
  serviceType: string;
  serviceCategory: 'maintenance' | 'repair' | 'inspection' | 'emergency' | 'consultation' | 'quote';
  servicePriority: 'low' | 'normal' | 'high' | 'urgent';
  serviceDescription: string;
  estimatedCost?: number;
  
  // Call Details
  callReason: string;
  callNotes: string;
  customerConcerns: string[];
  followUpRequired: boolean;
  followUpDate?: Date;
  appointmentRequested: boolean;
  quoteRequested: boolean;
  
  // Call Outcome
  callOutcome: 'scheduled' | 'quote-sent' | 'follow-up' | 'no-action' | 'transferred' | 'incomplete';
  nextAction?: string;
  
  // Metadata
  callTakenBy: string;
  callSource: 'phone' | 'walk-in' | 'referral' | 'online' | 'repeat';
  marketingSource?: string;
}

interface CallIntakeFormProps {
  initialData?: Partial<CallIntakeData>;
  onSubmit: (data: CallIntakeData) => void;
  onCancel?: () => void;
  className?: string;
}

// Service types and categories
const serviceCategories = {
  maintenance: {
    label: 'Maintenance',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    services: [
      'Oil Change',
      'Tire Rotation',
      'Brake Inspection',
      'Filter Replacement',
      'Fluid Top-off',
      'Battery Check',
      'Scheduled Maintenance',
    ],
  },
  repair: {
    label: 'Repair',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    services: [
      'Engine Repair',
      'Brake Repair',
      'Transmission Repair',
      'Electrical Issues',
      'AC/Heating Repair',
      'Suspension Repair',
      'Exhaust Repair',
    ],
  },
  inspection: {
    label: 'Inspection',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    services: [
      'State Inspection',
      'Pre-Purchase Inspection',
      'Diagnostic Scan',
      'Safety Inspection',
      'Emissions Test',
    ],
  },
  emergency: {
    label: 'Emergency',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    services: [
      'Towing Service',
      'Roadside Assistance',
      'Emergency Repair',
      'Jump Start',
      'Flat Tire Change',
      'Lockout Service',
    ],
  },
  consultation: {
    label: 'Consultation',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    services: [
      'Service Consultation',
      'Repair Estimate',
      'Maintenance Planning',
      'Technical Questions',
      'Warranty Issues',
    ],
  },
  quote: {
    label: 'Quote Request',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    services: [
      'Service Quote',
      'Repair Quote',
      'Parts Quote',
      'Labor Estimate',
      'Insurance Estimate',
    ],
  },
};

const commonConcerns = [
  'Strange noises',
  'Check engine light',
  'Poor performance',
  'Overheating',
  'Vibration',
  'Leaking fluids',
  'Electrical problems',
  'Brake issues',
  'Steering problems',
  'AC not working',
  'Battery dead',
  'Won\'t start',
];

const priorityConfig = {
  low: { label: 'Low', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  normal: { label: 'Normal', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  high: { label: 'High', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  urgent: { label: 'Urgent', color: 'text-red-600', bgColor: 'bg-red-100' },
};

export function CallIntakeForm({
  initialData,
  onSubmit,
  onCancel,
  className = '',
}: CallIntakeFormProps) {
  const [formData, setFormData] = useState<CallIntakeData>({
    callId: `CALL-${Date.now()}`,
    phoneNumber: '',
    callStartTime: new Date(),
    isNewCustomer: false,
    customerName: '',
    customerPhone: '',
    isNewVehicle: false,
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',
    serviceType: '',
    serviceCategory: 'maintenance',
    servicePriority: 'normal',
    serviceDescription: '',
    callReason: '',
    callNotes: '',
    customerConcerns: [],
    followUpRequired: false,
    appointmentRequested: false,
    quoteRequested: false,
    callOutcome: 'incomplete',
    callTakenBy: 'Current User', // This would come from auth
    callSource: 'phone',
    ...initialData,
  });

  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [showVehicleSearch, setShowVehicleSearch] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState('');
  const [callTimer, setCallTimer] = useState(0);
  const [isCallActive, setIsCallActive] = useState(true);

  const phoneInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Hooks
  const { data: customersResponse } = useCustomers();
  const { data: vehiclesResponse } = useVehicles();
  const { addToast } = useUIStore();

  const customers = customersResponse?.data || [];
  const vehicles = vehiclesResponse?.data || [];

  // Call timer effect
  useEffect(() => {
    if (isCallActive) {
      timerRef.current = setInterval(() => {
        setCallTimer(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isCallActive]);

  // Auto-focus phone input on mount
  useEffect(() => {
    if (phoneInputRef.current) {
      phoneInputRef.current.focus();
    }
  }, []);

  // Format call timer
  const formatCallTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle form data updates
  const updateFormData = useCallback((updates: Partial<CallIntakeData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  // Handle customer selection
  const handleCustomerSelect = useCallback((customer: Customer) => {
    updateFormData({
      customerId: customer.id,
      customer,
      isNewCustomer: false,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email,
      customerAddress: customer.address,
    });
    setShowCustomerSearch(false);
    setCustomerSearchQuery('');
  }, [updateFormData]);

  // Handle vehicle selection
  const handleVehicleSelect = useCallback((vehicle: Vehicle) => {
    updateFormData({
      vehicleId: vehicle.id,
      vehicle,
      isNewVehicle: false,
      vehicleMake: vehicle.make,
      vehicleModel: vehicle.model,
      vehicleYear: vehicle.year.toString(),
      vehicleMileage: vehicle.mileage?.toString(),
      vehicleLicense: vehicle.licensePlate,
    });
    setShowVehicleSearch(false);
    setVehicleSearchQuery('');
  }, [updateFormData]);

  // Handle service type selection
  const handleServiceTypeSelect = useCallback((service: string, category: string) => {
    updateFormData({
      serviceType: service,
      serviceCategory: category as CallIntakeData['serviceCategory'],
    });
  }, [updateFormData]);

  // Handle concern toggle
  const handleConcernToggle = useCallback((concern: string) => {
    const newConcerns = formData.customerConcerns.includes(concern)
      ? formData.customerConcerns.filter(c => c !== concern)
      : [...formData.customerConcerns, concern];
    
    updateFormData({ customerConcerns: newConcerns });
  }, [formData.customerConcerns, updateFormData]);

  // Handle form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    const finalData: CallIntakeData = {
      ...formData,
      callDuration: callTimer,
      phoneNumber: formData.phoneNumber || formData.customerPhone,
    };

    onSubmit(finalData);
    
    addToast({
      type: 'success',
      title: 'Call Recorded',
      message: `Call intake for ${formData.customerName} has been saved`,
      duration: 3000,
    });
  }, [formData, callTimer, onSubmit, addToast]);

  // Handle call end
  const handleCallEnd = useCallback(() => {
    setIsCallActive(false);
    updateFormData({ 
      callDuration: callTimer,
      callOutcome: formData.callOutcome === 'incomplete' ? 'follow-up' : formData.callOutcome,
    });
  }, [callTimer, formData.callOutcome, updateFormData]);

  // Filter vehicles by customer
  const customerVehicles = vehicles.filter(v => v.customerId === formData.customerId);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Call Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <PhoneCall className="h-5 w-5" />
              Call Intake - {formData.callId}
              {isCallActive && (
                <Badge variant="outline" className="bg-green-100 text-green-700 animate-pulse">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                  Live
                </Badge>
              )}
            </CardTitle>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Timer className="h-4 w-4" />
                <span className="font-mono text-lg">{formatCallTime(callTimer)}</span>
              </div>
              
              {isCallActive ? (
                <Button variant="destructive" size="sm" onClick={handleCallEnd}>
                  End Call
                </Button>
              ) : (
                <Badge variant="secondary">Call Ended</Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Phone Number & Customer Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Caller Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  ref={phoneInputRef}
                  id="phoneNumber"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={formData.phoneNumber}
                  onChange={(e) => updateFormData({ phoneNumber: e.target.value })}
                  className="text-lg"
                />
              </div>
              
              <div>
                <Label>Call Source</Label>
                <Select 
                  value={formData.callSource} 
                  onValueChange={(value: CallIntakeData['callSource']) => 
                    updateFormData({ callSource: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone">Phone Call</SelectItem>
                    <SelectItem value="walk-in">Walk-in</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="repeat">Repeat Customer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Customer Search/Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Customer</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.isNewCustomer}
                    onCheckedChange={(checked) => updateFormData({ isNewCustomer: checked })}
                  />
                  <span className="text-sm">New Customer</span>
                </div>
              </div>

              {!formData.isNewCustomer ? (
                <div className="space-y-2">
                  <GlobalCustomerSearch
                    placeholder="Search existing customer..."
                    onCustomerSelect={handleCustomerSelect}
                    variant="input"
                  />
                  
                  {formData.customer && (
                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="font-medium">{formData.customer.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {formData.customer.phone} • {formData.customer.email}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => updateFormData({ 
                          customer: undefined, 
                          customerId: undefined,
                          customerName: '',
                          customerPhone: '',
                          customerEmail: '',
                          customerAddress: '',
                        })}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customerName">Customer Name *</Label>
                    <Input
                      id="customerName"
                      value={formData.customerName}
                      onChange={(e) => updateFormData({ customerName: e.target.value })}
                      placeholder="John Smith"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="customerEmail">Email</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={formData.customerEmail || ''}
                      onChange={(e) => updateFormData({ customerEmail: e.target.value })}
                      placeholder="john@example.com"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label htmlFor="customerAddress">Address</Label>
                    <Input
                      id="customerAddress"
                      value={formData.customerAddress || ''}
                      onChange={(e) => updateFormData({ customerAddress: e.target.value })}
                      placeholder="123 Main St, City, State 12345"
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CarFront className="h-4 w-4" />
              Vehicle Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isNewVehicle}
                  onCheckedChange={(checked) => updateFormData({ isNewVehicle: checked })}
                />
                <span className="text-sm">New Vehicle</span>
              </div>
            </div>

            {!formData.isNewVehicle && formData.customerId ? (
              <div className="space-y-2">
                <Label>Select Vehicle</Label>
                <Select 
                  value={formData.vehicleId || ''} 
                  onValueChange={(vehicleId) => {
                    const vehicle = customerVehicles.find(v => v.id === vehicleId);
                    if (vehicle) {
                      handleVehicleSelect(vehicle);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a vehicle..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customerVehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.year} {vehicle.make} {vehicle.model}
                        {vehicle.licensePlate && ` - ${vehicle.licensePlate}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {customerVehicles.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No vehicles found for this customer. Add vehicle information below.
                  </p>
                )}
              </div>
            ) : null}

            {(formData.isNewVehicle || !formData.vehicleId) && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="vehicleYear">Year *</Label>
                  <Input
                    id="vehicleYear"
                    value={formData.vehicleYear}
                    onChange={(e) => updateFormData({ vehicleYear: e.target.value })}
                    placeholder="2020"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="vehicleMake">Make *</Label>
                  <Input
                    id="vehicleMake"
                    value={formData.vehicleMake}
                    onChange={(e) => updateFormData({ vehicleMake: e.target.value })}
                    placeholder="Honda"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="vehicleModel">Model *</Label>
                  <Input
                    id="vehicleModel"
                    value={formData.vehicleModel}
                    onChange={(e) => updateFormData({ vehicleModel: e.target.value })}
                    placeholder="Civic"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="vehicleMileage">Mileage</Label>
                  <Input
                    id="vehicleMileage"
                    value={formData.vehicleMileage || ''}
                    onChange={(e) => updateFormData({ vehicleMileage: e.target.value })}
                    placeholder="50,000"
                  />
                </div>
              </div>
            )}

            {formData.vehicle && (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <Car className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium">
                    {formData.vehicle.year} {formData.vehicle.make} {formData.vehicle.model}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formData.vehicle.licensePlate && `License: ${formData.vehicle.licensePlate}`}
                    {formData.vehicle.mileage && ` • Mileage: ${formData.vehicle.mileage.toLocaleString()}`}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Service Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Service Request
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Service Category & Type */}
            <div className="space-y-3">
              <Label>Service Category & Type</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(serviceCategories).map(([category, config]) => (
                  <Card 
                    key={category} 
                    className={cn(
                      'cursor-pointer transition-all hover:shadow-md',
                      formData.serviceCategory === category && 'ring-2 ring-primary'
                    )}
                    onClick={() => updateFormData({ serviceCategory: category as CallIntakeData['serviceCategory'] })}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className={cn('text-sm flex items-center gap-2', config.color)}>
                        <div className={cn('w-3 h-3 rounded-full', config.bgColor)} />
                        {config.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-1">
                        {config.services.slice(0, 3).map((service) => (
                          <button
                            key={service}
                            type="button"
                            className={cn(
                              'block w-full text-left text-xs p-1 rounded hover:bg-muted/50 transition-colors',
                              formData.serviceType === service && 'bg-primary/10 text-primary font-medium'
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleServiceTypeSelect(service, category);
                            }}
                          >
                            {service}
                          </button>
                        ))}
                        {config.services.length > 3 && (
                          <p className="text-xs text-muted-foreground">
                            +{config.services.length - 3} more...
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Custom Service Type */}
            {formData.serviceCategory && (
              <div>
                <Label htmlFor="serviceType">Service Type *</Label>
                <Input
                  id="serviceType"
                  value={formData.serviceType}
                  onChange={(e) => updateFormData({ serviceType: e.target.value })}
                  placeholder="Enter specific service needed..."
                  required
                />
              </div>
            )}

            {/* Priority & Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Priority Level</Label>
                <Select 
                  value={formData.servicePriority} 
                  onValueChange={(value: CallIntakeData['servicePriority']) => 
                    updateFormData({ servicePriority: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <div className={cn('w-2 h-2 rounded-full', config.bgColor)} />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="estimatedCost">Estimated Cost</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="estimatedCost"
                    type="number"
                    value={formData.estimatedCost || ''}
                    onChange={(e) => updateFormData({ estimatedCost: parseFloat(e.target.value) || undefined })}
                    placeholder="0.00"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="serviceDescription">Service Description *</Label>
              <Textarea
                id="serviceDescription"
                value={formData.serviceDescription}
                onChange={(e) => updateFormData({ serviceDescription: e.target.value })}
                placeholder="Describe the service request in detail..."
                rows={3}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Customer Concerns */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Customer Concerns
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Common Concerns</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-2">
                {commonConcerns.map((concern) => (
                  <div key={concern} className="flex items-center space-x-2">
                    <Checkbox
                      id={`concern-${concern}`}
                      checked={formData.customerConcerns.includes(concern)}
                      onCheckedChange={() => handleConcernToggle(concern)}
                    />
                    <Label
                      htmlFor={`concern-${concern}`}
                      className="text-sm cursor-pointer"
                    >
                      {concern}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="callReason">Call Reason</Label>
              <Input
                id="callReason"
                value={formData.callReason}
                onChange={(e) => updateFormData({ callReason: e.target.value })}
                placeholder="Why is the customer calling today?"
              />
            </div>

            <div>
              <Label htmlFor="callNotes">Call Notes</Label>
              <Textarea
                id="callNotes"
                value={formData.callNotes}
                onChange={(e) => updateFormData({ callNotes: e.target.value })}
                placeholder="Additional notes about the call..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Call Outcome & Follow-up */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Call Outcome
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Call Outcome</Label>
                <Select 
                  value={formData.callOutcome} 
                  onValueChange={(value: CallIntakeData['callOutcome']) => 
                    updateFormData({ callOutcome: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Appointment Scheduled</SelectItem>
                    <SelectItem value="quote-sent">Quote Sent</SelectItem>
                    <SelectItem value="follow-up">Follow-up Required</SelectItem>
                    <SelectItem value="no-action">No Action Needed</SelectItem>
                    <SelectItem value="transferred">Transferred Call</SelectItem>
                    <SelectItem value="incomplete">Incomplete Call</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="nextAction">Next Action</Label>
                <Input
                  id="nextAction"
                  value={formData.nextAction || ''}
                  onChange={(e) => updateFormData({ nextAction: e.target.value })}
                  placeholder="What needs to happen next?"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="appointmentRequested"
                  checked={formData.appointmentRequested}
                  onCheckedChange={(checked) => updateFormData({ appointmentRequested: !!checked })}
                />
                <Label htmlFor="appointmentRequested" className="cursor-pointer">
                  Appointment Requested
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="quoteRequested"
                  checked={formData.quoteRequested}
                  onCheckedChange={(checked) => updateFormData({ quoteRequested: !!checked })}
                />
                <Label htmlFor="quoteRequested" className="cursor-pointer">
                  Quote Requested
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="followUpRequired"
                  checked={formData.followUpRequired}
                  onCheckedChange={(checked) => updateFormData({ followUpRequired: !!checked })}
                />
                <Label htmlFor="followUpRequired" className="cursor-pointer">
                  Follow-up Required
                </Label>
              </div>
            </div>

            {formData.followUpRequired && (
              <div>
                <Label htmlFor="followUpDate">Follow-up Date</Label>
                <Input
                  id="followUpDate"
                  type="datetime-local"
                  value={formData.followUpDate ? formData.followUpDate.toISOString().slice(0, 16) : ''}
                  onChange={(e) => updateFormData({ 
                    followUpDate: e.target.value ? new Date(e.target.value) : undefined 
                  })}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          
          <Button type="button" variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Save as Draft
          </Button>
          
          <Button type="submit">
            <Save className="h-4 w-4 mr-2" />
            Save Call Intake
          </Button>
        </div>
      </form>
    </div>
  );
}

export type { CallIntakeData, CallIntakeFormProps };
