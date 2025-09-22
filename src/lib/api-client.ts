// API Client
// Centralized HTTP client with proper error handling, typing, and request/response interceptors

import type {
  Customer, Vehicle, Job, Appointment, Call, ShopSettings,
  CreateCustomerData, UpdateCustomerData,
  CreateVehicleData, UpdateVehicleData,
  CreateJobData, UpdateJobData,
  CreateAppointmentData, UpdateAppointmentData,
  CreateCallData, UpdateCallData,
  JobFilters, CustomerFilters, CallFilters,
  ApiResponse, PaginatedResponse,
  DashboardStats
} from '@/types/database';

// Base configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true' || true; // Default to true for frontend-only development

// Mock data for frontend development
const mockData = {
  customers: [
    {
      id: '1',
      name: 'John Smith',
      email: 'john.smith@email.com',
      phone: '(555) 123-4567',
      address: '123 Main St, Anytown, ST 12345',
      notes: 'Regular customer, prefers morning appointments',
      status: 'active' as const,
      createdAt: new Date('2024-01-15').toISOString(),
      updatedAt: new Date('2024-01-15').toISOString(),
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@email.com',
      phone: '(555) 987-6543',
      address: '456 Oak Ave, Anytown, ST 12345',
      notes: 'VIP customer, owns multiple vehicles',
      status: 'vip' as const,
      createdAt: new Date('2024-01-10').toISOString(),
      updatedAt: new Date('2024-01-20').toISOString(),
    },
    {
      id: '3',
      name: 'Mike Wilson',
      email: 'mike.wilson@email.com',
      phone: '(555) 456-7890',
      address: '789 Pine St, Anytown, ST 12345',
      notes: 'New customer',
      status: 'new' as const,
      createdAt: new Date('2024-01-25').toISOString(),
      updatedAt: new Date('2024-01-25').toISOString(),
    }
  ],
  vehicles: [
    {
      id: '1',
      customerId: '1',
      make: 'Toyota',
      model: 'Camry',
      year: 2020,
      vin: '1HGBH41JXMN109186',
      licensePlate: 'ABC123',
      color: 'Silver',
      mileage: 45000,
      notes: 'Regular maintenance customer',
      createdAt: new Date('2024-01-15').toISOString(),
      updatedAt: new Date('2024-01-15').toISOString(),
    },
    {
      id: '2',
      customerId: '2',
      make: 'Honda',
      model: 'Accord',
      year: 2019,
      vin: '1HGCV1F3XJA123456',
      licensePlate: 'XYZ789',
      color: 'Blue',
      mileage: 62000,
      notes: 'Needs oil change every 3 months',
      createdAt: new Date('2024-01-10').toISOString(),
      updatedAt: new Date('2024-01-20').toISOString(),
    }
  ],
  jobs: [
    {
      id: '1',
      customerId: '1',
      vehicleId: '1',
      title: 'Oil Change & Inspection',
      description: 'Regular maintenance - oil change and safety inspection',
      status: 'in-progress' as const,
      priority: 'medium' as const,
      invoiceNumber: 'INV-1042',
      estimatedHours: 1.5,
      actualHours: 0,
      laborRate: 95.00,
      estimatedCost: 142.50,
      actualCost: 0,
      scheduledStart: new Date('2024-01-30T09:00:00').toISOString(),
      scheduledEnd: new Date('2024-01-30T10:30:00').toISOString(),
      actualStart: new Date('2024-01-30T09:15:00').toISOString(),
      actualEnd: null,
      notes: 'Customer requested synthetic oil',
      createdAt: new Date('2024-01-25').toISOString(),
      updatedAt: new Date('2024-01-30').toISOString(),
    },
    {
      id: '2',
      customerId: '2',
      vehicleId: '2',
      title: 'Brake Repair',
      description: 'Replace front brake pads and rotors',
      status: 'scheduled' as const,
      priority: 'high' as const,
      invoiceNumber: 'A-22031',
      estimatedHours: 3.0,
      actualHours: 0,
      laborRate: 95.00,
      estimatedCost: 450.00,
      actualCost: 0,
      scheduledStart: new Date('2024-02-01T08:00:00').toISOString(),
      scheduledEnd: new Date('2024-02-01T11:00:00').toISOString(),
      actualStart: null,
      actualEnd: null,
      notes: 'Customer reported grinding noise',
      createdAt: new Date('2024-01-28').toISOString(),
      updatedAt: new Date('2024-01-28').toISOString(),
    }
  ],
  calls: [
    {
      id: '1',
      customerId: '1',
      type: 'service-inquiry' as const,
      direction: 'inbound' as const,
      status: 'completed' as const,
      outcome: 'appointment-scheduled' as const,
      subject: 'Oil change appointment',
      notes: 'Customer wants to schedule regular oil change',
      duration: 180, // 3 minutes
      scheduledAt: null,
      completedAt: new Date('2024-01-25T14:30:00').toISOString(),
      createdAt: new Date('2024-01-25T14:30:00').toISOString(),
      updatedAt: new Date('2024-01-25T14:33:00').toISOString(),
    }
  ],
  appointments: [
    {
      id: '1',
      customerId: '1',
      vehicleId: '1',
      jobId: '1',
      title: 'Oil Change - John Smith',
      description: 'Regular maintenance appointment',
      startTime: new Date('2024-01-30T09:00:00').toISOString(),
      endTime: new Date('2024-01-30T10:30:00').toISOString(),
      status: 'confirmed' as const,
      type: 'service' as const,
      bay: 'Bay 1',
      notes: 'Customer prefers synthetic oil',
      createdAt: new Date('2024-01-25').toISOString(),
      updatedAt: new Date('2024-01-25').toISOString(),
    },
    {
      id: '2',
      customerId: '2',
      vehicleId: '2',
      jobId: '2',
      title: 'Brake Repair - Sarah Johnson',
      description: 'Replace front brake pads and rotors',
      startTime: new Date('2024-02-01T08:00:00').toISOString(),
      endTime: new Date('2024-02-01T11:00:00').toISOString(),
      status: 'confirmed' as const,
      type: 'service' as const,
      bay: 'Bay 2',
      notes: 'Customer reported grinding noise',
      createdAt: new Date('2024-01-28').toISOString(),
      updatedAt: new Date('2024-01-28').toISOString(),
    },
    {
      id: '3',
      customerId: '3',
      vehicleId: null,
      jobId: null,
      title: 'Consultation - Mike Wilson',
      description: 'New customer consultation for vehicle inspection',
      startTime: new Date('2024-01-31T14:00:00').toISOString(),
      endTime: new Date('2024-01-31T15:00:00').toISOString(),
      status: 'confirmed' as const,
      type: 'consultation' as const,
      bay: null,
      notes: 'First-time customer, needs estimate',
      createdAt: new Date('2024-01-29').toISOString(),
      updatedAt: new Date('2024-01-29').toISOString(),
    }
  ],
  dashboard: {
    todayStats: {
      scheduledJobs: 3,
      completedJobs: 1,
      inProgressJobs: 1,
      totalRevenue: 285.50,
      pendingCalls: 2,
      newCustomers: 1,
    },
    weekStats: {
      scheduledJobs: 18,
      completedJobs: 12,
      inProgressJobs: 3,
      totalRevenue: 2150.75,
      pendingCalls: 5,
      newCustomers: 4,
    },
    monthStats: {
      scheduledJobs: 67,
      completedJobs: 58,
      inProgressJobs: 6,
      totalRevenue: 8750.25,
      pendingCalls: 8,
      newCustomers: 15,
    },
    bayStatus: [
      { id: 'bay-1', name: 'Bay 1', status: 'occupied' as const, currentJob: 'Oil Change - John Smith', estimatedCompletion: '10:30 AM' },
      { id: 'bay-2', name: 'Bay 2', status: 'available' as const, currentJob: null, estimatedCompletion: null },
    ],
    recentActivity: [
      { id: '1', type: 'job-completed', message: 'Brake inspection completed for Sarah Johnson', timestamp: new Date('2024-01-29T16:30:00').toISOString() },
      { id: '2', type: 'appointment-scheduled', message: 'New appointment scheduled for Mike Wilson', timestamp: new Date('2024-01-29T14:15:00').toISOString() },
      { id: '3', type: 'call-received', message: 'Service inquiry call from new customer', timestamp: new Date('2024-01-29T11:45:00').toISOString() },
    ]
  },
  settings: {
    id: 'settings-1',
    shopName: 'Mechanic Shop OS',
    address: '123 Main St, Springfield, ST 12345',
    phone: '(555) 123-4567',
    email: 'info@mechanicshopos.com',
    hours: {
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
    },
    bays: [
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
        notes: 'Lift-equipped for transmissions and heavy-duty jobs.',
      },
    ],
    statusPalettes: {
      'incoming-call': { primary: '#64748B', accent: '#E2E8F0' },
      scheduled: { primary: '#2563EB', accent: '#DDE9FF' },
      'in-bay': { primary: '#16A34A', accent: '#D1FADF' },
      'waiting-parts': { primary: '#EA580C', accent: '#FFE8D5' },
      completed: { primary: '#0F172A', accent: '#CBD5F5' },
    },
    schedulingDefaults: {
      defaultJobDuration: 60,
      minimumSlotIncrement: 30,
      bufferMinutes: 10,
      enableAutoBuffers: true,
      lockEditingWithinMinutes: 30,
      allowSameDayScheduling: true,
      overbookingPolicy: 'soft',
    },
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date('2024-01-01').toISOString(),
  }
};

