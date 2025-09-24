import React from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Car,
  FileText,
  Mail,
  Phone,
  RefreshCcw,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Call, CustomerWithVehicles, Job, Vehicle } from '@/types';

interface CustomerDetailsViewProps {
  customerId: string;
  customer?: CustomerWithVehicles | null;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onRefresh?: () => void;
}

export function CustomerDetailsView({
  customerId,
  customer,
  isLoading = false,
  error = null,
  onRetry,
  onRefresh,
}: CustomerDetailsViewProps) {
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
          <SkeletonLine className="h-4 w-1/2" />
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
              <User className="h-5 w-5" /> Customer details unavailable
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

  if (!customer) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <User className="h-5 w-5" /> Select a customer to see details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Choose a customer from search, calls, or jobs to load their profile in this panel.</p>
        </CardContent>
      </Card>
    );
  }

  const vehicles = customer.vehicles ?? [];
  const jobs = customer.jobs ?? [];
  const calls = customer.calls ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-emerald-100 p-2 text-emerald-700">
                <User className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>{customer.name}</CardTitle>
                <p className="text-sm text-muted-foreground">Customer ID • {customerId}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Phone className="h-4 w-4" /> {customer.phone}
              </span>
              {customer.email ? (
                <span className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> {customer.email}
                </span>
              ) : null}
            </div>
            {customer.address ? (
              <p className="text-sm text-muted-foreground">{customer.address}</p>
            ) : null}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onRefresh?.()}
            disabled={!onRefresh}
          >
            <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <StatBubble label="Vehicles" value={vehicles.length} />
          <StatBubble label="Jobs" value={jobs.length} />
          <StatBubble label="Calls" value={calls.length} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" /> Vehicles
          </CardTitle>
        </CardHeader>
        <CardContent>
          {vehicles.length ? (
            <div className="space-y-3">
              {vehicles.map((vehicle) => (
                <VehicleItem key={vehicle.id} vehicle={vehicle} />
              ))}
            </div>
          ) : (
            <EmptyState message="No vehicles linked to this customer yet." />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Active Jobs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.length ? (
            <div className="space-y-3">
              {jobs.map((job) => (
                <JobItem key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <EmptyState message="No jobs on record." />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" /> Recent Calls
          </CardTitle>
        </CardHeader>
        <CardContent>
          {calls.length ? (
            <div className="space-y-3">
              {calls.map((call) => (
                <CallItem key={call.id} call={call} />
              ))}
            </div>
          ) : (
            <EmptyState message="No recent calls captured." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-muted', className)} />;
}

function StatBubble({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-4 text-center">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function VehicleItem({ vehicle }: { vehicle: Vehicle }) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          {[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ')}
        </p>
        {vehicle.licensePlate ? <Badge variant="outline">{vehicle.licensePlate}</Badge> : null}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        VIN {vehicle.vin ?? '—'} • Mileage {vehicle.mileage ? `${vehicle.mileage.toLocaleString()} mi` : '—'}
      </div>
    </div>
  );
}

function JobItem({ job }: { job: Job }) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{job.title}</p>
        <Badge variant="outline">{job.status}</Badge>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        Updated {format(new Date(job.updatedAt), 'MMM d, yyyy')} • Priority {job.priority}
      </div>
    </div>
  );
}

function CallItem({ call }: { call: Call }) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{call.callOutcome}</p>
        <Badge variant="outline">{call.callDuration ? `${call.callDuration} min` : '—'}</Badge>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        {call.callStartTime ? format(new Date(call.callStartTime), 'MMM d, yyyy h:mm a') : '—'}
      </div>
      {call.callReason ? <p className="mt-2 text-sm text-muted-foreground">Reason: {call.callReason}</p> : null}
      {call.callNotes ? <p className="mt-1 text-sm text-muted-foreground">Notes: {call.callNotes}</p> : null}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-6 text-sm text-muted-foreground">
      <FileText className="mb-2 h-5 w-5" />
      <p className="text-center leading-relaxed">{message}</p>
    </div>
  );
}
