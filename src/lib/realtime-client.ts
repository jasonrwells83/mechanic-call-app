// Real-time Client
// InstantDB client configuration for real-time subscriptions on the frontend

import { init } from '@instantdb/react';
import { queryClient, backgroundSync } from './query-client';

// Environment variables
const APP_ID = import.meta.env.VITE_INSTANT_APP_ID;

// Validate APP_ID format (must be a valid UUID)
const isValidUUID = (str: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

const isValidAppId = APP_ID && APP_ID !== 'your_app_id_here' && isValidUUID(APP_ID);

if (!APP_ID || APP_ID === 'your_app_id_here') {
  console.warn('VITE_INSTANT_APP_ID not configured. Real-time features will be disabled.');
  console.info('To enable InstantDB, set a valid UUID in your .env file for VITE_INSTANT_APP_ID');
} else if (!isValidAppId) {
  console.warn('VITE_INSTANT_APP_ID is not a valid UUID. Real-time features will be disabled.');
  console.info('Please check your .env file and ensure VITE_INSTANT_APP_ID is a valid UUID format');
}

// Initialize InstantDB for frontend use only if we have a valid app ID
export const db = isValidAppId ? init({ 
  appId: APP_ID!,
}) : null;

// Real-time subscription manager
export class RealtimeSubscriptionManager {
  private subscriptions = new Map<string, () => void>();
  private isConnected = false;
  private readonly hasSubscribeQuery: boolean;
  private hasLoggedMissingSubscribe = false;

  constructor() {
    this.hasSubscribeQuery = typeof (db as any)?.subscribeQuery === 'function';
    this.setupConnectionHandlers();
  }

  private setupConnectionHandlers() {
    if (!db) {
      console.log('InstantDB not available - skipping connection handlers setup');
      return;
    }

    // Log available methods for debugging
    console.log('InstantDB instance methods:', Object.getOwnPropertyNames(db).concat(Object.getOwnPropertyNames(Object.getPrototypeOf(db))));

    // Check if db has any subscription methods
    if (this.hasSubscribeQuery && typeof (db as any).subscribeQuery === 'function') {
      try {
        // Handle connection state changes using subscribeQuery
        (db as any).subscribeQuery({ 
          customers: {} 
        }, (result) => {
          const wasConnected = this.isConnected;
          this.isConnected = !result.error;
          
          if (!wasConnected && this.isConnected) {
            console.log('InstantDB real-time connection established');
            this.onConnect();
          } else if (wasConnected && !this.isConnected) {
            console.log('InstantDB real-time connection lost');
            this.onDisconnect();
          }
        });
      } catch (error) {
        console.error('Failed to setup InstantDB connection handlers with subscribeQuery:', error);
      }
    } else {
      console.warn('InstantDB instance does not have expected subscription methods. Available methods:', Object.keys(db));
      // Assume connected if db exists but doesn't have expected methods
      this.isConnected = true;
      this.onConnect();
    }
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
  subscribeToEntity(entityType: string, filters: any = {}, callback: (data: any) => void): string {
    if (!db) {
      console.warn('InstantDB not configured. Subscription ignored.');
      return '';
    }

    const subscriptionId = `${entityType}_${JSON.stringify(filters)}_${Date.now()}`;
    
    try {
      if (this.hasSubscribeQuery && typeof (db as any).subscribeQuery === 'function') {
        const unsubscribe = (db as any).subscribeQuery(
          { [entityType]: filters },
          (result) => {
            if (result.error) {
              console.error(`Subscription error for ${entityType}:`, result.error);
              return;
            }
            
            callback(result.data[entityType] || []);
          }
        );

        this.subscriptions.set(subscriptionId, unsubscribe);
        return subscriptionId;
      } else {
        if (!this.hasLoggedMissingSubscribe) {
          console.warn(`InstantDB subscribeQuery method not available. Skipping subscription for ${entityType}.`);
          this.hasLoggedMissingSubscribe = true;
        }
        // Return a dummy subscription ID for compatibility
        return subscriptionId;
      }
    } catch (error) {
      console.error(`Failed to subscribe to ${entityType}:`, error);
      return '';
    }
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


