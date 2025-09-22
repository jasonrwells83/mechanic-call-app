// Vehicle Hooks
// Hooks for vehicle management and operations

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vehicleApi } from '@/lib/api-client';
import { queryKeys, invalidateQueries } from '@/lib/query-client';
import { useUIStore } from '@/stores';
import type { Vehicle, CreateVehicleData, UpdateVehicleData } from '@/types/database';

interface VehicleFilters {
  customerId?: string;
  ids?: string[];
  make?: string;
  model?: string;
  year?: number;
  search?: string;
}

// Hook to get vehicles with optional filtering
export function useVehicles(filters: VehicleFilters = {}) {
  const { addToast } = useUIStore();
  
  return useQuery({
    queryKey: queryKeys.vehicles.filtered(filters),
    queryFn: () => vehicleApi.getAll(filters),
    staleTime: 1000 * 60 * 10, // 10 minutes
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Failed to Load Vehicles',
        message: error instanceof Error ? error.message : 'An error occurred',
        duration: 5000,
      });
    },
  });
}

// Hook to get a single vehicle by ID
export function useVehicle(id: string, enabled: boolean = true) {
  const { addToast } = useUIStore();
  
  return useQuery({
    queryKey: queryKeys.vehicles.detail(id),
    queryFn: () => vehicleApi.getById(id),
    enabled: enabled && !!id,
    staleTime: 1000 * 60 * 15, // 15 minutes
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Failed to Load Vehicle',
        message: error instanceof Error ? error.message : 'An error occurred',
        duration: 5000,
      });
    },
  });
}

// Hook to get vehicles by customer ID
export function useVehiclesByCustomer(customerId: string, enabled: boolean = true) {
  return useVehicles({ customerId });
}

// Hook to create a new vehicle
export function useCreateVehicle() {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  return useMutation({
    mutationFn: (data: CreateVehicleData) => vehicleApi.create(data),
    onSuccess: (newVehicle) => {
      // Invalidate and refetch vehicles
      invalidateQueries.vehicles();
      invalidateQueries.customers();

      addToast({
        type: 'success',
        title: 'Vehicle Added',
        message: `${newVehicle.year} ${newVehicle.make} ${newVehicle.model} has been added`,
        duration: 3000,
      });
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Failed to Add Vehicle',
        message: error instanceof Error ? error.message : 'An error occurred',
        duration: 5000,
      });
    },
  });
}

// Hook to update a vehicle
export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateVehicleData }) =>
      vehicleApi.update(id, data),
    onSuccess: (updatedVehicle) => {
      // Update the vehicle in the cache
      queryClient.setQueryData(
        queryKeys.vehicles.detail(updatedVehicle.id),
        updatedVehicle
      );

      // Invalidate related queries
      invalidateQueries.vehicles();
      invalidateQueries.customers();

      addToast({
        type: 'success',
        title: 'Vehicle Updated',
        message: `${updatedVehicle.year} ${updatedVehicle.make} ${updatedVehicle.model} has been updated`,
        duration: 3000,
      });
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Failed to Update Vehicle',
        message: error instanceof Error ? error.message : 'An error occurred',
        duration: 5000,
      });
    },
  });
}

// Hook to delete a vehicle
export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  return useMutation({
    mutationFn: (id: string) => vehicleApi.delete(id),
    onSuccess: (_, deletedId) => {
      // Remove the vehicle from cache
      queryClient.removeQueries({
        queryKey: queryKeys.vehicles.detail(deletedId),
      });

      // Invalidate related queries
      invalidateQueries.vehicles();
      invalidateQueries.customers();
      invalidateQueries.jobs();

      addToast({
        type: 'success',
        title: 'Vehicle Deleted',
        message: 'Vehicle has been removed from the system',
        duration: 3000,
      });
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Failed to Delete Vehicle',
        message: error instanceof Error ? error.message : 'An error occurred',
        duration: 5000,
      });
    },
  });
}

// Hook to get vehicle service history
export function useVehicleServiceHistory(vehicleId: string, enabled: boolean = true) {
  const { addToast } = useUIStore();
  
  return useQuery({
    queryKey: queryKeys.vehicles.serviceHistory(vehicleId),
    queryFn: () => vehicleApi.getServiceHistory(vehicleId),
    enabled: enabled && !!vehicleId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Failed to Load Service History',
        message: error instanceof Error ? error.message : 'An error occurred',
        duration: 5000,
      });
    },
  });
}

// Hook to search vehicles
export function useVehicleSearch(query: string, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.vehicles.search(query),
    queryFn: () => vehicleApi.search(query),
    enabled: enabled && query.length >= 2,
    staleTime: 1000 * 60 * 2, // 2 minutes
    debounceMs: 300, // Debounce search requests
  });
}

// Hook to get vehicle statistics
export function useVehicleStats(customerId?: string) {
  const { addToast } = useUIStore();
  
  return useQuery({
    queryKey: queryKeys.vehicles.stats(customerId),
    queryFn: () => vehicleApi.getStats(customerId),
    staleTime: 1000 * 60 * 10, // 10 minutes
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Failed to Load Vehicle Statistics',
        message: error instanceof Error ? error.message : 'An error occurred',
        duration: 5000,
      });
    },
  });
}

// Hook to prefetch vehicle data
export function usePrefetchVehicle() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.vehicles.detail(id),
      queryFn: () => vehicleApi.getById(id),
      staleTime: 1000 * 60 * 15, // 15 minutes
    });
  };
}

// Hook to get vehicles with maintenance alerts
export function useVehiclesWithAlerts() {
  const { addToast } = useUIStore();
  
  return useQuery({
    queryKey: queryKeys.vehicles.withAlerts(),
    queryFn: () => vehicleApi.getWithMaintenanceAlerts(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Failed to Load Vehicle Alerts',
        message: error instanceof Error ? error.message : 'An error occurred',
        duration: 5000,
      });
    },
  });
}
