import React, { useCallback, useMemo, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertTriangle,
  Car,
  Clock,
  FileText,
  MapPin,
  RefreshCcw,
  User,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  Job,
  ServiceHistoryEntry,
  VehicleAlert,
  VehicleNote,
  VehicleWithHistory,
} from '@/types';

interface VehicleDetailsViewProps {
  vehicleId: string;
  vehicle?: VehicleWithHistory | null;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onRefresh?: () => void;
  onAddNote?: (payload: VehicleNotePayload, vehicleId: string) => Promise<void> | void;
}

export interface VehicleNotePayload {
  content: string;
}

export function VehicleDetailsView({
  vehicleId,
  vehicle,
  isLoading = false,
  error = null,
  onRetry,
  onRefresh,
  onAddNote,
}: VehicleDetailsViewProps) {
  const [noteContent, setNoteContent] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  const hasVehicle = Boolean(vehicle);

  const sortedHistory = useMemo(() => {
    if (!vehicle?.serviceHistory?.length) return [] as ServiceHistoryEntry[];
    return [...vehicle.serviceHistory].sort((a, b) => (a.serviceDate > b.serviceDate ? -1 : 1));
  }, [vehicle?.serviceHistory]);

  const handleAddNote = useCallback(async () => {
    if (!noteContent.trim() || !onAddNote) {
      return;
    }
    setIsSubmittingNote(true);
    try {
      await onAddNote({ content: noteContent.trim() }, vehicleId);
      setNoteContent('');
    } finally {
      setIsSubmittingNote(false);
    }
  }, [noteContent, onAddNote, vehicleId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="space-y-2">
          <SkeletonLine className="h-6 w-48" />
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
              <AlertTriangle className="h-5 w-5" /> Vehicle details unavailable
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

  if (!hasVehicle) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <Car className="h-5 w-5" /> Select a vehicle to see details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>This panel will populate when you pick a vehicle from search, jobs, or customer views.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-purple-100 p-2 text-purple-700">
                <Car className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>{formatVehicleName(vehicle)}</CardTitle>
                <p className="text-sm text-muted-foreground font-mono">VIN {vehicle.vin ?? '—'}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              {typeof vehicle.mileage === 'number' ? (
                <Badge variant="outline">{vehicle.mileage.toLocaleString()} mi</Badge>
              ) : null}
              {vehicle.color ? <Badge variant="outline">{vehicle.color}</Badge> : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
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
          <DetailItem label="License" value={vehicle.licensePlate ?? '—'} icon={MapPin} />
          <DetailItem label="Created" value={formatDate(vehicle.createdAt)} icon={Clock} />
          <DetailItem label="Updated" value={formatDate(vehicle.updatedAt)} icon={Clock} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" /> Owner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <DetailLine label="Name" value={vehicle.customer?.name ?? '—'} />
            <DetailLine label="Phone" value={vehicle.customer?.phone ?? '—'} />
            <DetailLine label="Email" value={vehicle.customer?.email ?? '—'} />
            <DetailLine label="Address" value={vehicle.customer?.address ?? '—'} />
            <DetailLine label="Preferred Contact" value={vehicle.customer?.preferredContact ?? '—'} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vehicle.alerts?.length ? (
              <div className="space-y-3">
                {vehicle.alerts.map((alert) => (
                  <AlertItem key={alert.id} alert={alert} />
                ))}
              </div>
            ) : (
              <EmptyState message="No active maintenance alerts." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" /> Service History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedHistory.length ? (
            <div className="space-y-4">
              {sortedHistory.map((entry) => (
                <ServiceHistoryItem key={entry.id} entry={entry} />
              ))}
            </div>
          ) : (
            <EmptyState message="No service records yet." />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="vehicle-note" className="text-sm font-medium">
              Add a note
            </Label>
            <Textarea
              id="vehicle-note"
              value={noteContent}
              onChange={(event) => setNoteContent(event.target.value)}
              placeholder="Document observations about this vehicle."
              rows={3}
            />
            <Button
              size="sm"
              onClick={handleAddNote}
              disabled={!noteContent.trim() || isSubmittingNote || !onAddNote}
            >
              {isSubmittingNote ? 'Saving…' : 'Save Note'}
            </Button>
          </div>

          <Separator />

          {vehicle.notes?.length ? (
            <div className="space-y-3">
              {vehicle.notes.map((note) => (
                <VehicleNoteItem key={note.id} note={note} />
              ))}
            </div>
          ) : (
            <EmptyState message="No notes recorded for this vehicle." />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" /> Related Jobs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {vehicle.jobs?.length ? (
            <div className="space-y-3">
              {vehicle.jobs.map((job) => (
                <RelatedJobItem key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <EmptyState message="No jobs linked to this vehicle yet." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatVehicleName(vehicle: VehicleWithHistory) {
  return [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).map((part) => String(part)).join(' ');
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, 'MMM d, yyyy');
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

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

function AlertItem({ alert }: { alert: VehicleAlert }) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{alert.title}</p>
        <Badge variant="outline" className={alertSeverityToClass(alert.severity)}>
          {alert.severity}
        </Badge>
      </div>
      {alert.description ? (
        <p className="mt-1 text-sm text-muted-foreground">{alert.description}</p>
      ) : null}
      <p className="mt-2 text-xs text-muted-foreground">
        Detected {formatDistanceToNow(new Date(alert.detectedAt), { addSuffix: true })}
      </p>
    </div>
  );
}

function alertSeverityToClass(severity: VehicleAlert['severity']) {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-800';
    case 'high':
      return 'bg-orange-100 text-orange-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function ServiceHistoryItem({ entry }: { entry: ServiceHistoryEntry }) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-medium text-foreground">
        <span>{entry.serviceType}</span>
        <span>{formatDate(entry.serviceDate)}</span>
      </div>
      {entry.description ? (
        <p className="mt-1 text-sm text-muted-foreground">{entry.description}</p>
      ) : null}
      <div className="mt-2 grid gap-3 text-xs text-muted-foreground md:grid-cols-3">
        <span>Mileage: {entry.mileage ? `${entry.mileage.toLocaleString()} mi` : '—'}</span>
        <span>Technician: {entry.technician ?? '—'}</span>
        <span>Cost: {typeof entry.cost === 'number' ? `$${entry.cost.toFixed(2)}` : '—'}</span>
      </div>
    </div>
  );
}

function VehicleNoteItem({ note }: { note: VehicleNote }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-sm text-foreground">{note.content}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        — {note.author ?? 'Unknown'} • {formatDate(note.createdAt)}
      </p>
    </div>
  );
}

function RelatedJobItem({ job }: { job: Job }) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{job.title}</p>
        <Badge variant="outline">{job.status}</Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Created {formatDate(job.createdAt)} • Updated {formatDate(job.updatedAt)}
      </p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-muted-foreground">{message}</p>;
}
