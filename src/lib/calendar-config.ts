// Calendar Configuration
// FullCalendar configuration for the mechanic shop scheduling system

import type { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import resourcePlugin from '@fullcalendar/resource';
import resourceDayGridPlugin from '@fullcalendar/resource-daygrid';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { BayResource, CalendarEvent } from '@/types/database';

// Bay resources configuration (2-bay setup as per PRD)
export const bayResources: BayResource[] = [
  {
    id: 'bay-1',
    title: 'Bay 1',
    businessHours: {
      daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
      startTime: '08:00',
      endTime: '17:00',
    },
  },
  {
    id: 'bay-2',
    title: 'Bay 2',
    businessHours: {
      daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
      startTime: '08:00',
      endTime: '17:00',
    },
  },
];

// Enhanced status-based colors for calendar events
export const statusColors = {
  'incoming-call': {
    backgroundColor: '#f8fafc',
    borderColor: '#64748b',
    textColor: '#334155',
    gradient: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
    shadowColor: 'rgba(100, 116, 139, 0.2)',
    pulseColor: '#64748b',
  },
  'scheduled': {
    backgroundColor: '#dbeafe',
    borderColor: '#2563eb',
    textColor: '#1e40af',
    gradient: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
    shadowColor: 'rgba(37, 99, 235, 0.25)',
    pulseColor: '#2563eb',
  },
  'in-bay': {
    backgroundColor: '#dcfce7',
    borderColor: '#16a34a',
    textColor: '#15803d',
    gradient: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
    shadowColor: 'rgba(22, 163, 74, 0.25)',
    pulseColor: '#16a34a',
  },
  'waiting-parts': {
    backgroundColor: '#fed7aa',
    borderColor: '#ea580c',
    textColor: '#c2410c',
    gradient: 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)',
    shadowColor: 'rgba(234, 88, 12, 0.25)',
    pulseColor: '#ea580c',
    pattern: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(234, 88, 12, 0.1) 2px, rgba(234, 88, 12, 0.1) 6px)',
  },
  'completed': {
    backgroundColor: '#f1f5f9',
    borderColor: '#64748b',
    textColor: '#475569',
    gradient: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
    shadowColor: 'rgba(100, 116, 139, 0.15)',
    pulseColor: '#64748b',
    opacity: 0.8,
  },
} as const;

// Enhanced priority-based styling
export const priorityStyles = {
  'low': {
    borderWidth: '2px',
    borderStyle: 'solid',
    opacity: '0.9',
    transform: 'scale(1)',
  },
  'medium': {
    borderWidth: '3px',
    borderStyle: 'solid',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    transform: 'scale(1.01)',
  },
  'high': {
    borderWidth: '4px',
    borderStyle: 'solid',
    boxShadow: '0 4px 8px rgba(239, 68, 68, 0.3), 0 0 0 1px rgba(239, 68, 68, 0.2)',
    transform: 'scale(1.02)',
    animation: 'priority-pulse 2s ease-in-out infinite',
    zIndex: '10',
  },
} as const;

// Time-sensitive styling (for overdue or urgent appointments)
export const timeSensitiveStyles = {
  'overdue': {
    borderColor: '#dc2626',
    backgroundColor: '#fee2e2',
    animation: 'urgent-pulse 1.5s ease-in-out infinite',
    boxShadow: '0 0 0 2px rgba(220, 38, 38, 0.3)',
  },
  'due-soon': {
    borderColor: '#f59e0b',
    backgroundColor: '#fef3c7',
    boxShadow: '0 2px 4px rgba(245, 158, 11, 0.2)',
  },
  'future': {
    opacity: '0.85',
  },
} as const;

