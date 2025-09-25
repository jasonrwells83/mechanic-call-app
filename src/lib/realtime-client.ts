// Real-time Client
// InstantDB client configuration for real-time subscriptions on the frontend

import { init } from '@instantdb/react';
import { queryClient, backgroundSync } from './query-client';

// Environment variables
const APP_ID = import.meta.env.VITE_INSTANT_DB_APP_ID;

// Validate APP_ID format (must be a valid UUID)
const isValidUUID = (str: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

const isValidAppId = APP_ID && APP_ID !== 'your_app_id_here' && isValidUUID(APP_ID);

if (!APP_ID || APP_ID === 'your_app_id_here') {
  console.warn('VITE_INSTANT_DB_APP_ID not configured. Real-time features will be disabled.');
  console.info('To enable InstantDB, set a valid UUID in your .env file for VITE_INSTANT_DB_APP_ID');
} else if (!isValidAppId) {
  console.warn('VITE_INSTANT_DB_APP_ID is not a valid UUID. Real-time features will be disabled.');
  console.info('Please check your .env file and ensure VITE_INSTANT_DB_APP_ID is a valid UUID format');
}

// Initialize InstantDB for frontend use only if we have a valid app ID
export const db = isValidAppId ? init({ 
  appId: APP_ID!,
}) : null;

// Note: InstantDB React uses useQuery hook for subscriptions, not subscribeQuery method
// The subscribeQuery method doesn't exist in @instantdb/react

// Real-time subscription manager
export class RealtimeSubscriptionManager {
  private subscriptions = new Map<string, () => void>();
  private isConnected = false;
  private hasLoggedMissingSubscribe = false;

  constructor() {
    this.setupConnectionHandlers();
  }

  private setupConnectionHandlers() {
    if (!db) {
      console.log('InstantDB not available - skipping connection handlers setup');
      return;
    }

    // Log available methods for debugging
    console.log('InstantDB instance methods:', Object.getOwnPropertyNames(db).concat(Object.getOwnPropertyNames(Object.getPrototypeOf(db))));

    // InstantDB React doesn't have subscribeQuery - it uses useQuery hook for real-time subscriptions
    // We'll assume connection is available if db instance exists
    console.log('InstantDB React uses useQuery hook for real-time subscriptions, not subscribeQuery method');
    this.isConnected = true;
    this.onConnect();
  }

  private onConnect() {
    // Sync data when connection is restored
    try {
      backgroundSync.syncJobs();
      backgroundSync.syncAppointments();
      backgroundSync.syncDashboard();
    } catch (error) {
      console.error('Error syncing data on connection:', error);
    }
  }

  private onDisconnect() {
    // Handle disconnection - could show offline indicator
    console.warn('Real-time connection lost. Data may not be up to date.');
  }

  // Subscribe to entity changes
  // Note: InstantDB React uses useQuery hook for real-time subscriptions
  // This method is kept for compatibility but doesn't create actual subscriptions
  subscribeToEntity(entityType: string, filters: any = {}, callback: (data: any) => void): string {
    if (!db) {
      console.warn('InstantDB not configured. Subscription ignored.');
      return '';
    }

    const subscriptionId = `${entityType}_${JSON.stringify(filters)}_${Date.now()}`;
    
    if (!this.hasLoggedMissingSubscribe) {
      console.warn(`InstantDB React uses useQuery hook for subscriptions, not subscribeQuery method. Skipping subscription for ${entityType}.`);
      this.hasLoggedMissingSubscribe = true;
    }
    
    // Return a dummy subscription ID for compatibility
    // Real subscriptions should use InstantDB's useQuery hook in React components
    return subscriptionId;
  }

  // Unsubscribe from a specific subscription
  unsubscribe(subscriptionId: string) {
    const unsubscribe = this.subscriptions.get(subscriptionId);
    if (unsubscribe) {
      unsubscribe();
      this.subscriptions.delete(subscriptionId);
    }
  }

  // Unsubscribe from all subscriptions
  unsubscribeAll() {
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions.clear();
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      hasSubscriptions: this.subscriptions.size > 0,
      subscriptionCount: this.subscriptions.size,
    };
  }
}

