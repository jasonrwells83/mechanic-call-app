// Kanban Board Component
// Main kanban board for job management with drag-and-drop status transitions

import React, { useState, useCallback, useMemo } from 'react';
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal,
  Clock,
  AlertTriangle,
  CheckCircle,
  Wrench,
  Phone,
  Calendar as CalendarIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import './kanban.css';
import { useJobs, useUpdateJobStatus } from '@/hooks/use-jobs';
import { useUIStore } from '@/stores';
import { JobStatusTransitionService, isStatusTransitionValid, getStatusLabel } from '@/lib/job-status-transitions';
import type { Job, JobStatus } from '@/types/database';

interface KanbanBoardProps {
  onJobClick?: (job: Job) => void;
  onJobEdit?: (job: Job) => void;
  onJobCreate?: () => void;
  className?: string;
}

// Kanban column configuration
const KANBAN_COLUMNS = [
  {
    id: 'incoming-call' as JobStatus,
    title: 'Incoming Calls',
    description: 'New customer calls and inquiries',
    icon: Phone,
    color: 'bg-slate-50 border-slate-200',
    headerColor: 'bg-slate-100',
    maxItems: undefined,
  },
  {
    id: 'scheduled' as JobStatus,
    title: 'Scheduled',
    description: 'Jobs scheduled for service',
    icon: CalendarIcon,
    color: 'bg-blue-50 border-blue-200',
    headerColor: 'bg-blue-100',
    maxItems: undefined,
  },
  {
    id: 'in-bay' as JobStatus,
    title: 'In Bay',
    description: 'Currently being worked on',
    icon: Wrench,
    color: 'bg-green-50 border-green-200',
    headerColor: 'bg-green-100',
    maxItems: 2, // Limited by physical bay capacity
  },
  {
    id: 'waiting-parts' as JobStatus,
    title: 'Waiting on Parts',
    description: 'Pending parts delivery',
    icon: Clock,
    color: 'bg-orange-50 border-orange-200',
    headerColor: 'bg-orange-100',
    maxItems: undefined,
  },
  {
    id: 'completed' as JobStatus,
    title: 'Completed',
    description: 'Finished jobs',
    icon: CheckCircle,
    color: 'bg-gray-50 border-gray-200',
    headerColor: 'bg-gray-100',
    maxItems: undefined,
  },
] as const;

