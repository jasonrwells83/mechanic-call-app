import { db, generateId, getCurrentTimestamp } from '../config/instantdb';
import {
  Customer,
  Vehicle,
  Job,
  Appointment,
  Call,
  ShopSettings,
  ShopHoursSettings,
  BayConfigurationItem,
  SchedulingDefaultsConfig,
  StatusPalette,
  JobStatus,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  CreateVehicleRequest,
  UpdateVehicleRequest,
  CreateJobRequest,
  UpdateJobRequest,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
  CreateCallRequest,
  UpdateCallRequest,
  JobQueryFilters,
  CustomerQueryFilters,
  CallQueryFilters,
  isValidJobStatus,
  isValidJobPriority,
  isValidBay,
  isValidCallOutcome,
  isValidPreferredContact,
  isValidInvoiceNumber,
} from '../types/database';

interface CollectionQuery {
  0: Record<string, unknown>;
  [key: string]: unknown;
}

interface CustomersQuery {
  customers: CollectionQuery;
}

interface JobsQuery {
  jobs: CollectionQuery;
}

interface CallsQuery {
  calls: CollectionQuery;
}

// Database service class for all CRUD operations
export class DatabaseService {
  // Customer operations
  async createCustomer(data: CreateCustomerRequest): Promise<Customer> {
    if (!isValidPreferredContact(data.preferredContact)) {
      throw new Error('Invalid preferred contact method');
    }

    const customer: Customer = {
      id: generateId('cust'),
      name: data.name,
      phone: data.phone,
      email: data.email,
      preferredContact: data.preferredContact,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
    };

    await db.transact([
      { customers: { [customer.id]: customer } }
    ]);

    return customer;
  }

  async getCustomer(id: string): Promise<Customer | null> {
    const result = await db.query({
      customers: {
        $: { where: { id } }
      }
    });
    
    return result.customers[0] || null;
  }

  async getAllCustomers(filters?: CustomerQueryFilters): Promise<Customer[]> {
    const query: CustomersQuery = { customers: {} };
    
    // Apply filters if provided
    if (filters?.search) {
      query.customers.$ = {
        where: {
          $or: [
            { name: { $like: `%${filters.search}%` } },
            { phone: { $like: `%${filters.search}%` } },
            { email: { $like: `%${filters.search}%` } }
          ]
        }
      };
    }

    const result = await db.query(query);
    return result.customers || [];
  }

  async updateCustomer(id: string, data: UpdateCustomerRequest): Promise<Customer | null> {
    const existing = await this.getCustomer(id);
    if (!existing) return null;

    if (data.preferredContact && !isValidPreferredContact(data.preferredContact)) {
      throw new Error('Invalid preferred contact method');
    }

    const updated: Customer = {
      ...existing,
      ...data,
      updatedAt: getCurrentTimestamp(),
    };

    await db.transact([
      { customers: { [id]: updated } }
    ]);

    return updated;
  }

  async deleteCustomer(id: string): Promise<boolean> {
    const existing = await this.getCustomer(id);
    if (!existing) return false;

    await db.transact([
      { customers: { [id]: null } }
    ]);

    return true;
  }

  // Vehicle operations
  async createVehicle(data: CreateVehicleRequest): Promise<Vehicle> {
    const vehicle: Vehicle = {
      id: generateId('veh'),
      customerId: data.customerId,
      year: data.year,
      make: data.make,
      model: data.model,
      mileage: data.mileage,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
    };

    await db.transact([
      { vehicles: { [vehicle.id]: vehicle } }
    ]);

    return vehicle;
  }

  async getVehicle(id: string): Promise<Vehicle | null> {
    const result = await db.query({
      vehicles: {
        $: { where: { id } }
      }
    });
    
    return result.vehicles[0] || null;
  }

  async getVehiclesByCustomer(customerId: string): Promise<Vehicle[]> {
    const result = await db.query({
      vehicles: {
        $: { where: { customerId } }
      }
    });
    
    return result.vehicles || [];
  }

  async updateVehicle(id: string, data: UpdateVehicleRequest): Promise<Vehicle | null> {
    const existing = await this.getVehicle(id);
    if (!existing) return null;

    const updated: Vehicle = {
      ...existing,
      ...data,
      updatedAt: getCurrentTimestamp(),
    };

    await db.transact([
      { vehicles: { [id]: updated } }
    ]);

    return updated;
  }

  async deleteVehicle(id: string): Promise<boolean> {
    const existing = await this.getVehicle(id);
    if (!existing) return false;

    await db.transact([
      { vehicles: { [id]: null } }
    ]);

    return true;
  }

