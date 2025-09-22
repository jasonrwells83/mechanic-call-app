// Call Outcome Analytics Component
// Advanced analytics and reporting for call outcomes and performance

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Phone,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  DollarSign,
  Users,
  Target,
  Zap,
  AlertTriangle,
  Star,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import type { Call } from './CallList';

interface CallOutcomeAnalyticsProps {
  calls: Call[];
  timeRange?: 'week' | 'month' | 'quarter' | 'year';
  className?: string;
}

const outcomeColors = {
  scheduled: '#10b981',
  'quote-sent': '#3b82f6',
  'follow-up': '#f59e0b',
  'no-action': '#6b7280',
  transferred: '#8b5cf6',
  incomplete: '#ef4444',
};

const priorityColors = {
  urgent: '#ef4444',
  high: '#f59e0b',
  normal: '#3b82f6',
  low: '#6b7280',
};

const statusColors = {
  completed: '#10b981',
  missed: '#ef4444',
  active: '#3b82f6',
  cancelled: '#6b7280',
};

export function CallOutcomeAnalytics({
  calls,
  timeRange = 'month',
  className = '',
}: CallOutcomeAnalyticsProps) {
  // Calculate time range
  const timeRangeData = useMemo(() => {
    const now = new Date();
    let days: number;
    
    switch (timeRange) {
      case 'week':
        days = 7;
        break;
      case 'month':
        days = 30;
        break;
      case 'quarter':
        days = 90;
        break;
      case 'year':
        days = 365;
        break;
      default:
        days = 30;
    }
    
    const startDate = startOfDay(subDays(now, days));
    const endDate = endOfDay(now);
    
    return {
      startDate,
      endDate,
      days,
      label: timeRange.charAt(0).toUpperCase() + timeRange.slice(1),
    };
  }, [timeRange]);

  // Filter calls by time range
  const filteredCalls = useMemo(() => {
    return calls.filter(call =>
      isWithinInterval(call.createdAt, {
        start: timeRangeData.startDate,
        end: timeRangeData.endDate,
      })
    );
  }, [calls, timeRangeData]);

  // Calculate comprehensive analytics
  const analytics = useMemo(() => {
    const total = filteredCalls.length;
    if (total === 0) {
      return {
        total: 0,
        outcomes: {},
        statuses: {},
        priorities: {},
        conversionRate: 0,
        avgDuration: 0,
        followUpRate: 0,
        completionRate: 0,
        revenueImpact: 0,
        dailyTrends: [],
        outcomeDistribution: [],
        priorityDistribution: [],
        statusDistribution: [],
        performanceMetrics: {},
        topConcerns: [],
        conversionFunnel: [],
      };
    }

    // Outcome analysis
    const outcomes = filteredCalls.reduce((acc, call) => {
      acc[call.callOutcome] = (acc[call.callOutcome] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Status analysis
    const statuses = filteredCalls.reduce((acc, call) => {
      acc[call.status] = (acc[call.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Priority analysis
    const priorities = filteredCalls.reduce((acc, call) => {
      acc[call.servicePriority] = (acc[call.servicePriority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Conversion metrics
    const scheduledCalls = filteredCalls.filter(c => c.callOutcome === 'scheduled').length;
    const quoteSentCalls = filteredCalls.filter(c => c.callOutcome === 'quote-sent').length;
    const conversionRate = ((scheduledCalls + quoteSentCalls) / total) * 100;

    // Duration analysis
    const callsWithDuration = filteredCalls.filter(c => c.callDuration && c.callDuration > 0);
    const avgDuration = callsWithDuration.length > 0
      ? callsWithDuration.reduce((sum, c) => sum + (c.callDuration || 0), 0) / callsWithDuration.length
      : 0;

    // Follow-up rate
    const followUpCalls = filteredCalls.filter(c => c.followUpRequired).length;
    const followUpRate = (followUpCalls / total) * 100;

    // Completion rate
    const completedCalls = filteredCalls.filter(c => c.status === 'completed').length;
    const completionRate = (completedCalls / total) * 100;

    // Revenue impact (estimated)
    const revenueImpact = filteredCalls.reduce((sum, call) => {
      if (call.callOutcome === 'scheduled' && call.estimatedCost) {
        return sum + call.estimatedCost;
      }
      return sum;
    }, 0);

    // Daily trends
    const dailyTrends = [];
    for (let i = timeRangeData.days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      const dayCalls = filteredCalls.filter(call =>
        isWithinInterval(call.createdAt, { start: dayStart, end: dayEnd })
      );
      
      dailyTrends.push({
        date: format(date, 'MMM d'),
        fullDate: date,
        total: dayCalls.length,
        completed: dayCalls.filter(c => c.status === 'completed').length,
        scheduled: dayCalls.filter(c => c.callOutcome === 'scheduled').length,
        missed: dayCalls.filter(c => c.status === 'missed').length,
        followUps: dayCalls.filter(c => c.followUpRequired).length,
      });
    }

    // Distribution data for charts
    const outcomeDistribution = Object.entries(outcomes).map(([outcome, count]) => ({
      outcome,
      count,
      percentage: (count / total) * 100,
      color: outcomeColors[outcome as keyof typeof outcomeColors] || '#6b7280',
    }));

    const priorityDistribution = Object.entries(priorities).map(([priority, count]) => ({
      priority,
      count,
      percentage: (count / total) * 100,
      color: priorityColors[priority as keyof typeof priorityColors] || '#6b7280',
    }));

    const statusDistribution = Object.entries(statuses).map(([status, count]) => ({
      status,
      count,
      percentage: (count / total) * 100,
      color: statusColors[status as keyof typeof statusColors] || '#6b7280',
    }));

    // Performance metrics by staff
    const performanceMetrics = filteredCalls.reduce((acc, call) => {
      const staff = call.callTakenBy;
      if (!acc[staff]) {
        acc[staff] = {
          totalCalls: 0,
          completedCalls: 0,
          scheduledCalls: 0,
          avgDuration: 0,
          totalDuration: 0,
          callsWithDuration: 0,
        };
      }
      
      acc[staff].totalCalls++;
      if (call.status === 'completed') acc[staff].completedCalls++;
      if (call.callOutcome === 'scheduled') acc[staff].scheduledCalls++;
      if (call.callDuration) {
        acc[staff].totalDuration += call.callDuration;
        acc[staff].callsWithDuration++;
      }
      
      return acc;
    }, {} as Record<string, any>);

    // Calculate average duration for each staff member
    Object.keys(performanceMetrics).forEach(staff => {
      const metrics = performanceMetrics[staff];
      metrics.avgDuration = metrics.callsWithDuration > 0
        ? metrics.totalDuration / metrics.callsWithDuration
        : 0;
      metrics.completionRate = (metrics.completedCalls / metrics.totalCalls) * 100;
      metrics.conversionRate = (metrics.scheduledCalls / metrics.totalCalls) * 100;
    });

    // Top customer concerns
    const concernCounts = filteredCalls.reduce((acc, call) => {
      call.customerConcerns.forEach(concern => {
        acc[concern] = (acc[concern] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const topConcerns = Object.entries(concernCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([concern, count]) => ({
        concern,
        count,
        percentage: (count / total) * 100,
      }));

    // Conversion funnel
    const conversionFunnel = [
      { stage: 'Total Calls', count: total, percentage: 100 },
      { stage: 'Completed Calls', count: completedCalls, percentage: completionRate },
      { stage: 'Quotes Sent', count: quoteSentCalls, percentage: (quoteSentCalls / total) * 100 },
      { stage: 'Appointments Scheduled', count: scheduledCalls, percentage: (scheduledCalls / total) * 100 },
    ];

    return {
      total,
      outcomes,
      statuses,
      priorities,
      conversionRate,
      avgDuration,
      followUpRate,
      completionRate,
      revenueImpact,
      dailyTrends,
      outcomeDistribution,
      priorityDistribution,
      statusDistribution,
      performanceMetrics,
      topConcerns,
      conversionFunnel,
    };
  }, [filteredCalls, timeRangeData]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total}</div>
            <p className="text-xs text-muted-foreground">
              Past {timeRangeData.label.toLowerCase()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.conversionRate.toFixed(1)}%</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-green-600">+2.1%</span>
              <span>from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(analytics.avgDuration)}</div>
            <p className="text-xs text-muted-foreground">
              Per call average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Impact</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.revenueImpact)}</div>
            <p className="text-xs text-muted-foreground">
              From scheduled appointments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Daily Call Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.dailyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="total"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.3}
                  name="Total Calls"
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stackId="2"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.6}
                  name="Completed"
                />
                <Area
                  type="monotone"
                  dataKey="scheduled"
                  stackId="3"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.6}
                  name="Scheduled"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Outcome Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" />
              Call Outcomes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.outcomeDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="count"
                  nameKey="outcome"
                  label={({ outcome, percentage }) => 
                    `${outcome.replace('-', ' ')} (${percentage.toFixed(1)}%)`
                  }
                >
                  {analytics.outcomeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Staff Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Staff Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(analytics.performanceMetrics).map(([staff, metrics]: [string, any]) => (
                <div key={staff} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{staff}</span>
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">{metrics.totalCalls} calls</Badge>
                      <Badge variant="secondary">
                        {metrics.conversionRate.toFixed(1)}% conversion
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Completion:</span>
                      <div className="font-medium">{metrics.completionRate.toFixed(1)}%</div>
                      <Progress value={metrics.completionRate} className="h-1 mt-1" />
                    </div>
                    
                    <div>
                      <span className="text-muted-foreground">Avg Duration:</span>
                      <div className="font-medium">{formatDuration(metrics.avgDuration)}</div>
                    </div>
                    
                    <div>
                      <span className="text-muted-foreground">Scheduled:</span>
                      <div className="font-medium">{metrics.scheduledCalls}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Conversion Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.conversionFunnel.map((stage, index) => (
                <div key={stage.stage} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{stage.stage}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{stage.count}</span>
                      <span className="text-sm text-muted-foreground">
                        ({stage.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <Progress value={stage.percentage} className="h-2" />
                  {index < analytics.conversionFunnel.length - 1 && (
                    <div className="text-center">
                      <div className="inline-block w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Concerns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Top Customer Concerns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analytics.topConcerns.map((concern, index) => (
              <div key={concern.concern} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    #{index + 1}
                  </Badge>
                  <span className="font-medium">{concern.concern}</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">{concern.count}</div>
                  <div className="text-xs text-muted-foreground">
                    {concern.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Key Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Key Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800">High Performance</span>
              </div>
              <p className="text-sm text-green-700">
                Conversion rate is {analytics.conversionRate > 60 ? 'excellent' : analytics.conversionRate > 40 ? 'good' : 'needs improvement'} at {analytics.conversionRate.toFixed(1)}%
              </p>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-800">Call Efficiency</span>
              </div>
              <p className="text-sm text-blue-700">
                Average call duration of {formatDuration(analytics.avgDuration)} is {analytics.avgDuration > 300 ? 'above' : 'within'} optimal range
              </p>
            </div>

            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-purple-600" />
                <span className="font-medium text-purple-800">Follow-up Rate</span>
              </div>
              <p className="text-sm text-purple-700">
                {analytics.followUpRate.toFixed(1)}% of calls require follow-up action
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export type { CallOutcomeAnalyticsProps };
