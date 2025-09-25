// Customer Detail View Component
// Comprehensive customer information display with service history and vehicles

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  Car,
  Wrench,
  DollarSign,
  Clock,
  TrendingUp,
  Star,
  Edit,
  Plus,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  User,
  FileText,
  History,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCustomer } from '@/hooks/use-customers';
import { useJobs } from '@/hooks/use-jobs';
import { useVehicles } from '@/hooks/use-vehicles';
import { VehicleManagement } from '@/components/vehicles/VehicleManagement';
import { ServiceHistoryTimeline } from '@/components/timeline/ServiceHistoryTimeline';
import { CustomerCommunicationTimeline } from '@/components/communication/CustomerCommunicationTimeline';
import { CommunicationAnalytics } from '@/components/communication/CommunicationAnalytics';
import { QuickCommunicationActions } from '@/components/communication/QuickCommunicationActions';
import { JobStatusTransitionService } from '@/lib/job-status-transitions';
import type { Customer, Job, Vehicle } from '@/types/database';

interface CustomerDetailViewProps {
  customerId: string;
  onBack?: () => void;
  onEdit?: (customer: Customer) => void;
  onAddVehicle?: (customerId: string) => void;
  onCreateJob?: (customerId: string, vehicleId?: string) => void;
  className?: string;
}