let mockSettings = { ...mockData.settings };

// Helper function to simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Custom error class for API errors
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Generic fetch wrapper with error handling
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  // Use mock data if enabled
  if (USE_MOCK_DATA) {
    return await mockApiRequest<T>(endpoint, options);
  }

  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.error || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Network or other errors
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error occurred',
      0,
      error
    );
  }
}

// Mock API request handler
async function mockApiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  // Simulate network delay
  await delay(300 + Math.random() * 200);

  const method = options.method || 'GET';
  console.log(`[MOCK API] ${method} ${endpoint}`);

  // Parse endpoint to determine what data to return
  if (endpoint.startsWith('/customers')) {
    if (method === 'GET' && endpoint === '/customers') {
      return {
        success: true,
        data: mockData.customers as T,
        count: mockData.customers.length,
      };
    }
    if (method === 'GET' && endpoint.match(/\/customers\/\w+$/)) {
      const id = endpoint.split('/').pop();
      const customer = mockData.customers.find(c => c.id === id);
      if (!customer) {
        throw new ApiError('Customer not found', 404);
      }
      return {
        success: true,
        data: customer as T,
      };
    }
  }

  if (endpoint.startsWith('/vehicles')) {
    if (method === 'GET' && endpoint === '/vehicles') {
      return {
        success: true,
        data: mockData.vehicles as T,
        count: mockData.vehicles.length,
      };
    }
  }

  if (endpoint.startsWith('/jobs')) {
    if (method === 'GET' && endpoint === '/jobs') {
      return {
        success: true,
        data: mockData.jobs as T,
        count: mockData.jobs.length,
      };
    }
  }

  if (endpoint.startsWith('/calls')) {
    if (method === 'GET' && endpoint === '/calls') {
      return {
        success: true,
        data: mockData.calls as T,
        count: mockData.calls.length,
      };
    }
  }

  if (endpoint.startsWith('/appointments')) {
    if (method === 'GET' && endpoint === '/appointments') {
      return {
        success: true,
        data: mockData.appointments as T,
        count: mockData.appointments.length,
      };
    }
  }

  if (endpoint === '/dashboard/stats') {
    return {
      success: true,
      data: mockData.dashboard as T,
    };
  }

  if (endpoint === '/settings' || endpoint === '/settings/shop') {
    if (method === 'GET') {
      return {
        success: true,
        data: mockSettings as T,
      };
    }

    if (['PUT', 'PATCH'].includes(method)) {
      const body = options.body ? JSON.parse(options.body as string) : {};
      mockSettings = {
        ...mockSettings,
        ...body,
        hours: body.hours ? { ...mockSettings.hours, ...body.hours } : mockSettings.hours,
        bays: body.bays ? body.bays : mockSettings.bays,
        statusPalettes: body.statusPalettes
          ? { ...mockSettings.statusPalettes, ...body.statusPalettes }
          : mockSettings.statusPalettes,
        schedulingDefaults: body.schedulingDefaults
          ? { ...mockSettings.schedulingDefaults, ...body.schedulingDefaults }
          : mockSettings.schedulingDefaults,
        updatedAt: new Date().toISOString(),
      };

      return {
        success: true,
        data: mockSettings as T,
        message: 'Settings updated successfully',
      };
    }
  }

  // For POST/PUT/PATCH requests, simulate success
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    const body = options.body ? JSON.parse(options.body as string) : {};
    return {
      success: true,
      data: { id: Date.now().toString(), ...body } as T,
      message: `${method} operation completed successfully`,
    };
  }

  // For DELETE requests, simulate success
  if (method === 'DELETE') {
    return {
      success: true,
      message: 'Resource deleted successfully',
    } as ApiResponse<T>;
  }

  // Default fallback
  throw new ApiError(`Mock endpoint not implemented: ${method} ${endpoint}`, 501);
}

