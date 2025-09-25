import path from 'path';
import dotenv from 'dotenv';

const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

import { db } from '../src/config/instantdb';
import { id } from '@instantdb/admin';
import type {
  Appointment,
  Call,
  Customer,
  Job,
  JobNote,
  ShopSettings,
  Vehicle,
} from '../src/types/database';

interface StoredJob extends Omit<Job, 'noteEntries'> {
  noteEntries?: string;
}

interface StoredCall extends Omit<Call, 'customerConcerns'> {
  customerConcerns?: string;
}

const sanitize = <T extends object>(record: T): Record<string, unknown> => {
  const copy = { ...(record as Record<string, unknown>) };
  for (const key of Object.keys(copy)) {
    if (copy[key] === undefined) {
      delete copy[key];
    }
  }
  return copy;
};

const serializeJob = (job: Job): StoredJob => {
  return sanitize({
    ...job,
    noteEntries: job.noteEntries && job.noteEntries.length > 0
      ? JSON.stringify(job.noteEntries)
      : undefined,
  }) as unknown as StoredJob;
};

const serializeCall = (call: Call): StoredCall => {
  return sanitize({
    ...call,
    customerConcerns: call.customerConcerns && call.customerConcerns.length > 0
      ? JSON.stringify(call.customerConcerns)
      : undefined,
  }) as unknown as StoredCall;
};

const customers: Customer[] = [
  {
    id: 'cust-john-smith',
    name: 'John Smith',
    phone: '(555) 123-4567',
    email: 'john.smith@email.com',
    address: '123 Main St, Los Angeles, CA',
    preferredContact: 'phone',
    createdAt: '2024-01-15T16:30:00.000Z',
    updatedAt: '2024-01-15T16:30:00.000Z',
  },
  {
    id: 'cust-sarah-johnson',
    name: 'Sarah Johnson',
    phone: '(555) 987-6543',
    email: 'sarah.johnson@email.com',
    address: '456 Oak Ave, Pasadena, CA',
    preferredContact: 'email',
    createdAt: '2024-01-10T17:45:00.000Z',
    updatedAt: '2024-01-20T01:15:00.000Z',
  },
  {
    id: 'cust-mike-wilson',
    name: 'Mike Wilson',
    phone: '(555) 456-7890',
    email: 'mike.wilson@email.com',
    address: '789 Pine St, Burbank, CA',
    preferredContact: 'phone',
    createdAt: '2024-01-25T19:00:00.000Z',
    updatedAt: '2024-01-25T19:00:00.000Z',
  },
];

const vehicles: Vehicle[] = [
  {
    id: 'veh-camry-2020',
    customerId: 'cust-john-smith',
    year: 2020,
    make: 'Toyota',
    model: 'Camry',
    licensePlate: 'ABC123',
    mileage: 45000,
    color: 'Silver',
    vin: '1HGBH41JXMN109186',
    createdAt: '2024-01-15T16:30:00.000Z',
    updatedAt: '2024-01-15T16:30:00.000Z',
  },
  {
    id: 'veh-accord-2019',
    customerId: 'cust-sarah-johnson',
    year: 2019,
    make: 'Honda',
    model: 'Accord',
    licensePlate: 'XYZ789',
    mileage: 62000,
    color: 'Blue',
    vin: '1HGCV1F3XJA123456',
    createdAt: '2024-01-10T17:45:00.000Z',
    updatedAt: '2024-01-20T01:15:00.000Z',
  },
  {
    id: 'veh-rav4-2022',
    customerId: 'cust-mike-wilson',
    year: 2022,
    make: 'Toyota',
    model: 'RAV4',
    licensePlate: 'CAL-204',
    mileage: 18000,
    color: 'Magnetic Gray',
    vin: '2T3P1RFV2LW099876',
    createdAt: '2024-02-01T17:45:00.000Z',
    updatedAt: '2024-02-01T17:45:00.000Z',
  },
];

