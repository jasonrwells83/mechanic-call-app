// Draggable Job List Component
// Sidebar component showing unscheduled jobs that can be dragged onto the calendar

import React, { useEffect, useRef, useState } from 'react';
import { Draggable } from '@fullcalendar/interaction';
import { useJobs } from '@/hooks/use-jobs';
import { useCustomers } from '@/hooks/use-customers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Briefcase, 
  Clock, 
  User, 
  Car, 
  AlertTriangle, 
  Calendar,
  GripVertical,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Customer, Job, JobStatus } from '@/types/database';

interface DraggableJobListProps {
  className?: string;
  onJobDragStart?: (job: Job) => void;
  onJobDragEnd?: (job: Job) => void;
}

interface DraggableJobItemProps {
  job: Job;
  customerName?: string;
  vehicleInfo?: string;
  onDragStart?: (job: Job) => void;
  onDragEnd?: (job: Job) => void;
}

// Priority colors for visual feedback
const priorityColors = {
  low: 'bg-gray-100 border-gray-300 text-gray-700',
  medium: 'bg-yellow-100 border-yellow-300 text-yellow-800',
  high: 'bg-red-100 border-red-300 text-red-800',
};

// Status colors
const statusColors = {
  'incoming-call': 'bg-gray-50 border-gray-200',
  'scheduled': 'bg-blue-50 border-blue-200',
  'in-bay': 'bg-green-50 border-green-200',
  'waiting-parts': 'bg-orange-50 border-orange-200',
  'completed': 'bg-gray-50 border-gray-200',
};

function DraggableJobItem({ 
  job, 
  customerName, 
  vehicleInfo, 
  onDragStart, 
  onDragEnd 
}: DraggableJobItemProps) {
  const jobRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = jobRef.current;
    if (!node) {
      return;
    }

    const draggable = new Draggable(node, {
      eventData: {
        id: `job-${job.id}`,
        title: job.title,
        duration: { hours: job.estHours },
        extendedProps: {
          jobId: job.id,
          customerId: job.customerId,
          vehicleId: job.vehicleId,
          status: job.status,
          priority: job.priority,
          estimatedHours: job.estHours,
          customerName,
          vehicleInfo,
          isExternalJob: true,
        },
        backgroundColor: getJobColor(job.status, job.priority).backgroundColor,
        borderColor: getJobColor(job.status, job.priority).borderColor,
        textColor: getJobColor(job.status, job.priority).textColor,
      },
    });

    const handleDragStart = () => onDragStart?.(job);
    const handleDragEnd = () => onDragEnd?.(job);

    node.addEventListener('dragstart', handleDragStart);
    node.addEventListener('dragend', handleDragEnd);

    return () => {
      draggable.destroy();
      node.removeEventListener('dragstart', handleDragStart);
      node.removeEventListener('dragend', handleDragEnd);
    };
  }, [job, customerName, vehicleInfo, onDragStart, onDragEnd]);

  return (
    <div
      ref={jobRef}
      className={cn(
        'group relative p-3 rounded-lg border-2 cursor-grab active:cursor-grabbing',
        'hover:shadow-md transition-all duration-200',
        'hover:scale-[1.02] hover:border-primary/30',
        statusColors[job.status],
        priorityColors[job.priority]
      )}
      title={`Drag to schedule: ${job.title}`}
    >
      {/* Drag Handle */}
      <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="space-y-2 ml-2">
        {/* Job Title and Priority */}
        <div className="flex items-start justify-between">
          <h4 className="font-medium text-sm line-clamp-2 pr-2">{job.title}</h4>
          <div className="flex items-center gap-1 shrink-0">
            {job.priority === 'high' && (
              <AlertTriangle className="h-3 w-3 text-red-500" />
            )}
            <Badge variant="outline" className="text-xs px-1 py-0">
              {job.priority}
            </Badge>
          </div>
        </div>

        {/* Customer and Vehicle Info */}
        {(customerName || vehicleInfo) && (
          <div className="space-y-1 text-xs text-muted-foreground">
            {customerName && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span className="truncate">{customerName}</span>
              </div>
            )}
            {vehicleInfo && (
              <div className="flex items-center gap-1">
                <Car className="h-3 w-3" />
                <span className="truncate">{vehicleInfo}</span>
              </div>
            )}
          </div>
        )}

        {/* Estimated Hours and Status */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{job.estHours}h est.</span>
          </div>
          <Badge variant="secondary" className="text-xs px-1 py-0">
            {job.status.replace('-', ' ')}
          </Badge>
        </div>
      </div>
    </div>
  );
}

