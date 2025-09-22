import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import type { CalendarEventSnapshot } from '@/components/calendar/SchedulingCalendar';

type PrintScope = 'day' | 'week' | 'month';

interface PrintOptions {
  scope: PrintScope;
  anchorDate: Date;
  events: CalendarEventSnapshot[];
  title?: string;
}

const BAY_LABELS: Record<string, string> = {
  'bay-1': 'Bay 1',
  'bay-2': 'Bay 2',
};

const SCOPE_TITLES: Record<PrintScope, string> = {
  day: 'Daily Schedule',
  week: 'Weekly Schedule',
  month: 'Monthly Schedule',
};

function formatBayLabel(id: string | null | undefined): string {
  if (!id) {
    return 'Unassigned';
  }
  return BAY_LABELS[id] ?? id;
}

function getRangeForScope(scope: PrintScope, reference: Date): { start: Date; end: Date } {
  switch (scope) {
    case 'day':
      return { start: startOfDay(reference), end: endOfDay(reference) };
    case 'week':
      return {
        start: startOfWeek(reference, { weekStartsOn: 1 }),
        end: endOfWeek(reference, { weekStartsOn: 1 }),
      };
    case 'month':
    default:
      return { start: startOfMonth(reference), end: endOfMonth(reference) };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatEventRow(event: CalendarEventSnapshot): string {
  const customer = typeof event.extendedProps.customerName === 'string'
    ? event.extendedProps.customerName
    : '';
  const vehicle = typeof event.extendedProps.vehicleInfo === 'string'
    ? event.extendedProps.vehicleInfo
    : '';
  const status = typeof event.extendedProps.status === 'string'
    ? event.extendedProps.status
    : '';
  const priority = typeof event.extendedProps.priority === 'string'
    ? event.extendedProps.priority
    : '';
  const estimatedHours = typeof event.extendedProps.estimatedHours === 'number'
    ? event.extendedProps.estimatedHours.toFixed(1)
    : '';

  return `
        <tr>
          <td>${escapeHtml(format(event.start, 'p'))}</td>
          <td>${escapeHtml(format(event.end, 'p'))}</td>
          <td>${escapeHtml(formatBayLabel(event.resourceId ?? (event.extendedProps as { bay?: string }).bay ?? undefined))}</td>
          <td>${escapeHtml(event.title)}</td>
          <td>${escapeHtml(customer)}</td>
          <td>${escapeHtml(vehicle)}</td>
          <td>${escapeHtml(status)}</td>
          <td>${escapeHtml(priority)}</td>
          <td class="text-right">${escapeHtml(estimatedHours)}</td>
        </tr>`;
}

function buildDaySection(date: Date, events: CalendarEventSnapshot[], index: number): string {
  const header = format(date, 'EEEE, MMMM d, yyyy');
  const rows = events.length
    ? events
        .slice()
        .sort((a, b) => a.start.getTime() - b.start.getTime())
        .map(formatEventRow)
        .join('\n')
    : '<tr><td colspan="9" class="empty-cell">No appointments scheduled.</td></tr>';

  const sectionClass = index === 0 ? 'day-section' : 'day-section page-break';

  return `
      <section class="${sectionClass}">
        <h2>${escapeHtml(header)}</h2>
        <table>
          <thead>
            <tr>
              <th>Start</th>
              <th>End</th>
              <th>Bay</th>
              <th>Job</th>
              <th>Customer</th>
              <th>Vehicle</th>
              <th>Status</th>
              <th>Priority</th>
              <th class="text-right">Est. Hours</th>
            </tr>
          </thead>
          <tbody>
${rows}
          </tbody>
        </table>
      </section>`;
}

function buildSummary(events: CalendarEventSnapshot[]): { appointments: number; hours: number; byBay: Array<{ bay: string; appointments: number; hours: number }>; } {
  const totals = {
    appointments: events.length,
    hours: 0,
  };
  const byBay = new Map<string, { appointments: number; hours: number }>();

  events.forEach((event) => {
    const duration = (event.end.getTime() - event.start.getTime()) / 36e5;
    totals.hours += duration;
    const bay = formatBayLabel(event.resourceId ?? (event.extendedProps as { bay?: string }).bay ?? undefined);
    const bucket = byBay.get(bay) ?? { appointments: 0, hours: 0 };
    bucket.appointments += 1;
    bucket.hours += duration;
    byBay.set(bay, bucket);
  });

  return {
    appointments: totals.appointments,
    hours: totals.hours,
    byBay: Array.from(byBay.entries()).map(([bay, stats]) => ({
      bay,
      appointments: stats.appointments,
      hours: stats.hours,
    })),
  };
}

export function openPrintableSchedule({ scope, anchorDate, events, title }: PrintOptions) {
  if (typeof window === 'undefined') {
    return;
  }

  const { start, end } = getRangeForScope(scope, anchorDate);
  const filtered = events
    .filter((event) => event.start < end && event.end > start)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const printWindow = window.open('', '_blank', 'noopener,noreferrer');
  if (!printWindow) {
    console.error('Unable to open print window. Please allow pop-ups for this site.');
    return;
  }

  const dayMap = new Map<string, { date: Date; events: CalendarEventSnapshot[] }>();
  filtered.forEach((event) => {
    const dayKey = startOfDay(event.start).toISOString();
    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, { date: startOfDay(event.start), events: [] });
    }
    dayMap.get(dayKey)!.events.push(event);
  });

  // Ensure every day in the range appears, even if empty.
  for (let current = startOfDay(start); current <= end; current.setDate(current.getDate() + 1)) {
    const key = current.toISOString();
    if (!dayMap.has(key)) {
      dayMap.set(key, { date: new Date(current), events: [] });
    }
  }

  const days = Array.from(dayMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  const summary = buildSummary(filtered);
  const rangeLabel =
    scope === 'day'
      ? format(start, 'PPP')
      : scope === 'week'
      ? `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`
      : format(start, 'MMMM yyyy');

  const generatedAt = format(new Date(), 'PPpp');
  const docTitle = title ?? 'Mechanic Shop OS';

  const daySections = days.map((day, index) => buildDaySection(day.date, day.events, index)).join('\n');
  const baySummary = summary.byBay
    .map((entry) => `
            <div class="summary-card">
              <div class="summary-label">${escapeHtml(entry.bay)}</div>
              <div class="summary-value">${entry.appointments} appt</div>
              <div class="summary-subvalue">${entry.hours.toFixed(1)} hrs</div>
            </div>`)
    .join('\n');

  const styles = `
    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; background: #ffffff; }
    .print-container { padding: 32px 48px; }
    header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 24px; }
    header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    header .range { font-size: 14px; color: #4b5563; margin-top: 4px; }
    header .meta { text-align: right; font-size: 12px; color: #6b7280; }
    .summary { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 24px; }
    .summary-card { min-width: 140px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #f9fafb; }
    .summary-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
    .summary-value { font-size: 20px; font-weight: 600; }
    .summary-subvalue { font-size: 12px; color: #6b7280; }
    .day-section { margin-bottom: 32px; }
    .day-section h2 { font-size: 20px; font-weight: 600; margin: 0 0 12px; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #111827; background: #f3f4f6; padding: 8px; border: 1px solid #e5e7eb; }
    td { font-size: 12px; color: #1f2937; padding: 8px; border: 1px solid #e5e7eb; vertical-align: top; }
    td.text-right, th.text-right { text-align: right; }
    .empty-cell { text-align: center; color: #6b7280; font-style: italic; }
    .page-break { page-break-before: always; }
    @page { size: letter portrait; margin: 0.5in; }
    @media print {
      body { margin: 0; }
      .print-container { padding: 0; }
    }
  `;

  const html = `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(`${SCOPE_TITLES[scope]} | ${docTitle}`)}</title>
      <style>${styles}</style>
    </head>
    <body>
      <div class="print-container">
        <header>
          <div>
            <h1>${escapeHtml(SCOPE_TITLES[scope])}</h1>
            <div class="range">${escapeHtml(rangeLabel)}</div>
          </div>
          <div class="meta">
            <div>${escapeHtml(docTitle)}</div>
            <div>Generated ${escapeHtml(generatedAt)}</div>
            <div>${summary.appointments} appointments &bull; ${summary.hours.toFixed(1)} hours</div>
          </div>
        </header>
        <section class="summary">
          <div class="summary-card">
            <div class="summary-label">Total Appointments</div>
            <div class="summary-value">${summary.appointments}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Total Hours</div>
            <div class="summary-value">${summary.hours.toFixed(1)}</div>
          </div>
          ${baySummary}
        </section>
        ${daySections}
      </div>
    </body>
  </html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
