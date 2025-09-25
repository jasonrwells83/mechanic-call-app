// Communication Analytics Component
// Analytics and insights for customer communications

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
} from 'recharts';
import {
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  Bell,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  Activity,
  Users,
  Target,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CommunicationItem } from './CustomerCommunicationTimeline';

interface CommunicationAnalyticsProps {
  communications: CommunicationItem[];
  timeRange?: 'week' | 'month' | 'quarter' | 'year';
  className?: string;
}

const communicationColors = {
  call: '#3b82f6',
  email: '#10b981',
  sms: '#8b5cf6',
  appointment: '#f59e0b',
  reminder: '#eab308',
  note: '#6b7280',
  quote: '#6366f1',
  invoice: '#ef4444',
};

const statusColors = {
  sent: '#3b82f6',
  delivered: '#10b981',
  read: '#059669',
  failed: '#ef4444',
  pending: '#eab308',
  completed: '#10b981',
  cancelled: '#6b7280',
};

export function CommunicationAnalytics({
  communications,
  timeRange = 'month',
  className = '',
}: CommunicationAnalyticsProps) {
  // Calculate analytics
  const analytics = useMemo(() => {
    const now = new Date();
    const cutoffDate = new Date();
    
    switch (timeRange) {
      case 'week':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    const filteredCommunications = communications.filter(
      comm => comm.timestamp >= cutoffDate
    );

    // Basic counts
    const totalCommunications = filteredCommunications.length;
    const inboundCount = filteredCommunications.filter(c => c.direction === 'inbound').length;
    const outboundCount = filteredCommunications.filter(c => c.direction === 'outbound').length;
    const systemCount = filteredCommunications.filter(c => c.direction === 'system').length;

    // Type breakdown
    const typeBreakdown = Object.entries(
      filteredCommunications.reduce((acc, comm) => {
        acc[comm.type] = (acc[comm.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([type, count]) => ({
      type,
      count,
      percentage: totalCommunications > 0 ? (count / totalCommunications) * 100 : 0,
    }));

    // Status breakdown
    const statusBreakdown = Object.entries(
      filteredCommunications.reduce((acc, comm) => {
        acc[comm.status] = (acc[comm.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([status, count]) => ({
      status,
      count,
      percentage: totalCommunications > 0 ? (count / totalCommunications) * 100 : 0,
    }));

    // Response rates
    const emailCommunications = filteredCommunications.filter(c => c.type === 'email');
    const readEmails = emailCommunications.filter(c => c.status === 'read').length;
    const emailReadRate = emailCommunications.length > 0 ? (readEmails / emailCommunications.length) * 100 : 0;

    const callCommunications = filteredCommunications.filter(c => c.type === 'call');
    const completedCalls = callCommunications.filter(c => c.status === 'completed').length;
    const callSuccessRate = callCommunications.length > 0 ? (completedCalls / callCommunications.length) * 100 : 0;

    // Average response time (mock data)
    const avgResponseTime = 2.5; // hours

    // Daily activity for chart
    const dailyActivity = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayComms = filteredCommunications.filter(
        c => c.timestamp >= dayStart && c.timestamp <= dayEnd
      );

      dailyActivity.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        total: dayComms.length,
        calls: dayComms.filter(c => c.type === 'call').length,
        emails: dayComms.filter(c => c.type === 'email').length,
        sms: dayComms.filter(c => c.type === 'sms').length,
      });
    }

    // Priority distribution
    const priorityBreakdown = Object.entries(
      filteredCommunications.reduce((acc, comm) => {
        acc[comm.priority] = (acc[comm.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([priority, count]) => ({
      priority,
      count,
      percentage: totalCommunications > 0 ? (count / totalCommunications) * 100 : 0,
    }));

    // Peak hours
    const hourlyBreakdown = Array.from({ length: 24 }, (_, hour) => {
      const count = filteredCommunications.filter(
        c => c.timestamp.getHours() === hour
      ).length;
      return {
        hour,
        count,
        label: `${hour}:00`,
      };
    });

    const peakHour = hourlyBreakdown.length > 0 
      ? hourlyBreakdown.reduce((max, current) => 
          current.count > max.count ? current : max
        )
      : { hour: 0, count: 0, label: '0:00' };

    return {
      totalCommunications,
      inboundCount,
      outboundCount,
      systemCount,
      typeBreakdown,
      statusBreakdown,
      emailReadRate,
      callSuccessRate,
      avgResponseTime,
      dailyActivity,
      priorityBreakdown,
      peakHour,
      hourlyBreakdown,
    };
  }, [communications, timeRange]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Communications</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalCommunications}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-600" />
                <span className="text-green-600">+12%</span>
              </div>
              <span>from last {timeRange}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.emailReadRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Email open rate
            </p>
            <Progress value={analytics.emailReadRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Call Success</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.callSuccessRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Completed calls
            </p>
            <Progress value={analytics.callSuccessRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.avgResponseTime}h</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <div className="flex items-center gap-1">
                <TrendingDown className="h-3 w-3 text-green-600" />
                <span className="text-green-600">-0.5h</span>
              </div>
              <span>improvement</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.dailyActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="calls" fill={communicationColors.call} name="Calls" />
                <Bar dataKey="emails" fill={communicationColors.email} name="Emails" />
                <Bar dataKey="sms" fill={communicationColors.sms} name="SMS" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Communication Types Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Communication Types</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.typeBreakdown}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="count"
                  nameKey="type"
                  label={({ type, percentage }) => `${type} (${percentage.toFixed(1)}%)`}
                >
                  {analytics.typeBreakdown.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={communicationColors[entry.type as keyof typeof communicationColors]} 
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Communication Direction */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Communication Direction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                <span className="text-sm">Inbound</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{analytics.inboundCount}</div>
                <div className="text-xs text-muted-foreground">
                  {analytics.totalCommunications > 0 ? ((analytics.inboundCount / analytics.totalCommunications) * 100).toFixed(1) : '0'}%
                </div>
              </div>
            </div>
            <Progress value={analytics.totalCommunications > 0 ? (analytics.inboundCount / analytics.totalCommunications) * 100 : 0} />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-sm">Outbound</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{analytics.outboundCount}</div>
                <div className="text-xs text-muted-foreground">
                  {analytics.totalCommunications > 0 ? ((analytics.outboundCount / analytics.totalCommunications) * 100).toFixed(1) : '0'}%
                </div>
              </div>
            </div>
            <Progress value={analytics.totalCommunications > 0 ? (analytics.outboundCount / analytics.totalCommunications) * 100 : 0} />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-500 rounded-full" />
                <span className="text-sm">System</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{analytics.systemCount}</div>
                <div className="text-xs text-muted-foreground">
                  {analytics.totalCommunications > 0 ? ((analytics.systemCount / analytics.totalCommunications) * 100).toFixed(1) : '0'}%
                </div>
              </div>
            </div>
            <Progress value={analytics.totalCommunications > 0 ? (analytics.systemCount / analytics.totalCommunications) * 100 : 0} />
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.statusBreakdown.map((status) => (
              <div key={status.status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: statusColors[status.status as keyof typeof statusColors] }}
                  />
                  <span className="text-sm capitalize">{status.status}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{status.count}</div>
                  <div className="text-xs text-muted-foreground">
                    {status.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Priority Levels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.priorityBreakdown.map((priority) => (
              <div key={priority.priority} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={cn(
                      'text-xs',
                      priority.priority === 'urgent' && 'border-red-200 text-red-700',
                      priority.priority === 'high' && 'border-orange-200 text-orange-700',
                      priority.priority === 'normal' && 'border-blue-200 text-blue-700',
                      priority.priority === 'low' && 'border-gray-200 text-gray-700'
                    )}
                  >
                    {priority.priority}
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{priority.count}</div>
                  <div className="text-xs text-muted-foreground">
                    {priority.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Peak Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Peak Activity Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Clock className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold">{analytics.peakHour.label}</div>
              <p className="text-sm text-muted-foreground">Peak Communication Hour</p>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics.peakHour.count} communications
              </p>
            </div>
            
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Zap className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold">
                {analytics.typeBreakdown.length > 0 
                  ? analytics.typeBreakdown.reduce((max, current) => 
                      current.count > max.count ? current : max
                    ).type
                  : 'N/A'
                }
              </div>
              <p className="text-sm text-muted-foreground">Most Used Channel</p>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics.typeBreakdown.length > 0 
                  ? analytics.typeBreakdown.reduce((max, current) => 
                      current.count > max.count ? current : max
                    ).percentage.toFixed(1)
                  : '0'
                }% of all communications
              </p>
            </div>
            
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <div className="text-2xl font-bold">
                {analytics.statusBreakdown.filter(s => 
                  s.status === 'completed' || s.status === 'delivered' || s.status === 'read'
                ).reduce((sum, s) => sum + s.count, 0)}
              </div>
              <p className="text-sm text-muted-foreground">Successful Communications</p>
              <p className="text-xs text-muted-foreground mt-1">
                {(analytics.statusBreakdown.filter(s => 
                  s.status === 'completed' || s.status === 'delivered' || s.status === 'read'
                ).reduce((sum, s) => sum + s.percentage, 0)).toFixed(1)}% success rate
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export type { CommunicationAnalyticsProps };
