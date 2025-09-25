import dotenv from 'dotenv';
import { init, id as generateInstantId } from '@instantdb/admin';
import { instantDBSchema } from '../types/database';

dotenv.config();

// Environment variables validation
const APP_ID = process.env.INSTANT_DB_APP_ID;
const ADMIN_TOKEN = process.env.INSTANT_DB_ADMIN_TOKEN;

const isConfigured = Boolean(APP_ID && ADMIN_TOKEN);

type ValueType = 'string' | 'number' | 'boolean' | 'date' | 'json';

type AdminAttribute = {
  valueType: ValueType;
  required: boolean;
  isIndexed: boolean;
  config: {
    indexed: boolean;
    unique: boolean;
  };
};

type AdminLink = {
  entityName: string;
  cardinality: 'one' | 'many';
};

type AdminSchema = {
  entities: Record<string, { attrs: Record<string, AdminAttribute>; links: Record<string, AdminLink> }>;
  links: Record<string, {
    from: { entity: string; has: 'one' | 'many'; label: string };
    to: { entity: string; has: 'one' | 'many'; label: string };
  }>;
};

const parseAttributeDefinition = (definition: string): { valueType: ValueType; required: boolean } => {
  const optional = definition.endsWith('?');
  const base = optional ? definition.slice(0, -1) : definition;
  const allowed: ValueType[] = ['string', 'number', 'boolean', 'date', 'json'];
  const valueType = allowed.includes(base as ValueType) ? (base as ValueType) : 'string';
  return {
    valueType,
    required: !optional,
  };
};

const buildAdminSchema = (schema: typeof instantDBSchema): AdminSchema => {
  const entities: AdminSchema['entities'] = {};

  for (const [entityName, attributes] of Object.entries(schema.entities)) {
    const attrDefs: Record<string, AdminAttribute> = {};
    for (const [attrName, definition] of Object.entries(attributes)) {
      const { valueType, required } = parseAttributeDefinition(definition as string);
      attrDefs[attrName] = {
        valueType,
        required,
        isIndexed: false,
        config: {
          indexed: false,
          unique: false,
        },
      };
    }

    entities[entityName] = {
      attrs: attrDefs,
      links: {},
    };
  }

  const links: AdminSchema['links'] = {};

  for (const [linkName, linkDef] of Object.entries(schema.links ?? {})) {
    const forward = linkDef.forward;
    const reverse = linkDef.reverse;

    links[linkName] = {
      from: {
        entity: forward.on,
        has: forward.has,
        label: forward.label,
      },
      to: {
        entity: reverse.on,
        has: reverse.has,
        label: reverse.label,
      },
    };

    const forwardEntity = entities[forward.on];
    const reverseEntity = entities[reverse.on];

    if (forwardEntity) {
      forwardEntity.links[forward.label] = {
        entityName: reverse.on,
        cardinality: forward.has as 'one' | 'many',
      };
    }

    if (reverseEntity) {
      reverseEntity.links[reverse.label] = {
        entityName: forward.on,
        cardinality: reverse.has as 'one' | 'many',
      };
    }
  }

  return { entities, links };
};

const adminSchema = buildAdminSchema(instantDBSchema);

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
      schema: adminSchema as any,
    })
    : createDisabledDbProxy()
) as any;

// Export configuration for use in other parts of the app
export const instantDBConfig = {
  appId: APP_ID ?? '',
  isConfigured,
  schema: adminSchema as any,
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
  void prefix;
  return generateInstantId();
};

// Helper function to get current timestamp
export const getCurrentTimestamp = (): string => {
  return new Date().toISOString();
};

if (isConfigured) {
  console.log('dY"S InstantDB initialized with app ID:', `${APP_ID!.substring(0, 8)}...`);
  console.log('dY"- Database relationships configured:', Object.keys(relationships).length);
} else {
  console.warn('?s??,? InstantDB credentials not found. Set INSTANT_DB_APP_ID and INSTANT_DB_ADMIN_TOKEN to enable database access.');
}

