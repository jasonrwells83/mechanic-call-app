// Kanban Card Component
// Individual job card with drag-and-drop functionality

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  User, 
  Car, 
  AlertTriangle, 
  MoreHorizontal, 
  Calendar,
  DollarSign,
  GripVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Job } from '@/types/database';

interface KanbanCardProps {
  job: Job;
  isDragging?: boolean;
  onJobClick?: (job: Job) => void;
  onJobEdit?: (job: Job) => void;
}

// Priority colors
const priorityColors = {
  low: 'border-gray-300 bg-gray-50',
  medium: 'border-yellow-300 bg-yellow-50',
  high: 'border-red-300 bg-red-50',
};

// Status colors for accent
const statusAccents = {
  'incoming-call': 'border-l-slate-500',
  'scheduled': 'border-l-blue-500',
  'in-bay': 'border-l-green-500',
  'waiting-parts': 'border-l-orange-500',
  'completed': 'border-l-gray-500',
};

export function KanbanCard({
  job,
  isDragging = false,
  onJobClick,
  onJobEdit,
}: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: job.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Calculate time estimates and urgency
  const createdDate = new Date(job.createdAt);
  const daysSinceCreated = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
  const isUrgent = job.priority === 'high' || daysSinceCreated > 3;

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onJobClick?.(job);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onJobEdit?.(job);
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md',
        'border-l-4',
        statusAccents[job.status],
        priorityColors[job.priority],
        (isDragging || isSortableDragging) && 'shadow-lg rotate-2 opacity-90 z-50',
        isUrgent && 'ring-1 ring-red-200'
      )}
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm line-clamp-2 pr-2">
                {job.title}
              </h4>
              {job.notes && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {job.notes}
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-1 shrink-0">
              {job.invoiceNumber && (
                <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                  {job.invoiceNumber}
                </Badge>
              )}

              {/* Drag Handle */}
              <div 
                {...listeners}
                className="p-1 hover:bg-muted/50 rounded cursor-grab active:cursor-grabbing"
              >
                <GripVertical className="h-3 w-3 text-muted-foreground" />
              </div>
              
              {/* More Options */}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={handleEditClick}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Job Details */}
          <div className="space-y-2">
            {/* Priority and Estimated Hours */}
            <div className="flex items-center justify-between">
              <Badge 
                variant={job.priority === 'high' ? 'destructive' : job.priority === 'medium' ? 'default' : 'secondary'}
                className="text-xs px-2 py-0"
              >
                {job.priority === 'high' && <AlertTriangle className="h-2 w-2 mr-1" />}
                {job.priority.toUpperCase()}
              </Badge>
              
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{job.estHours}h est.</span>
              </div>
            </div>

            {/* Customer and Vehicle Info */}
            <div className="space-y-1">
              {job.customerId && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span className="truncate">Customer #{job.customerId.slice(-6)}</span>
                </div>
              )}
              
              {job.vehicleId && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Car className="h-3 w-3" />
                  <span className="truncate">Vehicle #{job.vehicleId.slice(-6)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-muted/50">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>
                {daysSinceCreated === 0 
                  ? 'Today' 
                  : daysSinceCreated === 1 
                  ? 'Yesterday' 
                  : `${daysSinceCreated}d ago`
                }
              </span>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center gap-1">
              <div className={cn(
                'w-2 h-2 rounded-full',
                job.status === 'incoming-call' && 'bg-slate-500',
                job.status === 'scheduled' && 'bg-blue-500',
                job.status === 'in-bay' && 'bg-green-500 animate-pulse',
                job.status === 'waiting-parts' && 'bg-orange-500 animate-pulse',
                job.status === 'completed' && 'bg-gray-500',
              )} />
              <span className="text-xs text-muted-foreground capitalize">
                {job.status.replace('-', ' ')}
              </span>
            </div>
          </div>

          {/* Urgency Indicator */}
          {isUrgent && (
            <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-md">
              <AlertTriangle className="h-3 w-3 text-red-600" />
              <span className="text-xs text-red-800">
                {job.priority === 'high' ? 'High Priority' : 'Needs Attention'}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export type { KanbanCardProps };
