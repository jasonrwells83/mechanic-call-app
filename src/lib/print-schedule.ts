import {
  addDays,
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import type { CalendarEventSnapshot } from '@/components/calendar/SchedulingCalendar';

export type PrintScope = 'day' | 'week' | 'month';

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

type ColumnDefinition = {
  header: string;
  align?: 'left' | 'right';
  value: (event: CalendarEventSnapshot) => string;
};

interface DayGroup {
  date: Date;
  events: CalendarEventSnapshot[];
}

const SCOPE_COLUMNS: Record<PrintScope, ColumnDefinition[]> = {
  day: [
    { header: 'Start', value: (event) => format(event.start, 'p') },
    { header: 'End', value: (event) => format(event.end, 'p') },
    { header: 'Bay', value: (event) => formatBayLabel(resolveBay(event)) },
    { header: 'Job', value: (event) => event.title },
    { header: 'Customer', value: (event) => getStringProp(event, 'customerName') },
    { header: 'Vehicle', value: (event) => getStringProp(event, 'vehicleInfo') },
    { header: 'Status', value: (event) => getStringProp(event, 'status') },
    { header: 'Priority', value: (event) => getStringProp(event, 'priority') },
    {
      header: 'Est. Hours',
      align: 'right',
      value: (event) => getNumberProp(event, 'estimatedHours'),
    },
  ],
  week: [
    { header: 'Start', value: (event) => format(event.start, 'p') },
    { header: 'End', value: (event) => format(event.end, 'p') },
    { header: 'Bay', value: (event) => formatBayLabel(resolveBay(event)) },
    { header: 'Job', value: (event) => event.title },
    { header: 'Vehicle', value: (event) => getStringProp(event, 'vehicleInfo') },
    { header: 'Customer', value: (event) => getStringProp(event, 'customerName') },
  ],
  month: [
    { header: 'Job Type', value: (event) => event.title },
    { header: 'Vehicle', value: (event) => getStringProp(event, 'vehicleInfo') },
  ],
};

function formatBayLabel(id: string | null | undefined): string {
  if (!id) {
    return 'Unassigned';
  }
  return BAY_LABELS[id] ?? id;
}

function resolveBay(event: CalendarEventSnapshot): string | null {
  const extendedBay = (event.extendedProps as { bay?: string }).bay ?? null;
  return event.resourceId ?? extendedBay ?? null;
}

function getStringProp(event: CalendarEventSnapshot, key: string): string {
  const value = (event.extendedProps as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : '';
}

function getNumberProp(event: CalendarEventSnapshot, key: string): string {
  const value = (event.extendedProps as Record<string, unknown>)[key];
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toFixed(1);
  }
  if (typeof value === 'string' && value.trim().length > 0 && !Number.isNaN(Number(value))) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed.toFixed(1) : '';
  }
  return '';
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

function renderTableHead(columns: ColumnDefinition[]): string {
  const cells = columns
    .map((column) => {
      const classNames = column.align === 'right' ? ' class="text-right"' : '';
      return `<th${classNames}>${escapeHtml(column.header)}</th>`;
    })
    .join('');

  return `<thead><tr>${cells}</tr></thead>`;
}

function formatEventRow(event: CalendarEventSnapshot, columns: ColumnDefinition[]): string {
  const cells = columns
    .map((column) => {
      const rawValue = column.value(event);
      const value = rawValue === undefined || rawValue === null ? '' : String(rawValue);
      const classNames = column.align === 'right' ? ' class="text-right"' : '';
      return `<td${classNames}>${escapeHtml(value)}</td>`;
    })
    .join('');

  return `<tr>${cells}</tr>`;
}

function buildDaySection(scope: PrintScope, date: Date, events: CalendarEventSnapshot[], index: number): string {
  const header = format(date, 'EEEE, MMMM d, yyyy');
  const columns = SCOPE_COLUMNS[scope];
  const rows = events.length
    ? events
        .slice()
        .sort((a, b) => a.start.getTime() - b.start.getTime())
        .map((event) => formatEventRow(event, columns))
        .join('\n')
    : `<tr><td colspan="${columns.length}" class="empty-cell">No appointments scheduled.</td></tr>`;

  const tableHead = renderTableHead(columns);
  const sectionClass = index === 0 ? 'day-section' : 'day-section page-break';

  return `
      <section class="${sectionClass}">
        <h2>${escapeHtml(header)}</h2>
        <table>
          ${tableHead}
          <tbody>
${rows}
          </tbody>
        </table>
      </section>`;
}

function buildWeekSection(days: DayGroup[]): string {
  const columns = SCOPE_COLUMNS.week;
  const tableHead = renderTableHead(columns);

  const rows = days
    .map((day) => {
      const dayLabel = `<tr class="subheader-row"><td colspan="${columns.length}">${escapeHtml(
        format(day.date, 'EEEE, MMM d')
      )}</td></tr>`;
      if (day.events.length === 0) {
        return `${dayLabel}<tr><td colspan="${columns.length}" class="empty-cell">No appointments scheduled.</td></tr>`;
      }

      const eventRows = day.events
        .slice()
        .sort((a, b) => a.start.getTime() - b.start.getTime())
        .map((event) => formatEventRow(event, columns))
        .join('\n');
      return `${dayLabel}\n${eventRows}`;
    })
    .join('\n');

  return `
      <section class="aggregated-section">
        <h2>Week Overview</h2>
        <table>
          ${tableHead}
          <tbody>
${rows}
          </tbody>
        </table>
      </section>`;
}

function buildMonthSection(days: DayGroup[]): string {
  const columns = SCOPE_COLUMNS.month;
  const tableHead = renderTableHead(columns);

  const rows = days
    .map((day) => {
      const dayLabel = `<tr class="subheader-row"><td colspan="${columns.length}">${escapeHtml(
        format(day.date, 'EEEE, MMM d')
      )}</td></tr>`;
      if (day.events.length === 0) {
        return `${dayLabel}<tr><td colspan="${columns.length}" class="empty-cell">No appointments scheduled.</td></tr>`;
      }

      const eventRows = day.events
        .slice()
        .sort((a, b) => a.start.getTime() - b.start.getTime())
        .map((event) => formatEventRow(event, columns))
        .join('\n');
      return `${dayLabel}\n${eventRows}`;
    })
    .join('\n');

  return `
      <section class="aggregated-section month-section">
        <h2>Month Overview</h2>
        <table>
          ${tableHead}
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
    const bay = formatBayLabel(resolveBay(event) ?? undefined);
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

  const printWindow = window.open('', '_blank', 'noopener=yes');
  if (!printWindow) {
    console.error('Unable to open print window. Please allow pop-ups for this site.');
    return;
  }

  try {
    // Ensure no reference back to the opener for security purposes.
    printWindow.opener = null;
  } catch (error) {
    // Some browsers may prevent setting the opener; ignore silently.
  }

  const dayMap = new Map<string, { date: Date; events: CalendarEventSnapshot[] }>();
  filtered.forEach((event) => {
    const normalizedDate = startOfDay(event.start);
    const dayKey = format(normalizedDate, 'yyyy-MM-dd');
    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, { date: new Date(normalizedDate), events: [] });
    }
    dayMap.get(dayKey)!.events.push(event);
  });

  // Ensure every day in the range appears, even if empty.
  let cursor = startOfDay(start);
  const endOfRange = startOfDay(end);
  while (cursor <= endOfRange) {
    const key = format(cursor, 'yyyy-MM-dd');
    if (!dayMap.has(key)) {
      dayMap.set(key, { date: new Date(cursor), events: [] });
    }
    cursor = addDays(cursor, 1);
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

  const daySections =
    scope === 'day'
      ? days.map((day, index) => buildDaySection(scope, day.date, day.events, index)).join('\n')
      : scope === 'week'
      ? buildWeekSection(days)
      : buildMonthSection(days);
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
    .aggregated-section { margin-bottom: 32px; }
    .aggregated-section h2 { font-size: 16px; font-weight: 600; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #374151; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #111827; background: #f3f4f6; padding: 8px; border: 1px solid #e5e7eb; }
    td { font-size: 12px; color: #1f2937; padding: 8px; border: 1px solid #e5e7eb; vertical-align: top; }
    td.text-right, th.text-right { text-align: right; }
    .empty-cell { text-align: center; color: #6b7280; font-style: italic; }
    .subheader-row td { background: #e5e7eb; color: #1f2937; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; padding: 6px 8px; }
    .month-section table { page-break-inside: avoid; }
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

  const triggerPrint = () => {
    printWindow.focus();
    printWindow.print();
  };

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  if (printWindow.document.readyState === 'complete') {
    triggerPrint();
  } else {
    printWindow.document.addEventListener('DOMContentLoaded', () => {
      triggerPrint();
    });
  }
}
