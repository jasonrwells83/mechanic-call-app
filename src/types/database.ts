// Frontend TypeScript types for Mechanic Shop OS
// Based on PRD requirements and InstantDB schema

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
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
  licensePlate?: string;
  mileage?: number;
  color?: string;
  vin?: string;
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
  notes?: string;
  invoiceNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobMilestone {
  id: string;
  title: string;
  status: 'pending' | 'in-progress' | 'completed';
  description?: string;
  completedAt?: string;
  dueAt?: string;
  assignedTo?: string;
}

export interface JobNote {
  id: string;
  author: string;
  content: string;
  createdAt: string;
  type?: 'general' | 'technical' | 'customer' | 'internal';
  isImportant?: boolean;
}

export interface JobAttachment {
  id: string;
  label: string;
  type: 'document' | 'link';
  url: string;
  uploadedAt: string;
  uploadedBy?: string;
}

export interface Appointment {
  id: string;
  jobId: string;
  bay: Bay;
  startAt: string; // ISO date string
  endAt: string;   // ISO date string
  createdAt: string;
  updatedAt: string;
}

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

// Enum-like types for better type safety
export type JobStatus = 
  | 'intake'
  | 'incoming-call' 
  | 'scheduled' 
  | 'in-progress'
  | 'in-bay'
  | 'waiting-parts' 
  | 'completed';

export type JobPriority = 'low' | 'medium' | 'high';

export type Bay = string;

export type CallOutcome = 
  | 'scheduled' 
  | 'quote-requested' 
  | 'follow-up' 
  | 'no-action'
  | 'transferred'
  | 'incomplete';
export type CallSource = 'phone' | 'walk-in' | 'referral' | 'online' | 'repeat';
export type CallServicePriority = 'low' | 'normal' | 'high' | 'urgent';
export type CallStatus = 'open' | 'in-progress' | 'completed';

export type PreferredContact = 'phone' | 'email';

// Utility types for forms and API responses
export type CreateCustomerData = Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateCustomerData = Partial<CreateCustomerData>;

export type CreateVehicleData = Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateVehicleData = Partial<CreateVehicleData>;

export type CreateJobData = Omit<Job, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateJobData = Partial<CreateJobData> & {
  noteEntries?: JobNote[];
};

export type CreateAppointmentData = Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateAppointmentData = Partial<CreateAppointmentData>;

export type CreateCallData = Omit<Call, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateCallData = Partial<CreateCallData>;

// Extended types with relationships for UI components
export interface JobWithRelations extends Job {
  customer?: Customer;
  vehicle?: Vehicle;
  appointment?: Appointment;
  jobNumber?: string;
  description?: string;
  estimatedDurationMinutes?: number;
  milestones?: JobMilestone[];
  noteEntries?: JobNote[];
  attachments?: JobAttachment[];
}

export interface CustomerWithVehicles extends Customer {
  vehicles?: Vehicle[];
  jobs?: Job[];
  calls?: Call[];
}

export interface VehicleWithHistory extends Vehicle {
  customer?: Customer;
  jobs?: Job[];
  serviceHistory?: ServiceHistoryEntry[];
  notes?: VehicleNote[];
  alerts?: VehicleAlert[];
}

export interface ServiceHistoryEntry {
  id: string;
  jobId: string;
  vehicleId: string;
  serviceDate: string;
  serviceType: string;
  description: string;
  mileage?: number;
  cost?: number;
  technician?: string;
  notes?: string;
}

export interface VehicleNote {
  id: string;
  content: string;
  author?: string;
  createdAt: string;
}

export interface VehicleAlert {
  id: string;
  title: string;
  description?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: string;
}

export interface AppointmentWithJob extends Appointment {
  job?: JobWithRelations;
  customer?: Customer;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Filter and search types
export interface JobFilters {
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

export interface CustomerFilters {
  search?: string;
  preferredContact?: PreferredContact[];
  hasActiveJobs?: boolean;
}

export interface CallFilters {
  outcome?: CallOutcome[];
  dateRange?: {
    start: string;
    end: string;
  };
  customerId?: string;
}

// Calendar/scheduling types
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resourceId: Bay;
  backgroundColor?: string;
  borderColor?: string;
  extendedProps: {
    jobId: string;
    customerId: string;
    vehicleId: string;
    status: JobStatus;
    priority: JobPriority;
    estimatedHours?: number;
    customerName?: string;
    vehicleInfo?: string;
    appointmentId?: string;
    invoiceNumber?: string;
  };
}

export interface BayResource {
  id: Bay;
  title: string;
  businessHours?: {
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
  };
}

// Shop configuration types
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

// Dashboard/KPI types
export interface DashboardScheduleEntry {
  appointmentId: string;
  jobId: string;
  jobTitle?: string;
  status?: JobStatus;
  bay: Bay;
  startAt: string;
  endAt: string;
  customerName?: string;
  vehicle?: {
    year?: number;
    make?: string;
    model?: string;
    licensePlate?: string;
  };
}

export interface DashboardStats {
  today: {
    carsScheduled: number;
    hoursBooked: number;
    totalCapacity: number;
    waitingOnParts: number;
    completed: number;
  };
  thisWeek: {
    jobsCompleted: number;
    totalRevenue?: number;
    averageJobTime: number;
    customerSatisfaction?: number;
  };
  todaySchedule: DashboardScheduleEntry[];
}
// Export utilities
export interface ExportOptions {
  format: 'csv' | 'pdf';
  dateRange?: {
    start: string;
    end: string;
  };
  includeFields: string[];
  filters?: JobFilters | CustomerFilters | CallFilters;
}