export function KanbanBoard({
  onJobClick,
  onJobEdit,
  onJobCreate,
  className = '',
}: KanbanBoardProps) {
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [invoiceFilter, setInvoiceFilter] = useState('');

  // Hooks
  const { data: jobsResponse, isLoading } = useJobs();
  const { mutateAsync: updateJobStatus } = useUpdateJobStatus();
  const { addToast } = useUIStore();

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const jobs = jobsResponse?.data || [];

  // Filter and group jobs by status
  const filteredJobs = useMemo(() => {
    const search = searchQuery.toLowerCase();
    const invoiceNeedle = invoiceFilter.trim().toLowerCase();

    return jobs.filter(job => {
      const matchesSearch = !searchQuery || 
        job.title.toLowerCase().includes(search) ||
        job.notes?.toLowerCase().includes(search);

      const matchesPriority = filterPriority === 'all' || job.priority === filterPriority;

      const matchesInvoice = !invoiceNeedle ||
        (job.invoiceNumber && job.invoiceNumber.toLowerCase().includes(invoiceNeedle));

      return matchesSearch && matchesPriority && matchesInvoice;
    });
  }, [jobs, searchQuery, filterPriority, invoiceFilter]);

  const jobsByStatus = useMemo(() => {
    const grouped = KANBAN_COLUMNS.reduce((acc, column) => {
      acc[column.id] = filteredJobs.filter(job => job.status === column.id);
      return acc;
    }, {} as Record<JobStatus, Job[]>);
    
    return grouped;
  }, [filteredJobs]);

  // Drag handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const job = jobs.find(j => j.id === event.active.id);
    setActiveJob(job || null);
  }, [jobs]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveJob(null);

    if (!over) return;

    const jobId = active.id as string;
    const newStatus = over.id as JobStatus;
    const job = jobs.find(j => j.id === jobId);

    if (!job || job.status === newStatus) return;

    // Validate transition using the service
    const transition = JobStatusTransitionService.validateTransition(job.status, newStatus, job);
    if (!transition || !transition.isValid) {
      addToast({
        type: 'error',
        title: 'Invalid Status Transition',
        message: transition?.warningMessage || `Cannot move job from ${getStatusLabel(job.status)} to ${getStatusLabel(newStatus)}`,
        duration: 4000,
      });
      return;
    }

    // Check capacity constraints
    const targetColumn = KANBAN_COLUMNS.find(col => col.id === newStatus);
    if (targetColumn?.maxItems) {
      const currentCount = jobsByStatus[newStatus].length;
      if (currentCount >= targetColumn.maxItems) {
        addToast({
          type: 'warning',
          title: 'Capacity Limit Reached',
          message: `${targetColumn.title} can only hold ${targetColumn.maxItems} jobs`,
          duration: 5000,
        });
        return;
      }
    }

    // Show confirmation if required
    if (transition.requiresConfirmation) {
      const confirmMessage = JobStatusTransitionService.getTransitionMessage(job, newStatus, transition);
      
      // For now, we'll proceed with the transition
      // In a full implementation, you'd show a confirmation dialog
      addToast({
        type: 'warning',
        title: confirmMessage.title,
        message: confirmMessage.message,
        duration: 6000,
      });
    }

    try {
      await updateJobStatus({ id: jobId, status: newStatus });
      
      const successMessage = JobStatusTransitionService.getTransitionMessage(job, newStatus, transition);
      
      addToast({
        type: 'success',
        title: successMessage.title,
        message: successMessage.message,
        duration: 3000,
      });

      // Show auto-actions if any
      if (transition.autoActions && transition.autoActions.length > 0) {
        setTimeout(() => {
          addToast({
            type: 'info',
            title: 'Automated Actions',
            message: transition.autoActions!.join(', '),
            duration: 4000,
          });
        }, 1000);
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to Update Job',
        message: error instanceof Error ? error.message : 'An error occurred',
        duration: 5000,
      });
    }
  }, [jobs, jobsByStatus, updateJobStatus, addToast]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = filteredJobs.length;
    const completed = jobsByStatus['completed'].length;
    const inProgress = jobsByStatus['in-bay'].length;
    const waiting = jobsByStatus['waiting-parts'].length;
    const highPriority = filteredJobs.filter(job => job.priority === 'high').length;
    
    return { total, completed, inProgress, waiting, highPriority };
  }, [filteredJobs, jobsByStatus]);

  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Job Management</h2>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{stats.total} total jobs</span>
            <span>{stats.completed} completed</span>
            <span>{stats.inProgress} in progress</span>
            {stats.highPriority > 0 && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {stats.highPriority} high priority
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button onClick={onJobCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Job
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search jobs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-input bg-background rounded-md text-sm"
          />
        </div>

        <div className="relative flex-1 max-w-xs">
          <input
            type="text"
            placeholder="Filter by invoice #"
            value={invoiceFilter}
            onChange={(e) => setInvoiceFilter(e.target.value)}
            className="pl-3 pr-4 py-2 w-full border border-input bg-background rounded-md text-sm font-mono"
            aria-label="Filter jobs by invoice number"
          />
        </div>
        
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="px-3 py-2 border border-input bg-background rounded-md text-sm"
        >
          <option value="all">All Priorities</option>
          <option value="low">Low Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="high">High Priority</option>
        </select>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-[600px]">
          {KANBAN_COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              jobs={jobsByStatus[column.id]}
              onJobClick={onJobClick}
              onJobEdit={onJobEdit}
            />
          ))}
        </div>

        <DragOverlay>
          {activeJob ? (
            <KanbanCard
              job={activeJob}
              isDragging
              onJobClick={() => {}}
              onJobEdit={() => {}}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Empty State */}
      {filteredJobs.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <Phone className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-medium">No jobs found</h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery || filterPriority !== 'all'
                    ? 'Try adjusting your search or filter criteria'
                    : 'Create your first job to get started'}
                </p>
              </div>
              {(!searchQuery && filterPriority === 'all') && (
                <Button onClick={onJobCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Job
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


export type { KanbanBoardProps };
