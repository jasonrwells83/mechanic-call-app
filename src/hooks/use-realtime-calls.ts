// Real-time Call Hooks
// Hooks for real-time call data subscriptions and notifications

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { realtimeManager, realtimeSync, realtimeHandlers } from '@/lib/realtime-client';
import { queryKeys } from '@/lib/query-client';
import { useUIStore } from '@/stores';
import type { Call, CallFilters, CallOutcome } from '@/types/database';

// Hook for real-time call list updates
export function useRealtimeCalls(filters: CallFilters = {}) {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<string | null>(null);

  useEffect(() => {
    const subscriptionId = realtimeManager.subscribeToEntity(
      'calls',
      filters,
      (calls: Call[]) => {
        // Update the query cache with fresh data
        queryClient.setQueryData(
          queryKeys.calls.list(filters),
          {
            success: true,
            data: calls,
            count: calls.length,
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
  }, [queryClient, JSON.stringify(filters)]);

  return {
    isSubscribed: !!subscriptionRef.current,
  };
}

// Hook for real-time single call updates
export function useRealtimeCall(callId: string, enabled: boolean = true) {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !callId) return;

    const subscriptionId = realtimeManager.subscribeToEntity(
      'calls',
      { id: callId },
      (calls: Call[]) => {
        const call = calls[0];
        if (call) {
          // Update the specific call query
          queryClient.setQueryData(
            queryKeys.calls.detail(callId),
            {
              success: true,
              data: call,
            }
          );

          // Update lists that might contain this call
          queryClient.invalidateQueries({ queryKey: queryKeys.calls.lists() });
        }
      }
    );

    subscriptionRef.current = subscriptionId;

    return () => {
      if (subscriptionRef.current) {
        realtimeManager.unsubscribe(subscriptionRef.current);
      }
    };
  }, [callId, enabled, queryClient]);

  return {
    isSubscribed: !!subscriptionRef.current,
  };
}

// Hook for real-time new call notifications
export function useRealtimeCallNotifications() {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();
  const subscriptionRef = useRef<string | null>(null);
  const lastCountRef = useRef<number>(0);

  useEffect(() => {
    const subscriptionId = realtimeManager.subscribeToEntity(
      'calls',
      {},
      (calls: Call[]) => {
        const currentCount = calls.length;
        const lastCount = lastCountRef.current;

        // If count increased, new calls were added
        if (lastCount > 0 && currentCount > lastCount) {
          const newCalls = calls
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, currentCount - lastCount);
          
          newCalls.forEach(call => {
            realtimeHandlers.onNewCall(call.id);
            
            addToast({
              type: 'info',
              title: 'New Call Received',
              message: `Call from ${call.phone}`,
              duration: 6000,
            });
          });
        }

        lastCountRef.current = currentCount;

        // Update the cache
        queryClient.setQueryData(
          queryKeys.calls.lists(),
          {
            success: true,
            data: calls,
            count: calls.length,
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

// Hook for real-time follow-up call reminders
export function useRealtimeFollowUpCalls() {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();
  const subscriptionRef = useRef<string | null>(null);
  const notifiedCallsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const subscriptionId = realtimeManager.subscribeToEntity(
      'calls',
      { outcome: 'follow-up' },
      (followUpCalls: Call[]) => {
        const now = new Date();
        
        // Find calls that need follow-up and haven't been notified
        const callsNeedingFollowUp = followUpCalls.filter(call => {
          if (!call.nextActionAt || notifiedCallsRef.current.has(call.id)) {
            return false;
          }
          
          const followUpDate = new Date(call.nextActionAt);
          return followUpDate <= now;
        });

        // Notify about calls needing follow-up
        callsNeedingFollowUp.forEach(call => {
          notifiedCallsRef.current.add(call.id);
          
          addToast({
            type: 'warning',
            title: 'Follow-up Required',
            message: `Call from ${call.phone} needs follow-up`,
            duration: 8000,
          });
        });

        // Update the follow-up calls cache
        queryClient.setQueryData(
          [...queryKeys.calls.all, 'follow-up'],
          callsNeedingFollowUp
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

// Hook for real-time call statistics
export function useRealtimeCallStats() {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<string | null>(null);

  useEffect(() => {
    const subscriptionId = realtimeManager.subscribeToEntity(
      'calls',
      {},
      (calls: Call[]) => {
        const outcomeCounts = calls.reduce((acc, call) => {
          acc[call.outcome] = (acc[call.outcome] || 0) + 1;
          return acc;
        }, {} as Record<CallOutcome, number>);
        
        // Calculate calls from today
        const today = new Date().toDateString();
        const todaysCalls = calls.filter(call => 
          new Date(call.createdAt).toDateString() === today
        );
        
        const stats = {
          total: calls.length,
          today: todaysCalls.length,
          byOutcome: outcomeCounts,
          withCustomer: calls.filter(call => call.customerId).length,
          withoutCustomer: calls.filter(call => !call.customerId).length,
          needingFollowUp: calls.filter(call => 
            call.outcome === 'follow-up' && call.nextActionAt &&
            new Date(call.nextActionAt) <= new Date()
          ).length,
          converted: calls.filter(call => call.outcome === 'scheduled').length,
          conversionRate: calls.length > 0 
            ? (calls.filter(call => call.outcome === 'scheduled').length / calls.length) * 100 
            : 0,
        };

        // Update stats cache
        queryClient.setQueryData(
          [...queryKeys.calls.all, 'stats'],
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

// Hook for real-time calls by customer
export function useRealtimeCallsByCustomer(customerId: string, enabled: boolean = true) {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !customerId) return;

    const subscriptionId = realtimeManager.subscribeToEntity(
      'calls',
      { customerId },
      (calls: Call[]) => {
        // Update customer-specific calls query
        queryClient.setQueryData(
          queryKeys.calls.byCustomer(customerId),
          {
            success: true,
            data: calls,
            count: calls.length,
          }
        );

        // Also invalidate customer details to update call history
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

// Hook for real-time call outcome tracking
export function useRealtimeCallsByOutcome(outcome: CallOutcome) {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<string | null>(null);

  useEffect(() => {
    const subscriptionId = realtimeManager.subscribeToEntity(
      'calls',
      { outcome },
      (calls: Call[]) => {
        // Update outcome-specific query
        queryClient.setQueryData(
          queryKeys.calls.byOutcome(outcome),
          {
            success: true,
            data: calls,
            count: calls.length,
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
  }, [outcome, queryClient]);

  return {
    isSubscribed: !!subscriptionRef.current,
  };
}

// Hook for real-time call volume monitoring (for dashboard)
export function useRealtimeCallVolume() {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<string | null>(null);

  useEffect(() => {
    const subscriptionId = realtimeManager.subscribeToEntity(
      'calls',
      {},
      (calls: Call[]) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisWeek = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const volume = {
          today: calls.filter(call => new Date(call.createdAt) >= today).length,
          thisWeek: calls.filter(call => new Date(call.createdAt) >= thisWeek).length,
          thisMonth: calls.filter(call => new Date(call.createdAt) >= thisMonth).length,
          hourly: Array.from({ length: 24 }, (_, hour) => {
            const hourStart = new Date(today.getTime() + (hour * 60 * 60 * 1000));
            const hourEnd = new Date(hourStart.getTime() + (60 * 60 * 1000));
            return calls.filter(call => {
              const callDate = new Date(call.createdAt);
              return callDate >= hourStart && callDate < hourEnd;
            }).length;
          }),
        };

        // Update call volume cache
        queryClient.setQueryData(
          [...queryKeys.calls.all, 'volume'],
          volume
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
