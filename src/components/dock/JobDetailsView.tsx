import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Pause,
  Play,
  RefreshCcw,
  User,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  JobAttachment,
  JobMilestone,
  JobNote,
  JobWithRelations,
  JobPriority,
  JobStatus,
} from '@/types';

export type JobPanelAction = 'start' | 'pause' | 'complete' | 'cancel';

export interface JobNotePayload {
  content: string;
  type?: JobNote['type'];
  isImportant?: boolean;
}

interface JobDetailsViewProps {
  jobId: string;
  job?: JobWithRelations | null;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onJobAction?: (action: JobPanelAction, jobId: string) => void;
  onAddNote?: (payload: JobNotePayload, jobId: string) => Promise<void> | void;
  onInvoiceChange?: (invoiceNumber: string | null, jobId: string) => Promise<void> | void;
  onRefresh?: () => void;
}

const STATUS_LABELS: Record<JobStatus, { label: string; className: string }> = {
  intake: { label: 'Intake', className: 'bg-slate-100 text-slate-800' },
  'incoming-call': { label: 'Incoming Call', className: 'bg-teal-100 text-teal-800' },
  scheduled: { label: 'Scheduled', className: 'bg-blue-100 text-blue-800' },
  'in-progress': { label: 'In Progress', className: 'bg-indigo-100 text-indigo-800' },
  'waiting-parts': { label: 'Waiting on Parts', className: 'bg-amber-100 text-amber-800' },
  completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-800' },
};

const PRIORITY_LABELS: Record<JobPriority, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-green-100 text-green-800' },
  medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-800' },
  high: { label: 'High', className: 'bg-red-100 text-red-800' },
};

const NOTE_TYPES: Array<{ value: NonNullable<JobNote['type']>; label: string }> = [
  { value: 'general', label: 'General' },
  { value: 'technical', label: 'Technical' },
  { value: 'customer', label: 'Customer' },
  { value: 'internal', label: 'Internal' },
];

const INVOICE_PATTERN = /^[A-Za-z0-9\-\/]{1,20}$/;

