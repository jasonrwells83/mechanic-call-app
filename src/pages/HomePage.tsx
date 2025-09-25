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
  Car
} from 'lucide-react';
import { JobForm } from '@/components/forms/JobForm';
import { useUIStore } from '@/stores';
import { useDashboardStats } from '@/hooks/use-dashboard';
import type { DashboardScheduleEntry } from '@/types/database';

const placeholder = '--';

const formatNumeric = (value: number) => {
  if (!Number.isFinite(value)) {
    return placeholder;
  }
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
};

const formatTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return placeholder;
  }
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatVehicle = (vehicle?: DashboardScheduleEntry['vehicle']) => {
  if (!vehicle) {
    return 'Vehicle TBD';
  }
  const parts = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).map(String);
  const description = parts.join(' ');
  return vehicle.licensePlate
    ? `${description || 'Vehicle TBD'} - ${vehicle.licensePlate}`
    : description || 'Vehicle TBD';
};

export function HomePage() {
  const navigate = useNavigate();
  const { openModal, closeModal, activeModal } = useUIStore();
  const { data: statsResponse, isLoading: isStatsLoading, isError: statsError } = useDashboardStats();

  const stats = statsResponse?.data;
  const today = stats?.today;
  const schedule = stats?.todaySchedule ?? [];

  const carsScheduled = today?.carsScheduled ?? 0;
  const hoursBooked = today?.hoursBooked ?? 0;
  const totalCapacity = today?.totalCapacity ?? 0;
  const waitingOnParts = today?.waitingOnParts ?? 0;
  const completedToday = today?.completed ?? 0;
  const capacityPercent = !isStatsLoading && totalCapacity > 0
    ? Math.round((hoursBooked / totalCapacity) * 100)
    : 0;

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'scheduled': { variant: 'secondary' as const, className: 'bg-status-scheduled border-status-scheduled-border' },
      'in-bay': { variant: 'default' as const, className: 'bg-status-in-bay' },
      'waiting-parts': { variant: 'outline' as const, className: 'bg-status-waiting-parts border-status-waiting-parts-border status-waiting-parts' },
      'completed': { variant: 'secondary' as const, className: 'bg-status-completed border-status-completed-border' },
    };

    const normalizedStatus = (status || 'scheduled').toLowerCase() as keyof typeof statusConfig;
    const config = statusConfig[normalizedStatus] || statusConfig.scheduled;

    return (
      <Badge variant={config.variant} className={config.className}>
        {normalizedStatus.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cars Today</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isStatsLoading ? placeholder : formatNumeric(carsScheduled)}</div>
            <p className="text-xs text-muted-foreground">
              {statsError ? 'Unable to load car count' : 'Vehicles scheduled for today'}
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
              {isStatsLoading
                ? `${placeholder}/${placeholder}`
                : `${formatNumeric(hoursBooked)}/${formatNumeric(totalCapacity)}`}
            </div>
            <p className="text-xs text-muted-foreground">
              {statsError
                ? 'Capacity unavailable'
                : `${capacityPercent}% capacity`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Waiting on Parts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isStatsLoading ? placeholder : formatNumeric(waitingOnParts)}</div>
            <p className="text-xs text-muted-foreground">
              {statsError ? 'Parts status unavailable' : 'Jobs paused due to parts'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isStatsLoading ? placeholder : formatNumeric(completedToday)}</div>
            <p className="text-xs text-muted-foreground">
              {statsError ? 'Completion metrics unavailable' : 'Jobs wrapped up today'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Today's Schedule</CardTitle>
              <CardDescription>
                {statsError ? 'Unable to load schedule' : 'Upcoming appointments and current jobs'}
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
            {isStatsLoading && schedule.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Loading schedule…
              </div>
            ) : schedule.length > 0 ? (
              schedule.map((item) => (
                <div
                  key={item.appointmentId}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="text-sm font-medium w-20">{formatTime(item.startAt)}</div>
                    <div className="flex flex-col min-w-[160px]">
                      <div className="font-medium">{item.customerName || 'Unassigned customer'}</div>
                      <div className="text-sm text-muted-foreground">{formatVehicle(item.vehicle)}</div>
                    </div>
                    <div className="flex flex-col">
                      <div className="font-medium">{item.jobTitle || 'Job to assign'}</div>
                      <div className="text-sm text-muted-foreground">{item.bay}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(item.status || 'scheduled')}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                {statsError ? 'Schedule unavailable right now.' : 'No appointments booked for today yet.'}
              </div>
            )}
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
