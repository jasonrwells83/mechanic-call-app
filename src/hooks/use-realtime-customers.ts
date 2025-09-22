// Real-time Customer Hooks
// Hooks for real-time customer data subscriptions

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { realtimeManager, realtimeSync } from '@/lib/realtime-client';
import { queryKeys } from '@/lib/query-client';
import { useUIStore } from '@/stores';
import type { Customer, CustomerFilters } from '@/types/database';

// Hook for real-time customer list updates
export function useRealtimeCustomers(filters: CustomerFilters = {}) {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<string | null>(null);
  const { addToast } = useUIStore();

  useEffect(() => {
    // Subscribe to customer changes
    const subscriptionId = realtimeManager.subscribeToEntity(
      'customers',
      filters,
      (customers: Customer[]) => {
        // Update the query cache with fresh data
        queryClient.setQueryData(
          queryKeys.customers.list(filters),
          {
            success: true,
            data: customers,
            count: customers.length,
          }
        );
      }
    );

    subscriptionRef.current = subscriptionId;

    // Cleanup subscription on unmount
    return () => {
      if (subscriptionRef.current) {
        realtimeManager.unsubscribe(subscriptionRef.current);
      }
    };
  }, [queryClient, JSON.stringify(filters), addToast]);

  return {
    isSubscribed: !!subscriptionRef.current,
  };
}

// Hook for real-time single customer updates
export function useRealtimeCustomer(customerId: string, enabled: boolean = true) {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !customerId) return;

    // Subscribe to specific customer changes
    const subscriptionId = realtimeManager.subscribeToEntity(
      'customers',
      { id: customerId },
      (customers: Customer[]) => {
        const customer = customers[0];
        if (customer) {
          // Update the specific customer query
          queryClient.setQueryData(
            queryKeys.customers.detail(customerId),
            {
              success: true,
              data: customer,
            }
          );

          // Also update any lists that might contain this customer
          queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists() });
        }
      }
    );

    subscriptionRef.current = subscriptionId;

    return () => {
      if (subscriptionRef.current) {
        realtimeManager.unsubscribe(subscriptionRef.current);
      }
    };
  }, [customerId, enabled, queryClient]);

  return {
    isSubscribed: !!subscriptionRef.current,
  };
}

// Hook for real-time customer creation notifications
export function useRealtimeCustomerNotifications() {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();
  const subscriptionRef = useRef<string | null>(null);
  const lastCountRef = useRef<number>(0);

  useEffect(() => {
    // Subscribe to all customers to detect new ones
    const subscriptionId = realtimeManager.subscribeToEntity(
      'customers',
      {},
      (customers: Customer[]) => {
        const currentCount = customers.length;
        const lastCount = lastCountRef.current;

        // If count increased, a new customer was added
        if (lastCount > 0 && currentCount > lastCount) {
          const newCustomers = customers.slice(0, currentCount - lastCount);
          
          newCustomers.forEach(customer => {
            addToast({
              type: 'info',
              title: 'New Customer Added',
              message: `${customer.name} has been added to the system`,
              duration: 4000,
            });
          });
        }

        lastCountRef.current = currentCount;

        // Update the cache
        queryClient.setQueryData(
          queryKeys.customers.lists(),
          {
            success: true,
            data: customers,
            count: customers.length,
          }
        );
      }
    );

    subscriptionRef.current = subscriptionId;

    return () => {
      if (subscriptionRef.current) {
        realtimeManager.unsubscribe(subscriptionRef.current);
      }
    };
  }, [queryClient, addToast]);

  return {
    isSubscribed: !!subscriptionRef.current,
  };
}

// Hook for real-time customer vehicles updates
export function useRealtimeCustomerVehicles(customerId: string, enabled: boolean = true) {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !customerId) return;

    // Subscribe to vehicles for this customer
    const subscriptionId = realtimeManager.subscribeToEntity(
      'vehicles',
      { customerId },
      (vehicles: any[]) => {
        // Update the customer vehicles query
        queryClient.setQueryData(
          queryKeys.customers.vehicles(customerId),
          {
            success: true,
            data: vehicles,
            count: vehicles.length,
          }
        );

        // Also invalidate the customer detail to update vehicle count
        queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(customerId) });
      }
    );

    subscriptionRef.current = subscriptionId;

    return () => {
      if (subscriptionRef.current) {
        realtimeManager.unsubscribe(subscriptionRef.current);
      }
    };
  }, [customerId, enabled, queryClient]);

  return {
    isSubscribed: !!subscriptionRef.current,
  };
}

// Hook for real-time customer statistics
export function useRealtimeCustomerStats() {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<string | null>(null);

  useEffect(() => {
    // Subscribe to all customers to calculate stats
    const subscriptionId = realtimeManager.subscribeToEntity(
      'customers',
      {},
      (customers: Customer[]) => {
        // Calculate stats
        const stats = {
          total: customers.length,
          withActiveJobs: customers.filter(c => c.jobs && c.jobs.length > 0).length,
          byContactMethod: {
            phone: customers.filter(c => c.preferredContact === 'phone').length,
            email: customers.filter(c => c.preferredContact === 'email').length,
          },
        };

        // Update stats cache
        queryClient.setQueryData(
          [...queryKeys.customers.all, 'stats'],
          stats
        );
      }
    );

    subscriptionRef.current = subscriptionId;

    return () => {
      if (subscriptionRef.current) {
        realtimeManager.unsubscribe(subscriptionRef.current);
      }
    };
  }, [queryClient]);

  return {
    isSubscribed: !!subscriptionRef.current,
  };
}

// Utility hook to manage multiple customer subscriptions
export function useRealtimeCustomerManager() {
  const subscriptions = useRef<string[]>([]);

  const subscribe = (type: 'list' | 'detail' | 'vehicles', id?: string, filters?: any) => {
    let subscriptionId: string;

    switch (type) {
      case 'list':
        subscriptionId = realtimeManager.subscribeToEntity('customers', filters || {}, (data) => {
          realtimeSync.syncEntity('customers');
        });
        break;
      case 'detail':
        if (!id) return '';
        subscriptionId = realtimeManager.subscribeToEntity('customers', { id }, (data) => {
          realtimeSync.syncEntity('customers', id);
        });
        break;
      case 'vehicles':
        if (!id) return '';
        subscriptionId = realtimeManager.subscribeToEntity('vehicles', { customerId: id }, (data) => {
          realtimeSync.syncEntity('vehicles');
          realtimeSync.syncEntity('customers', id);
        });
        break;
      default:
        return '';
    }

    subscriptions.current.push(subscriptionId);
    return subscriptionId;
  };

  const unsubscribeAll = () => {
    subscriptions.current.forEach(id => {
      realtimeManager.unsubscribe(id);
    });
    subscriptions.current = [];
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribeAll();
    };
  }, []);

  return {
    subscribe,
    unsubscribeAll,
    activeSubscriptions: subscriptions.current.length,
  };
}
