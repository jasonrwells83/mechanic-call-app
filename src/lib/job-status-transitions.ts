// Job Status Transition Logic
// Handles validation, rules, and notifications for job status changes

import type { JobStatus, Job } from '@/types/database';

// Status transition rules and validation
export interface StatusTransition {
  from: JobStatus;
  to: JobStatus;
  isValid: boolean;
  requiresConfirmation?: boolean;
  warningMessage?: string;
  successMessage?: string;
  prerequisites?: string[];
  autoActions?: string[];
}

// Define all possible status transitions with their rules
export const STATUS_TRANSITIONS: StatusTransition[] = [
  // From Incoming Call
  {
    from: 'incoming-call',
    to: 'scheduled',
    isValid: true,
    successMessage: 'Job scheduled successfully',
    prerequisites: ['Customer information confirmed', 'Service details documented'],
    autoActions: ['Create appointment slot', 'Send customer confirmation'],
  },
  
  // From Scheduled
  {
    from: 'scheduled',
    to: 'in-bay',
    isValid: true,
    successMessage: 'Job started in bay',
    prerequisites: ['Bay available', 'Technician assigned'],
    autoActions: ['Start time tracking', 'Update bay status'],
  },
  {
    from: 'scheduled',
    to: 'completed',
    isValid: true,
    requiresConfirmation: true,
    warningMessage: 'Are you sure you want to mark this job as completed without starting work?',
    successMessage: 'Job marked as completed',
    autoActions: ['Free up scheduled slot', 'Generate completion report'],
  },
  
  // From In Bay
  {
    from: 'in-bay',
    to: 'waiting-parts',
    isValid: true,
    successMessage: 'Job moved to waiting for parts',
    prerequisites: ['Parts order created'],
    autoActions: ['Free up bay', 'Create parts order', 'Set follow-up reminder'],
  },
  {
    from: 'in-bay',
    to: 'completed',
    isValid: true,
    successMessage: 'Job completed successfully',
    prerequisites: ['Work completed', 'Quality check passed'],
    autoActions: ['Free up bay', 'Stop time tracking', 'Generate invoice'],
  },
  
  // From Waiting Parts
  {
    from: 'waiting-parts',
    to: 'in-bay',
    isValid: true,
    successMessage: 'Job resumed in bay',
    prerequisites: ['Parts received', 'Bay available'],
    autoActions: ['Resume time tracking', 'Update bay status'],
  },
  {
    from: 'waiting-parts',
    to: 'completed',
    isValid: true,
    requiresConfirmation: true,
    warningMessage: 'Completing without returning to bay - is this correct?',
    successMessage: 'Job completed',
    autoActions: ['Generate completion report'],
  },
  
  // From Completed (generally not allowed, but for special cases)
  {
    from: 'completed',
    to: 'in-bay',
    isValid: false, // Can be overridden with special permissions
    requiresConfirmation: true,
    warningMessage: 'Reopening a completed job requires supervisor approval',
    successMessage: 'Job reopened for additional work',
    autoActions: ['Create follow-up work order'],
  },
];

// Status metadata for UI and business logic
export const STATUS_METADATA = {
  'incoming-call': {
    label: 'Incoming Call',
    description: 'New customer inquiry',
    color: '#64748b',
    icon: 'phone',
    allowsEditing: true,
    requiresAppointment: false,
    tracksBayTime: false,
  },
  'scheduled': {
    label: 'Scheduled',
    description: 'Appointment booked',
    color: '#2563eb',
    icon: 'calendar',
    allowsEditing: true,
    requiresAppointment: true,
    tracksBayTime: false,
  },
  'in-bay': {
    label: 'In Bay',
    description: 'Work in progress',
    color: '#16a34a',
    icon: 'wrench',
    allowsEditing: false,
    requiresAppointment: true,
    tracksBayTime: true,
  },
  'waiting-parts': {
    label: 'Waiting Parts',
    description: 'Pending parts delivery',
    color: '#ea580c',
    icon: 'clock',
    allowsEditing: true,
    requiresAppointment: false,
    tracksBayTime: false,
  },
  'completed': {
    label: 'Completed',
    description: 'Work finished',
    color: '#64748b',
    icon: 'check-circle',
    allowsEditing: false,
    requiresAppointment: false,
    tracksBayTime: false,
  },
} as const;

// Service class for managing status transitions
export class JobStatusTransitionService {
  /**
   * Validate if a status transition is allowed
   */
  static validateTransition(
    currentStatus: JobStatus, 
    targetStatus: JobStatus,
    job?: Job
  ): StatusTransition | null {
    const transition = STATUS_TRANSITIONS.find(
      t => t.from === currentStatus && t.to === targetStatus
    );

    if (!transition) {
      return null;
    }

    // Additional business logic validation
    if (!transition.isValid) {
      return transition;
    }

    // Check prerequisites based on job data
    if (transition.prerequisites && job) {
      // Add specific validation logic here
      // For now, we'll assume prerequisites are met
    }

    return transition;
  }