// Default calendar configuration
export const defaultCalendarConfig: Partial<CalendarOptions> = {
  // Plugins
  plugins: [
    dayGridPlugin,
    timeGridPlugin,
    resourcePlugin,
    resourceDayGridPlugin,
    resourceTimeGridPlugin,
    interactionPlugin,
  ],

  // Initial view - resource timeline for 2-bay layout as per PRD
  initialView: 'resourceTimeGridDay',

  // Header toolbar configuration
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'resourceTimeGridDay,resourceTimeGridWeek,dayGridMonth',
  },

  // Views configuration
  views: {
    resourceTimeGridDay: {
      type: 'resourceTimeGrid',
      duration: { days: 1 },
      buttonText: 'Day',
      slotMinTime: '07:00:00',
      slotMaxTime: '19:00:00',
      slotDuration: '00:30:00', // 30-minute slots
      slotLabelInterval: '01:00:00', // Hour labels
      eventMinHeight: 50, // Minimum height for events to show content
      resourceAreaWidth: '15%',
      resourceAreaColumns: [
        {
          field: 'title',
          headerContent: 'Bays',
        },
      ],
    },
    resourceTimeGridWeek: {
      type: 'resourceTimeGrid',
      duration: { weeks: 1 },
      buttonText: 'Week',
      slotMinTime: '07:00:00',
      slotMaxTime: '19:00:00',
      slotDuration: '01:00:00', // 1-hour slots for week view
      eventMinHeight: 45, // Slightly smaller for week view
      resourceAreaWidth: '12%',
    },
    dayGridMonth: {
      type: 'dayGrid',
      buttonText: 'Month',
    },
  },

  // Resources (bays)
  resources: bayResources,

  // Business hours
  businessHours: {
    daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
    startTime: '08:00',
    endTime: '17:00',
  },

  // Interaction settings
  editable: true,
  droppable: true,
  selectable: false,  // Disable selection to prevent highlighting issues
  selectMirror: false,
  unselectAuto: false, // Don't auto-unselect to avoid selector issues
  eventStartEditable: true,
  eventDurationEditable: true,

  // Event settings
  eventResizableFromStart: true,
  eventDurationEditable: true,
  eventStartEditable: true,
  
  // Enable dragging events outside the calendar
  dragRevertDuration: 500,
  eventDragMinDistance: 5,

  // Styling
  height: 'auto',
  aspectRatio: 1.35,
  nowIndicator: true,
  weekends: false, // Hide weekends by default (shop closed)

  // Slot configuration
  slotEventOverlap: false, // Prevent overlapping appointments
  selectOverlap: false,
  eventOverlap: false,

  // Event rendering
  eventClassNames: (arg) => {
    const classes = ['calendar-event'];
    
    if (arg.event.extendedProps?.status) {
      classes.push(`status-${arg.event.extendedProps.status}`);
    }
    
    if (arg.event.extendedProps?.priority) {
      classes.push(`priority-${arg.event.extendedProps.priority}`);
    }

    return classes;
  },

  // Custom event content to format multi-line information
  eventContent: (arg) => {
    const { event } = arg;
    const props = event.extendedProps;
    
    // For day/week views, show more detailed content
    if (arg.view.type.includes('timeGrid')) {
      const jobTitle = event.title.split(' - ')[0]; // Get just the job part
      const customerName = props?.customerName;
      const vehicleInfo = props?.vehicleInfo;
      
      return {
        html: `
          <div class="custom-event-content">
            <div class="event-job-title">${jobTitle}</div>
            ${customerName ? `<div class="event-customer">${customerName}</div>` : ''}
            ${vehicleInfo ? `<div class="event-vehicle">${vehicleInfo}</div>` : ''}
          </div>
        `
      };
    }
    
    // For month view, keep it simpler
    return { html: `<div class="fc-event-title">${event.title}</div>` };
  },

  // Enhanced event styling function
  eventDidMount: (info) => {
    const { event } = info;
    const status = event.extendedProps?.status;
    const priority = event.extendedProps?.priority;
    const startTime = event.start;
    const now = new Date();

    // Apply status colors with enhanced features
    if (status && statusColors[status as keyof typeof statusColors]) {
      const colors = statusColors[status as keyof typeof statusColors];
      
      // Base colors
      info.el.style.backgroundColor = colors.backgroundColor;
      info.el.style.borderColor = colors.borderColor;
      info.el.style.color = colors.textColor;
      
      // Enhanced visual features
      if (colors.gradient) {
        info.el.style.background = colors.gradient;
      }
      
      if (colors.pattern) {
        info.el.style.backgroundImage = colors.pattern;
      }
      
      if (colors.opacity) {
        info.el.style.opacity = colors.opacity.toString();
      }
      
      if (colors.shadowColor) {
        info.el.style.boxShadow = `0 2px 4px ${colors.shadowColor}`;
      }
    }

    // Apply priority styling
    if (priority && priorityStyles[priority as keyof typeof priorityStyles]) {
      const styles = priorityStyles[priority as keyof typeof priorityStyles];
      Object.assign(info.el.style, styles);
    }

    // Apply time-sensitive styling
    if (startTime) {
      const timeDiff = startTime.getTime() - now.getTime();
      const hoursUntil = timeDiff / (1000 * 60 * 60);
      
      let timeStyle: keyof typeof timeSensitiveStyles | null = null;
      
      if (hoursUntil < 0 && status !== 'completed') {
        timeStyle = 'overdue';
      } else if (hoursUntil <= 2 && hoursUntil > 0 && status === 'scheduled') {
        timeStyle = 'due-soon';
      } else if (hoursUntil > 24) {
        timeStyle = 'future';
      }
      
      if (timeStyle && timeSensitiveStyles[timeStyle]) {
        const timeStyles = timeSensitiveStyles[timeStyle];
        Object.assign(info.el.style, timeStyles);
      }
    }

    // Add status indicator icons
    addStatusIndicator(info.el, status, priority);

    // Add tooltip with job details
    const tooltip = createEventTooltip(event);
    info.el.setAttribute('title', tooltip);
    info.el.style.cursor = 'pointer';
    
    // Add hover effects
    info.el.addEventListener('mouseenter', () => {
      info.el.style.transform = `${info.el.style.transform || ''} translateY(-1px)`;
      info.el.style.filter = 'brightness(1.05)';
    });
    
    info.el.addEventListener('mouseleave', () => {
      info.el.style.transform = info.el.style.transform?.replace(' translateY(-1px)', '') || '';
      info.el.style.filter = '';
    });
  },

  // Validation functions
  selectAllow: (selectInfo) => {
    // Only allow selection during business hours
    const start = selectInfo.start;
    const end = selectInfo.end;
    const businessStart = new Date(start);
    businessStart.setHours(8, 0, 0, 0); // 8 AM
    const businessEnd = new Date(start);
    businessEnd.setHours(17, 0, 0, 0); // 5 PM

    return start >= businessStart && end <= businessEnd;
  },

  eventAllow: (dropInfo, draggedEvent) => {
    // Prevent scheduling outside business hours
    const start = dropInfo.start;
    const end = dropInfo.end;
    
    if (!start || !end) return false;

    const businessStart = new Date(start);
    businessStart.setHours(8, 0, 0, 0);
    const businessEnd = new Date(start);
    businessEnd.setHours(17, 0, 0, 0);

    return start >= businessStart && end <= businessEnd;
  },
};