export function DraggableJobList({ 
  className = '', 
  onJobDragStart, 
  onJobDragEnd 
}: DraggableJobListProps) {
  const [draggedJob, setDraggedJob] = useState<Job | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  
  // Get unscheduled jobs (incoming-call status)
  const { data: jobsResponse, isLoading, refetch } = useJobs({ 
    status: ['incoming-call'] 
  });
  
  // Get all customers for display names
  const { data: customersResponse } = useCustomers();
  
  const jobs = jobsResponse?.data || [];
  const customers = customersResponse?.data || [];

  // Create customer lookup map
  const customerMap = customers.reduce<Record<string, Customer>>((acc, customer) => {
    acc[customer.id] = customer;
    return acc;
  }, {});

  const handleJobDragStart = (job: Job) => {
    setDraggedJob(job);
    setIsDragActive(true);
    onJobDragStart?.(job);
    
    // Add visual feedback to document body
    document.body.classList.add('job-dragging');
  };

  const handleJobDragEnd = (job: Job) => {
    setDraggedJob(null);
    setIsDragActive(false);
    onJobDragEnd?.(job);
    
    // Remove visual feedback from document body
    document.body.classList.remove('job-dragging');
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Unscheduled Jobs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      className,
      isDragActive && "ring-2 ring-primary/50 bg-primary/5",
      "transition-all duration-200"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className={cn(
            "text-sm font-medium flex items-center gap-2 transition-colors",
            isDragActive && "text-primary"
          )}>
            <Briefcase className={cn(
              "h-4 w-4 transition-colors",
              isDragActive && "text-primary"
            )} />
            Unscheduled Jobs
            <Badge variant={isDragActive ? "default" : "secondary"} className="ml-1">
              {jobs.length}
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {jobs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No unscheduled jobs</p>
            <p className="text-xs">All jobs are scheduled!</p>
          </div>
        ) : (
          <>
            <div className="text-xs text-muted-foreground mb-3 px-1">
              Drag jobs onto the calendar to schedule them
            </div>
            
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {jobs.map((job) => {
                  const customer = customerMap[job.customerId];
                  const vehicleInfo = job.vehicleId ? 'Vehicle assigned' : undefined;
                  
                  return (
                    <DraggableJobItem
                      key={job.id}
                      job={job}
                      customerName={customer?.name}
                      vehicleInfo={vehicleInfo}
                      onDragStart={handleJobDragStart}
                      onDragEnd={handleJobDragEnd}
                    />
                  );
                })}
              </div>
            </ScrollArea>

            <Separator className="my-3" />
            
            {/* Drag Instructions */}
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary/60" />
                <span>Drag job to calendar time slot</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500/60" />
                <span>Drop on Bay 1 or Bay 2</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500/60" />
                <span>Conflicts will be detected</span>
              </div>
            </div>

            {/* Currently Dragging Indicator */}
            {draggedJob && (
              <div className="mt-3 p-2 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="text-xs font-medium text-primary">
                  Dragging: {draggedJob.title}
                </div>
                <div className="text-xs text-muted-foreground">
                  Drop on calendar to schedule
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Helper function to get job colors based on status and priority
function getJobColor(status: JobStatus, priority: string) {
  const statusColorMap = {
    'incoming-call': { backgroundColor: '#f3f4f6', borderColor: '#6b7280', textColor: '#374151' },
    'scheduled': { backgroundColor: '#e3f2fd', borderColor: '#1976d2', textColor: '#0d47a1' },
    'in-bay': { backgroundColor: '#e8f5e8', borderColor: '#388e3c', textColor: '#1b5e20' },
    'waiting-parts': { backgroundColor: '#fff3e0', borderColor: '#f57c00', textColor: '#e65100' },
    'completed': { backgroundColor: '#f5f5f5', borderColor: '#9e9e9e', textColor: '#424242' },
  };

  let colors = statusColorMap[status] || statusColorMap['incoming-call'];

  // Modify border for high priority
  if (priority === 'high') {
    colors = {
      ...colors,
      borderColor: '#ef4444',
    };
  }

  return colors;
}

export type { DraggableJobListProps };

