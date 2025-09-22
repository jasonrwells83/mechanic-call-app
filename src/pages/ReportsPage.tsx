import React, { useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import {
  Activity,
  BarChart3,
  Calendar as CalendarIcon,
  CheckCircle,
  ClipboardList,
  Clock,
  DollarSign,
  Download,
  Filter,
  Printer,
  TrendingUp,
  Users,
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, isWithinInterval, differenceInMinutes, differenceInCalendarDays, startOfWeek, endOfWeek } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useAppointments, useCalls, useCustomers, useJobs } from '@/hooks';
import type { Appointment, Call, Customer, Job } from '@/hooks';

type ReportJob = Job & {
  estimatedHours?: number;
  actualHours?: number;
  estimatedCost?: number;
  actualCost?: number;
  scheduledStart?: string;
  scheduledEnd?: string;
  laborRate?: number;
};

type ReportAppointment = Appointment & {
  startTime?: string;
  endTime?: string;
  title?: string;
  status?: string;
  type?: string;
};

type ReportCall = Call & {
  outcome?: string;
  status?: string;
};

type ReportCustomer = Customer & {
  status?: string;
};

interface UpcomingJobRow {
  id: string;
  start: Date | null;
  end: Date | null;
  jobTitle: string;
  customerName: string;
  status: string;
  bay?: string | null;
  durationHours: number | null;
}

interface WeeklySummaryRow {
  start: Date;
  end: Date;
  jobsScheduled: number;
  jobsCompleted: number;
  completionRate: number;
  averageHours: number;
  revenue: number;
}

const statusOptions: { value: string; label: string }[] = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'waiting-parts', label: 'Waiting Parts' },
  { value: 'completed', label: 'Completed' },
  { value: 'incoming-call', label: 'Incoming Call' },
  { value: 'intake', label: 'Intake' },
];

const statusBadgeStyles: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-700 border border-blue-100',
  'in-progress': 'bg-amber-50 text-amber-700 border border-amber-100',
  'waiting-parts': 'bg-orange-50 text-orange-700 border border-orange-100',
  completed: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  default: 'bg-slate-100 text-slate-700 border border-slate-200',
};

const appointmentStartKeys = ['startAt', 'startTime', 'start_time'];
const appointmentEndKeys = ['endAt', 'endTime', 'end_time'];
const jobPrimaryDateKeys = ['scheduledStart', 'createdAt', 'updatedAt'];
const jobHoursKeys = ['estHours', 'estimatedHours', 'estimated_hours'];
const jobRevenueKeys = ['actualCost', 'estimatedCost', 'totalCost', 'billingTotal'];
const jobEstimatedCostKeys = ['estimatedCost', 'quoteTotal', 'quotedAmount'];
const jobActualCostKeys = ['actualCost', 'finalTotal', 'billedAmount'];
const callOutcomeKeys = ['outcome', 'callOutcome'];

