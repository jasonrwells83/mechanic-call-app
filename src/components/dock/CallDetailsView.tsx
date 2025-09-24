import React from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  AlertCircle,
  Calendar,
  Clock,
  FileText,
  Phone,
  RefreshCcw,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Call } from '@/types';

interface CallDetailsViewProps {
  callId: string;
  call?: Call | null;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onRefresh?: () => void;
  onScheduleFollowUp?: (callId: string) => void;
}

export function CallDetailsView({
  callId,
  call,
  isLoading = false,
  error = null,
  onRetry,
  onRefresh,
  onScheduleFollowUp,
}: CallDetailsViewProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="space-y-2">
          <SkeletonLine className="h-6 w-40" />
          <SkeletonLine className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <SkeletonLine className="h-4 w-full" />
          <SkeletonLine className="h-4 w-3/4" />
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
              <AlertCircle className="h-5 w-5" /> Call details unavailable
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

  if (!call) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-5 w-5" /> Select a call to see details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Choose a call record to review outcomes, notes, and next steps.</p>
        </CardContent>
      </Card>
    );
  }

  const callStart = call.callStartTime ? format(new Date(call.callStartTime), 'MMM d, yyyy h:mm a') : '—';
  const followUpFlags = [
    call.followUpRequired ? 'Follow-up required' : null,
    call.appointmentRequested ? 'Requested appointment' : null,
    call.quoteRequested ? 'Requested quote' : null,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-orange-100 p-2 text-orange-700">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Call Summary</CardTitle>
                <p className="text-sm text-muted-foreground">Call ID • {callId}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="outline" className="bg-blue-100 text-blue-800">
                Outcome: {call.callOutcome}
              </Badge>
              {call.callDuration ? (
                <Badge variant="outline" className="bg-slate-100 text-slate-700">
                  {call.callDuration} min
                </Badge>
              ) : null}
              {followUpFlags.map((flag) => (
                <Badge key={flag} variant="outline" className="bg-amber-100 text-amber-800">
                  {flag}
                </Badge>
              ))}
            </div>
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
        <CardContent className="grid gap-4 md:grid-cols-2">
          <DetailItem label="Started" value={callStart} icon={Clock} />
          <DetailItem label="Caller" value={call.phoneNumber} icon={Phone} />
          <DetailItem label="Handled By" value={call.callTakenBy ?? '—'} icon={User} />
          <DetailItem label="Source" value={call.callSource ?? '—'} icon={FileText} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Conversation Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {call.callReason ? (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Reason</p>
              <p className="text-sm text-foreground">{call.callReason}</p>
            </div>
          ) : null}
          {call.callNotes ? (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Notes</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{call.callNotes}</p>
            </div>
          ) : (
            <EmptyState message="No notes captured." />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" /> Next Steps
          </CardTitle>
          {onScheduleFollowUp && call.followUpRequired && (
            <Button size="sm" onClick={() => onScheduleFollowUp(callId)}>
              Schedule Follow-up
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <DetailRow label="Follow-up Needed" value={call.followUpRequired ? 'Yes' : 'No'} />
          <DetailRow label="Requested Appointment" value={call.appointmentRequested ? 'Yes' : 'No'} />
          <DetailRow label="Requested Quote" value={call.quoteRequested ? 'Yes' : 'No'} />
          <DetailRow label="Next Action" value={call.nextAction ?? '—'} />
          <DetailRow label="Follow-up Date" value={call.followUpDate ? format(new Date(call.followUpDate), 'MMM d, yyyy') : '—'} />
          <Separator />
          <DetailRow label="Linked Customer" value={call.customerId ?? '—'} />
          <DetailRow label="Linked Job" value={call.jobId ?? '—'} />
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

function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-muted-foreground">{message}</p>;
}
