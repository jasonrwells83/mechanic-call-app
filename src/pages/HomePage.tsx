import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Plus,
  Car,
  Users
} from 'lucide-react';
import { JobForm } from '@/components/forms/JobForm';
import { useUIStore } from '@/stores';

export function HomePage() {
  const navigate = useNavigate();
  const { openModal, closeModal, activeModal } = useUIStore();
  // Mock data for today's KPIs
  const todayStats = {
    carsToday: 8,
    hoursBooked: 12,
    totalCapacity: 16,
    waitingOnParts: 3,
    completedToday: 4
  };

  const upcomingJobs = [
    { id: 1, time: '9:00 AM', customer: 'John Smith', vehicle: '2020 Honda Civic', service: 'Oil Change', bay: 'Bay 1', status: 'scheduled' },
    { id: 2, time: '10:30 AM', customer: 'Sarah Johnson', vehicle: '2018 Toyota Camry', service: 'Brake Inspection', bay: 'Bay 2', status: 'scheduled' },
    { id: 3, time: '1:00 PM', customer: 'Mike Wilson', vehicle: '2019 Ford F-150', service: 'Transmission Service', bay: 'Bay 1', status: 'in-bay' },
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'scheduled': { variant: 'secondary' as const, className: 'bg-status-scheduled border-status-scheduled-border' },
      'in-bay': { variant: 'default' as const, className: 'bg-status-in-bay' },
      'waiting-parts': { variant: 'outline' as const, className: 'bg-status-waiting-parts border-status-waiting-parts-border status-waiting-parts' },
      'completed': { variant: 'secondary' as const, className: 'bg-status-completed border-status-completed-border' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.scheduled;
    
    return (
      <Badge variant={config.variant} className={config.className}>
        {status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Today's Overview</h1>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
        <Button onClick={() => openModal('create-job')}>
          <Plus className="h-4 w-4 mr-2" />
          New Job
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cars Today</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayStats.carsToday}</div>
            <p className="text-xs text-muted-foreground">
              +2 from yesterday
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hours Booked</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {todayStats.hoursBooked}/{todayStats.totalCapacity}
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round((todayStats.hoursBooked / todayStats.totalCapacity) * 100)}% capacity
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Waiting on Parts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayStats.waitingOnParts}</div>
            <p className="text-xs text-muted-foreground">
              2 parts expected today
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayStats.completedToday}</div>
            <p className="text-xs text-muted-foreground">
              +1 from yesterday
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Today's Schedule</CardTitle>
              <CardDescription>
                Upcoming appointments and current jobs
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/calendar')}>
              <Calendar className="h-4 w-4 mr-2" />
              View Calendar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {upcomingJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="text-sm font-medium w-16">{job.time}</div>
                  <div className="flex flex-col">
                    <div className="font-medium">{job.customer}</div>
                    <div className="text-sm text-muted-foreground">{job.vehicle}</div>
                  </div>
                  <div className="flex flex-col">
                    <div className="font-medium">{job.service}</div>
                    <div className="text-sm text-muted-foreground">{job.bay}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(job.status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <JobForm
        isOpen={activeModal === 'create-job'}
        onClose={closeModal}
        initialStatus="incoming-call"
      />
    </div>
  );
}










