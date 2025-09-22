// Real-time Dashboard Hooks
// Hooks for real-time dashboard data and KPI tracking

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { realtimeManager } from '@/lib/realtime-client';
import { queryKeys } from '@/lib/query-client';
import type { Job, Call, Appointment, DashboardStats } from '@/types/database';

// Hook for real-time dashboard statistics
export function useRealtimeDashboard(dateRange?: { start: string; end: string }) {
  const queryClient = useQueryClient();
  const subscriptionRefs = useRef<string[]>([]);

  useEffect(() => {
    // Subscribe to all entities that affect dashboard
    const jobsSubscription = realtimeManager.subscribeToEntity(
      'jobs',
      {},
      (jobs: Job[]) => updateDashboardStats(jobs, null, null)
    );

    const callsSubscription = realtimeManager.subscribeToEntity(
      'calls',
      {},
      (calls: Call[]) => updateDashboardStats(null, calls, null)
    );

    const appointmentsSubscription = realtimeManager.subscribeToEntity(
      'appointments',
      {},
      (appointments: Appointment[]) => updateDashboardStats(null, null, appointments)
    );

    subscriptionRefs.current = [jobsSubscription, callsSubscription, appointmentsSubscription];

    // Function to update dashboard stats
    function updateDashboardStats(
      jobs: Job[] | null,
      calls: Call[] | null,
      appointments: Appointment[] | null
    ) {
      // Get existing data from cache or use provided data
      const currentJobs = jobs || queryClient.getQueryData<any>(queryKeys.jobs.lists())?.data || [];
      const currentCalls = calls || queryClient.getQueryData<any>(queryKeys.calls.lists())?.data || [];
      const currentAppointments = appointments || queryClient.getQueryData<any>(queryKeys.appointments.lists())?.data || [];

      const today = new Date();
      const todayStr = today.toDateString();

      // Calculate today's stats
      const todaysJobs = currentJobs.filter((job: Job) => 
        new Date(job.createdAt).toDateString() === todayStr
      );

      const todaysAppointments = currentAppointments.filter((apt: Appointment) => 
        new Date(apt.startAt).toDateString() === todayStr
      );

      const todaysCalls = currentCalls.filter((call: Call) => 
        new Date(call.createdAt).toDateString() === todayStr
      );

      // Calculate this week's stats
      const weekStart = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
      const thisWeeksJobs = currentJobs.filter((job: Job) => 
        new Date(job.createdAt) >= weekStart
      );

      const stats: DashboardStats = {
        today: {
          carsScheduled: todaysAppointments.length,
          hoursBooked: todaysAppointments.reduce((sum, apt) => {
            const start = new Date(apt.startAt);
            const end = new Date(apt.endAt);
            return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          }, 0),
          totalCapacity: 16, // 2 bays × 8 hours
          waitingOnParts: currentJobs.filter((job: Job) => job.status === 'waiting-parts').length,
          completed: currentJobs.filter((job: Job) => 
            job.status === 'completed' && 
            new Date(job.updatedAt).toDateString() === todayStr
          ).length,
        },
        thisWeek: {
          jobsCompleted: thisWeeksJobs.filter((job: Job) => job.status === 'completed').length,
          totalRevenue: 0, // Would be calculated from completed jobs with pricing
          averageJobTime: thisWeeksJobs.length > 0 
            ? thisWeeksJobs.reduce((sum, job) => sum + job.estHours, 0) / thisWeeksJobs.length 
            : 0,
          customerSatisfaction: 0, // Would come from feedback system
        },
      };

      // Update dashboard cache
      queryClient.setQueryData(
        queryKeys.dashboard.stats(dateRange),
        {
          success: true,
          data: stats,
        }
      );

      // Calculate additional KPIs
      const kpis = {
        // Operational KPIs
        bayUtilization: (stats.today.hoursBooked / stats.today.totalCapacity) * 100,
        jobsInProgress: currentJobs.filter((job: Job) => job.status === 'in-bay').length,
        scheduledJobs: currentJobs.filter((job: Job) => job.status === 'scheduled').length,
        
        // Customer KPIs
        callVolume: todaysCalls.length,
        callConversionRate: todaysCalls.length > 0 
          ? (todaysCalls.filter(call => call.outcome === 'scheduled').length / todaysCalls.length) * 100 
          : 0,
        followUpCalls: currentCalls.filter((call: Call) => 
          call.outcome === 'follow-up' && 
          call.nextActionAt && 
          new Date(call.nextActionAt) <= today
        ).length,
        
        // Efficiency KPIs
        averageJobDuration: currentJobs.length > 0 
          ? currentJobs.reduce((sum, job) => sum + job.estHours, 0) / currentJobs.length 
          : 0,
        onTimeCompletion: 95, // Would be calculated from actual vs estimated times
        
        // Financial KPIs (placeholders)
        dailyRevenue: 0,
        weeklyRevenue: 0,
        monthlyRevenue: 0,
      };

      queryClient.setQueryData(
        queryKeys.dashboard.kpis(dateRange),
        {
          success: true,
          data: kpis,
        }
      );
    }

    return () => {
      subscriptionRefs.current.forEach(id => {
        realtimeManager.unsubscribe(id);
      });
    };
  }, [queryClient, dateRange]);

  return {
    isSubscribed: subscriptionRefs.current.length > 0,
    subscriptionCount: subscriptionRefs.current.length,
  };
}