  /**
   * Get all valid transitions from a current status
   */
  static getValidTransitions(currentStatus: JobStatus): StatusTransition[] {
    return STATUS_TRANSITIONS.filter(
      t => t.from === currentStatus && t.isValid
    );
  }

  /**
   * Get next logical status in the workflow
   */
  static getNextStatus(currentStatus: JobStatus): JobStatus | null {
    const validTransitions = this.getValidTransitions(currentStatus);
    
    // Return the most common next status
    const statusPriority: Record<JobStatus, number> = {
      'incoming-call': 1,
      'scheduled': 2,
      'in-bay': 3,
      'waiting-parts': 4,
      'completed': 5,
    };

    const nextTransition = validTransitions
      .sort((a, b) => statusPriority[a.to] - statusPriority[b.to])[0];

    return nextTransition?.to || null;
  }

  /**
   * Check if a job can be moved to a specific status
   */
  static canTransitionTo(
    job: Job, 
    targetStatus: JobStatus,
    context?: {
      bayCapacity?: number;
      currentBayJobs?: number;
      userPermissions?: string[];
    }
  ): { allowed: boolean; reason?: string } {
    const transition = this.validateTransition(job.status, targetStatus, job);

    if (!transition) {
      return {
        allowed: false,
        reason: `Invalid transition from ${job.status} to ${targetStatus}`,
      };
    }

    if (!transition.isValid) {
      return {
        allowed: false,
        reason: transition.warningMessage || 'Transition not allowed',
      };
    }

    // Check bay capacity for in-bay transitions
    if (targetStatus === 'in-bay' && context?.bayCapacity && context?.currentBayJobs) {
      if (context.currentBayJobs >= context.bayCapacity) {
        return {
          allowed: false,
          reason: 'Bay is at full capacity',
        };
      }
    }

    // Check high priority jobs
    if (job.priority === 'high' && targetStatus === 'waiting-parts') {
      return {
        allowed: true,
        reason: 'High priority job - consider expediting parts order',
      };
    }

    return { allowed: true };
  }

  /**
   * Generate transition confirmation message
   */
  static getTransitionMessage(
    job: Job,
    targetStatus: JobStatus,
    transition: StatusTransition
  ): {
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success';
    actions?: string[];
  } {
    const statusLabel = STATUS_METADATA[targetStatus].label;
    
    if (transition.requiresConfirmation && transition.warningMessage) {
      return {
        title: `Move to ${statusLabel}?`,
        message: transition.warningMessage,
        type: 'warning',
        actions: transition.autoActions,
      };
    }

    return {
      title: `Moving to ${statusLabel}`,
      message: transition.successMessage || `Job moved to ${statusLabel.toLowerCase()}`,
      type: 'success',
      actions: transition.autoActions,
    };
  }

  /**
   * Get status workflow progress percentage
   */
  static getWorkflowProgress(status: JobStatus): number {
    const progressMap: Record<JobStatus, number> = {
      'incoming-call': 0,
      'scheduled': 25,
      'in-bay': 50,
      'waiting-parts': 75, // Considered progress even though waiting
      'completed': 100,
    };

    return progressMap[status] || 0;
  }

  /**
   * Get estimated time in current status
   */
  static getEstimatedTimeInStatus(status: JobStatus): {
    min: number; // hours
    max: number; // hours
    description: string;
  } {
    const estimates = {
      'incoming-call': {
        min: 0,
        max: 24,
        description: 'Typically scheduled within 24 hours',
      },
      'scheduled': {
        min: 0,
        max: 168, // 1 week
        description: 'Waiting for appointment date',
      },
      'in-bay': {
        min: 1,
        max: 8,
        description: 'Active work in progress',
      },
      'waiting-parts': {
        min: 24,
        max: 720, // 30 days
        description: 'Depends on parts availability',
      },
      'completed': {
        min: 0,
        max: 0,
        description: 'Work finished',
      },
    };

    return estimates[status];
  }
}

// Helper functions for common operations
export function isStatusTransitionValid(from: JobStatus, to: JobStatus): boolean {
  return JobStatusTransitionService.validateTransition(from, to)?.isValid ?? false;
}

export function getStatusColor(status: JobStatus): string {
  return STATUS_METADATA[status].color;
}

export function getStatusLabel(status: JobStatus): string {
  return STATUS_METADATA[status].label;
}

export function getWorkflowSteps(): Array<{ status: JobStatus; label: string; description: string }> {
  return Object.entries(STATUS_METADATA).map(([status, meta]) => ({
    status: status as JobStatus,
    label: meta.label,
    description: meta.description,
  }));
}