export function JobDetailsView({
  jobId,
  job,
  isLoading = false,
  error = null,
  onRetry,
  onJobAction,
  onAddNote,
  onInvoiceChange,
  onRefresh,
}: JobDetailsViewProps) {
  const [noteContent, setNoteContent] = useState('');
  const [noteType, setNoteType] = useState<NonNullable<JobNote['type']>>('general');
  const [noteIsImportant, setNoteIsImportant] = useState(false);
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [invoiceValue, setInvoiceValue] = useState('');
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const hasJob = Boolean(job);

  useEffect(() => {
    setInvoiceValue(job?.invoiceNumber ?? '');
    setInvoiceError(null);
  }, [job?.invoiceNumber]);

  const estimatedDurationMinutes = useMemo(() => {
    if (!job) return null;
    if (typeof job.estimatedDurationMinutes === 'number') {
      return job.estimatedDurationMinutes;
    }
    if (typeof job.estHours === 'number') {
      return Math.round(job.estHours * 60);
    }
    return null;
  }, [job]);

  const milestoneProgress = useMemo(() => {
    if (!job?.milestones?.length) {
      return { completed: 0, total: 0, value: 0 };
    }
    const total = job.milestones.length;
    const completed = job.milestones.filter((milestone) => milestone.status === 'completed').length;
    const value = Math.round((completed / total) * 100);
    return { completed, total, value };
  }, [job?.milestones]);

  const handleJobAction = useCallback(
    (action: JobPanelAction) => {
      onJobAction?.(action, jobId);
    },
    [jobId, onJobAction],
  );

  const handleNoteSubmit = useCallback(async () => {
    if (!noteContent.trim() || !onAddNote) {
      return;
    }

    setIsSubmittingNote(true);
    try {
      await onAddNote(
        {
          content: noteContent.trim(),
          type: noteType,
          isImportant: noteIsImportant,
        },
        jobId,
      );
      setNoteContent('');
      setNoteIsImportant(false);
      setNoteType('general');
    } finally {
      setIsSubmittingNote(false);
    }
  }, [noteContent, noteType, noteIsImportant, onAddNote, jobId]);

  const handleInvoiceBlur = useCallback(() => {
    const trimmed = invoiceValue.trim();

    if (!trimmed) {
      setInvoiceError(null);
      if (onInvoiceChange) {
        onInvoiceChange(null, jobId);
      }
      return;
    }

    if (!INVOICE_PATTERN.test(trimmed)) {
      setInvoiceError('Use 1-20 characters: letters, numbers, dash, or slash.');
      return;
    }

    setInvoiceError(null);
    if (onInvoiceChange) {
      onInvoiceChange(trimmed, jobId);
    }
  }, [invoiceValue, onInvoiceChange, jobId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="space-y-2">
          <SkeletonLine className="h-6 w-40" />
          <SkeletonLine className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <SkeletonLine className="h-4 w-full" />
          <SkeletonLine className="h-4 w-3/4" />
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
              <AlertCircle className="h-5 w-5" /> Job details unavailable
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

  if (!hasJob) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <FileText className="h-5 w-5" /> Select a job to see details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>This panel will populate as soon as you select a job elsewhere in the app.</p>
        </CardContent>
      </Card>
    );
  }

  const statusMeta = STATUS_LABELS[job.status];
  const priorityMeta = PRIORITY_LABELS[job.priority];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-blue-100 p-2 text-blue-700">
                <Wrench className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>{job.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {job.jobNumber ?? `Job ${job.id}`}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="outline" className={statusMeta.className}>
                {statusMeta.label}
              </Badge>
              <Badge variant="outline" className={priorityMeta.className}>
                {priorityMeta.label} Priority
              </Badge>
              {estimatedDurationMinutes ? (
                <Badge variant="outline" className="bg-slate-100 text-slate-700">
                  {estimatedDurationMinutes} min est.
                </Badge>
              ) : null}
            </div>
            {job.description && (
              <p className="text-sm text-muted-foreground">{job.description}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              {job.status !== 'completed' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRefresh?.()}
                  disabled={!onRefresh}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {job.status === 'scheduled' && (
                <Button size="sm" onClick={() => handleJobAction('start')}>
                  <Play className="mr-2 h-4 w-4" /> Start Job
                </Button>
              )}
              {job.status === 'in-progress' && (
                <>
                  <Button variant="outline" size="sm" onClick={() => handleJobAction('pause')}>
                    <Pause className="mr-2 h-4 w-4" /> Pause
                  </Button>
                  <Button size="sm" onClick={() => handleJobAction('complete')}>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Completed
                  </Button>
                </>
              )}
              {job.status === 'waiting-parts' && (
                <Button size="sm" onClick={() => handleJobAction('start')}>
                  <Play className="mr-2 h-4 w-4" /> Resume
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <DetailItem
            label="Created"
            value={formatDateTime(job.createdAt)}
            icon={Clock}
          />
          <DetailItem
            label="Last Updated"
            value={formatDateTime(job.updatedAt)}
            icon={Clock}
          />
          {job.appointment && (
            <DetailItem
              label="Appointment"
              value={`${formatDateTime(job.appointment.startAt)} → ${formatDateTime(job.appointment.endAt)}`}
              icon={Calendar}
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" /> Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <DetailLine label="Name" value={job.customer?.name ?? '—'} />
            <DetailLine label="Phone" value={job.customer?.phone ?? '—'} />
            <DetailLine label="Email" value={job.customer?.email ?? '—'} />
            <DetailLine label="Address" value={job.customer?.address ?? '—'} />
            <DetailLine label="Preferred Contact" value={job.customer?.preferredContact ?? '—'} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" /> Vehicle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <DetailLine
              label="Vehicle"
              value={
                job.vehicle
                  ? [job.vehicle.year, job.vehicle.make, job.vehicle.model]
                      .filter(Boolean)
                      .map((part) => String(part))
                      .join(' ')
                      .trim() || '—'
                  : '—'
              }
            />
            <DetailLine label="VIN" value={job.vehicle?.vin ?? '—'} />
            <DetailLine label="License" value={job.vehicle?.licensePlate ?? '—'} />
            <DetailLine label="Mileage" value={job.vehicle?.mileage ? `${job.vehicle.mileage} mi` : '—'} />
            <DetailLine label="Color" value={job.vehicle?.color ?? '—'} />
          </CardContent>
        </Card>
      </div>

      {job.milestones?.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Progress value={milestoneProgress.value} className="h-2 w-24" />
              Milestones ({milestoneProgress.completed}/{milestoneProgress.total})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {job.milestones.map((milestone) => (
              <MilestoneItem key={milestone.id} milestone={milestone} />
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Notes
          </CardTitle>
          {job.noteEntries?.length ? (
            <span className="text-xs text-muted-foreground">
              {job.noteEntries.length} note{job.noteEntries.length === 1 ? '' : 's'}
            </span>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="job-note-content" className="text-sm font-medium">
              Add a note
            </Label>
            <Textarea
              id="job-note-content"
              placeholder="Share updates, internal notes, or customer feedback."
              value={noteContent}
              onChange={(event) => setNoteContent(event.target.value)}
              rows={3}
            />
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="job-note-type" className="text-xs uppercase tracking-wide text-muted-foreground">
                  Type
                </Label>
                <Select value={noteType} onValueChange={(value) => setNoteType(value as typeof noteType)}>
                  <SelectTrigger id="job-note-type" className="h-8 w-32 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTE_TYPES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="job-note-important"
                  checked={noteIsImportant}
                  onCheckedChange={(value) => setNoteIsImportant(Boolean(value))}
                />
                <Label htmlFor="job-note-important" className="text-xs text-muted-foreground">
                  Mark as important
                </Label>
              </div>
              <Button
                size="sm"
                onClick={handleNoteSubmit}
                disabled={!noteContent.trim() || isSubmittingNote || !onAddNote}
              >
                {isSubmittingNote ? 'Saving…' : 'Save Note'}
              </Button>
            </div>
          </div>

          <Separator />

          {job.noteEntries?.length ? (
            <div className="space-y-4">
              {job.noteEntries.map((note) => (
                <NoteItem key={note.id} note={note} />
              ))}
            </div>
          ) : (
            <EmptyState message="No notes recorded yet." />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Billing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-4 md:grid-cols-2">
            <DetailLine
              label="Estimated Hours"
              value={
                typeof job.estHours === 'number'
                  ? `${job.estHours.toFixed(1)} hrs`
                  : '—'
              }
            />
            <div className="space-y-1">
              <Label htmlFor="job-invoice" className="text-xs uppercase tracking-wide text-muted-foreground">
                Invoice number
              </Label>
              <Input
                id="job-invoice"
                value={invoiceValue}
                onChange={(event) => setInvoiceValue(event.target.value)}
                onBlur={handleInvoiceBlur}
                placeholder="Optional"
                maxLength={20}
                disabled={!onInvoiceChange}
                className="max-w-xs font-mono"
              />
              {invoiceError ? <p className="text-xs text-destructive">{invoiceError}</p> : null}
            </div>
          </div>
          {job.attachments?.length ? (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Attachments</p>
              <div className="space-y-2">
                {job.attachments.map((attachment) => (
                  <AttachmentItem key={attachment.id} attachment={attachment} />
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return format(date, 'MMM d, yyyy • h:mm a');
}

function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-muted', className)} />;
}

function DetailItem({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: React.ElementType }) {
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

function MilestoneItem({ milestone }: { milestone: JobMilestone }) {
  const statusBadge = getMilestoneBadge(milestone.status);
  return (
    <div className="rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-sm text-foreground">{milestone.title}</p>
        <Badge variant="outline" className={statusBadge.className}>
          {statusBadge.label}
        </Badge>
      </div>
      {milestone.description ? (
        <p className="mt-1 text-sm text-muted-foreground">{milestone.description}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {milestone.completedAt ? (
          <span>Completed {formatDistanceToNow(new Date(milestone.completedAt), { addSuffix: true })}</span>
        ) : null}
        {milestone.dueAt ? (
          <span>Due {formatDateTime(milestone.dueAt)}</span>
        ) : null}
        {milestone.assignedTo ? <span>Assigned to {milestone.assignedTo}</span> : null}
      </div>
    </div>
  );
}

function getMilestoneBadge(status: JobMilestone['status']) {
  switch (status) {
    case 'completed':
      return { label: 'Completed', className: 'bg-emerald-100 text-emerald-700' };
    case 'in-progress':
      return { label: 'In Progress', className: 'bg-indigo-100 text-indigo-700' };
    default:
      return { label: 'Pending', className: 'bg-slate-100 text-slate-700' };
  }
}

function NoteItem({ note }: { note: JobNote }) {
  const typeLabel = NOTE_TYPES.find((item) => item.value === note.type)?.label ?? 'General';
  return (
    <div className="rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-slate-100 text-slate-700">
            {typeLabel}
          </Badge>
          {note.isImportant ? (
            <Badge variant="outline" className="bg-amber-100 text-amber-800">
              Must Read
            </Badge>
          ) : null}
        </div>
        <span>{formatDateTime(note.createdAt)}</span>
      </div>
      <p className="mt-2 text-sm text-foreground">{note.content}</p>
      <p className="mt-2 text-xs text-muted-foreground">— {note.author}</p>
    </div>
  );
}

function AttachmentItem({ attachment }: { attachment: JobAttachment }) {
  return (
    <a
      href={attachment.url}
      className="flex items-center justify-between rounded border p-2 text-sm hover:bg-muted"
      target="_blank"
      rel="noreferrer"
    >
      <span>{attachment.label}</span>
      <Badge variant="outline" className="bg-slate-100 text-slate-700">
        {attachment.type === 'document' ? 'Document' : 'Link'}
      </Badge>
    </a>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-muted-foreground">{message}</p>;
}
