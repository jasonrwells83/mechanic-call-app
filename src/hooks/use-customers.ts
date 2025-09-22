// Customer Hooks
// Custom hooks for customer data management using TanStack Query

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customerApi } from '@/lib/api-client';
import { queryKeys, invalidateQueries, optimisticUpdates } from '@/lib/query-client';
import { useUIStore } from '@/stores';
import type { Customer, CreateCustomerData, UpdateCustomerData, CustomerFilters } from '@/types/database';

// Hook to get all customers
export function useCustomers(filters: CustomerFilters = {}) {
  const { setLoading } = useUIStore();

  return useQuery({
    queryKey: queryKeys.customers.list(filters),
    queryFn: async () => {
      setLoading('customers', true);
      try {
        const response = await customerApi.getAll(filters);
        return response;
      } finally {
        setLoading('customers', false);
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook to get a single customer by ID
export function useCustomer(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: () => customerApi.getById(id),
    enabled: enabled && !!id,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

// Hook to get customer's vehicles
export function useCustomerVehicles(customerId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.customers.vehicles(customerId),
    queryFn: () => customerApi.getVehicles(customerId),
    enabled: enabled && !!customerId,
    staleTime: 1000 * 60 * 15, // 15 minutes (vehicles don't change often)
  });
}

// Hook to create a new customer
export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  return useMutation({
    mutationFn: (data: CreateCustomerData) => customerApi.create(data),
    onMutate: async (newCustomer) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.customers.lists() });

      // Optimistically update the cache
      optimisticUpdates.addCustomer({
        id: `temp-${Date.now()}`,
        ...newCustomer,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Return context for rollback
      return { previousCustomers: queryClient.getQueryData(queryKeys.customers.lists()) };
    },
    onError: (error, newCustomer, context) => {
      // Rollback optimistic update
      if (context?.previousCustomers) {
        queryClient.setQueryData(queryKeys.customers.lists(), context.previousCustomers);
      }
      
      addToast({
        type: 'error',
        title: 'Failed to Create Customer',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    },
    onSuccess: (response) => {
      // Invalidate and refetch customers list
      invalidateQueries.customers();
      
      addToast({
        type: 'success',
        title: 'Customer Created',
        message: `${response.data?.name || 'Customer'} has been created successfully`,
      });
    },
  });
}

// Hook to update a customer
export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomerData }) => 
      customerApi.update(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel queries for this customer
      await queryClient.cancelQueries({ queryKey: queryKeys.customers.detail(id) });

      // Get previous data for rollback
      const previousCustomer = queryClient.getQueryData(queryKeys.customers.detail(id));

      // Optimistically update
      optimisticUpdates.updateCustomer(id, data);

      return { previousCustomer, customerId: id };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousCustomer) {
        queryClient.setQueryData(
          queryKeys.customers.detail(context.customerId),
          context.previousCustomer
        );
      }
      
      addToast({
        type: 'error',
        title: 'Failed to Update Customer',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    },
    onSuccess: (response, { id }) => {
      // Invalidate related queries
      invalidateQueries.customer(id);
      invalidateQueries.customers();
      
      addToast({
        type: 'success',
        title: 'Customer Updated',
        message: `${response.data?.name || 'Customer'} has been updated successfully`,
      });
    },
  });
}

// Hook to delete a customer
export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  return useMutation({
    mutationFn: (id: string) => customerApi.delete(id),
    onMutate: async (id) => {
      // Cancel queries
      await queryClient.cancelQueries({ queryKey: queryKeys.customers.all });

      // Get previous data for rollback
      const previousCustomer = queryClient.getQueryData(queryKeys.customers.detail(id));
      const previousCustomers = queryClient.getQueryData(queryKeys.customers.lists());

      // Optimistically remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.customers.detail(id) });
      
      // Remove from lists
      queryClient.setQueryData(queryKeys.customers.lists(), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.filter((customer: Customer) => customer.id !== id),
          count: old.count - 1,
        };
      });

      return { previousCustomer, previousCustomers, customerId: id };
    },
    onError: (error, id, context) => {
      // Rollback optimistic updates
      if (context?.previousCustomer) {
        queryClient.setQueryData(queryKeys.customers.detail(id), context.previousCustomer);
      }
      if (context?.previousCustomers) {
        queryClient.setQueryData(queryKeys.customers.lists(), context.previousCustomers);
      }
      
      addToast({
        type: 'error',
        title: 'Failed to Delete Customer',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    },
    onSuccess: () => {
      // Invalidate all customer queries
      invalidateQueries.customers();
      
      addToast({
        type: 'success',
        title: 'Customer Deleted',
        message: 'Customer has been deleted successfully',
      });
    },
  });
}

// Hook for customer search with debouncing
export function useCustomerSearch(searchTerm: string, debounceMs: number = 300) {
  const [debouncedTerm, setDebouncedTerm] = useState(searchTerm);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, debounceMs);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, debounceMs]);

  return useCustomers({ search: debouncedTerm });
}

// Hook to prefetch customer data (for hover effects, etc.)
export function usePrefetchCustomer() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.customers.detail(id),
      queryFn: () => customerApi.getById(id),
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
  };
}

// Hook to get customer statistics
export function useCustomerStats() {
  return useQuery({
    queryKey: [...queryKeys.customers.all, 'stats'],
    queryFn: async () => {
      // This would be implemented as a separate API endpoint
      const response = await customerApi.getAll();
      const customers = response.data || [];
      
      return {
        total: customers.length,
        withActiveJobs: customers.filter(c => c.jobs && c.jobs.length > 0).length,
        byContactMethod: {
          phone: customers.filter(c => c.preferredContact === 'phone').length,
          email: customers.filter(c => c.preferredContact === 'email').length,
        },
      };
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

// Re-export types for convenience
export type { Customer, CreateCustomerData, UpdateCustomerData, CustomerFilters };
