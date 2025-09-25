// Dashboard Hooks
// Fetch aggregated dashboard metrics from the API

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import type { DashboardStats } from '@/types/database';

export function useDashboardStats(dateRange?: { start: string; end: string }) {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(dateRange),
    queryFn: () => dashboardApi.getStats(dateRange),
    staleTime: 1000 * 60 * 5,
  });
}

export type { DashboardStats };