// Helper function to add status indicator icons
function addStatusIndicator(element: HTMLElement, status?: string, priority?: string) {
  // Remove existing indicators
  const existingIndicator = element.querySelector('.status-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }

  const indicator = document.createElement('div');
  indicator.className = 'status-indicator';
  indicator.style.cssText = `
    position: absolute;
    top: 2px;
    right: 2px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    z-index: 10;
    pointer-events: none;
  `;

  let indicatorColor = '#64748b';
  let shouldPulse = false;

  switch (status) {
    case 'scheduled':
      indicatorColor = '#2563eb';
      break;
    case 'in-bay':
      indicatorColor = '#16a34a';
      shouldPulse = true;
      break;
    case 'waiting-parts':
      indicatorColor = '#ea580c';
      shouldPulse = true;
      break;
    case 'completed':
      indicatorColor = '#64748b';
      break;
    default:
      indicatorColor = '#64748b';
  }

  indicator.style.backgroundColor = indicatorColor;
  indicator.style.boxShadow = `0 0 0 1px white, 0 0 4px ${indicatorColor}`;

  if (shouldPulse) {
    indicator.style.animation = 'status-pulse 2s ease-in-out infinite';
  }

  // Add priority indicator
  if (priority === 'high') {
    const priorityIndicator = document.createElement('div');
    priorityIndicator.className = 'priority-indicator';
    priorityIndicator.style.cssText = `
      position: absolute;
      top: 2px;
      left: 2px;
      width: 0;
      height: 0;
      border-left: 6px solid #dc2626;
      border-bottom: 6px solid transparent;
      z-index: 10;
      pointer-events: none;
    `;
    element.appendChild(priorityIndicator);
  }

  element.appendChild(indicator);
}

// Helper function to create event tooltips
function createEventTooltip(event: any): string {
  const props = event.extendedProps;
  const lines = [
    `Job: ${event.title}`,
    `Time: ${event.start.toLocaleTimeString()} - ${event.end.toLocaleTimeString()}`,
    `Status: ${props?.status || 'Unknown'}`,
    `Priority: ${props?.priority || 'Medium'}`,
  ];

  if (props?.customerName) {
    lines.push(`Customer: ${props.customerName}`);
  }

  if (props?.vehicleInfo) {
    lines.push(`Vehicle: ${props.vehicleInfo}`);
  }

  if (props?.estimatedHours) {
    lines.push(`Est. Hours: ${props.estimatedHours}`);
  }

  if (props?.invoiceNumber) {
    lines.push(`Invoice: ${props.invoiceNumber}`);
  }

  return lines.join('\n');
}

// Calendar event factory function
export function createCalendarEvent(
  appointment: any,
  job?: any,
  customer?: any,
  vehicle?: any
): CalendarEvent {
  // Create a detailed title with job, customer, and vehicle info
  const jobTitle = job?.title || `Job ${appointment.jobId}`;
  const customerName = customer?.name;
  const vehicleInfo = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : undefined;
  
  // Build title with available information
  let title = jobTitle;
  if (customerName) {
    title += ` - ${customerName}`;
  }
  if (vehicleInfo) {
    title += ` (${vehicleInfo})`;
  }

  return {
    id: appointment.id,
    title,
    start: new Date(appointment.startAt),
    end: new Date(appointment.endAt),
    resourceId: appointment.bay,
    backgroundColor: statusColors[job?.status as keyof typeof statusColors]?.backgroundColor,
    borderColor: statusColors[job?.status as keyof typeof statusColors]?.borderColor,
    extendedProps: {
      jobId: appointment.jobId,
      customerId: job?.customerId,
      vehicleId: job?.vehicleId,
      status: job?.status || 'scheduled',
      priority: job?.priority || 'medium',
      estimatedHours: job?.estHours,
      customerName: customer?.name,
      vehicleInfo: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : undefined,
      vehicleModel: vehicle?.model,
      appointmentId: appointment.id,
      invoiceNumber: job?.invoiceNumber,
    },
  };
}

// Bay availability checker
export function checkBayAvailability(
  bayId: string,
  startTime: Date,
  endTime: Date,
  existingEvents: CalendarEvent[],
  excludeEventId?: string
): boolean {
  const bayEvents = existingEvents.filter(
    event => event.resourceId === bayId && event.id !== excludeEventId
  );

  return !bayEvents.some(event => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    
    // Check for overlap
    return (
      (startTime >= eventStart && startTime < eventEnd) ||
      (endTime > eventStart && endTime <= eventEnd) ||
      (startTime <= eventStart && endTime >= eventEnd)
    );
  });
}

// Time slot generator for scheduling suggestions
export function generateTimeSlots(
  date: Date,
  duration: number, // in hours
  slotSize: number = 0.5 // 30-minute slots
): Array<{ start: Date; end: Date }> {
  const slots = [];
  const businessStart = new Date(date);
  businessStart.setHours(8, 0, 0, 0);
  const businessEnd = new Date(date);
  businessEnd.setHours(17, 0, 0, 0);

  let currentTime = new Date(businessStart);
  
  while (currentTime.getTime() + (duration * 60 * 60 * 1000) <= businessEnd.getTime()) {
    const slotEnd = new Date(currentTime.getTime() + (duration * 60 * 60 * 1000));
    
    slots.push({
      start: new Date(currentTime),
      end: slotEnd,
    });

    // Move to next slot
    currentTime = new Date(currentTime.getTime() + (slotSize * 60 * 60 * 1000));
  }

  return slots;
}


