import { db, generateId, getCurrentTimestamp } from '../config/instantdb';
import {
  Appointment,
  Bay,
  BayConfigurationItem,
  Call,
  CallOutcome,
  CallQueryFilters,
  CallServicePriority,
  CallStatus,
  CreateAppointmentRequest,
  CreateCallRequest,
  CreateCustomerRequest,
  CreateJobRequest,
  CreateVehicleRequest,
  Customer,
  CustomerQueryFilters,
  Job,
  JobNote,
  JobPriority,
  JobQueryFilters,
  JobStatus,
  SchedulingDefaultsConfig,
  ShopHoursSettings,
  ShopSettings,
  StatusPalette,
  UpdateAppointmentRequest,
  UpdateCallRequest,
  UpdateCustomerRequest,
  UpdateJobRequest,
  UpdateVehicleRequest,
  Vehicle,
  VehicleQueryFilters,
  isValidBay,
  isValidCallOutcome,
  isValidInvoiceNumber,
  isValidJobPriority,
  isValidJobStatus,
  isValidPreferredContact,
} from '../types/database';

interface StoredJob extends Omit<Job, 'noteEntries'> {
  noteEntries?: string;
}

interface StoredCall extends Omit<Call, 'customerConcerns'> {
  customerConcerns?: string;
}

type QueryResult<T> = {
  [K in keyof T]: T[K];
};

const sanitizeForStorage = <T extends object>(record: T): Record<string, unknown> => {
  const sanitized = { ...(record as Record<string, unknown>) };
  for (const key of Object.keys(sanitized)) {
    if (sanitized[key] === undefined) {
      delete sanitized[key];
    }
  }
  return sanitized;
};

const serializeJob = (job: Job): StoredJob => {
  return sanitizeForStorage({
    ...job,
    noteEntries: job.noteEntries && job.noteEntries.length > 0
      ? JSON.stringify(job.noteEntries)
      : undefined,
  }) as unknown as StoredJob;
};

const deserializeJob = (record: any): Job => {
  if (!record) {
    return record;
  }

  let noteEntries: JobNote[] | undefined;
  try {
    noteEntries = record.noteEntries ? JSON.parse(record.noteEntries) : undefined;
  } catch (error) {
    console.warn('Failed to parse job note entries, returning empty array.', error);
    noteEntries = [];
  }

  return {
    ...record,
    noteEntries,
  } as Job;
};

const serializeCall = (call: Call): StoredCall => {
  return sanitizeForStorage({
    ...call,
    customerConcerns: call.customerConcerns && call.customerConcerns.length > 0
      ? JSON.stringify(call.customerConcerns)
      : undefined,
  }) as unknown as StoredCall;
};

const deserializeCall = (record: any): Call => {
  if (!record) {
    return record;
  }

  let customerConcerns: string[] | undefined;
  try {
    customerConcerns = record.customerConcerns
      ? JSON.parse(record.customerConcerns)
      : undefined;
  } catch (error) {
    console.warn('Failed to parse customer concerns, returning empty array.', error);
    customerConcerns = [];
  }

  return {
    ...record,
    customerConcerns,
  } as Call;
};

const paginate = <T>(items: T[], limit?: number, offset?: number): T[] => {
  const start = offset ?? 0;
  if (limit === undefined) {
    return items.slice(start);
  }
  return items.slice(start, start + limit);
};

const JOB_ACTIVE_STATUSES: JobStatus[] = [
  'intake',
  'incoming-call',
  'scheduled',
  'in-progress',
  'in-bay',
  'waiting-parts',
];

