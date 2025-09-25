// Backend database types for Mechanic Shop OS
// Aligns with frontend data contracts so REST/InstantDB responses are consistent

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  preferredContact: PreferredContact;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  customerId: string;
  year: number;
  make: string;
  model: string;
  licensePlate?: string;
  mileage?: number;
  color?: string;
  vin?: string;
  createdAt: string;
  updatedAt: string;
}

export type JobPriority = 'low' | 'medium' | 'high';
export type JobStatus =
  | 'intake'
  | 'incoming-call'
  | 'scheduled'
  | 'in-progress'
  | 'in-bay'
  | 'waiting-parts'
  | 'completed';

export interface JobNote {
  id: string;
  author: string;
  content: string;
  createdAt: string;
  type?: 'general' | 'technical' | 'customer' | 'internal';
  isImportant?: boolean;
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
  noteEntries?: JobNote[];
  createdAt: string;
  updatedAt: string;
}

export type Bay = string;

export interface Appointment {
  id: string;
  jobId: string;
  bay: Bay;
  startAt: string;
  endAt: string;
  createdAt: string;
  updatedAt: string;
}

export type CallOutcome =
  | 'scheduled'
  | 'quote-requested'
  | 'follow-up'
  | 'no-action'
  | 'transferred'
  | 'incomplete';

export type CallServicePriority = 'low' | 'normal' | 'high' | 'urgent';
export type CallStatus = 'open' | 'in-progress' | 'completed';
export type CallSource = 'phone' | 'walk-in' | 'referral' | 'online' | 'repeat';

export interface Call {
  id: string;
  callId?: string;
  customerId?: string;
  customerName?: string;
  jobId?: string;
  vehicleId?: string;
  vehicleYear?: number;
  vehicleMake?: string;
  vehicleModel?: string;
  phoneNumber: string;
  callStartTime: string;
  callDuration?: number;
  callReason?: string;
  callNotes?: string;
  customerConcerns?: string[];
  followUpRequired?: boolean;
  followUpDate?: string;
  appointmentRequested?: boolean;
  quoteRequested?: boolean;
  callOutcome: CallOutcome;
  nextAction?: string;
  callTakenBy?: string;
  callSource?: CallSource;
  serviceType?: string;
  servicePriority?: CallServicePriority;
  estimatedCost?: number;
  status?: CallStatus;
  createdAt: string;
  updatedAt: string;
}

export type PreferredContact = 'phone' | 'email';

export type CreateCustomerRequest = Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateCustomerRequest = Partial<CreateCustomerRequest>;

export type CreateVehicleRequest = Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateVehicleRequest = Partial<CreateVehicleRequest>;

export type CreateJobRequest = Omit<Job, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateJobRequest = Partial<CreateJobRequest>;

export type CreateAppointmentRequest = Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateAppointmentRequest = Partial<CreateAppointmentRequest>;

export type CreateCallRequest = Omit<Call, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateCallRequest = Partial<CreateCallRequest>;

export interface JobQueryFilters {
  status?: JobStatus[];
  priority?: JobPriority[];
  bay?: Bay[];
  customerId?: string;
  vehicleId?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  limit?: number;
  offset?: number;
}

export interface CustomerQueryFilters {
  search?: string;
  preferredContact?: PreferredContact[];
  hasActiveJobs?: boolean;
  limit?: number;
  offset?: number;
}

export interface CallQueryFilters {
  outcome?: CallOutcome[];
  customerId?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  limit?: number;
  offset?: number;
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

export const instantDBSchema = {
  entities: {
    customers: {
      id: 'string',
      name: 'string',
      phone: 'string',
      email: 'string?',
      address: 'string?',
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
      licensePlate: 'string?',
      mileage: 'number?',
      color: 'string?',
      vin: 'string?',
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
      noteEntries: 'string?',
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
      callId: 'string?',
      customerId: 'string?',
      customerName: 'string?',
      jobId: 'string?',
      vehicleId: 'string?',
      vehicleYear: 'number?',
      vehicleMake: 'string?',
      vehicleModel: 'string?',
      phoneNumber: 'string',
      callStartTime: 'string',
      callDuration: 'number?',
      callReason: 'string?',
      callNotes: 'string?',
      customerConcerns: 'string?',
      followUpRequired: 'boolean?',
      followUpDate: 'string?',
      appointmentRequested: 'boolean?',
      quoteRequested: 'boolean?',
      callOutcome: 'string',
      nextAction: 'string?',
      callTakenBy: 'string?',
      callSource: 'string?',
      serviceType: 'string?',
      servicePriority: 'string?',
      estimatedCost: 'number?',
      status: 'string?',
      createdAt: 'string',
      updatedAt: 'string',
    },
    shopSettings: {
      id: 'string',
      shopName: 'string',
      address: 'string?',
      phone: 'string?',
      email: 'string?',
      hours: 'string',
      bays: 'string',
      statusPalettes: 'string',
      schedulingDefaults: 'string',
      createdAt: 'string',
      updatedAt: 'string',
    },
  },
  links: {
    customerVehicles: {
      forward: { on: 'customers', label: 'vehicles', has: 'many' },
      reverse: { on: 'vehicles', label: 'customer', has: 'one' },
    },
    customerJobs: {
      forward: { on: 'customers', label: 'jobs', has: 'many' },
      reverse: { on: 'jobs', label: 'customer', has: 'one' },
    },
    vehicleJobs: {
      forward: { on: 'vehicles', label: 'jobs', has: 'many' },
      reverse: { on: 'jobs', label: 'vehicle', has: 'one' },
    },
    jobAppointment: {
      forward: { on: 'jobs', label: 'appointment', has: 'one' },
      reverse: { on: 'appointments', label: 'job', has: 'one' },
    },
    customerCalls: {
      forward: { on: 'customers', label: 'calls', has: 'many' },
      reverse: { on: 'calls', label: 'customer', has: 'one' },
    },
  },
} as const;

export const isValidJobStatus = (status: string): status is JobStatus => {
  return [
    'intake',
    'incoming-call',
    'scheduled',
    'in-progress',
    'in-bay',
    'waiting-parts',
    'completed'
  ].includes(status);
};

export const isValidJobPriority = (priority: string): priority is JobPriority => {
  return ['low', 'medium', 'high'].includes(priority);
};

export const isValidBay = (bay: string): bay is Bay => {
  return /^bay-[a-zA-Z0-9_-]+$/.test(bay);
};

export const isValidCallOutcome = (outcome: string): outcome is CallOutcome => {
  return [
    'scheduled',
    'quote-requested',
    'follow-up',
    'no-action',
    'transferred',
    'incomplete'
  ].includes(outcome);
};

export const isValidPreferredContact = (contact: string): contact is PreferredContact => {
  return ['phone', 'email'].includes(contact);
};

export const isValidInvoiceNumber = (value: string): boolean => {
  return /^[A-Za-z0-9/-]{1,20}$/.test(value);
};