const jobNotes: Record<string, JobNote[]> = {
  'job-oil-change': [
    {
      id: 'note-oil-001',
      author: 'Jessie Brown',
      content: 'Customer requested synthetic oil and tire rotation.',
      createdAt: '2024-02-02T09:30:00.000Z',
      type: 'customer',
      isImportant: false,
    },
  ],
  'job-brake-repair': [
    {
      id: 'note-brake-001',
      author: 'Andre Gomez',
      content: 'Rotor surface shows scoring; recommend replacement.',
      createdAt: '2024-02-01T08:45:00.000Z',
      type: 'technical',
      isImportant: true,
    },
  ],
};

const jobs: Job[] = [
  {
    id: 'job-oil-change',
    title: 'Oil Change & Inspection',
    customerId: 'cust-john-smith',
    vehicleId: 'veh-camry-2020',
    estHours: 1.5,
    status: 'in-bay',
    priority: 'medium',
    invoiceNumber: 'INV-1042',
    notes: 'Scheduled maintenance visit.',
    noteEntries: jobNotes['job-oil-change'],
    createdAt: '2024-01-29T15:00:00.000Z',
    updatedAt: '2024-02-02T17:15:00.000Z',
  },
  {
    id: 'job-brake-repair',
    title: 'Brake Pad & Rotor Replacement',
    customerId: 'cust-sarah-johnson',
    vehicleId: 'veh-accord-2019',
    estHours: 3,
    status: 'scheduled',
    priority: 'high',
    invoiceNumber: 'A-22031',
    notes: 'Customer reported grinding noise at low speeds.',
    noteEntries: jobNotes['job-brake-repair'],
    createdAt: '2024-01-28T21:15:00.000Z',
    updatedAt: '2024-02-01T16:45:00.000Z',
  },
  {
    id: 'job-diagnostic',
    title: 'Check Engine Diagnostic',
    customerId: 'cust-mike-wilson',
    vehicleId: 'veh-rav4-2022',
    estHours: 2,
    status: 'incoming-call',
    priority: 'medium',
    notes: 'CEL came on while driving on freeway.',
    createdAt: '2024-02-03T20:00:00.000Z',
    updatedAt: '2024-02-03T20:00:00.000Z',
  },
];

const appointments: Appointment[] = [
  {
    id: 'appt-oil-change',
    jobId: 'job-oil-change',
    bay: 'bay-1',
    startAt: '2024-02-02T17:00:00.000Z',
    endAt: '2024-02-02T18:30:00.000Z',
    createdAt: '2024-01-29T15:30:00.000Z',
    updatedAt: '2024-02-02T17:00:00.000Z',
  },
  {
    id: 'appt-brake-repair',
    jobId: 'job-brake-repair',
    bay: 'bay-2',
    startAt: '2024-02-05T16:00:00.000Z',
    endAt: '2024-02-05T19:30:00.000Z',
    createdAt: '2024-01-28T21:20:00.000Z',
    updatedAt: '2024-02-01T16:45:00.000Z',
  },
];

