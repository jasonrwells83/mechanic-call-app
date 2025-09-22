// Kanban Column Component
// Individual status lane in the kanban board

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KanbanCard } from './KanbanCard';
import type { Job, JobStatus } from '@/types/database';

interface KanbanColumnProps {
  column: {
    id: JobStatus;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    headerColor: string;
    maxItems?: number;
  };
  jobs: Job[];
  onJobClick?: (job: Job) => void;
  onJobEdit?: (job: Job) => void;
}

export function KanbanColumn({
  column,
  jobs,
  onJobClick,
  onJobEdit,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const Icon = column.icon;
  const isAtCapacity = column.maxItems && jobs.length >= column.maxItems;
  const highPriorityCount = jobs.filter(job => job.priority === 'high').length;

  return (
    <Card 
      ref={setNodeRef}
      className={cn(
        'h-full transition-all duration-200',
        column.color,
        isOver && 'ring-2 ring-primary/50 ring-offset-2',
        isAtCapacity && 'ring-2 ring-orange-500/50'
      )}
    >
      {/* Column Header */}
      <CardHeader className={cn('pb-3', column.headerColor)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <h3 className="font-semibold text-sm">{column.title}</h3>
          </div>
          
          <div className="flex items-center gap-2">
            {highPriorityCount > 0 && (
              <Badge variant="destructive" className="text-xs px-1 py-0">
                <AlertTriangle className="h-2 w-2 mr-1" />
                {highPriorityCount}
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {jobs.length}
              {column.maxItems && `/${column.maxItems}`}
            </Badge>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground mt-1">
          {column.description}
        </p>

        {/* Capacity Warning */}
        {isAtCapacity && (
          <div className="flex items-center gap-2 mt-2 p-2 bg-orange-100 border border-orange-200 rounded-md">
            <AlertTriangle className="h-3 w-3 text-orange-600" />
            <span className="text-xs text-orange-800">
              At capacity ({column.maxItems} max)
            </span>
          </div>
        )}
      </CardHeader>

      {/* Column Content */}
      <CardContent className="pt-0 pb-4">
        <SortableContext items={jobs.map(job => job.id)} strategy={verticalListSortingStrategy}>
          <ScrollArea className="h-[500px] pr-3">
            <div className="space-y-3">
              {jobs.map((job) => (
                <KanbanCard
                  key={job.id}
                  job={job}
                  onJobClick={onJobClick}
                  onJobEdit={onJobEdit}
                />
              ))}
              
              {/* Empty State */}
              {jobs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center mb-3">
                    <Icon className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No jobs in {column.title.toLowerCase()}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Drag jobs here to update status
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </SortableContext>
      </CardContent>
    </Card>
  );
}

export type { KanbanColumnProps };
