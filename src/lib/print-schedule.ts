import {
  addDays,
  differenceInCalendarDays,
  differenceInMinutes,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { CalendarEventSnapshot } from '@/components/calendar/SchedulingCalendar';

export type PrintScope = 'day' | 'week' | 'month';

interface PrintOptions {
  scope: PrintScope;
  anchorDate: Date;
  events: CalendarEventSnapshot[];
  title?: string;
}

interface BaySummary {
  bayId: string;
  label: string;
  appointments: number;
  hours: number;
}

type TimeBucket = 'morning' | 'afternoon' | 'evening';

const BAY_LABELS: Record<string, string> = {
  'bay-1': 'Bay 1',
  'bay-2': 'Bay 2',
};

const BUCKET_ORDER: TimeBucket[] = ['morning', 'afternoon', 'evening'];
const BUCKET_LABELS: Record<TimeBucket, string> = {
  morning: 'Morning (7a–12p)',
  afternoon: 'Afternoon (12p–5p)',
  evening: 'Evening (5p+)'
};

function formatBayLabel(id: string | null | undefined): string {
  if (!id) {
    return 'Unassigned';
  }
  return BAY_LABELS[id] ?? id;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getVehicleModel(event: CalendarEventSnapshot): string {
  const rawModel = (event.extendedProps as Record<string, unknown>).vehicleModel;
  if (typeof rawModel === 'string' && rawModel.trim().length > 0) {
    return rawModel.trim();
  }

  const vehicleInfo = (event.extendedProps as Record<string, unknown>).vehicleInfo;
  if (typeof vehicleInfo === 'string' && vehicleInfo.trim().length > 0) {
    const capture = vehicleInfo.match(/^\d{4}\s+.+?\s+(.+)$/);
    if (capture && capture[1]) {
      return capture[1];
    }
    return vehicleInfo;
  }

  return '';
}

function getCustomerName(event: CalendarEventSnapshot): string {
  const customer = (event.extendedProps as Record<string, unknown>).customerName;
  return typeof customer === 'string' ? customer : '';
}

function getPriority(event: CalendarEventSnapshot): string {
  const priority = (event.extendedProps as Record<string, unknown>).priority;
  return typeof priority === 'string' ? priority.toLowerCase() : 'medium';
}

function getStatus(event: CalendarEventSnapshot): string {
  const status = (event.extendedProps as Record<string, unknown>).status;
  return typeof status === 'string' ? status : '';
}

function capitalize(value: string): string {
  if (!value) {
    return '';
  }
  const lower = value.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function getDurationMinutes(event: CalendarEventSnapshot): number {
  const minutes = differenceInMinutes(event.end, event.start);
  return Math.max(0, minutes);
}

function getDurationHours(event: CalendarEventSnapshot): number {
  return getDurationMinutes(event) / 60;
}

function formatDuration(minutes: number): string {
  if (minutes <= 0) {
    return '—';
  }
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (remaining > 0) {
    parts.push(`${remaining}m`);
  }
  return parts.join(' ');
}

function formatTimeRange(start: Date, end: Date): string {
  return `${format(start, 'p')} – ${format(end, 'p')}`;
}

function computeBaySummary(events: CalendarEventSnapshot[]): BaySummary[] {
  const map = new Map<string, { appointments: number; hours: number }>();

  events.forEach((event) => {
    const extendedBay = (event.extendedProps as { bay?: string }).bay;
    const bayId = event.resourceId ?? extendedBay ?? 'unassigned';
    const record = map.get(bayId) ?? { appointments: 0, hours: 0 };
    record.appointments += 1;
    record.hours += getDurationHours(event);
    map.set(bayId, record);
  });

  return Array.from(map.entries())
    .map(([bayId, record]) => ({
      bayId,
      label: formatBayLabel(bayId),
      appointments: record.appointments,
      hours: record.hours,
    }))
    .sort((a, b) => b.hours - a.hours || a.label.localeCompare(b.label));
}

function renderSummaryCard(label: string, value: string, subvalue?: string): string {
  return `
    <div class="summary-card">
      <div class="summary-label">${escapeHtml(label)}</div>
      <div class="summary-value">${escapeHtml(value)}</div>
      ${subvalue ? `<div class="summary-subvalue">${escapeHtml(subvalue)}</div>` : ''}
    </div>`;
}

function renderPriorityBadge(priority: string): string {
  const safe = escapeHtml(capitalize(priority));
  return `<span class="priority-badge priority-${escapeHtml(priority)}">${safe}</span>`;
}

function buildDayView(date: Date, events: CalendarEventSnapshot[]): string {
  const sorted = events
    .slice()
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const totalAppointments = sorted.length;
  const totalHours = sorted.reduce((hours, event) => hours + getDurationHours(event), 0);
  const baySummary = computeBaySummary(sorted);
  const highPriorityEvents = sorted.filter((event) => getPriority(event) === 'high');
  const highPriorityCount = highPriorityEvents.length;

  const rows = sorted.length
    ? sorted
        .map((event) => {
          const bay = formatBayLabel(event.resourceId ?? (event.extendedProps as { bay?: string }).bay);
          const vehicle = getVehicleModel(event) || '—';
          const customer = getCustomerName(event) || '—';
          const priority = getPriority(event);
          const status = capitalize(getStatus(event));
          const duration = formatDuration(getDurationMinutes(event));

          return `
            <tr class="priority-row priority-${escapeHtml(priority)}">
              <td class="time-col">${escapeHtml(formatTimeRange(event.start, event.end))}</td>
              <td>
                <div class="job-title">${escapeHtml(event.title)}</div>
                ${status ? `<div class="job-status">${escapeHtml(status)}</div>` : ''}
              </td>
              <td>${escapeHtml(bay)}</td>
              <td>${escapeHtml(vehicle)}</td>
              <td>${escapeHtml(customer)}</td>
              <td>${renderPriorityBadge(priority)}</td>
              <td class="text-right">${escapeHtml(duration)}</td>
            </tr>`;
        })
        .join('\n')
    : '<tr><td colspan="7" class="empty-cell">No appointments scheduled for this day.</td></tr>';

  const summaryCards = [
    renderSummaryCard('Total Jobs', String(totalAppointments)),
    renderSummaryCard('Total Hours', totalHours.toFixed(1), 'scheduled'),
    ...baySummary.map((entry) =>
      renderSummaryCard(entry.label, `${entry.appointments} jobs`, `${entry.hours.toFixed(1)} hrs`)
    ),
    renderSummaryCard('High Priority', String(highPriorityCount), 'needs extra prep'),
  ].join('\n');

  const focusList = highPriorityEvents.length
    ? `<ul class="notes-list">
        ${highPriorityEvents
          .map((event) => {
            const bay = formatBayLabel(event.resourceId ?? (event.extendedProps as { bay?: string }).bay);
            const vehicle = getVehicleModel(event) || 'Vehicle TBD';
            return `<li><strong>${escapeHtml(format(event.start, 'p'))}</strong> — ${escapeHtml(event.title)} · ${escapeHtml(vehicle)} · ${escapeHtml(bay)}</li>`;
          })
          .join('\n')}
      </ul>`
    : '<p class="empty-cell">No high priority jobs scheduled.</p>';

  return `
    <section class="day-view">
      <div class="section-header">
        <h2>${escapeHtml(format(date, 'EEEE, MMMM d, yyyy'))}</h2>
        <div class="section-meta">${totalAppointments} jobs · ${totalHours.toFixed(1)} hrs scheduled</div>
      </div>
      <div class="summary-grid">
        ${summaryCards}
      </div>
      <table class="day-table">
        <thead>
          <tr>
            <th class="time-col">Time</th>
            <th>Job</th>
            <th>Bay</th>
            <th>Vehicle</th>
            <th>Customer</th>
            <th>Priority</th>
            <th class="text-right">Duration</th>
          </tr>
        </thead>
        <tbody>
${rows}
        </tbody>
      </table>
      <div class="notes-section">
        <h3>High Priority Focus</h3>
        ${focusList}
      </div>
    </section>`;
}

function getTimeBucket(date: Date): TimeBucket {
  const hour = date.getHours();
  if (hour < 12) {
    return 'morning';
  }
  if (hour < 17) {
    return 'afternoon';
  }
  return 'evening';
}

function renderWeekCell(events: CalendarEventSnapshot[]): string {
  if (events.length === 0) {
    return '<div class="cell-empty">—</div>';
  }

  return `
    <ul class="week-list">
      ${events
        .map((event) => {
          const bay = formatBayLabel(event.resourceId ?? (event.extendedProps as { bay?: string }).bay);
          const vehicle = getVehicleModel(event) || 'Vehicle TBD';
          const priority = getPriority(event);
          const status = capitalize(getStatus(event));
          const metaParts = [vehicle, bay, formatTimeRange(event.start, event.end)];
          if (status) {
            metaParts.push(status);
          }
          return `
            <li class="week-entry priority-${escapeHtml(priority)}">
              <div class="entry-title">${escapeHtml(event.title)}</div>
              <div class="entry-meta">${escapeHtml(metaParts.join(' • '))}</div>
            </li>`;
        })
        .join('\n')}
    </ul>`;
}

function buildWeekView(weekStart: Date, events: CalendarEventSnapshot[]): string {
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const buckets = days.map(() => ({ morning: [] as CalendarEventSnapshot[], afternoon: [] as CalendarEventSnapshot[], evening: [] as CalendarEventSnapshot[] }));

  events.forEach((event) => {
    const dayIndex = differenceInCalendarDays(startOfDay(event.start), weekStart);
    if (dayIndex < 0 || dayIndex >= days.length) {
      return;
    }
    const bucket = getTimeBucket(event.start);
    buckets[dayIndex][bucket].push(event);
  });

  buckets.forEach((bucket) => {
    BUCKET_ORDER.forEach((slot) => {
      bucket[slot].sort((a, b) => a.start.getTime() - b.start.getTime());
    });
  });

  const totalAppointments = events.length;
  const totalHours = events.reduce((hours, event) => hours + getDurationHours(event), 0);
  const baySummary = computeBaySummary(events);
  const highPriority = events.filter((event) => getPriority(event) === 'high');

  const summaryCards = [
    renderSummaryCard('Jobs this week', String(totalAppointments)),
    renderSummaryCard('Total hours', totalHours.toFixed(1), 'scheduled'),
    ...baySummary.map((entry) =>
      renderSummaryCard(entry.label, `${entry.appointments} jobs`, `${entry.hours.toFixed(1)} hrs`)
    ),
    renderSummaryCard('High priority', String(highPriority.length)),
  ].join('\n');

  const alertsList = highPriority.length
    ? `<ul class="notes-list">
        ${highPriority
          .sort((a, b) => a.start.getTime() - b.start.getTime())
          .map((event) => {
            const bay = formatBayLabel(event.resourceId ?? (event.extendedProps as { bay?: string }).bay);
            const dayLabel = format(event.start, 'EEE MMM d');
            return `<li><strong>${escapeHtml(dayLabel)}</strong> — ${escapeHtml(event.title)} · ${escapeHtml(bay)}</li>`;
          })
          .join('\n')}
      </ul>`
    : '<p class="empty-cell">No high priority alerts this week.</p>';

  const tableBody = BUCKET_ORDER
    .map((bucket) => {
      const cells = buckets
        .map((dayBuckets) => `<td>${renderWeekCell(dayBuckets[bucket])}</td>`)
        .join('\n');
      return `
        <tr>
          <th class="slot-label">${escapeHtml(BUCKET_LABELS[bucket])}</th>
          ${cells}
        </tr>`;
    })
    .join('\n');

  const headerCells = days
    .map((day) => `<th class="week-day">${escapeHtml(format(day, 'EEE d'))}</th>`)
    .join('\n');

  return `
    <section class="week-view">
      <div class="section-header">
        <h2>Week of ${escapeHtml(format(weekStart, 'MMMM d, yyyy'))}</h2>
        <div class="section-meta">${totalAppointments} jobs · ${totalHours.toFixed(1)} hrs scheduled</div>
      </div>
      <div class="summary-grid">
        ${summaryCards}
      </div>
      <table class="week-grid">
        <thead>
          <tr>
            <th></th>
            ${headerCells}
          </tr>
        </thead>
        <tbody>
${tableBody}
        </tbody>
      </table>
      <div class="notes-section">
        <h3>Rolling Alerts</h3>
        ${alertsList}
      </div>
    </section>`;
}

function buildMonthCell(date: Date, currentMonth: Date, events: CalendarEventSnapshot[]): string {
  const isOutside = date.getMonth() !== currentMonth.getMonth();
  const sorted = events
    .filter((event) => isSameDay(event.start, date))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const entries = sorted.length
    ? `<ul class="month-list">
        ${sorted.slice(0, 3)
          .map((event) => {
            const priority = getPriority(event);
            const labelParts = [format(event.start, 'p'), event.title];
            const vehicle = getVehicleModel(event);
            if (vehicle) {
              labelParts.push(vehicle);
            }
            return `<li class="month-entry priority-${escapeHtml(priority)}">${escapeHtml(labelParts.join(' • '))}</li>`;
          })
          .join('\n')}
        ${sorted.length > 3 ? `<li class="month-entry more">+${sorted.length - 3} more…</li>` : ''}
      </ul>`
    : '<div class="cell-empty">—</div>';

  return `
    <div class="month-cell ${isOutside ? 'outside' : ''}">
      <div class="cell-header">
        <span class="date-number">${date.getDate()}</span>
        <span class="day-name">${escapeHtml(format(date, 'EEE'))}</span>
      </div>
      ${entries}
    </div>`;
}

function buildMonthView(monthStart: Date, events: CalendarEventSnapshot[]): string {
  const monthEnd = endOfMonth(monthStart);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const gridDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const weeks: Date[][] = [];
  for (let i = 0; i < gridDays.length; i += 7) {
    weeks.push(gridDays.slice(i, i + 7));
  }

  const monthEvents = events.filter((event) => isWithinInterval(event.start, { start: monthStart, end: monthEnd }));
  const totalAppointments = monthEvents.length;
  const highPriority = monthEvents.filter((event) => getPriority(event) === 'high');
  const baySummary = computeBaySummary(monthEvents);

  const weekLoad = new Map<string, { start: Date; count: number }>();
  monthEvents.forEach((event) => {
    const start = startOfWeek(event.start, { weekStartsOn: 0 });
    const key = start.toISOString();
    const record = weekLoad.get(key) ?? { start, count: 0 };
    record.count += 1;
    weekLoad.set(key, record);
  });

  const busiestWeek = Array.from(weekLoad.values()).sort((a, b) => b.count - a.count)[0];
  const busiestLabel = busiestWeek
    ? `${format(busiestWeek.start, 'MMM d')} – ${format(addDays(busiestWeek.start, 6), 'MMM d')}`
    : '—';

  const summaryCards = [
    renderSummaryCard('Total jobs', String(totalAppointments)),
    renderSummaryCard('High priority', String(highPriority.length)),
    renderSummaryCard('Busiest week', busiestLabel, busiestWeek ? `${busiestWeek.count} jobs` : undefined),
  ];

  if (baySummary.length > 0) {
    const topBay = baySummary[0];
    summaryCards.push(renderSummaryCard('Heaviest bay', topBay.label, `${topBay.hours.toFixed(1)} hrs`));
  }

  const highlights = highPriority
    .slice()
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, 6)
    .map((event) => {
      const label = `${format(event.start, 'MMM d')} — ${event.title}`;
      return `<li>${escapeHtml(label)}</li>`;
    })
    .join('\n');

  const highlightsList = highlights ? `<ul class="notes-list">${highlights}</ul>` : '<p class="empty-cell">No high priority jobs on the books yet.</p>';

  const weekRows = weeks
    .map((week) => {
      const cells = week
        .map((day) => buildMonthCell(day, monthStart, events))
        .join('\n');
      return `<div class="month-week">${cells}</div>`;
    })
    .join('\n');

  return `
    <section class="month-view">
      <div class="section-header">
        <h2>${escapeHtml(format(monthStart, 'MMMM yyyy'))}</h2>
        <div class="section-meta">${totalAppointments} jobs scheduled</div>
      </div>
      <div class="summary-grid">
        ${summaryCards.join('\n')}
      </div>
      <div class="month-grid">
        <div class="month-week month-header">
          ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
            .map((day) => `<div class="month-day-header">${day}</div>`)
            .join('')}
        </div>
        ${weekRows}
      </div>
      <div class="notes-section">
        <h3>Upcoming Highlights</h3>
        ${highlightsList}
      </div>
    </section>`;
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
      return {
        start: startOfMonth(reference),
        end: endOfMonth(reference),
      };
  }
}

function buildHeader(scope: PrintScope, rangeLabel: string, title: string, generatedAt: string): string {
  const scopeLabel = scope === 'day' ? 'Daily' : scope === 'week' ? 'Weekly' : 'Monthly';
  return `
    <header class="print-header">
      <div>
        <h1>${escapeHtml(`${scopeLabel} Schedule`)}</h1>
        <div class="range">${escapeHtml(rangeLabel)}</div>
      </div>
      <div class="meta">
        <div class="scope-badge">${escapeHtml(scopeLabel)} overview</div>
        <div>${escapeHtml(title)}</div>
        <div>Generated ${escapeHtml(generatedAt)}</div>
      </div>
    </header>`;
}

function buildStyles(): string {
  return `
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #0f172a;
      background: #ffffff;
      line-height: 1.4;
    }
    .print-container {
      padding: 32px 40px;
    }
    .print-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 18px;
      margin-bottom: 28px;
    }
    .print-header h1 {
      margin: 0;
      font-size: 26px;
      font-weight: 600;
    }
    .print-header .range {
      font-size: 14px;
      color: #475569;
      margin-top: 6px;
    }
    .print-header .meta {
      text-align: right;
      font-size: 12px;
      color: #64748b;
    }
    .scope-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      background: #e0f2fe;
      color: #0c4a6e;
      font-weight: 600;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }
    .summary-card {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-height: 90px;
    }
    .summary-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
    }
    .summary-value {
      font-size: 22px;
      font-weight: 600;
      color: #0f172a;
    }
    .summary-subvalue {
      font-size: 12px;
      color: #64748b;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 16px;
      margin-bottom: 18px;
    }
    .section-header h2 {
      margin: 0;
      font-size: 22px;
      font-weight: 600;
    }
    .section-meta {
      font-size: 14px;
      color: #475569;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    th, td {
      border: 1px solid #e2e8f0;
      padding: 10px;
      font-size: 12px;
      vertical-align: top;
    }
    th {
      background: #f1f5f9;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 600;
      color: #0f172a;
    }
    td {
      color: #1f2937;
    }
    .time-col {
      width: 128px;
      white-space: nowrap;
    }
    .job-title {
      font-weight: 600;
      color: #0f172a;
    }
    .job-status {
      font-size: 11px;
      color: #64748b;
      margin-top: 4px;
    }
    .text-right {
      text-align: right;
    }
    .empty-cell {
      text-align: center;
      color: #94a3b8;
      font-style: italic;
    }
    .priority-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .priority-high { background: #fee2e2; color: #b91c1c; }
    .priority-medium { background: #fef3c7; color: #c2410c; }
    .priority-low { background: #dcfce7; color: #15803d; }
    .priority-row.priority-high { border-left: 4px solid #dc2626; }
    .priority-row.priority-medium { border-left: 4px solid #f97316; }
    .priority-row.priority-low { border-left: 4px solid #10b981; }
    .notes-section {
      margin-top: 12px;
      margin-bottom: 28px;
    }
    .notes-section h3 {
      margin: 0 0 8px;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #475569;
    }
    .notes-list {
      margin: 0;
      padding-left: 18px;
      color: #1f2937;
      font-size: 12px;
    }
    .notes-list li {
      margin-bottom: 4px;
    }
    .week-grid th, .week-grid td {
      text-align: left;
      vertical-align: top;
    }
    .slot-label {
      width: 160px;
      background: #f8fafc;
      font-weight: 600;
    }
    .week-day {
      text-align: center;
      font-weight: 600;
      font-size: 13px;
    }
    .week-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .week-entry {
      padding: 6px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .week-entry:last-child {
      border-bottom: none;
    }
    .entry-title {
      font-weight: 600;
      font-size: 12px;
      margin-bottom: 3px;
    }
    .entry-meta {
      font-size: 11px;
      color: #475569;
    }
    .cell-empty {
      padding: 12px;
      text-align: center;
      color: #94a3b8;
    }
    .month-grid {
      display: grid;
      gap: 10px;
    }
    .month-week {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 10px;
    }
    .month-day-header {
      text-align: center;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      color: #475569;
      padding-bottom: 6px;
    }
    .month-cell {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px;
      min-height: 110px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
    }
    .month-cell.outside {
      background: #f8fafc;
      color: #94a3b8;
    }
    .cell-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      font-size: 12px;
      color: #475569;
    }
    .date-number {
      font-weight: 600;
      font-size: 14px;
      color: #0f172a;
    }
    .month-list {
      list-style: none;
      padding: 0;
      margin: 0;
      font-size: 11px;
      color: #1f2937;
    }
    .month-entry {
      margin-bottom: 6px;
      line-height: 1.3;
      padding-left: 10px;
      position: relative;
    }
    .month-entry::before {
      content: '•';
      position: absolute;
      left: 0;
      color: #1d4ed8;
    }
    .month-entry.priority-high::before { color: #dc2626; }
    .month-entry.priority-medium::before { color: #d97706; }
    .month-entry.priority-low::before { color: #15803d; }
    .month-entry.more {
      font-style: italic;
      color: #64748b;
    }
    @media print {
      body { margin: 0; }
      .print-container { padding: 24px 28px; }
      .summary-card { page-break-inside: avoid; }
      table { page-break-inside: avoid; }
      .month-week { page-break-inside: avoid; }
    }
  `;
}

function renderContent(scope: PrintScope, rangeStart: Date, events: CalendarEventSnapshot[]): string {
  if (scope === 'day') {
    return buildDayView(rangeStart, events.filter((event) => isSameDay(event.start, rangeStart)));
  }

  if (scope === 'week') {
    return buildWeekView(rangeStart, events);
  }

  return buildMonthView(rangeStart, events);
}

export function openPrintableSchedule({ scope, anchorDate, events, title = 'Mechanic Call App' }: PrintOptions) {
  if (typeof window === 'undefined') {
    return;
  }

  const { start, end } = getRangeForScope(scope, anchorDate);
  const filtered = events
    .filter((event) => event.start < end && event.end > start)
    .map((event) => ({
      ...event,
      start: new Date(event.start),
      end: new Date(event.end),
    }));

  const rangeLabel =
    scope === 'day'
      ? format(start, 'EEEE, MMMM d, yyyy')
      : scope === 'week'
      ? `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
      : format(start, 'MMMM yyyy');

  const generatedAt = format(new Date(), 'PPpp');
  const styles = buildStyles();
  const header = buildHeader(scope, rangeLabel, title, generatedAt);
  const content = renderContent(scope, start, filtered);

  const html = `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(`${title} | ${rangeLabel}`)}</title>
      <style>${styles}</style>
    </head>
    <body>
      <div class="print-container">
        ${header}
        ${content}
      </div>
    </body>
  </html>`;

  const canUseBlobUrl = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function';

  if (canUseBlobUrl) {
    const documentBlob = new Blob([html], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(documentBlob);
    const popupWindow = window.open(blobUrl, '_blank', 'noopener');
    if (!popupWindow) {
      URL.revokeObjectURL(blobUrl);
      console.error('Unable to open print window. Please allow pop-ups for this site.');
      return;
    }

    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) {
        return;
      }
      cleanedUp = true;
      try {
        URL.revokeObjectURL(blobUrl);
      } catch {
        // Best-effort revoke; ignore errors
      }
    };

    const triggerPrint = () => {
      if (cleanedUp || popupWindow.closed) {
        cleanup();
        return;
      }

      try {
        popupWindow.focus();
        popupWindow.print();
      } catch (error) {
        console.error('Print failed', error);
      } finally {
        cleanup();
      }
    };

    const handleLoad = () => {
      popupWindow.removeEventListener('load', handleLoad);
      triggerPrint();
    };

    popupWindow.addEventListener('load', handleLoad);
    popupWindow.addEventListener('beforeunload', cleanup);

    setTimeout(() => {
      if (!cleanedUp) {
        triggerPrint();
      }
    }, 800);

    return;
  }

  const fallbackWindow = window.open('', '_blank', 'noopener');
  if (!fallbackWindow) {
    console.error('Unable to open print window. Please allow pop-ups for this site.');
    return;
  }

  fallbackWindow.document.open();
  fallbackWindow.document.write(html);
  fallbackWindow.document.close();
  fallbackWindow.focus();

  setTimeout(() => {
    try {
      fallbackWindow.print();
    } catch (error) {
      console.error('Print failed', error);
    }
  }, 250);
}

