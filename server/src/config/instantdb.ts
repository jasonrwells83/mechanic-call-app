import dotenv from 'dotenv';
import { init } from '@instantdb/admin';
import { instantDBSchema } from '../types/database';
dotenv.config();

// Environment variables validation
const APP_ID = process.env.INSTANT_DB_APP_ID;
const ADMIN_TOKEN = process.env.INSTANT_DB_ADMIN_TOKEN;

const isConfigured = Boolean(APP_ID && ADMIN_TOKEN);

const createDisabledDbProxy = (path: string[] = []) => new Proxy(() => {}, {
  get: (_, property) => {
    if (property === 'then' && path.length === 0) {
      return undefined;
    }

    if (property === 'toString') {
      return () => '[InstantDB disabled]';
    }

    if (typeof property === 'symbol') {
      return undefined;
    }

    return createDisabledDbProxy([...path, property.toString()]);
  },
  apply: () => {
    const attempted = path.length ? `Attempted to call InstantDB method: ${path.join('.')}` : "Attempted to use InstantDB client";
    throw new Error(`${attempted}. Set INSTANT_DB_APP_ID and INSTANT_DB_ADMIN_TOKEN to enable database access.`);
  }
});

// Initialize InstantDB with schema when credentials are provided. Otherwise fall back to a proxy
// that throws helpful errors when the database client is used. This prevents the server from
// crashing during development environments where InstantDB credentials may be absent (e.g. CI).
export const db = (
  isConfigured
    ? init({
      appId: APP_ID!,
      adminToken: ADMIN_TOKEN!,
      schema: instantDBSchema as any,
    })
    : createDisabledDbProxy()
) as any;

// Export configuration for use in other parts of the app
export const instantDBConfig = {
  appId: APP_ID ?? '',
  isConfigured,
  schema: instantDBSchema as any,
};

// Database relationships and constraints
export const relationships = {
  // Customers have many vehicles
  customerVehicles: {
    from: 'customers',
    to: 'vehicles',
    foreignKey: 'customerId',
    type: 'one-to-many' as const,
  },
  
  // Customers have many jobs
  customerJobs: {
    from: 'customers', 
    to: 'jobs',
    foreignKey: 'customerId',
    type: 'one-to-many' as const,
  },
  
  // Vehicles have many jobs
  vehicleJobs: {
    from: 'vehicles',
    to: 'jobs', 
    foreignKey: 'vehicleId',
    type: 'one-to-many' as const,
  },
  
  // Jobs have one appointment
  jobAppointment: {
    from: 'jobs',
    to: 'appointments',
    foreignKey: 'jobId', 
    type: 'one-to-one' as const,
  },
  
  // Customers have many calls
  customerCalls: {
    from: 'customers',
    to: 'calls',
    foreignKey: 'customerId',
    type: 'one-to-many' as const,
  },
};

// Helper function to generate unique IDs
export const generateId = (prefix: string): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
};

// Helper function to get current timestamp
export const getCurrentTimestamp = (): string => {
  return new Date().toISOString();
};

if (isConfigured) {
  console.log('📊 InstantDB initialized with app ID:', `${APP_ID!.substring(0, 8)}...`);
  console.log('🔗 Database relationships configured:', Object.keys(relationships).length);
} else {
  console.warn('⚠️ InstantDB credentials not found. Set INSTANT_DB_APP_ID and INSTANT_DB_ADMIN_TOKEN to enable database access.');
}

