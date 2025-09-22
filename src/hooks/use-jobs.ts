// Job Hooks
// Custom hooks for job data management using TanStack Query

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { jobApi } from '@/lib/api-client';
import { queryKeys, invalidateQueries, optimisticUpdates } from '@/lib/query-client';
import { useUIStore } from '@/stores';
import type { Job, CreateJobData, UpdateJobData, JobFilters, JobStatus } from '@/types/database';

// Hook to get all jobs
export function useJobs(filters: JobFilters = {}) {
  const { setLoading } = useUIStore();

  return useQuery({
    queryKey: queryKeys.jobs.list(filters),
    queryFn: async () => {
      setLoading('jobs', true);
      try {
        const response = await jobApi.getAll(filters);
        return response;
      } finally {
        setLoading('jobs', false);
      }
    },
    staleTime: 1000 * 60 * 2, // 2 minutes (jobs change frequently)
  });
}

// Hook to get a single job by ID
export function useJob(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.jobs.detail(id),
    queryFn: () => jobApi.getById(id),
    enabled: enabled && !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook to get jobs by status
export function useJobsByStatus(status: JobStatus) {
  return useQuery({
    queryKey: queryKeys.jobs.byStatus(status),
    queryFn: () => jobApi.getAll({ status: [status] }),
    staleTime: 1000 * 60 * 1, // 1 minute for status-specific queries
  });
}

// Hook to get jobs by customer
export function useJobsByCustomer(customerId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.jobs.byCustomer(customerId),
    queryFn: () => jobApi.getAll({ customerId }),
    enabled: enabled && !!customerId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook to get jobs by vehicle
export function useJobsByVehicle(vehicleId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.jobs.byVehicle(vehicleId),
    queryFn: () => jobApi.getAll({ vehicleId }),
    enabled: enabled && !!vehicleId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook to create a new job
export function useCreateJob() {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  return useMutation({
    mutationFn: (data: CreateJobData) => jobApi.create(data),
    onMutate: async (newJob) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.jobs.lists() });

      // Optimistically add job to cache
      const tempJob: Job = {
        id: `temp-${Date.now()}`,
        ...newJob,
        status: 'incoming-call',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData(queryKeys.jobs.lists(), (old: any) => {
        if (!old) return { success: true, data: [tempJob], count: 1 };
        return {
          ...old,
          data: [tempJob, ...old.data],
          count: old.count + 1,
        };
      });

      return { previousJobs: queryClient.getQueryData(queryKeys.jobs.lists()) };
    },
    onError: (error, newJob, context) => {
      // Rollback optimistic update
      if (context?.previousJobs) {
        queryClient.setQueryData(queryKeys.jobs.lists(), context.previousJobs);
      }
      
      addToast({
        type: 'error',
        title: 'Failed to Create Job',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    },
    onSuccess: (response) => {
      // Invalidate and refetch jobs
      invalidateQueries.jobs();
      
      // Also invalidate customer and vehicle related queries
      if (response.data?.customerId) {
        invalidateQueries.customer(response.data.customerId);
      }
      if (response.data?.vehicleId) {
        invalidateQueries.vehicle(response.data.vehicleId);
      }
      
      addToast({
        type: 'success',
        title: 'Job Created',
        message: `${response.data?.title || 'Job'} has been created successfully`,
      });
    },
  });
}

// Hook to update a job
export function useUpdateJob() {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateJobData }) => 
      jobApi.update(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel queries for this job
      await queryClient.cancelQueries({ queryKey: queryKeys.jobs.detail(id) });

      // Get previous data for rollback
      const previousJob = queryClient.getQueryData(queryKeys.jobs.detail(id));

      // Optimistically update
      queryClient.setQueryData(queryKeys.jobs.detail(id), (old: any) => {
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

      return { previousJob, jobId: id };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousJob) {
        queryClient.setQueryData(
          queryKeys.jobs.detail(context.jobId),
          context.previousJob
        );
      }
      
      addToast({
        type: 'error',
        title: 'Failed to Update Job',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    },
    onSuccess: (response, { id }) => {
      // Invalidate related queries
      invalidateQueries.job(id);
      invalidateQueries.jobs();
      
      addToast({
        type: 'success',
        title: 'Job Updated',
        message: `${response.data?.title || 'Job'} has been updated successfully`,
      });
    },
  });
}

// Hook to update job status specifically (for quick status changes)
export function useUpdateJobStatus() {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: JobStatus }) => 
      jobApi.updateStatus(id, status),
    onMutate: async ({ id, status }) => {
      // Cancel queries
      await queryClient.cancelQueries({ queryKey: queryKeys.jobs.detail(id) });

      // Get previous data
      const previousJob = queryClient.getQueryData(queryKeys.jobs.detail(id));

      // Optimistically update status
      optimisticUpdates.updateJobStatus(id, status);

      return { previousJob, jobId: id };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousJob) {
        queryClient.setQueryData(
          queryKeys.jobs.detail(context.jobId),
          context.previousJob
        );
      }
      
      addToast({
        type: 'error',
        title: 'Failed to Update Status',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    },
    onSuccess: (response, { id, status }) => {
      // Invalidate related queries
      invalidateQueries.job(id);
      invalidateQueries.jobsByStatus(status);
      invalidateQueries.jobs();
      
      const statusLabels: Record<JobStatus, string> = {
        'incoming-call': 'Incoming Call',
        'scheduled': 'Scheduled',
        'in-bay': 'In Bay',
        'waiting-parts': 'Waiting for Parts',
        'completed': 'Completed',
      };
      
      addToast({
        type: 'success',
        title: 'Status Updated',
        message: `Job status changed to ${statusLabels[status]}`,
        duration: 3000,
      });
    },
  });
}

