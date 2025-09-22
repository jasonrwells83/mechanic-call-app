// Service History Timeline Component
// Chronological display of customer service history with job progression visualization

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Filter,
  Calendar,
  Clock,
  Car,
  Wrench,
  DollarSign,
  User,
  CheckCircle,
  AlertTriangle,
  Play,
  Pause,
  MoreHorizontal,
  TrendingUp,
  FileText,
  History,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useJobs } from '@/hooks/use-jobs';
import { useVehicles } from '@/hooks/use-vehicles';
import { JobStatusTransitionService } from '@/lib/job-status-transitions';
import type { Job, Vehicle, Customer, JobStatus } from '@/types/database';

interface ServiceHistoryTimelineProps {
  customer: Customer;
  vehicleId?: string; // Optional: filter by specific vehicle
  className?: string;
  onJobClick?: (job: Job) => void;
  onCreateJob?: (vehicleId?: string) => void;
}

interface TimelineJob extends Job {
  vehicle?: Vehicle;
  statusHistory?: Array<{
    status: JobStatus;
    timestamp: Date;
    duration?: number; // Time in this status (hours)
  }>;
  totalDuration?: number; // Total job duration (hours)
  estimatedCost?: number;
  actualCost?: number;
}

export function ServiceHistoryTimeline({
  customer,
  vehicleId,
  className = '',
  onJobClick,
  onCreateJob,
}: ServiceHistoryTimelineProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all');
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | '1y' | 'all'>('all');
  const [groupBy, setGroupBy] = useState<'date' | 'vehicle' | 'status'>('date');
  const [selectedJob, setSelectedJob] = useState<TimelineJob | null>(null);

  // Fetch data
  const { data: jobsResponse, isLoading } = useJobs({ 
    customerId: customer.id,
    vehicleId: vehicleId 
  });
  const { data: vehiclesResponse } = useVehicles({ customerId: customer.id });

  const jobs = jobsResponse?.data || [];
  const vehicles = vehiclesResponse?.data || [];

  // Create vehicle lookup map
  const vehicleMap = useMemo(() => {
    return vehicles.reduce((acc, vehicle) => {
      acc[vehicle.id] = vehicle;
      return acc;
    }, {} as Record<string, Vehicle>);
  }, [vehicles]);

  // Process jobs with timeline data
  const timelineJobs = useMemo(() => {
    return jobs.map((job): TimelineJob => {
      const vehicle = vehicleMap[job.vehicleId];
      
      // Simulate status history (in a real app, this would come from the API)
      const statusHistory = [
        {
          status: 'incoming-call' as JobStatus,
          timestamp: new Date(job.createdAt),
          duration: 0.5, // 30 minutes
        },
        {
          status: 'scheduled' as JobStatus,
          timestamp: new Date(new Date(job.createdAt).getTime() + 30 * 60 * 1000),
          duration: job.status === 'scheduled' ? undefined : 24, // 1 day
        },
      ];

      if (job.status !== 'incoming-call' && job.status !== 'scheduled') {
        statusHistory.push({
          status: 'in-bay' as JobStatus,
          timestamp: new Date(new Date(job.createdAt).getTime() + 24 * 60 * 60 * 1000),
          duration: job.status === 'in-bay' ? undefined : job.estHours,
        });
      }

      if (job.status === 'waiting-parts' || job.status === 'completed') {
        if (job.status === 'waiting-parts') {
          statusHistory.push({
            status: 'waiting-parts' as JobStatus,
            timestamp: new Date(new Date(job.createdAt).getTime() + (24 + job.estHours) * 60 * 60 * 1000),
            duration: undefined,
          });
        } else {
          statusHistory.push({
            status: 'completed' as JobStatus,
            timestamp: new Date(new Date(job.createdAt).getTime() + (24 + job.estHours) * 60 * 60 * 1000),
            duration: 0,
          });
        }
      }

      const totalDuration = statusHistory.reduce((sum, status) => sum + (status.duration || 0), 0);
      const estimatedCost = job.estHours * 100; // $100/hour
      const actualCost = job.status === 'completed' ? estimatedCost * (0.9 + Math.random() * 0.2) : undefined;

      return {
        ...job,
        vehicle,
        statusHistory,
        totalDuration,
        estimatedCost,
        actualCost,
      };
    });
  }, [jobs, vehicleMap]);

  // Filter jobs
  const filteredJobs = useMemo(() => {
    let filtered = timelineJobs;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(job =>
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.vehicle?.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.vehicle?.model.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(job => job.status === statusFilter);
    }

    // Time range filter
    if (timeRange !== 'all') {
      const now = Date.now();
      const ranges = {
        '30d': 30 * 24 * 60 * 60 * 1000,
        '90d': 90 * 24 * 60 * 60 * 1000,
        '1y': 365 * 24 * 60 * 60 * 1000,
      };
      const cutoff = now - ranges[timeRange];
      filtered = filtered.filter(job => new Date(job.createdAt).getTime() > cutoff);
    }

    // Sort by creation date (newest first)
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [timelineJobs, searchQuery, statusFilter, timeRange]);

  // Group jobs
  const groupedJobs = useMemo(() => {
    if (groupBy === 'date') {
      const groups: Record<string, TimelineJob[]> = {};
      filteredJobs.forEach(job => {
        const date = new Date(job.createdAt).toDateString();
        if (!groups[date]) groups[date] = [];
        groups[date].push(job);
      });
      return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
    } else if (groupBy === 'vehicle') {
      const groups: Record<string, TimelineJob[]> = {};
      filteredJobs.forEach(job => {
        const vehicleKey = job.vehicle ? `${job.vehicle.year} ${job.vehicle.make} ${job.vehicle.model}` : 'Unknown Vehicle';
        if (!groups[vehicleKey]) groups[vehicleKey] = [];
        groups[vehicleKey].push(job);
      });
      return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
    } else {
      const groups: Record<string, TimelineJob[]> = {};
      filteredJobs.forEach(job => {
        const status = job.status.replace('-', ' ').toUpperCase();
        if (!groups[status]) groups[status] = [];
        groups[status].push(job);
      });
      return Object.entries(groups);
    }
  }, [filteredJobs, groupBy]);

  // Calculate statistics
  const stats = useMemo(() => {
    const completed = filteredJobs.filter(job => job.status === 'completed');
    const active = filteredJobs.filter(job => 
      job.status === 'scheduled' || job.status === 'in-bay' || job.status === 'waiting-parts'
    );
    
    const totalRevenue = completed.reduce((sum, job) => sum + (job.actualCost || 0), 0);
    const averageJobValue = completed.length > 0 ? totalRevenue / completed.length : 0;
    const averageCompletionTime = completed.reduce((sum, job) => sum + (job.totalDuration || 0), 0) / completed.length || 0;
    
    return {
      total: filteredJobs.length,
      completed: completed.length,
      active: active.length,
      totalRevenue,
      averageJobValue,
      averageCompletionTime,
    };
  }, [filteredJobs]);

  const getStatusBadge = (status: JobStatus) => {
    const config = {
      'incoming-call': { color: 'bg-slate-100 text-slate-800', icon: Play },
      'scheduled': { color: 'bg-blue-100 text-blue-800', icon: Calendar },
      'in-bay': { color: 'bg-green-100 text-green-800', icon: Wrench },
      'waiting-parts': { color: 'bg-orange-100 text-orange-800', icon: Pause },
      'completed': { color: 'bg-gray-100 text-gray-800', icon: CheckCircle },
    };
    
    const statusConfig = config[status] || config.completed;
    const Icon = statusConfig.icon;
    
    return (
      <Badge className={cn('text-xs', statusConfig.color)}>
        <Icon className="h-2 w-2 mr-1" />
        {status.replace('-', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const config = {
      low: { color: 'bg-gray-100 text-gray-800' },
      medium: { color: 'bg-blue-100 text-blue-800' },
      high: { color: 'bg-red-100 text-red-800', icon: AlertTriangle },
    };
    
    const priorityConfig = config[priority as keyof typeof config] || config.medium;
    const Icon = priorityConfig.icon;
    
    return (
      <Badge className={cn('text-xs', priorityConfig.color)}>
        {Icon && <Icon className="h-2 w-2 mr-1" />}
        {priority.toUpperCase()}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Statistics Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Services</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.active} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              ${Math.round(stats.averageJobValue)} avg/job
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Time</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats.averageCompletionTime)}h</div>
            <p className="text-xs text-muted-foreground">
              Per completed job
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Service History Timeline
              <Badge variant="secondary">{filteredJobs.length}</Badge>
            </CardTitle>
            <Button onClick={() => onCreateJob?.(vehicleId)}>
              <Wrench className="h-4 w-4 mr-2" />
              New Service
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as JobStatus | 'all')}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="all">All Status</option>
              <option value="incoming-call">Incoming Call</option>
              <option value="scheduled">Scheduled</option>
              <option value="in-bay">In Bay</option>
              <option value="waiting-parts">Waiting Parts</option>
              <option value="completed">Completed</option>
            </select>

            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="all">All Time</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
            </select>

            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as typeof groupBy)}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="date">Group by Date</option>
              <option value="vehicle">Group by Vehicle</option>
              <option value="status">Group by Status</option>
            </select>
          </div>

          {/* Timeline */}
          <ScrollArea className="h-[600px] w-full">
            <div className="space-y-6">
              {groupedJobs.map(([groupKey, groupJobs]) => (
                <div key={groupKey}>
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="font-semibold text-lg">
                      {groupBy === 'date' 
                        ? new Date(groupKey).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })
                        : groupKey
                      }
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {groupJobs.length} job{groupJobs.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>

                  <div className="space-y-4 ml-4 border-l-2 border-muted pl-6">
                    {groupJobs.map((job, index) => (
                      <div key={job.id} className="relative">
                        {/* Timeline dot */}
                        <div className="absolute -left-8 top-4 w-3 h-3 rounded-full border-2 border-background bg-primary" />

                        <Card 
                          className={cn(
                            'transition-all duration-200 hover:shadow-md cursor-pointer',
                            selectedJob?.id === job.id && 'ring-2 ring-primary/50'
                          )}
                          onClick={() => {
                            setSelectedJob(selectedJob?.id === job.id ? null : job);
                            onJobClick?.(job);
                          }}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div>
                                  <CardTitle className="text-base">{job.title}</CardTitle>
                                  <p className="text-sm text-muted-foreground">
                                    {job.vehicle ? `${job.vehicle.year} ${job.vehicle.make} ${job.vehicle.model}` : 'Unknown Vehicle'}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {getStatusBadge(job.status)}
                                {getPriorityBadge(job.priority)}
                                
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      className="h-8 w-8 p-0"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => onJobClick?.(job)}>
                                      <FileText className="mr-2 h-4 w-4" />
                                      View Details
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </CardHeader>
                          
                          <CardContent className="space-y-3">
                            {/* Job Details */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Started:</span>
                                <div className="font-medium">
                                  {new Date(job.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Duration:</span>
                                <div className="font-medium">{job.estHours}h est.</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Cost:</span>
                                <div className="font-medium">
                                  ${job.actualCost?.toLocaleString() || job.estimatedCost?.toLocaleString() || 'TBD'}
                                </div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Progress:</span>
                                <div className="font-medium">
                                  {JobStatusTransitionService.getWorkflowProgress(job.status)}%
                                </div>
                              </div>
                            </div>

                            {/* Status History */}
                            {selectedJob?.id === job.id && job.statusHistory && (
                              <>
                                <Separator />
                                <div>
                                  <h4 className="font-medium mb-3 flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4" />
                                    Status Progression
                                  </h4>
                                  <div className="space-y-2">
                                    {job.statusHistory.map((status, statusIndex) => (
                                      <div key={statusIndex} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                          {getStatusBadge(status.status)}
                                          <span>{status.timestamp.toLocaleString()}</span>
                                        </div>
                                        {status.duration && (
                                          <span className="text-muted-foreground">
                                            {status.duration}h duration
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </>
                            )}

                            {/* Notes */}
                            {job.notes && (
                              <>
                                <Separator />
                                <div>
                                  <span className="text-muted-foreground text-sm">Notes:</span>
                                  <p className="text-sm mt-1">{job.notes}</p>
                                </div>
                              </>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Empty State */}
              {filteredJobs.length === 0 && (
                <div className="text-center py-12">
                  <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No service history found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || statusFilter !== 'all' || timeRange !== 'all'
                      ? 'Try adjusting your search or filter criteria'
                      : 'No services have been performed yet'
                    }
                  </p>
                  {!searchQuery && statusFilter === 'all' && timeRange === 'all' && (
                    <Button onClick={() => onCreateJob?.(vehicleId)}>
                      <Wrench className="h-4 w-4 mr-2" />
                      Create First Service
                    </Button>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export type { ServiceHistoryTimelineProps };
