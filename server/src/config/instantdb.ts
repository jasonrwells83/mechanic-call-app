import dotenv from 'dotenv';
import { init } from '@instantdb/admin';
import { instantDBSchema } from '../types/database';
dotenv.config();

// Environment variables validation
const APP_ID = process.env.INSTANT_DB_APP_ID;
const ADMIN_TOKEN = process.env.INSTANT_DB_ADMIN_TOKEN;

if (!APP_ID) {
  throw new Error('INSTANT_DB_APP_ID environment variable is required');
}

if (!ADMIN_TOKEN) {
  throw new Error('INSTANT_DB_ADMIN_TOKEN environment variable is required');
}

// Initialize InstantDB with schema
export const db = init({
  appId: APP_ID,
  adminToken: ADMIN_TOKEN,
  schema: instantDBSchema as any,
});

// Export configuration for use in other parts of the app
export const instantDBConfig = {
  appId: APP_ID,
  isConfigured: !!(APP_ID && ADMIN_TOKEN),
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

console.log('📊 InstantDB initialized with app ID:', APP_ID.substring(0, 8) + '...');
console.log('🔗 Database relationships configured:', Object.keys(relationships).length);