  // Job operations
  async createJob(data: CreateJobRequest): Promise<Job> {
    if (!isValidJobPriority(data.priority)) {
      throw new Error('Invalid job priority');
    }

    const invoiceNumber = data.invoiceNumber?.trim() || undefined;
    if (invoiceNumber && !isValidInvoiceNumber(invoiceNumber)) {
      throw new Error('Invalid invoice number format');
    }

    const job: Job = {
      id: generateId('job'),
      title: data.title,
      customerId: data.customerId,
      vehicleId: data.vehicleId,
      estHours: data.estHours,
      status: 'incoming-call',
      priority: data.priority,
      invoiceNumber,
      notes: data.notes,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
    };

    await db.transact([
      { jobs: { [job.id]: job } }
    ]);

    return job;
  }

  async getJob(id: string): Promise<Job | null> {
    const result = await db.query({
      jobs: {
        $: { where: { id } }
      }
    });
    
    return result.jobs[0] || null;
  }

  async getAllJobs(filters?: JobQueryFilters): Promise<Job[]> {
    const query: JobsQuery = { jobs: {} };
    
    // Apply filters if provided
    if (filters?.status?.length) {
      query.jobs.$ = {
        where: { status: { $in: filters.status } }
      };
    }

    if (filters?.customerId) {
      query.jobs.$ = {
        ...query.jobs.$,
        where: {
          ...query.jobs.$?.where,
          customerId: filters.customerId
        }
      };
    }

    const result = await db.query(query);
    return result.jobs || [];
  }

  async updateJob(id: string, data: UpdateJobRequest): Promise<Job | null> {
    const existing = await this.getJob(id);
    if (!existing) return null;

    if (data.status && !isValidJobStatus(data.status)) {
      throw new Error('Invalid job status');
    }

    if (data.priority && !isValidJobPriority(data.priority)) {
      throw new Error('Invalid job priority');
    }

    const sanitizedData: UpdateJobRequest = { ...data };

    if (sanitizedData.invoiceNumber !== undefined) {
      const trimmed = sanitizedData.invoiceNumber?.trim() ?? '';
      if (trimmed.length > 0) {
        if (!isValidInvoiceNumber(trimmed)) {
          throw new Error('Invalid invoice number format');
        }
        sanitizedData.invoiceNumber = trimmed;
      } else {
        sanitizedData.invoiceNumber = undefined;
      }
    }

    const updated: Job = {
      ...existing,
      ...sanitizedData,
      updatedAt: getCurrentTimestamp(),
    };

    await db.transact([
      { jobs: { [id]: updated } }
    ]);

    return updated;
  }

  async deleteJob(id: string): Promise<boolean> {
    const existing = await this.getJob(id);
    if (!existing) return false;

    await db.transact([
      { jobs: { [id]: null } }
    ]);

    return true;
  }

  // Appointment operations
  async createAppointment(data: CreateAppointmentRequest): Promise<Appointment> {
    if (!isValidBay(data.bay)) {
      throw new Error('Invalid bay');
    }

    const appointment: Appointment = {
      id: generateId('appt'),
      jobId: data.jobId,
      bay: data.bay,
      startAt: data.startAt,
      endAt: data.endAt,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
    };

    await db.transact([
      { appointments: { [appointment.id]: appointment } }
    ]);

    return appointment;
  }

  async getAppointment(id: string): Promise<Appointment | null> {
    const result = await db.query({
      appointments: {
        $: { where: { id } }
      }
    });
    
    return result.appointments[0] || null;
  }

  async getAppointmentByJob(jobId: string): Promise<Appointment | null> {
    const result = await db.query({
      appointments: {
        $: { where: { jobId } }
      }
    });
    
    return result.appointments[0] || null;
  }

  async getAllAppointments(): Promise<Appointment[]> {
    const result = await db.query({
      appointments: {}
    });
    
    return result.appointments || [];
  }

  async updateAppointment(id: string, data: UpdateAppointmentRequest): Promise<Appointment | null> {
    const existing = await this.getAppointment(id);
    if (!existing) return null;

    if (data.bay && !isValidBay(data.bay)) {
      throw new Error('Invalid bay');
    }

    const updated: Appointment = {
      ...existing,
      ...data,
      updatedAt: getCurrentTimestamp(),
    };

    await db.transact([
      { appointments: { [id]: updated } }
    ]);

    return updated;
  }

  async deleteAppointment(id: string): Promise<boolean> {
    const existing = await this.getAppointment(id);
    if (!existing) return false;

    await db.transact([
      { appointments: { [id]: null } }
    ]);

    return true;
  }

  // Call operations
  async createCall(data: CreateCallRequest): Promise<Call> {
    if (!isValidCallOutcome(data.outcome)) {
      throw new Error('Invalid call outcome');
    }

    const call: Call = {
      id: generateId('call'),
      customerId: data.customerId,
      phone: data.phone,
      notes: data.notes,
      outcome: data.outcome,
      nextActionAt: data.nextActionAt,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
    };

    await db.transact([
      { calls: { [call.id]: call } }
    ]);

    return call;
  }

  async getCall(id: string): Promise<Call | null> {
    const result = await db.query({
      calls: {
        $: { where: { id } }
      }
    });
    
    return result.calls[0] || null;
  }