// Hook for real-time bay status monitoring
export function useRealtimeBayStatus() {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<string | null>(null);

  useEffect(() => {
    const subscriptionId = realtimeManager.subscribeToEntity(
      'jobs',
      { status: 'in-bay' },
      (jobsInBay: Job[]) => {
        const bayStatus = {
          'bay-1': {
            occupied: !!jobsInBay.find(job => job.appointment?.bay === 'bay-1'),
            currentJob: jobsInBay.find(job => job.appointment?.bay === 'bay-1') || null,
            estimatedCompletion: null as string | null,
          },
          'bay-2': {
            occupied: !!jobsInBay.find(job => job.appointment?.bay === 'bay-2'),
            currentJob: jobsInBay.find(job => job.appointment?.bay === 'bay-2') || null,
            estimatedCompletion: null as string | null,
          },
          totalOccupied: jobsInBay.length,
          totalCapacity: 2,
          utilizationRate: (jobsInBay.length / 2) * 100,
        };

        // Calculate estimated completion times
        ['bay-1', 'bay-2'].forEach(bay => {
          const bayData = bayStatus[bay as keyof typeof bayStatus] as any;
          if (bayData.currentJob?.appointment) {
            const startTime = new Date(bayData.currentJob.appointment.startAt);
            const duration = bayData.currentJob.estHours * 60 * 60 * 1000; // Convert to milliseconds
            bayData.estimatedCompletion = new Date(startTime.getTime() + duration).toISOString();
          }
        });

        queryClient.setQueryData(
          [...queryKeys.dashboard.all, 'bay-status'],
          bayStatus
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

// Hook for real-time alerts and notifications
export function useRealtimeAlerts() {
  const queryClient = useQueryClient();
  const subscriptionRefs = useRef<string[]>([]);

  useEffect(() => {
    // Monitor for various alert conditions
    const jobsSubscription = realtimeManager.subscribeToEntity(
      'jobs',
      {},
      (jobs: Job[]) => {
        const alerts = [];
        
        // Jobs waiting for parts too long
        const longWaitingJobs = jobs.filter(job => {
          if (job.status !== 'waiting-parts') return false;
          const daysSinceUpdate = (Date.now() - new Date(job.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
          return daysSinceUpdate > 3; // More than 3 days
        });

        longWaitingJobs.forEach(job => {
          alerts.push({
            type: 'warning',
            title: 'Long Wait for Parts',
            message: `${job.title} has been waiting for parts for over 3 days`,
            jobId: job.id,
            severity: 'medium',
          });
        });

        // Overdue jobs
        const overdueJobs = jobs.filter(job => {
          if (!job.appointment) return false;
          const expectedEnd = new Date(job.appointment.endAt);
          return expectedEnd < new Date() && job.status !== 'completed';
        });

        overdueJobs.forEach(job => {
          alerts.push({
            type: 'error',
            title: 'Job Overdue',
            message: `${job.title} is overdue for completion`,
            jobId: job.id,
            severity: 'high',
          });
        });

        updateAlertsCache(alerts);
      }
    );

    const callsSubscription = realtimeManager.subscribeToEntity(
      'calls',
      { outcome: 'follow-up' },
      (followUpCalls: Call[]) => {
        const alerts = [];
        const now = new Date();

        const overdueFollowUps = followUpCalls.filter(call => 
          call.nextActionAt && new Date(call.nextActionAt) < now
        );

        overdueFollowUps.forEach(call => {
          alerts.push({
            type: 'warning',
            title: 'Follow-up Overdue',
            message: `Call from ${call.phone} needs follow-up`,
            callId: call.id,
            severity: 'medium',
          });
        });

        updateAlertsCache(alerts);
      }
    );

    subscriptionRefs.current = [jobsSubscription, callsSubscription];

    function updateAlertsCache(newAlerts: any[]) {
      const existingAlerts = queryClient.getQueryData([...queryKeys.dashboard.all, 'alerts']) || [];
      const allAlerts = [...existingAlerts, ...newAlerts];
      
      // Remove duplicates and old alerts
      const uniqueAlerts = allAlerts.filter((alert, index, self) => 
        index === self.findIndex(a => a.jobId === alert.jobId && a.callId === alert.callId)
      ).slice(-50); // Keep only last 50 alerts

      queryClient.setQueryData(
        [...queryKeys.dashboard.all, 'alerts'],
        uniqueAlerts
      );
    }

    return () => {
      subscriptionRefs.current.forEach(id => {
        realtimeManager.unsubscribe(id);
      });
    };
  }, [queryClient]);

  return {
    isSubscribed: subscriptionRefs.current.length > 0,
  };
}

// Hook for real-time performance metrics
export function useRealtimePerformanceMetrics() {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<string | null>(null);

  useEffect(() => {
    const subscriptionId = realtimeManager.subscribeToEntity(
      'jobs',
      {},
      (jobs: Job[]) => {
        const completedJobs = jobs.filter(job => job.status === 'completed');
        const today = new Date().toDateString();
        const thisWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const metrics = {
          // Daily metrics
          daily: {
            jobsCompleted: completedJobs.filter(job => 
              new Date(job.updatedAt).toDateString() === today
            ).length,
            averageCompletionTime: 0, // Would calculate from actual completion times
            customerSatisfaction: 0, // Would come from feedback
          },
          
          // Weekly metrics
          weekly: {
            jobsCompleted: completedJobs.filter(job => 
              new Date(job.updatedAt) >= thisWeek
            ).length,
            onTimeDelivery: 0, // Percentage of jobs completed on time
            repeatCustomers: 0, // Would calculate from customer data
          },
          
          // Efficiency metrics
          efficiency: {
            bayUtilization: 0, // Calculated from appointments
            averageJobTime: jobs.length > 0 
              ? jobs.reduce((sum, job) => sum + job.estHours, 0) / jobs.length 
              : 0,
            jobsPerDay: completedJobs.length / 30, // Last 30 days average
          },
        };

        queryClient.setQueryData(
          [...queryKeys.dashboard.all, 'performance'],
          metrics
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
