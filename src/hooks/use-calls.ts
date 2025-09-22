// Call Hooks
// Custom hooks for call data management using TanStack Query

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { callApi } from '@/lib/api-client';
import { queryKeys, invalidateQueries } from '@/lib/query-client';
import { useUIStore } from '@/stores';
import type { Call, CreateCallData, UpdateCallData, CallFilters, CallOutcome } from '@/types/database';

// Hook to get all calls
export function useCalls(filters: CallFilters = {}) {
  const { setLoading } = useUIStore();

  return useQuery({
    queryKey: queryKeys.calls.list(filters),
    queryFn: async () => {
      setLoading('calls', true);
      try {
        const response = await callApi.getAll(filters);
        return response;
      } finally {
        setLoading('calls', false);
      }
    },
    staleTime: 1000 * 60 * 3, // 3 minutes
  });
}

// Hook to get a single call by ID
export function useCall(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.calls.detail(id),
    queryFn: () => callApi.getById(id),
    enabled: enabled && !!id,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

// Hook to get calls by customer
export function useCallsByCustomer(customerId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.calls.byCustomer(customerId),
    queryFn: () => callApi.getAll({ customerId }),
    enabled: enabled && !!customerId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook to get calls by outcome
export function useCallsByOutcome(outcome: CallOutcome) {
  return useQuery({
    queryKey: queryKeys.calls.byOutcome(outcome),
    queryFn: () => callApi.getAll({ outcome: [outcome] }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook to create a new call
export function useCreateCall() {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  return useMutation({
    mutationFn: (data: CreateCallData) => callApi.create(data),
    onMutate: async (newCall) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.calls.lists() });

      // Optimistically add call to cache
      const tempCall: Call = {
        id: `temp-${Date.now()}`,
        ...newCall,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData(queryKeys.calls.lists(), (old: any) => {
        if (!old) return { success: true, data: [tempCall], count: 1 };
        return {
          ...old,
          data: [tempCall, ...old.data],
          count: old.count + 1,
        };
      });

      return { previousCalls: queryClient.getQueryData(queryKeys.calls.lists()) };
    },
    onError: (error, newCall, context) => {
      // Rollback optimistic update
      if (context?.previousCalls) {
        queryClient.setQueryData(queryKeys.calls.lists(), context.previousCalls);
      }
      
      addToast({
        type: 'error',
        title: 'Failed to Log Call',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    },
    onSuccess: (response) => {
      // Invalidate and refetch calls
      invalidateQueries.calls();
      
      // Also invalidate customer related queries if linked
      if (response.data?.customerId) {
        invalidateQueries.customer(response.data.customerId);
      }
      
      addToast({
        type: 'success',
        title: 'Call Logged',
        message: 'Call has been logged successfully',
      });
    },
  });
}

// Hook to update a call
export function useUpdateCall() {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCallData }) => 
      callApi.update(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel queries for this call
      await queryClient.cancelQueries({ queryKey: queryKeys.calls.detail(id) });

      // Get previous data for rollback
      const previousCall = queryClient.getQueryData(queryKeys.calls.detail(id));

      // Optimistically update
      queryClient.setQueryData(queryKeys.calls.detail(id), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          data: {
            ...old.data,
            ...data,
            updatedAt: new Date().toISOString(),
          },
        };
      });

      return { previousCall, callId: id };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousCall) {
        queryClient.setQueryData(
          queryKeys.calls.detail(context.callId),
          context.previousCall
        );
      }
      
      addToast({
        type: 'error',
        title: 'Failed to Update Call',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    },
    onSuccess: (response, { id }) => {
      // Invalidate related queries
      invalidateQueries.call(id);
      invalidateQueries.calls();
      
      addToast({
        type: 'success',
        title: 'Call Updated',
        message: 'Call has been updated successfully',
      });
    },
  });
}

// Hook to delete a call
export function useDeleteCall() {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  return useMutation({
    mutationFn: (id: string) => callApi.delete(id),
    onMutate: async (id) => {
      // Cancel queries
      await queryClient.cancelQueries({ queryKey: queryKeys.calls.all });

      // Get previous data for rollback
      const previousCall = queryClient.getQueryData(queryKeys.calls.detail(id));
      const previousCalls = queryClient.getQueryData(queryKeys.calls.lists());

      // Optimistically remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.calls.detail(id) });
      
      // Remove from lists
      queryClient.setQueryData(queryKeys.calls.lists(), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.filter((call: Call) => call.id !== id),
          count: old.count - 1,
        };
      });

      return { previousCall, previousCalls, callId: id };
    },
    onError: (error, id, context) => {
      // Rollback optimistic updates
      if (context?.previousCall) {
        queryClient.setQueryData(queryKeys.calls.detail(id), context.previousCall);
      }
      if (context?.previousCalls) {
        queryClient.setQueryData(queryKeys.calls.lists(), context.previousCalls);
      }
      
      addToast({
        type: 'error',
        title: 'Failed to Delete Call',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    },
    onSuccess: () => {
      // Invalidate all call queries
      invalidateQueries.calls();
      
      addToast({
        type: 'success',
        title: 'Call Deleted',
        message: 'Call has been deleted successfully',
      });
    },
  });
}

// Hook for call statistics
export function useCallStats() {
  return useQuery({
    queryKey: [...queryKeys.calls.all, 'stats'],
    queryFn: async () => {
      const response = await callApi.getAll();
      const calls = response.data || [];
      
      const outcomeCounts = calls.reduce((acc, call) => {
        acc[call.outcome] = (acc[call.outcome] || 0) + 1;
        return acc;
      }, {} as Record<CallOutcome, number>);
      
      // Calculate calls from today
      const today = new Date().toDateString();
      const todaysCalls = calls.filter(call => 
        new Date(call.createdAt).toDateString() === today
      );
      
      return {
        total: calls.length,
        today: todaysCalls.length,
        byOutcome: outcomeCounts,
        withCustomer: calls.filter(call => call.customerId).length,
        withoutCustomer: calls.filter(call => !call.customerId).length,
        needingFollowUp: calls.filter(call => 
          call.outcome === 'follow-up' && call.nextActionAt
        ).length,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook to get calls needing follow-up
export function useCallsNeedingFollowUp() {
  return useQuery({
    queryKey: [...queryKeys.calls.all, 'follow-up'],
    queryFn: async () => {
      const response = await callApi.getAll({ outcome: ['follow-up'] });
      const calls = response.data || [];
      
      // Filter for calls with upcoming follow-up dates
      const now = new Date();
      return calls.filter(call => 
        call.nextActionAt && new Date(call.nextActionAt) <= now
      );
    },
    staleTime: 1000 * 60 * 2, // 2 minutes (more frequent for follow-ups)
  });
}

// Hook to convert call to job (would integrate with job creation)
export function useConvertCallToJob() {
  const { addToast } = useUIStore();

  return useMutation({
    mutationFn: async ({ callId, jobData }: { callId: string; jobData: any }) => {
      // This would be implemented as a backend endpoint that:
      // 1. Creates a job from the call data
      // 2. Updates the call outcome to 'scheduled'
      // 3. Links the call to the job
      
      // For now, simulate the conversion
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true, jobId: `job-${Date.now()}` };
    },
    onSuccess: (response) => {
      // Invalidate calls and jobs
      invalidateQueries.calls();
      invalidateQueries.jobs();
      
      addToast({
        type: 'success',
        title: 'Call Converted to Job',
        message: 'The call has been successfully converted to a job',
      });
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Failed to Convert Call',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    },
  });
}

// Hook to prefetch call data
export function usePrefetchCall() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.calls.detail(id),
      queryFn: () => callApi.getById(id),
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
  };
}

// Re-export types for convenience
export type { Call, CreateCallData, UpdateCallData, CallFilters, CallOutcome };