export class DatabaseService {
  // Customers
  async createCustomer(data: CreateCustomerRequest): Promise<Customer> {
    if (!isValidPreferredContact(data.preferredContact)) {
      throw new Error('Invalid preferred contact method');
    }

    const timestamp = getCurrentTimestamp();
    const customer: Customer = {
      id: generateId('cust'),
      name: data.name,
      phone: data.phone,
      email: data.email,
      address: data.address,
      preferredContact: data.preferredContact,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const storedCustomer = sanitizeForStorage(customer);
    await db.transact([db.tx.customers[customer.id].update(storedCustomer as any)]);
    return customer;
  }

  async getCustomer(id: string): Promise<Customer | null> {
    const result = await db.query({ customers: { $: { where: { id } } } });
    return (result.customers?.[0] as Customer) ?? null;
  }

  async getAllCustomers(filters?: CustomerQueryFilters): Promise<Customer[]> {
    const result = await db.query({ customers: {} });
    let customers: Customer[] = (result.customers as Customer[] | undefined) ?? [];

    if (filters?.search) {
      const needle = filters.search.toLowerCase();
      customers = customers.filter((customer) => (
        customer.name?.toLowerCase().includes(needle) ||
        customer.phone?.toLowerCase().includes(needle) ||
        customer.email?.toLowerCase().includes(needle)
      ));
    }

    if (filters?.preferredContact?.length) {
      const allowed = new Set(filters.preferredContact);
      customers = customers.filter((customer) => allowed.has(customer.preferredContact));
    }

    if (typeof filters?.hasActiveJobs === 'boolean') {
      const jobs = await this.getAllJobs();
      const jobsByCustomer = new Map<string, Job[]>();
      for (const job of jobs) {
        const list = jobsByCustomer.get(job.customerId) ?? [];
        list.push(job);
        jobsByCustomer.set(job.customerId, list);
      }

      customers = customers.filter((customer) => {
        const customerJobs = jobsByCustomer.get(customer.id) ?? [];
        const hasActive = customerJobs.some((job) => JOB_ACTIVE_STATUSES.includes(job.status));
        return filters.hasActiveJobs ? hasActive : !hasActive;
      });
    }

    customers = paginate(customers, filters?.limit, filters?.offset);
    return customers;
  }

  async updateCustomer(id: string, data: UpdateCustomerRequest): Promise<Customer | null> {
    const existing = await this.getCustomer(id);
    if (!existing) {
      return null;
    }

    if (data.preferredContact && !isValidPreferredContact(data.preferredContact)) {
      throw new Error('Invalid preferred contact method');
    }

    const updated: Customer = {
      ...existing,
      ...data,
      updatedAt: getCurrentTimestamp(),
    };

    const storedCustomer = sanitizeForStorage(updated);
    await db.transact([db.tx.customers[id].update(storedCustomer as any)]);
    return updated;
  }

  async deleteCustomer(id: string): Promise<boolean> {
    const existing = await this.getCustomer(id);
    if (!existing) {
      return false;
    }

    await db.transact([db.tx.customers[id].delete()]);
    return true;
  }

  // Vehicles
  async createVehicle(data: CreateVehicleRequest): Promise<Vehicle> {
    const timestamp = getCurrentTimestamp();
    const vehicle: Vehicle = {
      id: generateId('veh'),
      customerId: data.customerId,
      year: data.year,
      make: data.make,
      model: data.model,
      licensePlate: data.licensePlate,
      mileage: data.mileage,
      color: data.color,
      vin: data.vin,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const storedVehicle = sanitizeForStorage(vehicle);
    await db.transact([db.tx.vehicles[vehicle.id].update(storedVehicle as any)]);
    return vehicle;
  }

  async getVehicle(id: string): Promise<Vehicle | null> {
    const result = await db.query({ vehicles: { $: { where: { id } } } });
    return (result.vehicles?.[0] as Vehicle) ?? null;
  }

  async getAllVehicles(filters: VehicleQueryFilters = {}): Promise<Vehicle[]> {
    const result = await db.query({ vehicles: {} });
    let vehicles: Vehicle[] = ((result.vehicles as Vehicle[] | undefined) ?? []).map((vehicle) => ({
      ...vehicle,
    }));

    if (filters.ids?.length) {
      const allowedIds = new Set(filters.ids);
      vehicles = vehicles.filter((vehicle) => allowedIds.has(vehicle.id));
    }

    if (filters.customerId) {
      vehicles = vehicles.filter((vehicle) => vehicle.customerId === filters.customerId);
    }

    if (filters.make) {
      const make = filters.make.toLowerCase();
      vehicles = vehicles.filter((vehicle) => vehicle.make.toLowerCase() === make);
    }

    if (filters.model) {
      const model = filters.model.toLowerCase();
      vehicles = vehicles.filter((vehicle) => vehicle.model.toLowerCase() === model);
    }

    if (typeof filters.year === 'number') {
      vehicles = vehicles.filter((vehicle) => vehicle.year === filters.year);
    }

    if (filters.search) {
      const term = filters.search.toLowerCase();
      vehicles = vehicles.filter((vehicle) => {
        return [
          vehicle.make,
          vehicle.model,
          vehicle.licensePlate,
          vehicle.vin,
        ]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLowerCase().includes(term));
      });
    }

    return vehicles.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async getVehiclesByCustomer(customerId: string): Promise<Vehicle[]> {
    const result = await db.query({ vehicles: {} });
    const vehicles: Vehicle[] = (result.vehicles as Vehicle[] | undefined) ?? [];
    return vehicles.filter((vehicle) => vehicle.customerId === customerId);
  }

  async updateVehicle(id: string, data: UpdateVehicleRequest): Promise<Vehicle | null> {
    const existing = await this.getVehicle(id);
    if (!existing) {
      return null;
    }

    const updated: Vehicle = {
      ...existing,
      ...data,
      updatedAt: getCurrentTimestamp(),
    };

    const storedVehicle = sanitizeForStorage(updated);
    await db.transact([db.tx.vehicles[id].update(storedVehicle as any)]);
    return updated;
  }

  async deleteVehicle(id: string): Promise<boolean> {
    const existing = await this.getVehicle(id);
    if (!existing) {
      return false;
    }

    await db.transact([db.tx.vehicles[id].delete()]);
    return true;
  }

  // Jobs
  async createJob(data: CreateJobRequest): Promise<Job> {
    if (!isValidJobPriority(data.priority)) {
      throw new Error('Invalid job priority');
    }

    const status = data.status ?? 'incoming-call';
    if (!isValidJobStatus(status)) {
      throw new Error('Invalid job status');
    }

    if (data.invoiceNumber && !isValidInvoiceNumber(data.invoiceNumber)) {
      throw new Error('Invalid invoice number format');
    }

    const timestamp = getCurrentTimestamp();
    const job: Job = {
      id: generateId('job'),
      title: data.title,
      customerId: data.customerId,
      vehicleId: data.vehicleId,
      estHours: data.estHours,
      status,
      priority: data.priority,
      invoiceNumber: data.invoiceNumber,
      notes: data.notes,
      noteEntries: data.noteEntries ?? [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await db.transact([db.tx.jobs[job.id].update(serializeJob(job) as any)]);
    return job;
  }

  async getJob(id: string): Promise<Job | null> {
    const result = await db.query({ jobs: { $: { where: { id } } } });
    const raw = result.jobs?.[0];
    return raw ? deserializeJob(raw) : null;
  }

  async getAllJobs(filters?: JobQueryFilters): Promise<Job[]> {
    const result = await db.query({ jobs: {} });
    let jobs: Job[] = ((result.jobs as QueryResult<StoredJob>[] | undefined) ?? []).map(deserializeJob);

    if (filters?.status?.length) {
      const allowed = new Set(filters.status);
      jobs = jobs.filter((job) => allowed.has(job.status));
    }

    if (filters?.priority?.length) {
      const allowed = new Set(filters.priority);
      jobs = jobs.filter((job) => allowed.has(job.priority));
    }

    if (filters?.customerId) {
      jobs = jobs.filter((job) => job.customerId === filters.customerId);
    }

    if (filters?.vehicleId) {
      jobs = jobs.filter((job) => job.vehicleId === filters.vehicleId);
    }

    if (filters?.dateRange) {
      const { start, end } = filters.dateRange;
      const startDate = new Date(start).getTime();
      const endDate = new Date(end).getTime();
      jobs = jobs.filter((job) => {
        const created = new Date(job.createdAt).getTime();
        return created >= startDate && created <= endDate;
      });
    }

    jobs = paginate(jobs, filters?.limit, filters?.offset);
    return jobs;
  }

  async updateJob(id: string, data: UpdateJobRequest): Promise<Job | null> {
    const existing = await this.getJob(id);
    if (!existing) {
      return null;
    }

    if (data.status && !isValidJobStatus(data.status)) {
      throw new Error('Invalid job status');
    }

    if (data.priority && !isValidJobPriority(data.priority)) {
      throw new Error('Invalid job priority');
    }

    let invoiceNumber = data.invoiceNumber;
    if (invoiceNumber !== undefined) {
      const trimmed = invoiceNumber?.trim() ?? '';
      if (trimmed && !isValidInvoiceNumber(trimmed)) {
        throw new Error('Invalid invoice number format');
      }
      invoiceNumber = trimmed || undefined;
    }

    const noteEntries = data.noteEntries ?? existing.noteEntries ?? [];
    const normalizedNotes = noteEntries.map((note) => ({
      ...note,
      id: note.id ?? generateId('note'),
      author: note.author ?? 'Shop Team',
      createdAt: note.createdAt ?? getCurrentTimestamp(),
    }));

    const updated: Job = {
      ...existing,
      ...data,
      invoiceNumber,
      noteEntries: normalizedNotes,
      updatedAt: getCurrentTimestamp(),
    };

    await db.transact([db.tx.jobs[id].update(serializeJob(updated) as any)]);
    return updated;
  }

  async deleteJob(id: string): Promise<boolean> {
    const existing = await this.getJob(id);
    if (!existing) {
      return false;
    }

    await db.transact([db.tx.jobs[id].delete()]);
    return true;
  }

  // Appointments
  async createAppointment(data: CreateAppointmentRequest): Promise<Appointment> {
    if (!isValidBay(data.bay)) {
      throw new Error('Invalid bay identifier');
    }

    const timestamp = getCurrentTimestamp();
    const appointment: Appointment = {
      id: generateId('appt'),
      jobId: data.jobId,
      bay: data.bay,
      startAt: data.startAt,
      endAt: data.endAt,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await db.transact([db.tx.appointments[appointment.id].update(appointment as any)]);
    return appointment;
  }

  async getAppointment(id: string): Promise<Appointment | null> {
    const result = await db.query({ appointments: { $: { where: { id } } } });
    return (result.appointments?.[0] as Appointment) ?? null;
  }

  async getAppointmentByJob(jobId: string): Promise<Appointment | null> {
    const result = await db.query({ appointments: { $: { where: { jobId } } } });
    return (result.appointments?.[0] as Appointment) ?? null;
  }

  async getAllAppointments(): Promise<Appointment[]> {
    const result = await db.query({ appointments: {} });
    return (result.appointments as Appointment[] | undefined) ?? [];
  }

  async updateAppointment(id: string, data: UpdateAppointmentRequest): Promise<Appointment | null> {
    const existing = await this.getAppointment(id);
    if (!existing) {
      return null;
    }

    if (data.bay && !isValidBay(data.bay)) {
      throw new Error('Invalid bay identifier');
    }

    const updated: Appointment = {
      ...existing,
      ...data,
      updatedAt: getCurrentTimestamp(),
    };

    await db.transact([db.tx.appointments[id].update(updated as any)]);
    return updated;
  }

  async deleteAppointment(id: string): Promise<boolean> {
    const existing = await this.getAppointment(id);
    if (!existing) {
      return false;
    }

    await db.transact([db.tx.appointments[id].delete()]);
    return true;
  }

  // Calls
  async createCall(data: CreateCallRequest): Promise<Call> {
    if (!isValidCallOutcome(data.callOutcome)) {
      throw new Error('Invalid call outcome');
    }

    const timestamp = getCurrentTimestamp();
    const call: Call = {
      id: generateId('call'),
      callId: data.callId ?? `CALL-${Date.now()}`,
      customerId: data.customerId,
      customerName: data.customerName,
      jobId: data.jobId,
      vehicleId: data.vehicleId,
      vehicleYear: data.vehicleYear,
      vehicleMake: data.vehicleMake,
      vehicleModel: data.vehicleModel,
      phoneNumber: data.phoneNumber,
      callStartTime: data.callStartTime ?? timestamp,
      callDuration: data.callDuration,
      callReason: data.callReason,
      callNotes: data.callNotes,
      customerConcerns: data.customerConcerns ?? [],
      followUpRequired: data.followUpRequired ?? false,
      followUpDate: data.followUpDate,
      appointmentRequested: data.appointmentRequested ?? false,
      quoteRequested: data.quoteRequested ?? false,
      callOutcome: data.callOutcome,
      nextAction: data.nextAction,
      callTakenBy: data.callTakenBy,
      callSource: data.callSource,
      serviceType: data.serviceType,
      servicePriority: data.servicePriority ?? 'normal',
      estimatedCost: data.estimatedCost,
      status: data.status ?? 'open',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await db.transact([db.tx.calls[call.id].update(serializeCall(call) as any)]);
    return call;
  }

  async getCall(id: string): Promise<Call | null> {
    const result = await db.query({ calls: { $: { where: { id } } } });
    const raw = result.calls?.[0];
    return raw ? deserializeCall(raw) : null;
  }

  async getAllCalls(filters?: CallQueryFilters): Promise<Call[]> {
    const result = await db.query({ calls: {} });
    let calls: Call[] = ((result.calls as QueryResult<StoredCall>[] | undefined) ?? []).map(deserializeCall);

    if (filters?.outcome?.length) {
      const allowed = new Set(filters.outcome);
      calls = calls.filter((call) => allowed.has(call.callOutcome));
    }

    if (filters?.customerId) {
      calls = calls.filter((call) => call.customerId === filters.customerId);
    }

    if (filters?.dateRange) {
      const { start, end } = filters.dateRange;
      const startDate = new Date(start).getTime();
      const endDate = new Date(end).getTime();
      calls = calls.filter((call) => {
        const created = new Date(call.createdAt).getTime();
        return created >= startDate && created <= endDate;
      });
    }

    calls = paginate(calls, filters?.limit, filters?.offset);
    return calls;
  }

  async updateCall(id: string, data: UpdateCallRequest): Promise<Call | null> {
    const existing = await this.getCall(id);
    if (!existing) {
      return null;
    }

    if (data.callOutcome && !isValidCallOutcome(data.callOutcome)) {
      throw new Error('Invalid call outcome');
    }

    const updated: Call = {
      ...existing,
      ...data,
      customerConcerns: data.customerConcerns ?? existing.customerConcerns ?? [],
      updatedAt: getCurrentTimestamp(),
    };

    await db.transact([db.tx.calls[id].update(serializeCall(updated) as any)]);
    return updated;
  }

  async deleteCall(id: string): Promise<boolean> {
    const existing = await this.getCall(id);
    if (!existing) {
      return false;
    }

    await db.transact([db.tx.calls[id].delete()]);
    return true;
  }

  // Shop settings
  async getShopSettings(): Promise<ShopSettings | null> {
    const result = await db.query({ shopSettings: {} });
    const raw = result.shopSettings?.[0];
    if (!raw) {
      return null;
    }

    return {
      ...raw,
      hours: JSON.parse(raw.hours),
      bays: JSON.parse(raw.bays),
      statusPalettes: JSON.parse(raw.statusPalettes),
      schedulingDefaults: JSON.parse(raw.schedulingDefaults),
    } as ShopSettings;
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
      intake: { primary: '#1E293B', accent: '#E2E8F0' },
      'incoming-call': { primary: '#64748B', accent: '#E2E8F0' },
      scheduled: { primary: '#2563EB', accent: '#DDE9FF' },
      'in-progress': { primary: '#0EA5E9', accent: '#CFFAFE' },
      'in-bay': { primary: '#16A34A', accent: '#D1FADF' },
      'waiting-parts': { primary: '#EA580C', accent: '#FFE8D5' },
      completed: { primary: '#0F172A', accent: '#CBD5F5' },
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

    const hours = data.hours ?? existing?.hours ?? defaultHours;
    const bays = data.bays ?? existing?.bays ?? defaultBays;
    const palettes = data.statusPalettes ?? existing?.statusPalettes ?? defaultStatusPalettes;
    const scheduling = data.schedulingDefaults ?? existing?.schedulingDefaults ?? defaultSchedulingDefaults;

    const settings: ShopSettings = {
      id: existing?.id ?? generateId('settings'),
      shopName: data.shopName ?? existing?.shopName ?? 'My Auto Shop',
      address: data.address ?? existing?.address,
      phone: data.phone ?? existing?.phone,
      email: data.email ?? existing?.email,
      hours,
      bays,
      statusPalettes: palettes,
      schedulingDefaults: scheduling,
      createdAt: existing?.createdAt ?? getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
    };

    const storedSettings = sanitizeForStorage({
      ...settings,
      hours: JSON.stringify(settings.hours),
      bays: JSON.stringify(settings.bays),
      statusPalettes: JSON.stringify(settings.statusPalettes),
      schedulingDefaults: JSON.stringify(settings.schedulingDefaults),
    });

    await db.transact([
      db.tx.shopSettings[settings.id].update(storedSettings as any),
    ]);

    return settings;
  }
}

export const databaseService = new DatabaseService();