function getDateFromRecord(record: Record<string, unknown> | undefined, keys: string[]): Date | null {
  if (!record) {
    return null;
  }

  for (const key of keys) {
    const value = record[key];
    if (!value) {
      continue;
    }

    const date = new Date(String(value));
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
}

function getNumberFromRecord(record: Record<string, unknown> | undefined, keys: string[], fallback = 0): number {
  if (!record) {
    return fallback;
  }

  for (const key of keys) {
    const value = record[key];
    if (value == null) {
      continue;
    }

    const numeric = Number(value);
    if (!Number.isNaN(numeric)) {
      return numeric;
    }
  }

  return fallback;
}

function convertRowsToCsv(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = cell ?? '';
          const needsQuotes = value.includes(',') || value.includes('\n') || value.includes('"');
          const sanitized = value.replace(/"/g, '""');
          return needsQuotes ? `"${sanitized}"` : sanitized;
        })
        .join(',')
    )
    .join('\r\n');
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 6),
    to: new Date(),
  });
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const jobsQuery = useJobs();
  const appointmentsQuery = useAppointments();
  const callsQuery = useCalls();
  const customersQuery = useCustomers();

  const jobs = (jobsQuery.data?.data ?? []) as ReportJob[];
  const appointments = (appointmentsQuery.data?.data ?? []) as ReportAppointment[];
  const calls = (callsQuery.data?.data ?? []) as ReportCall[];
  const customers = (customersQuery.data?.data ?? []) as ReportCustomer[];

  const customerMap = useMemo(() => {
    const map = new Map<string, ReportCustomer>();
    customers.forEach((customer) => {
      map.set(customer.id, customer);
    });
    return map;
  }, [customers]);

  const jobMap = useMemo(() => {
    const map = new Map<string, ReportJob>();
    jobs.forEach((job) => {
      map.set(job.id, job);
    });
    return map;
  }, [jobs]);

  const rangeStart = dateRange?.from ? startOfDay(dateRange.from) : null;
  const rangeEnd = dateRange?.to ? endOfDay(dateRange.to) : null;

  const isWithinSelectedRange = (date: Date | null) => {
    if (!rangeStart || !rangeEnd || !date) {
      return true;
    }
    return isWithinInterval(date, { start: rangeStart, end: rangeEnd });
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const date = getDateFromRecord(job, jobPrimaryDateKeys);
      const matchesRange = isWithinSelectedRange(date);
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(job.status);
      return matchesRange && matchesStatus;
    });
  }, [jobs, statusFilter, rangeStart, rangeEnd]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const start = getDateFromRecord(appointment, appointmentStartKeys);
      return isWithinSelectedRange(start);
    });
  }, [appointments, rangeStart, rangeEnd]);

  const filteredCalls = useMemo(() => {
    return calls.filter((call) => {
      const createdAt = getDateFromRecord(call, ['createdAt', 'timestamp', 'loggedAt']);
      return isWithinSelectedRange(createdAt);
    });
  }, [calls, rangeStart, rangeEnd]);

  const daysInRange = rangeStart && rangeEnd ? differenceInCalendarDays(rangeEnd, rangeStart) + 1 : 1;
  const totalCapacityHours = Math.max(daysInRange, 1) * 2 * 8;

  const jobsCompleted = filteredJobs.filter((job) => job.status === 'completed');
  const waitingOnParts = filteredJobs.filter((job) => job.status === 'waiting-parts').length;
  const inProgressJobs = filteredJobs.filter((job) => job.status === 'in-progress').length;

  const estimatedRevenue = filteredJobs.reduce((sum, job) => sum + getNumberFromRecord(job, jobRevenueKeys, 0), 0);
  const totalEstimatedHours = filteredJobs.reduce((sum, job) => sum + getNumberFromRecord(job, jobHoursKeys, 0), 0);

  const hoursBooked = filteredAppointments.reduce((sum, appointment) => {
    const start = getDateFromRecord(appointment, appointmentStartKeys);
    const end = getDateFromRecord(appointment, appointmentEndKeys);
    if (!start || !end) {
      return sum;
    }
    return sum + differenceInMinutes(end, start) / 60;
  }, 0);

  const bayUtilization = totalCapacityHours > 0 ? (hoursBooked / totalCapacityHours) * 100 : 0;

  const conversionRate = useMemo(() => {
    if (filteredCalls.length === 0) {
      return 0;
    }
    const converted = filteredCalls.filter((call) => {
      const outcome = callOutcomeKeys.map((key) => call[key as keyof ReportCall]).find(Boolean);
      if (!outcome) {
        return false;
      }
      const normalized = String(outcome).toLowerCase();
      return normalized.includes('schedule');
    });
    return (converted.length / filteredCalls.length) * 100;
  }, [filteredCalls]);

  const formattedDateRange = useMemo(() => {
    if (dateRange?.from && dateRange?.to) {
      if (dateRange.from.getTime() === dateRange.to.getTime()) {
        return format(dateRange.from, 'PP');
      }
      return `${format(dateRange.from, 'PP')} - ${format(dateRange.to, 'PP')}`;
    }
    return 'All time';
  }, [dateRange]);

  const upcomingJobs = useMemo<UpcomingJobRow[]>(() => {
    const now = new Date();
    return filteredAppointments
      .map((appointment) => {
        const start = getDateFromRecord(appointment, appointmentStartKeys);
        const end = getDateFromRecord(appointment, appointmentEndKeys);
        const job = appointment.jobId ? jobMap.get(appointment.jobId) : undefined;
        const customer = appointment.customerId ? customerMap.get(appointment.customerId) : undefined;

        return {
          id: appointment.id,
          start,
          end,
          jobTitle: job?.title ?? appointment.title ?? 'Scheduled Appointment',
          customerName: customer?.name ?? 'Unassigned',
          status: job?.status ?? appointment.status ?? 'scheduled',
          bay: (appointment as Record<string, unknown>).bay as string | null,
          durationHours: start && end ? differenceInMinutes(end, start) / 60 : null,
        } as UpcomingJobRow;
      })
      .filter((row) => !row.start || row.start >= now)
      .sort((a, b) => {
        const timeA = a.start ? a.start.getTime() : Number.MAX_SAFE_INTEGER;
        const timeB = b.start ? b.start.getTime() : Number.MAX_SAFE_INTEGER;
        return timeA - timeB;
      })
      .slice(0, 10);
  }, [filteredAppointments, jobMap, customerMap]);

  const weeklySummary = useMemo<WeeklySummaryRow[]>(() => {
    const summaryMap = new Map<string, WeeklySummaryRow>();

    filteredJobs.forEach((job) => {
      const jobDate = getDateFromRecord(job, jobPrimaryDateKeys);
      if (!jobDate) {
        return;
      }
      const weekStart = startOfWeek(jobDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(jobDate, { weekStartsOn: 1 });
      const key = weekStart.toISOString();

      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          start: weekStart,
          end: weekEnd,
          jobsScheduled: 0,
          jobsCompleted: 0,
          completionRate: 0,
          averageHours: 0,
          revenue: 0,
        });
      }

      const entry = summaryMap.get(key)!;
      entry.jobsScheduled += 1;
      entry.averageHours += getNumberFromRecord(job, jobHoursKeys, 0);

      if (job.status === 'completed') {
        entry.jobsCompleted += 1;
        entry.revenue += getNumberFromRecord(job, jobRevenueKeys, 0);
      }
    });

    return Array.from(summaryMap.values())
      .map((entry) => ({
        ...entry,
        completionRate: entry.jobsScheduled > 0 ? (entry.jobsCompleted / entry.jobsScheduled) * 100 : 0,
        averageHours: entry.jobsScheduled > 0 ? entry.averageHours / entry.jobsScheduled : 0,
      }))
      .sort((a, b) => b.start.getTime() - a.start.getTime());
  }, [filteredJobs]);

  const buildCsvContent = () => {
    const rows: string[][] = [];

    rows.push(['Mechanic Shop OS Report']);
    rows.push(['Generated', format(new Date(), 'yyyy-MM-dd HH:mm')]);
    rows.push(['Date Range', formattedDateRange]);
    rows.push([]);

    rows.push(['Summary']);
    rows.push(['Metric', 'Value']);
    rows.push(['Jobs in Range', String(filteredJobs.length)]);
    rows.push(['Jobs Completed', String(jobsCompleted.length)]);
    rows.push(['Hours Booked', `${hoursBooked.toFixed(1)} h`]);
    rows.push(['Bay Utilization', `${bayUtilization.toFixed(1)} %`]);
    rows.push(['Estimated Revenue', currencyFormatter.format(estimatedRevenue)]);
    rows.push(['Call Conversion', `${conversionRate.toFixed(1)} %`]);
    rows.push([]);

    rows.push(['Jobs Detail']);
    rows.push(['Job ID', 'Title', 'Status', 'Customer', 'Scheduled Date', 'Estimated Hours', 'Estimated Cost', 'Actual Cost']);
    filteredJobs.forEach((job) => {
      const scheduledDate = getDateFromRecord(job, jobPrimaryDateKeys);
      const customerName = job.customerId ? customerMap.get(job.customerId)?.name ?? '' : '';
      const estimatedHoursValue = getNumberFromRecord(job, jobHoursKeys, 0);
      const estimatedCostValue = getNumberFromRecord(job, jobEstimatedCostKeys, 0);
      const actualCostValue = getNumberFromRecord(job, jobActualCostKeys, 0);

      rows.push([
        job.id,
        job.title || '',
        job.status,
        customerName,
        scheduledDate ? format(scheduledDate, 'yyyy-MM-dd HH:mm') : '',
        estimatedHoursValue ? estimatedHoursValue.toFixed(2) : '',
        estimatedCostValue ? estimatedCostValue.toFixed(2) : '',
        actualCostValue ? actualCostValue.toFixed(2) : '',
      ]);
    });
    rows.push([]);

    rows.push(['Upcoming Jobs']);
    rows.push(['Date', 'Time', 'Job', 'Customer', 'Status', 'Bay', 'Duration Hours']);
    upcomingJobs.forEach((job) => {
      rows.push([
        job.start ? format(job.start, 'yyyy-MM-dd') : '',
        job.start ? format(job.start, 'HH:mm') : '',
        job.jobTitle,
        job.customerName,
        job.status,
        job.bay ?? '',
        job.durationHours != null ? job.durationHours.toFixed(2) : '',
      ]);
    });
    rows.push([]);

    rows.push(['Weekly Summary']);
    rows.push(['Week Start', 'Week End', 'Jobs Scheduled', 'Jobs Completed', 'Completion Rate %', 'Avg Est Hours', 'Revenue']);
    weeklySummary.forEach((week) => {
      rows.push([
        format(week.start, 'yyyy-MM-dd'),
        format(week.end, 'yyyy-MM-dd'),
        String(week.jobsScheduled),
        String(week.jobsCompleted),
        week.completionRate.toFixed(1),
        week.averageHours.toFixed(1),
        week.revenue.toFixed(2),
      ]);
    });

    return convertRowsToCsv(rows);
  };

  const handleStatusToggle = (value: string, checked: boolean | string) => {
    setStatusFilter((previous) => {
      const isChecked = checked === true;
      if (isChecked) {
        if (previous.includes(value)) {
          return previous;
        }
        return [...previous, value];
      }
      return previous.filter((status) => status !== value);
    });
  };

  const handleClearFilters = () => {
    setDateRange({ from: subDays(new Date(), 6), to: new Date() });
    setStatusFilter([]);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    try {
      setIsExporting(true);
      const csvContent = buildCsvContent();
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `mechanic-shop-report-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export CSV', error);
    } finally {
      setIsExporting(false);
    }
  };

  const isLoading = jobsQuery.isLoading || appointmentsQuery.isLoading || callsQuery.isLoading || customersQuery.isLoading;
  const hasError = jobsQuery.isError || appointmentsQuery.isError || callsQuery.isError || customersQuery.isError;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground">Operational performance, throughput, and export tools</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center print:hidden">
          <Button variant="outline" onClick={handlePrint} disabled={isLoading}>
            <Printer className="mr-2 h-4 w-4" />
            Print Report
          </Button>
          <Button onClick={handleExport} disabled={isLoading || isExporting}>
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      <Card className="print:border-none print:shadow-none">
        <CardHeader className="gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Filter className="h-4 w-4" />
            <CardTitle className="text-lg">Report Filters</CardTitle>
          </div>
          <CardDescription>Select the date window and job statuses to refine every report on this page.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="flex flex-1 flex-col gap-2">
              <span className="text-sm font-medium text-muted-foreground">Date Range</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('justify-start text-left font-normal', !dateRange && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formattedDateRange}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-muted-foreground">Active Filters</span>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{statusFilter.length} statuses</Badge>
                <Badge variant="outline">{daysInRange} day span</Badge>
                <Badge variant="outline">{filteredJobs.length} jobs</Badge>
              </div>
            </div>
            <Button variant="ghost" onClick={handleClearFilters} className="w-fit">
              Reset Filters
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {statusOptions.map((option) => (
              <label key={option.value} className="flex items-center gap-2 rounded-md border border-dashed border-muted p-3 text-sm">
                <Checkbox
                  checked={statusFilter.includes(option.value)}
                  onCheckedChange={(checked) => handleStatusToggle(option.value, checked)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {hasError && (
        <Card className="border-destructive/30 bg-destructive/10 print:hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <BarChart3 className="h-5 w-5" />
              Failed to load report data
            </CardTitle>
            <CardDescription>Please refresh the page or adjust your filters.</CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="print:border print:border-muted-foreground/30 print:shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              Jobs in range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{filteredJobs.length}</div>
            <p className="text-xs text-muted-foreground">{formattedDateRange}</p>
          </CardContent>
        </Card>

        <Card className="print:border print:border-muted-foreground/30 print:shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
              Completed jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{jobsCompleted.length}</div>
            <p className="text-xs text-muted-foreground">{waitingOnParts} waiting on parts  |  {inProgressJobs} in progress</p>
          </CardContent>
        </Card>

        <Card className="print:border print:border-muted-foreground/30 print:shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Hours booked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{hoursBooked.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">{bayUtilization.toFixed(1)}% bay utilization</p>
          </CardContent>
        </Card>

        <Card className="print:border print:border-muted-foreground/30 print:shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Est. revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{currencyFormatter.format(estimatedRevenue)}</div>
            <p className="text-xs text-muted-foreground">Based on completed and scheduled work</p>
          </CardContent>
        </Card>

        <Card className="print:border print:border-muted-foreground/30 print:shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Call conversion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">{filteredCalls.length} calls in selected range</p>
          </CardContent>
        </Card>

        <Card className="print:border print:border-muted-foreground/30 print:shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Avg. est. hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{filteredJobs.length > 0 ? (totalEstimatedHours / filteredJobs.length).toFixed(1) : '0.0'}h</div>
            <p className="text-xs text-muted-foreground">Across all jobs in the filtered range</p>
          </CardContent>
        </Card>
      </div>

      <Card className="print:border print:border-muted-foreground/30 print:shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Upcoming jobs
          </CardTitle>
          <CardDescription>Next scheduled jobs based on appointment start time.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-24 rounded-md border border-dashed border-muted flex items-center justify-center text-muted-foreground">
              Loading upcoming jobs...
            </div>
          ) : upcomingJobs.length === 0 ? (
            <div className="h-24 rounded-md border border-dashed border-muted flex items-center justify-center text-muted-foreground">
              No upcoming jobs in this range.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Bay</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>{job.start ? format(job.start, 'PP') : 'TBD'}</TableCell>
                    <TableCell>{job.start ? format(job.start, 'p') : 'TBD'}</TableCell>
                    <TableCell className="font-medium">{job.jobTitle}</TableCell>
                    <TableCell>{job.customerName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusBadgeStyles[job.status] ?? statusBadgeStyles.default}>
                        {job.status.replace('-', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{job.bay ?? '-'}</TableCell>
                    <TableCell className="text-right">
                      {job.durationHours != null ? `${job.durationHours.toFixed(1)}h` : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="print:border print:border-muted-foreground/30 print:shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Weekly summary
          </CardTitle>
          <CardDescription>Performance grouped by calendar week (Mon-Sun) for the selected range.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-24 rounded-md border border-dashed border-muted flex items-center justify-center text-muted-foreground">
              Calculating weekly metrics...
            </div>
          ) : weeklySummary.length === 0 ? (
            <div className="h-24 rounded-md border border-dashed border-muted flex items-center justify-center text-muted-foreground">
              No jobs available to summarize for this range.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Week</TableHead>
                  <TableHead>Jobs scheduled</TableHead>
                  <TableHead>Jobs completed</TableHead>
                  <TableHead>Completion rate</TableHead>
                  <TableHead>Avg est. hours</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {weeklySummary.map((week) => (
                  <TableRow key={week.start.toISOString()}>
                    <TableCell>{`${format(week.start, 'MM/dd')} - ${format(week.end, 'MM/dd')}`}</TableCell>
                    <TableCell>{week.jobsScheduled}</TableCell>
                    <TableCell>{week.jobsCompleted}</TableCell>
                    <TableCell>{week.completionRate.toFixed(1)}%</TableCell>
                    <TableCell>{week.averageHours.toFixed(1)}h</TableCell>
                    <TableCell className="text-right">{week.revenue.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}