  async getAllCalls(filters?: CallQueryFilters): Promise<Call[]> {
    const query: CallsQuery = { calls: {} };
    
    // Apply filters if provided
    if (filters?.outcome?.length) {
      query.calls.$ = {
        where: { outcome: { $in: filters.outcome } }
      };
    }

    const result = await db.query(query);
    return result.calls || [];
  }

  async updateCall(id: string, data: UpdateCallRequest): Promise<Call | null> {
    const existing = await this.getCall(id);
    if (!existing) return null;

    if (data.outcome && !isValidCallOutcome(data.outcome)) {
      throw new Error('Invalid call outcome');
    }

    const updated: Call = {
      ...existing,
      ...data,
      updatedAt: getCurrentTimestamp(),
    };

    await db.transact([
      { calls: { [id]: updated } }
    ]);

    return updated;
  }

  async deleteCall(id: string): Promise<boolean> {
    const existing = await this.getCall(id);
    if (!existing) return false;

    await db.transact([
      { calls: { [id]: null } }
    ]);

    return true;
  }

  // Shop settings operations
  async getShopSettings(): Promise<ShopSettings | null> {
    const result = await db.query({
      shopSettings: {}
    });
    
    const settings = result.shopSettings[0];
    if (!settings) return null;

    // Parse JSON fields
    return {
      ...settings,
      hours: JSON.parse(settings.hours),
      bays: JSON.parse(settings.bays),
      statusPalettes: JSON.parse(settings.statusPalettes),
      schedulingDefaults: JSON.parse(settings.schedulingDefaults),
    };
  }

  async createOrUpdateShopSettings(data: Partial<ShopSettings>): Promise<ShopSettings> {
    const existing = await this.getShopSettings();

    const defaultHours: ShopHoursSettings = {
      timezone: 'America/Los_Angeles',
      days: {
        monday: { open: '08:00', close: '17:00', closed: false },
        tuesday: { open: '08:00', close: '17:00', closed: false },
        wednesday: { open: '08:00', close: '17:00', closed: false },
        thursday: { open: '08:00', close: '17:00', closed: false },
        friday: { open: '08:00', close: '17:00', closed: false },
        saturday: { open: '09:00', close: '14:00', closed: false },
        sunday: { open: '09:00', close: '14:00', closed: true },
      },
      closures: [],
    };

    const defaultBays: BayConfigurationItem[] = [
      {
        id: 'bay-1',
        name: 'Bay 1',
        shortCode: 'B1',
        isActive: true,
        supportsHeavyDuty: false,
        notes: 'General services and inspections.',
      },
      {
        id: 'bay-2',
        name: 'Bay 2',
        shortCode: 'B2',
        isActive: true,
        supportsHeavyDuty: true,
        notes: 'Lift-equipped bay for heavy-duty work.',
      },
    ];

    const defaultStatusPalettes: Record<JobStatus, StatusPalette> = {
      'incoming-call': { primary: '#64748B', accent: '#E2E8F0' },
      'scheduled': { primary: '#2563EB', accent: '#DDE9FF' },
      'in-bay': { primary: '#16A34A', accent: '#D1FADF' },
      'waiting-parts': { primary: '#EA580C', accent: '#FFE8D5' },
      'completed': { primary: '#0F172A', accent: '#CBD5F5' },
    };

    const defaultSchedulingDefaults: SchedulingDefaultsConfig = {
      defaultJobDuration: 60,
      minimumSlotIncrement: 30,
      bufferMinutes: 10,
      enableAutoBuffers: true,
      lockEditingWithinMinutes: 30,
      allowSameDayScheduling: true,
      overbookingPolicy: 'soft',
    };

    const sanitizedHours: ShopHoursSettings = data.hours || existing?.hours || defaultHours;
    const sanitizedBays: BayConfigurationItem[] = data.bays || existing?.bays || defaultBays;
    const sanitizedPalettes: Record<JobStatus, StatusPalette> =
      data.statusPalettes || existing?.statusPalettes || defaultStatusPalettes;
    const sanitizedScheduling: SchedulingDefaultsConfig =
      data.schedulingDefaults || existing?.schedulingDefaults || defaultSchedulingDefaults;

    const settings: ShopSettings = {
      id: existing?.id || generateId('settings'),
      shopName: data.shopName || existing?.shopName || 'My Auto Shop',
      address: data.address ?? existing?.address,
      phone: data.phone ?? existing?.phone,
      email: data.email ?? existing?.email,
      hours: sanitizedHours,
      bays: sanitizedBays,
      statusPalettes: sanitizedPalettes,
      schedulingDefaults: sanitizedScheduling,
      createdAt: existing?.createdAt || getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
    };

    const dbSettings = {
      ...settings,
      hours: JSON.stringify(settings.hours),
      bays: JSON.stringify(settings.bays),
      statusPalettes: JSON.stringify(settings.statusPalettes),
      schedulingDefaults: JSON.stringify(settings.schedulingDefaults),
    };

    await db.transact([
      { shopSettings: { [settings.id]: dbSettings } }
    ]);

    return settings;
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();