// Hook to delete a job
export function useDeleteJob() {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  return useMutation({
    mutationFn: (id: string) => jobApi.delete(id),
    onMutate: async (id) => {
      // Cancel queries
      await queryClient.cancelQueries({ queryKey: queryKeys.jobs.all });

      // Get previous data for rollback
      const previousJob = queryClient.getQueryData(queryKeys.jobs.detail(id));
      const previousJobs = queryClient.getQueryData(queryKeys.jobs.lists());

      // Optimistically remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.jobs.detail(id) });
      
      // Remove from lists
      queryClient.setQueryData(queryKeys.jobs.lists(), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.filter((job: Job) => job.id !== id),
          count: old.count - 1,
        };
      });

      return { previousJob, previousJobs, jobId: id };
    },
    onError: (error, id, context) => {
      // Rollback optimistic updates
      if (context?.previousJob) {
        queryClient.setQueryData(queryKeys.jobs.detail(id), context.previousJob);
      }
      if (context?.previousJobs) {
        queryClient.setQueryData(queryKeys.jobs.lists(), context.previousJobs);
      }
      
      addToast({
        type: 'error',
        title: 'Failed to Delete Job',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    },
    onSuccess: () => {
      // Invalidate all job queries
      invalidateQueries.jobs();
      
      addToast({
        type: 'success',
        title: 'Job Deleted',
        message: 'Job has been deleted successfully',
      });
    },
  });
}

// Hook for job statistics
export function useJobStats() {
  return useQuery({
    queryKey: [...queryKeys.jobs.all, 'stats'],
    queryFn: async () => {
      const response = await jobApi.getAll();
      const jobs = response.data || [];
      
      const statusCounts = jobs.reduce((acc, job) => {
        acc[job.status] = (acc[job.status] || 0) + 1;
        return acc;
      }, {} as Record<JobStatus, number>);
      
      return {
        total: jobs.length,
        byStatus: statusCounts,
        averageEstHours: jobs.length > 0 
          ? jobs.reduce((sum, job) => sum + job.estHours, 0) / jobs.length 
          : 0,
        byPriority: jobs.reduce((acc, job) => {
          acc[job.priority] = (acc[job.priority] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook to prefetch job data
export function usePrefetchJob() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.jobs.detail(id),
      queryFn: () => jobApi.getById(id),
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
  };
}

// Re-export types for convenience
export type { Job, CreateJobData, UpdateJobData, JobFilters, JobStatus };