const calls: Call[] = [
  {
    id: 'call-bridgewater-001',
    callId: 'CALL-001',
    customerId: 'cust-john-smith',
    customerName: 'John Smith',
    jobId: 'job-oil-change',
    vehicleId: 'veh-camry-2020',
    vehicleYear: 2020,
    vehicleMake: 'Toyota',
    vehicleModel: 'Camry',
    phoneNumber: '(555) 123-4567',
    callStartTime: '2024-02-01T22:15:00.000Z',
    callDuration: 420,
    callReason: 'Urgent oil change before weekend road trip',
    callNotes: 'Customer noticed maintenance reminder and wants tire rotation.',
    customerConcerns: ['Oil change', 'Tire rotation'],
    followUpRequired: false,
    appointmentRequested: true,
    quoteRequested: false,
    callOutcome: 'scheduled',
    nextAction: 'Send appointment reminder email',
    callTakenBy: 'Jessie Brown',
    callSource: 'phone',
    serviceType: 'Maintenance',
    servicePriority: 'normal',
    estimatedCost: 165,
    status: 'completed',
    createdAt: '2024-02-01T22:15:00.000Z',
    updatedAt: '2024-02-01T23:45:00.000Z',
  },
  {
    id: 'call-late-night-urgent',
    callId: 'CALL-002',
    customerId: 'cust-sarah-johnson',
    customerName: 'Sarah Johnson',
    phoneNumber: '(555) 987-6543',
    callStartTime: '2024-02-03T03:10:00.000Z',
    callDuration: 360,
    callReason: 'Brake noise getting louder',
    callNotes: 'Customer is worried about safety while driving with family.',
    customerConcerns: ['Safety', 'Long road trip planned'],
    followUpRequired: true,
    followUpDate: '2024-02-04T18:00:00.000Z',
    appointmentRequested: true,
    quoteRequested: true,
    callOutcome: 'follow-up',
    nextAction: 'Confirm parts availability and call customer back',
    callTakenBy: 'Andre Gomez',
    callSource: 'phone',
    serviceType: 'Brake Service',
    servicePriority: 'urgent',
    estimatedCost: 480,
    status: 'open',
    createdAt: '2024-02-03T03:10:00.000Z',
    updatedAt: '2024-02-03T03:10:00.000Z',
  },
  {
    id: 'call-web-lead-003',
    callId: 'CALL-003',
    phoneNumber: '(555) 444-2211',
    callStartTime: '2024-02-02T20:30:00.000Z',
    callDuration: 300,
    callReason: 'Check engine light came on after fueling',
    callNotes: 'Prospect needs diagnostic and smog check.',
    customerConcerns: ['Worried about emissions test'],
    followUpRequired: true,
    followUpDate: '2024-02-04T18:00:00.000Z',
    appointmentRequested: true,
    quoteRequested: false,
    callOutcome: 'quote-requested',
    nextAction: 'Send diagnostic quote and availability email',
    callTakenBy: 'Helena Park',
    callSource: 'online',
    serviceType: 'Diagnostics',
    servicePriority: 'high',
    estimatedCost: 189,
    status: 'open',
    createdAt: '2024-02-02T20:30:00.000Z',
    updatedAt: '2024-02-02T20:30:00.000Z',
  },
];

const shopSettings: ShopSettings = {
  id: 'settings-primary-shop',
  shopName: 'Bridgewater Auto Care',
  address: '2450 Mechanic Row, Glendale, CA',
  phone: '(555) 321-9090',
  email: 'service@bridgewaterauto.com',
  hours: {
    timezone: 'America/Los_Angeles',
    days: {
      monday: { open: '08:00', close: '18:00', closed: false },
      tuesday: { open: '08:00', close: '18:00', closed: false },
      wednesday: { open: '08:00', close: '18:00', closed: false },
      thursday: { open: '08:00', close: '18:00', closed: false },
      friday: { open: '08:00', close: '17:00', closed: false },
      saturday: { open: '09:00', close: '14:00', closed: false },
      sunday: { open: '09:00', close: '14:00', closed: true },
    },
    closures: [
      {
        id: 'closure-july4',
        name: 'Independence Day',
        startDate: '2024-07-04',
        endDate: '2024-07-04',
        appliesTo: 'shop',
      },
    ],
  },
  bays: [
    {
      id: 'bay-1',
      name: 'Inspection Bay',
      shortCode: 'B1',
      isActive: true,
      supportsHeavyDuty: false,
      notes: 'Ideal for inspections and quick maintenance.',
    },
    {
      id: 'bay-2',
      name: 'Lift Bay',
      shortCode: 'B2',
      isActive: true,
      supportsHeavyDuty: true,
      notes: 'Equipped with 10k lb lift for heavy service.',
    },
  ],
  statusPalettes: {
    intake: { primary: '#1E293B', accent: '#E2E8F0' },
    'incoming-call': { primary: '#64748B', accent: '#E2E8F0' },
    scheduled: { primary: '#2563EB', accent: '#DDE9FF' },
    'in-progress': { primary: '#0EA5E9', accent: '#CFFAFE' },
    'in-bay': { primary: '#16A34A', accent: '#D1FADF' },
    'waiting-parts': { primary: '#EA580C', accent: '#FFE8D5' },
    completed: { primary: '#0F172A', accent: '#CBD5F5' },
  },
  schedulingDefaults: {
    defaultJobDuration: 90,
    minimumSlotIncrement: 30,
    bufferMinutes: 10,
    enableAutoBuffers: true,
    lockEditingWithinMinutes: 30,
    allowSameDayScheduling: true,
    overbookingPolicy: 'soft',
  },
  createdAt: '2024-01-01T16:00:00.000Z',
  updatedAt: '2024-02-01T18:00:00.000Z',
};