export function CustomerDetailView({
  customerId,
  onBack,
  onEdit,
  onAddVehicle,
  onCreateJob,
  className = '',
}: CustomerDetailViewProps) {
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch customer data
  const { data: customerResponse } = useCustomer(customerId);
  const { data: jobsResponse } = useJobs({ customerId });
  const { data: vehiclesResponse } = useVehicles({ customerId });

  const customer = customerResponse?.data;
  const jobs = jobsResponse?.data || [];
  const vehicles = vehiclesResponse?.data || [];

  // Calculate customer statistics
  const customerStats = useMemo(() => {
    if (!customer) return null;

    const totalJobs = jobs.length;
    const completedJobs = jobs.filter(job => job.status === 'completed').length;
    const activeJobs = jobs.filter(job => 
      job.status === 'scheduled' || job.status === 'in-bay' || job.status === 'waiting-parts'
    ).length;

    const totalRevenue = jobs
      .filter(job => job.status === 'completed')
      .reduce((sum, job) => sum + (job.estHours * 100), 0); // Simplified calculation

    const averageJobValue = completedJobs > 0 ? totalRevenue / completedJobs : 0;

    const lastJobDate = jobs.length > 0 
      ? new Date(Math.max(...jobs.map(job => new Date(job.createdAt).getTime())))
      : null;

    const firstJobDate = jobs.length > 0 
      ? new Date(Math.min(...jobs.map(job => new Date(job.createdAt).getTime())))
      : null;

    const customerLifetime = firstJobDate 
      ? Math.floor((Date.now() - firstJobDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Calculate customer loyalty score
    const loyaltyScore = Math.min(100, Math.floor(
      (totalJobs * 10) + 
      (customerLifetime / 30 * 5) + 
      (totalRevenue / 100 * 2)
    ));

    return {
      totalJobs,
      completedJobs,
      activeJobs,
      totalRevenue,
      averageJobValue,
      lastJobDate,
      firstJobDate,
      customerLifetime,
      loyaltyScore,
      totalVehicles: vehicles.length,
    };
  }, [customer, jobs, vehicles]);

  // Group jobs by status for quick overview
  const jobsByStatus = useMemo(() => {
    return jobs.reduce((acc, job) => {
      if (!acc[job.status]) {
        acc[job.status] = [];
      }
      acc[job.status].push(job);
      return acc;
    }, {} as Record<string, Job[]>);
  }, [jobs]);

  // Recent jobs (last 10)
  const recentJobs = useMemo(() => {
    return [...jobs]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [jobs]);

  if (!customer) {
    return (
      <div className={cn('flex items-center justify-center h-64', className)}>
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const config = {
      'incoming-call': { color: 'bg-slate-100 text-slate-800', label: 'Incoming' },
      'scheduled': { color: 'bg-blue-100 text-blue-800', label: 'Scheduled' },
      'in-bay': { color: 'bg-green-100 text-green-800', label: 'In Progress' },
      'waiting-parts': { color: 'bg-orange-100 text-orange-800', label: 'Waiting Parts' },
      'completed': { color: 'bg-gray-100 text-gray-800', label: 'Completed' },
    };
    
    const statusConfig = config[status as keyof typeof config] || config.completed;
    return (
      <Badge className={cn('text-xs', statusConfig.color)}>
        {statusConfig.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const config = {
      low: { color: 'bg-gray-100 text-gray-800', icon: null },
      medium: { color: 'bg-blue-100 text-blue-800', icon: null },
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

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="text-lg">
                {customer.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{customer.name}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Customer since {new Date(customer.createdAt).toLocaleDateString()}
                </div>
                {customerStats?.loyaltyScore && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    {customerStats.loyaltyScore}% loyalty score
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => onAddVehicle?.(customer.id)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Vehicle
          </Button>
          <Button variant="outline" onClick={() => onCreateJob?.(customer.id)}>
            <Plus className="h-4 w-4 mr-2" />
            New Job
          </Button>
          <Button onClick={() => onEdit?.(customer)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Customer
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      {customerStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customerStats.totalJobs}</div>
              <p className="text-xs text-muted-foreground">
                {customerStats.completedJobs} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{customerStats.activeJobs}</div>
              <p className="text-xs text-muted-foreground">
                Currently in progress
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${customerStats.totalRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Lifetime value
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vehicles</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customerStats.totalVehicles}</div>
              <p className="text-xs text-muted-foreground">
                Registered vehicles
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="vehicles">Vehicles ({vehicles.length})</TabsTrigger>
          <TabsTrigger value="jobs">Service History ({jobs.length})</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{customer.phone}</div>
                    <div className="text-sm text-muted-foreground">Primary phone</div>
                  </div>
                </div>
                
                {customer.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{customer.email}</div>
                      <div className="text-sm text-muted-foreground">Email address</div>
                    </div>
                  </div>
                )}
                
                {customer.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <div className="font-medium">{customer.address}</div>
                      <div className="text-sm text-muted-foreground">Service address</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-3">
                    {recentJobs.slice(0, 5).map((job) => (
                      <div key={job.id} className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{job.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(job.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(job.status)}
                          {getPriorityBadge(job.priority)}
                        </div>
                      </div>
                    ))}
                    
                    {recentJobs.length === 0 && (
                      <div className="text-center text-muted-foreground py-4">
                        No recent activity
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Jobs by Status */}
          {Object.keys(jobsByStatus).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Jobs by Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {Object.entries(jobsByStatus).map(([status, statusJobs]) => {
                    const progress = JobStatusTransitionService.getWorkflowProgress(status as any);
                    
                    return (
                      <div key={status} className="text-center">
                        <div className="text-2xl font-bold">{statusJobs.length}</div>
                        <div className="text-sm text-muted-foreground mb-2">
                          {status.replace('-', ' ').toUpperCase()}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Vehicles Tab */}
        <TabsContent value="vehicles" className="space-y-4">
          <VehicleManagement
            customer={customer}
            onAddVehicle={() => onAddVehicle?.(customer.id)}
            onEditVehicle={(vehicle) => {
              // Handle vehicle editing - this could open a modal or navigate to edit form
              console.log('Edit vehicle:', vehicle);
            }}
            onCreateJob={(vehicleId) => onCreateJob?.(customer.id, vehicleId)}
          />
        </TabsContent>

        {/* Jobs Tab */}
        <TabsContent value="jobs" className="space-y-4">
          <ServiceHistoryTimeline
            customer={customer}
            onJobClick={(job) => {
              // Handle job click - could open job details modal
              console.log('Job clicked:', job);
            }}
            onCreateJob={(vehicleId) => onCreateJob?.(customer.id, vehicleId)}
          />
        </TabsContent>

        {/* Communication Tab */}
        <TabsContent value="communication">
          <Card>
            <CardContent className="text-center py-12">
              <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">Communication Timeline</h3>
              <p className="text-muted-foreground">
                Communication history will be implemented in Task 6.6
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Communication Tab */}
        <TabsContent value="communication" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions */}
            <div className="lg:col-span-1">
              <QuickCommunicationActions
                customer={customer}
                onCommunicationSend={(communication) => {
                  // Handle communication send
                  console.log('Communication sent:', communication);
                }}
              />
            </div>
            
            {/* Communication Timeline */}
            <div className="lg:col-span-2">
              <CustomerCommunicationTimeline
                customer={customer}
                onCommunicationAdd={(communication) => {
                  // Handle communication add
                  console.log('Communication added:', communication);
                }}
                onCommunicationUpdate={(id, updates) => {
                  // Handle communication update
                  console.log('Communication updated:', id, updates);
                }}
              />
            </div>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <CommunicationAnalytics
            communications={[]} // This would be fetched from API
            timeRange="month"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export type { CustomerDetailViewProps };
