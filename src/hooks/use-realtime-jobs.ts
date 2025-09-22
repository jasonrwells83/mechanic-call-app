// Real-time Job Hooks
// Hooks for real-time job data subscriptions and status tracking

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { realtimeManager, realtimeSync, realtimeHandlers } from '@/lib/realtime-client';
import { queryKeys } from '@/lib/query-client';
import { useUIStore } from '@/stores';
import type { Job, JobFilters, JobStatus } from '@/types/database';

// Hook for real-time job list updates
export function useRealtimeJobs(filters: JobFilters = {}) {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<string | null>(null);
  const { addToast } = useUIStore();

  useEffect(() => {
    // Subscribe to job changes with filters
    const subscriptionId = realtimeManager.subscribeToEntity(
      'jobs',
      filters,
      (jobs: Job[]) => {
        // Update the query cache with fresh data
        queryClient.setQueryData(
          queryKeys.jobs.list(filters),
          {
            success: true,
            data: jobs,
            count: jobs.length,
          }
        );

        // Also update dashboard stats since jobs affect KPIs
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      }
    );

    subscriptionRef.current = subscriptionId;

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

// Hook for real-time single job updates
export function useRealtimeJob(jobId: string, enabled: boolean = true) {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<string | null>(null);
  const previousJobRef = useRef<Job | null>(null);
  const { addToast } = useUIStore();

  useEffect(() => {
    if (!enabled || !jobId) return;

    const subscriptionId = realtimeManager.subscribeToEntity(
      'jobs',
      { id: jobId },
      (jobs: Job[]) => {
        const job = jobs[0];
        if (job) {
          const previousJob = previousJobRef.current;
          
          // Check for status changes
          if (previousJob && previousJob.status !== job.status) {
            realtimeHandlers.onJobStatusChange(jobId, job.status, previousJob.status);
            
            // Show status change notification
            const statusLabels: Record<JobStatus, string> = {
              'incoming-call': 'Incoming Call',
              'scheduled': 'Scheduled',
              'in-bay': 'In Bay',
              'waiting-parts': 'Waiting for Parts',
              'completed': 'Completed',
            };

            addToast({
              type: job.status === 'completed' ? 'success' : 'info',
              title: 'Job Status Updated',
              message: `${job.title} is now ${statusLabels[job.status]}`,
              duration: 4000,
            });
          }

          // Update the specific job query
          queryClient.setQueryData(
            queryKeys.jobs.detail(jobId),
            {
              success: true,
              data: job,
            }
          );

          // Update lists that might contain this job
          queryClient.invalidateQueries({ queryKey: queryKeys.jobs.lists() });
          
          // Update status-specific queries
          if (previousJob && previousJob.status !== job.status) {
            queryClient.invalidateQueries({ queryKey: queryKeys.jobs.byStatus(previousJob.status) });
            queryClient.invalidateQueries({ queryKey: queryKeys.jobs.byStatus(job.status) });
          }

          previousJobRef.current = job;
        }
      }
    );

    subscriptionRef.current = subscriptionId;

    return () => {
      if (subscriptionRef.current) {
        realtimeManager.unsubscribe(subscriptionRef.current);
      }
    };
  }, [jobId, enabled, queryClient, addToast]);

  return {
    isSubscribed: !!subscriptionRef.current,
  };
}

// Hook for real-time jobs by status
export function useRealtimeJobsByStatus(status: JobStatus) {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<string | null>(null);

  useEffect(() => {
    const subscriptionId = realtimeManager.subscribeToEntity(
      'jobs',
      { status },
      (jobs: Job[]) => {
        // Update the status-specific query
        queryClient.setQueryData(
          queryKeys.jobs.byStatus(status),
          {
            success: true,
            data: jobs,
            count: jobs.length,
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
  }, [status, queryClient]);

  return {
    isSubscribed: !!subscriptionRef.current,
  };
}

// Hook for real-time job notifications (new jobs, completions, etc.)
export function useRealtimeJobNotifications() {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();
  const subscriptionRef = useRef<string | null>(null);
  const previousJobsRef = useRef<Job[]>([]);

  useEffect(() => {
    const subscriptionId = realtimeManager.subscribeToEntity(
      'jobs',
      {},
      (jobs: Job[]) => {
        const previousJobs = previousJobsRef.current;
        
        if (previousJobs.length > 0) {
          // Check for new jobs
          const newJobs = jobs.filter(job => 
            !previousJobs.find(prev => prev.id === job.id)
          );

          newJobs.forEach(job => {
            addToast({
              type: 'info',
              title: 'New Job Created',
              message: `${job.title} has been added to the queue`,
              duration: 5000,
            });
          });

          // Check for completed jobs
          const completedJobs = jobs.filter(job => 
            job.status === 'completed' && 
            previousJobs.find(prev => prev.id === job.id && prev.status !== 'completed')
          );

          completedJobs.forEach(job => {
            addToast({
              type: 'success',
              title: 'Job Completed',
              message: `${job.title} has been completed`,
              duration: 5000,
            });
          });

          // Check for jobs waiting on parts
          const waitingJobs = jobs.filter(job => 
            job.status === 'waiting-parts' && 
            previousJobs.find(prev => prev.id === job.id && prev.status !== 'waiting-parts')
          );

          waitingJobs.forEach(job => {
            addToast({
              type: 'warning',
              title: 'Job Waiting for Parts',
              message: `${job.title} is now waiting for parts`,
              duration: 6000,
            });
          });
        }

        previousJobsRef.current = jobs;

        // Update the cache
        queryClient.setQueryData(
          queryKeys.jobs.lists(),
          {
            success: true,
            data: jobs,
            count: jobs.length,
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

// Hook for real-time job statistics
export function useRealtimeJobStats() {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<string | null>(null);

  useEffect(() => {
    const subscriptionId = realtimeManager.subscribeToEntity(
      'jobs',
      {},
      (jobs: Job[]) => {
        // Calculate real-time stats
        const statusCounts = jobs.reduce((acc, job) => {
          acc[job.status] = (acc[job.status] || 0) + 1;
          return acc;
        }, {} as Record<JobStatus, number>);

        const stats = {
          total: jobs.length,
          byStatus: statusCounts,
          averageEstHours: jobs.length > 0 
            ? jobs.reduce((sum, job) => sum + job.estHours, 0) / jobs.length 
            : 0,
          byPriority: jobs.reduce((acc, job) => {
            acc[job.priority] = (acc[job.priority] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          inProgress: jobs.filter(j => j.status === 'in-bay').length,
          scheduled: jobs.filter(j => j.status === 'scheduled').length,
          waitingParts: jobs.filter(j => j.status === 'waiting-parts').length,
          completed: jobs.filter(j => j.status === 'completed').length,
        };

        // Update stats cache
        queryClient.setQueryData(
          [...queryKeys.jobs.all, 'stats'],
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

// Hook for real-time jobs by customer
export function useRealtimeJobsByCustomer(customerId: string, enabled: boolean = true) {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !customerId) return;

    const subscriptionId = realtimeManager.subscribeToEntity(
      'jobs',
      { customerId },
      (jobs: Job[]) => {
        // Update customer-specific jobs query
        queryClient.setQueryData(
          queryKeys.jobs.byCustomer(customerId),
          {
            success: true,
            data: jobs,
            count: jobs.length,
          }
        );

        // Also invalidate customer details to update job count
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

// Hook for real-time bay occupancy tracking
export function useRealtimeBayStatus() {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<string | null>(null);
  const { addToast } = useUIStore();

  useEffect(() => {
    const subscriptionId = realtimeManager.subscribeToEntity(
      'jobs',
      { status: 'in-bay' },
      (jobsInBay: Job[]) => {
        // Calculate bay occupancy
        const bayStatus = {
          'bay-1': jobsInBay.find(job => job.appointment?.bay === 'bay-1') || null,
          'bay-2': jobsInBay.find(job => job.appointment?.bay === 'bay-2') || null,
          totalOccupied: jobsInBay.length,
          totalCapacity: 2,
          utilizationRate: (jobsInBay.length / 2) * 100,
        };

        // Update bay status cache
        queryClient.setQueryData(
          [...queryKeys.jobs.all, 'bay-status'],
          bayStatus
        );

        // Notify when bays become available
        if (bayStatus.totalOccupied < 2) {
          const availableBays = 2 - bayStatus.totalOccupied;
          // Could show notification for scheduling opportunities
        }
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