// Global subscription manager instance
export const realtimeManager = new RealtimeSubscriptionManager();

// Real-time sync utilities
export const realtimeSync = {
  // Sync specific entity when real-time update received
  syncEntity: (entityType: string, entityId?: string) => {
    switch (entityType) {
      case 'customers':
        if (entityId) {
          queryClient.invalidateQueries({ queryKey: ['customers', 'detail', entityId] });
        }
        queryClient.invalidateQueries({ queryKey: ['customers', 'list'] });
        break;
        
      case 'jobs':
        if (entityId) {
          queryClient.invalidateQueries({ queryKey: ['jobs', 'detail', entityId] });
        }
        queryClient.invalidateQueries({ queryKey: ['jobs', 'list'] });
        backgroundSync.syncDashboard(); // Jobs affect dashboard
        break;
        
      case 'calls':
        if (entityId) {
          queryClient.invalidateQueries({ queryKey: ['calls', 'detail', entityId] });
        }
        queryClient.invalidateQueries({ queryKey: ['calls', 'list'] });
        break;
        
      case 'appointments':
        if (entityId) {
          queryClient.invalidateQueries({ queryKey: ['appointments', 'detail', entityId] });
        }
        queryClient.invalidateQueries({ queryKey: ['appointments', 'list'] });
        break;
        
      case 'vehicles':
        if (entityId) {
          queryClient.invalidateQueries({ queryKey: ['vehicles', 'detail', entityId] });
        }
        queryClient.invalidateQueries({ queryKey: ['vehicles', 'list'] });
        break;
    }
  },

  // Handle batch updates (multiple entities changed)
  syncBatch: (updates: Array<{ entityType: string; entityId?: string }>) => {
    const uniqueEntities = new Set(updates.map(u => u.entityType));
    
    uniqueEntities.forEach(entityType => {
      realtimeSync.syncEntity(entityType);
    });
  },
};

// Real-time event types
export interface RealtimeEvent {
  type: 'create' | 'update' | 'delete';
  entityType: string;
  entityId: string;
  data?: any;
  timestamp: string;
}

// Real-time event handlers
export const realtimeHandlers = {
  // Handle job status changes
  onJobStatusChange: (jobId: string, newStatus: string, oldStatus?: string) => {
    realtimeSync.syncEntity('jobs', jobId);
    
    // Show notification for important status changes
    if (newStatus === 'completed') {
      // Could trigger a toast notification
      console.log(`Job ${jobId} completed`);
    } else if (newStatus === 'waiting-parts') {
      console.log(`Job ${jobId} waiting for parts`);
    }
  },

  // Handle new calls
  onNewCall: (callId: string) => {
    realtimeSync.syncEntity('calls', callId);
    
    // Could trigger notification sound or badge update
    console.log(`New call received: ${callId}`);
  },

  // Handle appointment changes
  onAppointmentChange: (appointmentId: string, changeType: 'create' | 'update' | 'delete') => {
    realtimeSync.syncEntity('appointments', appointmentId);
    
    // Sync calendar data
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    
    console.log(`Appointment ${changeType}: ${appointmentId}`);
  },
};

// Export utilities for testing and debugging
export const realtimeUtils = {
  // Check if real-time is available
  isAvailable: () => !!db,
  
  // Get subscription manager status
  getStatus: () => realtimeManager.getConnectionStatus(),
  
  // Force sync all data
  forceSyncAll: () => {
    backgroundSync.syncJobs();
    backgroundSync.syncAppointments();
    backgroundSync.syncDashboard();
    queryClient.invalidateQueries({ queryKey: ['customers'] });
    queryClient.invalidateQueries({ queryKey: ['calls'] });
    queryClient.invalidateQueries({ queryKey: ['vehicles'] });
  },
  
  // Reset all subscriptions
  reset: () => {
    realtimeManager.unsubscribeAll();
  },
};


