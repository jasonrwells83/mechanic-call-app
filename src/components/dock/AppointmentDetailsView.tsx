import React from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  AlertCircle,
  Calendar,
  Clock,
  FileText,
  Car,
  MapPin,
  RefreshCcw,
  User,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AppointmentWithJob } from '@/types';

interface AppointmentDetailsViewProps {
  appointmentId: string;
  appointment?: AppointmentWithJob | null;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onRefresh?: () => void;
  onEdit?: (appointmentId: string) => void;
}

export function AppointmentDetailsView({
  appointmentId,
  appointment,
  isLoading = false,
  error = null,
  onRetry,
  onRefresh,
  onEdit,
}: AppointmentDetailsViewProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="space-y-2">
          <SkeletonLine className="h-6 w-44" />
          <SkeletonLine className="h-4 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <SkeletonLine className="h-4 w-full" />
          <SkeletonLine className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" /> Appointment details unavailable
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          )}
        </CardHeader>
      </Card>
    );
  }

  if (!appointment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-5 w-5" /> Select an appointment to see details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Pick an appointment from the calendar or job timeline to view the schedule here.</p>
        </CardContent>
      </Card>
    );
  }

  const start = format(new Date(appointment.startAt), 'MMM d, yyyy h:mm a');
  const end = format(new Date(appointment.endAt), 'MMM d, yyyy h:mm a');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-indigo-100 p-2 text-indigo-700">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Appointment Window</CardTitle>
                <p className="text-sm text-muted-foreground">Appointment ID • {appointmentId}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" /> {start}
              </span>
              <span>→</span>
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" /> {end}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button size="sm" variant="outline" onClick={() => onEdit(appointmentId)}>
                Edit
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRefresh?.()}
              disabled={!onRefresh}
            >
              <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <DetailItem label="Bay" value={appointment.bay} icon={MapPin} />
          <DetailItem label="Job" value={appointment.job?.title ?? appointment.jobId} icon={Wrench} />
          <DetailItem label="Customer" value={appointment.customer?.name ?? appointment.job?.customer?.name ?? '—'} icon={User} />
          <DetailItem label="Vehicle" value={formatVehicle(appointment)} icon={Car} />
        </CardContent>
      </Card>

      {appointment.job ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" /> Job Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <DetailRow label="Status" value={appointment.job.status} />
            <DetailRow label="Priority" value={appointment.job.priority} />
            {appointment.job.description ? (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Work Requested</p>
                <p className="text-sm text-foreground">{appointment.job.description}</p>
              </div>
            ) : null}
            <Separator />
            <DetailRow label="Created" value={format(new Date(appointment.job.createdAt), 'MMM d, yyyy h:mm a')} />
            <DetailRow label="Updated" value={format(new Date(appointment.job.updatedAt), 'MMM d, yyyy h:mm a')} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Linked Records
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <DetailRow label="Job ID" value={appointment.jobId} />
          <DetailRow label="Customer ID" value={appointment.customer?.id ?? appointment.job?.customer?.id ?? '—'} />
        </CardContent>
      </Card>
    </div>
  );
}

function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-muted', className)} />;
}

function DetailItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value?: string | null;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex items-start gap-3">
      {Icon ? (
        <div className="rounded-md bg-slate-100 p-1 text-slate-600">
          <Icon className="h-4 w-4" />
        </div>
      ) : null}
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground">{value || '—'}</p>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function formatVehicle(appointment: AppointmentWithJob) {
  const vehicle = appointment.job?.vehicle;
  if (!vehicle) {
    return '—';
  }
  return [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ');
}
