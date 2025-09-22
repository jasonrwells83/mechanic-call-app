// Backend database types for Mechanic Shop OS
// Based on PRD requirements for data models

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  preferredContact: 'phone' | 'email';
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  customerId: string;
  year: number;
  make: string;
  model: string;
  mileage?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Job {
  id: string;
  title: string;
  customerId: string;
  vehicleId: string;
  estHours: number;
  status: JobStatus;
  priority: JobPriority;
  invoiceNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  jobId: string;
  bay: Bay;
  startAt: string;
  endAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Call {
  id: string;
  customerId?: string;
  phone: string;
  notes: string;
  outcome: CallOutcome;
  nextActionAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface BusinessDay {
  open: string;
  close: string;
  closed: boolean;
}

export interface ShopClosure {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  appliesTo: 'shop' | 'bay';
}

export interface ShopHoursSettings {
  timezone: string;
  days: Record<Weekday, BusinessDay>;
  closures: ShopClosure[];
}

export interface BayConfigurationItem {
  id: string;
  name: string;
  shortCode: string;
  isActive: boolean;
  supportsHeavyDuty: boolean;
  notes: string;
}

export interface StatusPalette {
  primary: string;
  accent: string;
}

export interface SchedulingDefaultsConfig {
  defaultJobDuration: number;
  minimumSlotIncrement: number;
  bufferMinutes: number;
  enableAutoBuffers: boolean;
  lockEditingWithinMinutes: number;
  allowSameDayScheduling: boolean;
  overbookingPolicy: 'strict' | 'soft' | 'manual';
}

export interface ShopSettings {
  id: string;
  shopName: string;
  address?: string;
  phone?: string;
  email?: string;
  hours: ShopHoursSettings;
  bays: BayConfigurationItem[];
  statusPalettes: Record<JobStatus, StatusPalette>;
  schedulingDefaults: SchedulingDefaultsConfig;
  createdAt: string;
  updatedAt: string;
}

// Union types for better type safety
export type JobStatus = 
  | 'incoming-call' 
  | 'scheduled' 
  | 'in-bay' 
  | 'waiting-parts' 
  | 'completed';

export type JobPriority = 'low' | 'medium' | 'high';

export type Bay = string;

export type CallOutcome = 
  | 'quote-given' 
  | 'scheduled' 
  | 'follow-up' 
  | 'no-action';

export type PreferredContact = 'phone' | 'email';

// Supporting types

// API request/response types
export interface CreateCustomerRequest {
  name: string;
  phone: string;
  email?: string;
  preferredContact: PreferredContact;
}

export type UpdateCustomerRequest = Partial<CreateCustomerRequest>;

export interface CreateVehicleRequest {
  customerId: string;
  year: number;
  make: string;
  model: string;
  mileage?: number;
}

export type UpdateVehicleRequest = Partial<Omit<CreateVehicleRequest, 'customerId'>>;

export interface CreateJobRequest {
  title: string;
  customerId: string;
  vehicleId: string;
  estHours: number;
  priority: JobPriority;
  invoiceNumber?: string;
  notes?: string;
}

export interface UpdateJobRequest extends Partial<CreateJobRequest> {
  status?: JobStatus;
}

export interface CreateAppointmentRequest {
  jobId: string;
  bay: Bay;
  startAt: string;
  endAt: string;
}

export type UpdateAppointmentRequest = Partial<CreateAppointmentRequest>;

export interface CreateCallRequest {
  customerId?: string;
  phone: string;
  notes: string;
  outcome: CallOutcome;
  nextActionAt?: string;
}

export type UpdateCallRequest = Partial<CreateCallRequest>;

// Query types
export interface QueryFilters {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface JobQueryFilters extends QueryFilters {
  status?: JobStatus[];
  priority?: JobPriority[];
  bay?: Bay[];
  customerId?: string;
  vehicleId?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface CustomerQueryFilters extends QueryFilters {
  search?: string;
  preferredContact?: PreferredContact[];
  hasActiveJobs?: boolean;
}

export interface CallQueryFilters extends QueryFilters {
  outcome?: CallOutcome[];
  dateRange?: {
    start: string;
    end: string;
  };
  customerId?: string;
}

// Database schema definition for InstantDB
export const instantDBSchema = {
  customers: {
    id: 'string',
    name: 'string',
    phone: 'string',
    email: 'string?',
    preferredContact: 'string',
    createdAt: 'string',
    updatedAt: 'string',
  },
  vehicles: {
    id: 'string',
    customerId: 'string',
    year: 'number',
    make: 'string',
    model: 'string',
    mileage: 'number?',
    createdAt: 'string',
    updatedAt: 'string',
  },
  jobs: {
    id: 'string',
    title: 'string',
    customerId: 'string',
    vehicleId: 'string',
    estHours: 'number',
    status: 'string',
    priority: 'string',
    invoiceNumber: 'string?',
    notes: 'string?',
    createdAt: 'string',
    updatedAt: 'string',
  },
  appointments: {
    id: 'string',
    jobId: 'string',
    bay: 'string',
    startAt: 'string',
    endAt: 'string',
    createdAt: 'string',
    updatedAt: 'string',
  },
  calls: {
    id: 'string',
    customerId: 'string?',
    phone: 'string',
    notes: 'string',
    outcome: 'string',
    nextActionAt: 'string?',
    createdAt: 'string',
    updatedAt: 'string',
  },
  shopSettings: {
    id: 'string',
    shopName: 'string',
    address: 'string?',
    phone: 'string?',
    email: 'string?',
    hours: 'string',             // JSON string
    bays: 'string',              // JSON string
    statusPalettes: 'string',    // JSON string
    schedulingDefaults: 'string',// JSON string
    createdAt: 'string',
    updatedAt: 'string',
  },
} as const;

// Utility functions for type checking
export const isValidJobStatus = (status: string): status is JobStatus => {
  return ['incoming-call', 'scheduled', 'in-bay', 'waiting-parts', 'completed'].includes(status);
};

export const isValidJobPriority = (priority: string): priority is JobPriority => {
  return ['low', 'medium', 'high'].includes(priority);
};

export const isValidBay = (bay: string): bay is Bay => {
  return /^bay-[a-zA-Z0-9_-]+$/.test(bay);
};

export const isValidCallOutcome = (outcome: string): outcome is CallOutcome => {
  return ['quote-given', 'scheduled', 'follow-up', 'no-action'].includes(outcome);
};

export const isValidPreferredContact = (contact: string): contact is PreferredContact => {
  return ['phone', 'email'].includes(contact);
};

export const isValidInvoiceNumber = (value: string): boolean => {
  return /^[A-Za-z0-9/-]{1,20}$/.test(value);
};
