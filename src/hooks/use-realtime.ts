// Real-time Hooks Export
// Central export file for all real-time subscription hooks

// Customer real-time hooks
export {
  useRealtimeCustomers,
  useRealtimeCustomer,
  useRealtimeCustomerNotifications,
  useRealtimeCustomerVehicles,
  useRealtimeCustomerStats,
  useRealtimeCustomerManager,
} from './use-realtime-customers';

// Job real-time hooks
export {
  useRealtimeJobs,
  useRealtimeJob,
  useRealtimeJobsByStatus,
  useRealtimeJobNotifications,
  useRealtimeJobStats,
  useRealtimeJobsByCustomer,
  useRealtimeBayStatus,
} from './use-realtime-jobs';

// Call real-time hooks
export {
  useRealtimeCalls,
  useRealtimeCall,
  useRealtimeCallNotifications,
  useRealtimeFollowUpCalls,
  useRealtimeCallStats,
  useRealtimeCallsByCustomer,
  useRealtimeCallsByOutcome,
  useRealtimeCallVolume,
} from './use-realtime-calls';

// Appointment real-time hooks
export {
  useRealtimeAppointments,
  useRealtimeAppointment,
  useRealtimeAppointmentNotifications,
  useRealtimeAppointmentsByDateRange,
  useRealtimeAppointmentConflicts,
  useRealtimeAppointmentsByJob,
  useRealtimeBayUtilization,
} from './use-realtime-appointments';

// Dashboard real-time hooks
export {
  useRealtimeDashboard,
  useRealtimeBayStatus as useRealtimeDashboardBayStatus,
  useRealtimeAlerts,
  useRealtimePerformanceMetrics,
} from './use-realtime-dashboard';

// Real-time client utilities
export {
  realtimeManager,
  realtimeSync,
  realtimeHandlers,
  realtimeUtils,
  db as realtimeDB,
} from '@/lib/realtime-client';

// Real-time provider component for app-wide real-time management
import { useEffect, useState } from 'react';
import { realtimeManager, realtimeUtils } from '@/lib/realtime-client';
import { useUIStore } from '@/stores';

export function useRealtimeProvider() {
  const { addToast } = useUIStore();

  useEffect(() => {
    // Initialize real-time connection
    if (!realtimeUtils.isAvailable()) {
      console.warn('Real-time features not available. InstantDB not configured.');
      addToast({
        type: 'warning',
        title: 'Real-time Disabled',
        message: 'Real-time updates are not available',
        duration: 5000,
      });
      return;
    }

    // Connection status monitoring
    const checkConnection = () => {
      const status = realtimeUtils.getStatus();
      if (!status.isConnected) {
        addToast({
          type: 'error',
          title: 'Connection Lost',
          message: 'Real-time updates may be delayed',
          duration: 4000,
        });
      }
    };

    // Check connection every 30 seconds
    const connectionCheck = setInterval(checkConnection, 30000);

    // Cleanup on unmount
    return () => {
      clearInterval(connectionCheck);
      realtimeManager.unsubscribeAll();
    };
  }, [addToast]);

  return {
    isAvailable: realtimeUtils.isAvailable(),
    status: realtimeUtils.getStatus(),
    forceSyncAll: realtimeUtils.forceSyncAll,
    reset: realtimeUtils.reset,
  };
}

// Hook for managing multiple real-time subscriptions
export function useRealtimeSubscriptions() {
  const subscriptions = new Map<string, () => void>();

  const subscribe = (key: string, unsubscribeFn: () => void) => {
    // Unsubscribe existing if present
    if (subscriptions.has(key)) {
      subscriptions.get(key)!();
    }
    subscriptions.set(key, unsubscribeFn);
  };

  const unsubscribe = (key: string) => {
    const unsubscribeFn = subscriptions.get(key);
    if (unsubscribeFn) {
      unsubscribeFn();
      subscriptions.delete(key);
    }
  };

  const unsubscribeAll = () => {
    subscriptions.forEach(unsubscribeFn => unsubscribeFn());
    subscriptions.clear();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribeAll();
    };
  }, []);

  return {
    subscribe,
    unsubscribe,
    unsubscribeAll,
    activeCount: subscriptions.size,
  };
}

// Hook for real-time connection status
export function useRealtimeConnectionStatus() {
  const [status, setStatus] = useState(() => realtimeUtils.getStatus());

  useEffect(() => {
    const checkStatus = () => {
      setStatus(realtimeUtils.getStatus());
    };

    const interval = setInterval(checkStatus, 5000); // Check every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  return status;
}

// Re-export types for convenience
export type { RealtimeEvent } from '@/lib/realtime-client';