const idMap = new Map<string, string>();
const remapId = (seedKey: string | undefined) => {
  if (!seedKey) {
    return seedKey;
  }
  if (!idMap.has(seedKey)) {
    idMap.set(seedKey, id());
  }
  return idMap.get(seedKey)!;
};

const seededCustomers: Customer[] = customers.map((customer) => ({
  ...customer,
  id: remapId(customer.id)!,
}));

const seededVehicles: Vehicle[] = vehicles.map((vehicle) => ({
  ...vehicle,
  id: remapId(vehicle.id)!,
  customerId: remapId(vehicle.customerId)!,
}));

const seededJobs: Job[] = jobs.map((job) => ({
  ...job,
  id: remapId(job.id)!,
  customerId: remapId(job.customerId)!,
  vehicleId: remapId(job.vehicleId)!,
  noteEntries: jobNotes[job.id] ?? [],
}));

const seededAppointments: Appointment[] = appointments.map((appointment) => ({
  ...appointment,
  id: remapId(appointment.id)!,
  jobId: remapId(appointment.jobId)!,
}));

const seededCalls: Call[] = calls.map((call) => ({
  ...call,
  id: remapId(call.id)!,
  customerId: call.customerId ? remapId(call.customerId) : undefined,
  jobId: call.jobId ? remapId(call.jobId) : undefined,
  vehicleId: call.vehicleId ? remapId(call.vehicleId) : undefined,
}));

const seededShopSettings: ShopSettings = {
  ...shopSettings,
  id: remapId(shopSettings.id)!,
};

const shopSettingsPayload = sanitize({
  ...seededShopSettings,
  hours: JSON.stringify(seededShopSettings.hours),
  bays: JSON.stringify(seededShopSettings.bays),
  statusPalettes: JSON.stringify(seededShopSettings.statusPalettes),
  schedulingDefaults: JSON.stringify(seededShopSettings.schedulingDefaults),
});

async function seed() {
  console.info('Starting InstantDB seed with canonical mechanic shop data...');

  const transactions = [
    ...seededCustomers.map((customer) =>
      db.tx.customers[customer.id].update(sanitize(customer) as any)
    ),
    ...seededVehicles.map((vehicle) =>
      db.tx.vehicles[vehicle.id].update(sanitize(vehicle) as any)
    ),
    ...seededJobs.map((job) =>
      db.tx.jobs[job.id].update(serializeJob(job) as any)
    ),
    ...seededAppointments.map((appointment) =>
      db.tx.appointments[appointment.id].update(sanitize(appointment) as any)
    ),
    ...seededCalls.map((call) =>
      db.tx.calls[call.id].update(serializeCall(call) as any)
    ),
    db.tx.shopSettings[seededShopSettings.id].update(shopSettingsPayload as any),
  ];

  await db.transact(transactions);

  console.info('Seed data applied successfully.');
}

seed()
  .then(() => {
    console.info('Seeding completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to seed InstantDB data.', error);
    process.exit(1);
  });
