// Helper to build query strings
function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        searchParams.set(key, value.join(','));
      } else if (typeof value === 'object' && value.start && value.end) {
        // Handle date ranges
        searchParams.set('startDate', value.start);
        searchParams.set('endDate', value.end);
      } else {
        searchParams.set(key, String(value));
      }
    }
  });
  
  return searchParams.toString();
}

// Customer API
export const customerApi = {
  // Get all customers with optional filters
  getAll: async (filters: CustomerFilters = {}): Promise<ApiResponse<Customer[]>> => {
    const queryString = buildQueryString(filters);
    return apiRequest<Customer[]>(`/customers${queryString ? `?${queryString}` : ''}`);
  },

  // Get customer by ID
  getById: async (id: string): Promise<ApiResponse<Customer>> => {
    return apiRequest<Customer>(`/customers/${id}`);
  },

  // Create new customer
  create: async (data: CreateCustomerData): Promise<ApiResponse<Customer>> => {
    return apiRequest<Customer>('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update customer
  update: async (id: string, data: UpdateCustomerData): Promise<ApiResponse<Customer>> => {
    return apiRequest<Customer>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete customer
  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/customers/${id}`, {
      method: 'DELETE',
    });
  },

  // Get customer's vehicles
  getVehicles: async (customerId: string): Promise<ApiResponse<Vehicle[]>> => {
    return apiRequest<Vehicle[]>(`/customers/${customerId}/vehicles`);
  },
};


// Vehicle API
export const vehicleApi = {
  // Get all vehicles with optional filters
  getAll: async (filters: any = {}): Promise<ApiResponse<Vehicle[]>> => {
    const queryString = buildQueryString(filters);
    return apiRequest<Vehicle[]>(`/vehicles${queryString ? `?${queryString}` : ''}`);
  },

  // Get vehicle by ID
  getById: async (id: string): Promise<ApiResponse<Vehicle>> => {
    return apiRequest<Vehicle>(`/vehicles/${id}`);
  },

  // Create new vehicle
  create: async (data: CreateVehicleData): Promise<ApiResponse<Vehicle>> => {
    return apiRequest<Vehicle>('/vehicles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update vehicle
  update: async (id: string, data: UpdateVehicleData): Promise<ApiResponse<Vehicle>> => {
    return apiRequest<Vehicle>(`/vehicles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete vehicle
  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/vehicles/${id}`, {
      method: 'DELETE',
    });
  },

  // Get vehicle service history
  getServiceHistory: async (vehicleId: string): Promise<ApiResponse<Job[]>> => {
    return apiRequest<Job[]>(`/vehicles/${vehicleId}/service-history`);
  },

  // Search vehicles
  search: async (query: string): Promise<ApiResponse<Vehicle[]>> => {
    return apiRequest<Vehicle[]>(`/vehicles/search?q=${encodeURIComponent(query)}`);
  },

  // Get vehicle statistics
  getStats: async (customerId?: string): Promise<ApiResponse<any>> => {
    const queryString = customerId ? `?customerId=${customerId}` : '';
    return apiRequest<any>(`/vehicles/stats${queryString}`);
  },

  // Get vehicles with maintenance alerts
  getWithMaintenanceAlerts: async (): Promise<ApiResponse<Vehicle[]>> => {
    return apiRequest<Vehicle[]>('/vehicles/alerts');
  },
};

// Job API
export const jobApi = {
  // Get all jobs with optional filters
  getAll: async (filters: JobFilters = {}): Promise<ApiResponse<Job[]>> => {
    const queryString = buildQueryString(filters);
    return apiRequest<Job[]>(`/jobs${queryString ? `?${queryString}` : ''}`);
  },

  // Get job by ID
  getById: async (id: string): Promise<ApiResponse<Job>> => {
    return apiRequest<Job>(`/jobs/${id}`);
  },

  // Create new job
  create: async (data: CreateJobData): Promise<ApiResponse<Job>> => {
    return apiRequest<Job>('/jobs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update job
  update: async (id: string, data: UpdateJobData): Promise<ApiResponse<Job>> => {
    return apiRequest<Job>(`/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Update job status specifically
  updateStatus: async (id: string, status: string): Promise<ApiResponse<Job>> => {
    return apiRequest<Job>(`/jobs/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  // Delete job
  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/jobs/${id}`, {
      method: 'DELETE',
    });
  },
};

// Appointment API
export const appointmentApi = {
  // Get all appointments with optional filters
  getAll: async (filters: any = {}): Promise<ApiResponse<Appointment[]>> => {
    const queryString = buildQueryString(filters);
    return apiRequest<Appointment[]>(`/appointments${queryString ? `?${queryString}` : ''}`);
  },

  // Get appointment by ID
  getById: async (id: string): Promise<ApiResponse<Appointment>> => {
    return apiRequest<Appointment>(`/appointments/${id}`);
  },

  // Create new appointment
  create: async (data: CreateAppointmentData): Promise<ApiResponse<Appointment>> => {
    return apiRequest<Appointment>('/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update appointment
  update: async (id: string, data: UpdateAppointmentData): Promise<ApiResponse<Appointment>> => {
    return apiRequest<Appointment>(`/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete appointment
  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/appointments/${id}`, {
      method: 'DELETE',
    });
  },
};

// Call API
export const callApi = {
  // Get all calls with optional filters
  getAll: async (filters: CallFilters = {}): Promise<ApiResponse<Call[]>> => {
    const queryString = buildQueryString(filters);
    return apiRequest<Call[]>(`/calls${queryString ? `?${queryString}` : ''}`);
  },

  // Get call by ID
  getById: async (id: string): Promise<ApiResponse<Call>> => {
    return apiRequest<Call>(`/calls/${id}`);
  },

  // Create new call
  create: async (data: CreateCallData): Promise<ApiResponse<Call>> => {
    return apiRequest<Call>('/calls', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update call
  update: async (id: string, data: UpdateCallData): Promise<ApiResponse<Call>> => {
    return apiRequest<Call>(`/calls/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete call
  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/calls/${id}`, {
      method: 'DELETE',
    });
  },
};

// Settings API
export const settingsApi = {
  // Get shop settings
  getShopSettings: async (): Promise<ApiResponse<ShopSettings>> => {
    return apiRequest<ShopSettings>('/settings');
  },

  // Update shop settings
  updateShopSettings: async (data: Partial<ShopSettings>): Promise<ApiResponse<ShopSettings>> => {
    return apiRequest<ShopSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

// Dashboard/Reports API
export const dashboardApi = {
  // Get dashboard stats
  getStats: async (dateRange?: { start: string; end: string }): Promise<ApiResponse<DashboardStats>> => {
    const queryString = dateRange ? buildQueryString(dateRange) : '';
    return apiRequest<DashboardStats>(`/dashboard/stats${queryString ? `?${queryString}` : ''}`);
  },

  // Get KPIs
  getKPIs: async (dateRange?: { start: string; end: string }): Promise<ApiResponse<any>> => {
    const queryString = dateRange ? buildQueryString(dateRange) : '';
    return apiRequest<any>(`/dashboard/kpis${queryString ? `?${queryString}` : ''}`);
  },
};

// Health check API
export const healthApi = {
  // Check API health
  check: async (): Promise<ApiResponse<any>> => {
    return apiRequest<any>('/health');
  },

  // Test database connection
  testDb: async (): Promise<ApiResponse<any>> => {
    return apiRequest<any>('/test-db');
  },
};

// Export all APIs as a single object for convenience
export const api = {
  customers: customerApi,
  vehicles: vehicleApi,
  jobs: jobApi,
  appointments: appointmentApi,
  calls: callApi,
  settings: settingsApi,
  dashboard: dashboardApi,
  health: healthApi,
};

// Individual APIs are already exported above where they are defined
