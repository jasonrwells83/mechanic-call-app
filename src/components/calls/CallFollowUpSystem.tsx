// Call Follow-up System Component
// Automated reminder system for call follow-ups and workflow management

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Clock,
  Bell,
  Phone,
  Calendar,
  CheckCircle,
  AlertTriangle,
  User,
  Car,
  Plus,
  Edit,
  Trash2,
  Send,
  MessageSquare,
  Mail,
  PhoneCall,
  CalendarPlus,
  MoreHorizontal,
  Filter,
  Search,
  Zap,
  Target,
  Star,
  FileText,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format, addDays, isAfter, isBefore, isToday } from 'date-fns';
import { useUIStore } from '@/stores';
import type { Call } from './CallList';

interface FollowUpTask {
  id: string;
  callId: string;
  call: Call;
  type: 'call-back' | 'send-quote' | 'schedule-appointment' | 'check-in' | 'escalate' | 'custom';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  dueDate: Date;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue' | 'cancelled';
  assignedTo?: string;
  title: string;
  description: string;
  notes?: string;
  completedAt?: Date;
  completedBy?: string;
  outcome?: string;
  nextAction?: string;
  remindersSent: number;
  lastReminderAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface CallFollowUpSystemProps {
  calls: Call[];
  onFollowUpComplete?: (taskId: string, outcome: string) => void;
  onFollowUpCreate?: (task: Partial<FollowUpTask>) => void;
  className?: string;
}

// Mock follow-up tasks - in real app, this would come from API
const mockFollowUpTasks: FollowUpTask[] = [
  {
    id: 'FU-001',
    callId: 'CALL-002',
    call: {} as Call, // Would be populated from calls data
    type: 'call-back',
    priority: 'high',
    dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    status: 'pending',
    assignedTo: 'Mike Chen',
    title: 'Call back Maria Garcia about brake inspection',
    description: 'Customer wants to schedule brake inspection after hearing grinding noise. Needs quote and availability.',
    remindersSent: 0,
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
  },
  {
    id: 'FU-002',
    callId: 'CALL-003',
    call: {} as Call,
    type: 'escalate',
    priority: 'urgent',
    dueDate: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours overdue
    status: 'overdue',
    assignedTo: 'Sarah Johnson',
    title: 'Follow up on missed call - Robert Johnson',
    description: 'Customer called about engine problems but call was missed. Left voicemail. Need to contact urgently.',
    remindersSent: 2,
    lastReminderAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
  },
  {
    id: 'FU-003',
    callId: 'CALL-001',
    call: {} as Call,
    type: 'send-quote',
    priority: 'normal',
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
    status: 'in-progress',
    assignedTo: 'Sarah Johnson',
    title: 'Send quote for John Smith oil change',
    description: 'Customer requested quote for oil change service. Include synthetic oil options.',
    notes: 'Started preparing quote, need to check current oil prices',
    remindersSent: 0,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000),
  },
];

const taskTypeConfig = {
  'call-back': {
    label: 'Call Back',
    icon: PhoneCall,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-200',
  },
  'send-quote': {
    label: 'Send Quote',
    icon: FileText,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-200',
  },
  'schedule-appointment': {
    label: 'Schedule Appointment',
    icon: CalendarPlus,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-200',
  },
  'check-in': {
    label: 'Check In',
    icon: MessageSquare,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-200',
  },
  escalate: {
    label: 'Escalate',
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-200',
  },
  custom: {
    label: 'Custom Task',
    icon: Star,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    borderColor: 'border-indigo-200',
  },
};

const statusConfig = {
  pending: {
    label: 'Pending',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    icon: Clock,
  },
  'in-progress': {
    label: 'In Progress',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: RefreshCw,
  },
  completed: {
    label: 'Completed',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: CheckCircle,
  },
  overdue: {
    label: 'Overdue',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    icon: AlertTriangle,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    icon: CheckCircle,
  },
};

const priorityConfig = {
  low: { label: 'Low', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  normal: { label: 'Normal', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  high: { label: 'High', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  urgent: { label: 'Urgent', color: 'text-red-600', bgColor: 'bg-red-100' },
};

export function CallFollowUpSystem({
  calls,
  onFollowUpComplete,
  onFollowUpCreate,
  className = '',
}: CallFollowUpSystemProps) {
  const [tasks, setTasks] = useState<FollowUpTask[]>(mockFollowUpTasks);
  const [filter, setFilter] = useState<{
    status: string;
    priority: string;
    assignedTo: string;
    type: string;
    search: string;
  }>({
    status: 'all',
    priority: 'all',
    assignedTo: 'all',
    type: 'all',
    search: '',
  });

  const [selectedTask, setSelectedTask] = useState<FollowUpTask | null>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'created'>('dueDate');

  const { addToast } = useUIStore();

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    // Apply filters
    if (filter.status !== 'all') {
      filtered = filtered.filter(task => task.status === filter.status);
    }

    if (filter.priority !== 'all') {
      filtered = filtered.filter(task => task.priority === filter.priority);
    }

    if (filter.assignedTo !== 'all') {
      filtered = filtered.filter(task => task.assignedTo === filter.assignedTo);
    }

    if (filter.type !== 'all') {
      filtered = filtered.filter(task => task.type === filter.type);
    }

    if (filter.search) {
      const search = filter.search.toLowerCase();
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(search) ||
        task.description.toLowerCase().includes(search) ||
        task.callId.toLowerCase().includes(search)
      );
    }

    // Sort tasks
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'dueDate':
          return a.dueDate.getTime() - b.dueDate.getTime();
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case 'created':
          return b.createdAt.getTime() - a.createdAt.getTime();
        default:
          return a.dueDate.getTime() - b.dueDate.getTime();
      }
    });

    return filtered;
  }, [tasks, filter, sortBy]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = tasks.length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const overdue = tasks.filter(t => t.status === 'overdue').length;
    const dueToday = tasks.filter(t => 
      t.status === 'pending' && isToday(t.dueDate)
    ).length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    return {
      total,
      pending,
      overdue,
      dueToday,
      completed,
      completionRate,
    };
  }, [tasks]);

  // Handle task actions
  const handleTaskAction = useCallback((action: string, task: FollowUpTask) => {
    switch (action) {
      case 'complete':
        setTasks(prev => prev.map(t => 
          t.id === task.id 
            ? { ...t, status: 'completed', completedAt: new Date(), updatedAt: new Date() }
            : t
        ));
        onFollowUpComplete?.(task.id, 'completed');
        addToast({
          type: 'success',
          title: 'Task Completed',
          message: `Follow-up task "${task.title}" has been completed`,
          duration: 3000,
        });
        break;
      
      case 'start':
        setTasks(prev => prev.map(t => 
          t.id === task.id 
            ? { ...t, status: 'in-progress', updatedAt: new Date() }
            : t
        ));
        addToast({
          type: 'info',
          title: 'Task Started',
          message: `Working on "${task.title}"`,
          duration: 2000,
        });
        break;
      
      case 'snooze':
        const newDueDate = addDays(new Date(), 1);
        setTasks(prev => prev.map(t => 
          t.id === task.id 
            ? { ...t, dueDate: newDueDate, updatedAt: new Date() }
            : t
        ));
        addToast({
          type: 'info',
          title: 'Task Snoozed',
          message: `Task postponed until tomorrow`,
          duration: 2000,
        });
        break;
      
      case 'delete':
        setTasks(prev => prev.filter(t => t.id !== task.id));
        addToast({
          type: 'success',
          title: 'Task Deleted',
          message: `Follow-up task has been removed`,
          duration: 2000,
        });
        break;
      
      default:
        break;
    }
  }, [onFollowUpComplete, addToast]);

  const handleCreateTask = useCallback((taskData: Partial<FollowUpTask>) => {
    const newTask: FollowUpTask = {
      id: `FU-${Date.now()}`,
      callId: taskData.callId || '',
      call: taskData.call || {} as Call,
      type: taskData.type || 'custom',
      priority: taskData.priority || 'normal',
      dueDate: taskData.dueDate || addDays(new Date(), 1),
      status: 'pending',
      assignedTo: taskData.assignedTo,
      title: taskData.title || '',
      description: taskData.description || '',
      remindersSent: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setTasks(prev => [...prev, newTask]);
    onFollowUpCreate?.(newTask);
    setShowCreateTask(false);

    addToast({
      type: 'success',
      title: 'Follow-up Created',
      message: `New follow-up task "${newTask.title}" has been created`,
      duration: 3000,
    });
  }, [onFollowUpCreate, addToast]);

  const getTaskUrgency = (task: FollowUpTask) => {
    if (task.status === 'overdue') return 'overdue';
    if (isToday(task.dueDate)) return 'due-today';
    if (isBefore(task.dueDate, addDays(new Date(), 1))) return 'due-soon';
    return 'future';
  };

  const renderTaskCard = (task: FollowUpTask) => {
    const typeConfig = taskTypeConfig[task.type];
    const statusInfo = statusConfig[task.status];
    const priorityInfo = priorityConfig[task.priority];
    const urgency = getTaskUrgency(task);
    const TypeIcon = typeConfig.icon;
    const StatusIcon = statusInfo.icon;

    return (
      <Card 
        key={task.id} 
        className={cn(
          'hover:shadow-md transition-all cursor-pointer',
          urgency === 'overdue' && 'border-red-300 bg-red-50',
          urgency === 'due-today' && 'border-orange-300 bg-orange-50',
          urgency === 'due-soon' && 'border-yellow-300 bg-yellow-50'
        )}
        onClick={() => setSelectedTask(task)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className={cn(
                'p-2 rounded-lg',
                typeConfig.bgColor,
                typeConfig.borderColor,
                'border'
              )}>
                <TypeIcon className={cn('h-4 w-4', typeConfig.color)} />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">{task.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={cn('text-xs', typeConfig.color)}>
                    {typeConfig.label}
                  </Badge>
                  <Badge variant="outline" className={cn('text-xs', priorityInfo.color)}>
                    {priorityInfo.label}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-1">
                <StatusIcon className={cn('h-3 w-3', statusInfo.color)} />
                <Badge variant="outline" className={cn('text-xs', statusInfo.color)}>
                  {statusInfo.label}
                </Badge>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  {task.status === 'pending' && (
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      handleTaskAction('start', task);
                    }}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Start Task
                    </DropdownMenuItem>
                  )}
                  {(task.status === 'pending' || task.status === 'in-progress') && (
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      handleTaskAction('complete', task);
                    }}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark Complete
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    handleTaskAction('snooze', task);
                  }}>
                    <Clock className="mr-2 h-4 w-4" />
                    Snooze 1 Day
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-red-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTaskAction('delete', task);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Task
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {task.description}
          </p>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>Due {formatDistanceToNow(task.dueDate, { addSuffix: true })}</span>
              </div>
              
              {task.assignedTo && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{task.assignedTo}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              <span>{task.callId}</span>
            </div>
          </div>

          {task.remindersSent > 0 && (
            <div className="mt-2 pt-2 border-t">
              <div className="flex items-center gap-1 text-xs text-orange-600">
                <Bell className="h-3 w-3" />
                <span>{task.remindersSent} reminder{task.remindersSent > 1 ? 's' : ''} sent</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Follow-up tasks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground">
              Need immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due Today</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.dueToday}</div>
            <p className="text-xs text-muted-foreground">
              Today's tasks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting action
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.completionRate.toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Tasks completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Follow-up Tasks
              <Badge variant="secondary">{filteredTasks.length}</Badge>
            </CardTitle>
            
            <Button onClick={() => setShowCreateTask(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={filter.search}
                onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <Select 
                value={filter.status} 
                onValueChange={(value) => setFilter(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              
              <Select 
                value={filter.priority} 
                onValueChange={(value) => setFilter(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              
              <Select 
                value={filter.type} 
                onValueChange={(value) => setFilter(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Task Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="call-back">Call Back</SelectItem>
                  <SelectItem value="send-quote">Send Quote</SelectItem>
                  <SelectItem value="schedule-appointment">Schedule</SelectItem>
                  <SelectItem value="check-in">Check In</SelectItem>
                  <SelectItem value="escalate">Escalate</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              
              <Select 
                value={sortBy} 
                onValueChange={(value: any) => setSortBy(value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dueDate">Due Date</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="created">Created</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Task Cards */}
          {filteredTasks.length > 0 ? (
            <ScrollArea className="h-[600px]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTasks.map(renderTaskCard)}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No follow-up tasks found</h3>
              <p className="text-muted-foreground mb-4">
                {filter.search || filter.status !== 'all' || filter.priority !== 'all' || filter.type !== 'all'
                  ? 'Try adjusting your filters to see more tasks.'
                  : 'No follow-up tasks have been created yet.'
                }
              </p>
              <Button onClick={() => setShowCreateTask(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Task
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Task Modal */}
      <Dialog open={showCreateTask} onOpenChange={setShowCreateTask}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Follow-up Task</DialogTitle>
          </DialogHeader>
          
          <CreateTaskForm
            calls={calls}
            onSubmit={handleCreateTask}
            onCancel={() => setShowCreateTask(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Task Detail Modal */}
      {selectedTask && (
        <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
          <DialogContent className="max-w-3xl">
            <TaskDetailView
              task={selectedTask}
              onAction={handleTaskAction}
              onClose={() => setSelectedTask(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Create Task Form Component
interface CreateTaskFormProps {
  calls: Call[];
  onSubmit: (task: Partial<FollowUpTask>) => void;
  onCancel: () => void;
}

function CreateTaskForm({ calls, onSubmit, onCancel }: CreateTaskFormProps) {
  const [formData, setFormData] = useState<Partial<FollowUpTask>>({
    type: 'call-back',
    priority: 'normal',
    dueDate: addDays(new Date(), 1),
    title: '',
    description: '',
    assignedTo: 'Current User',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Task Type</label>
          <Select 
            value={formData.type} 
            onValueChange={(value: FollowUpTask['type']) => 
              setFormData(prev => ({ ...prev, type: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="call-back">Call Back</SelectItem>
              <SelectItem value="send-quote">Send Quote</SelectItem>
              <SelectItem value="schedule-appointment">Schedule Appointment</SelectItem>
              <SelectItem value="check-in">Check In</SelectItem>
              <SelectItem value="escalate">Escalate</SelectItem>
              <SelectItem value="custom">Custom Task</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Priority</label>
          <Select 
            value={formData.priority} 
            onValueChange={(value: FollowUpTask['priority']) => 
              setFormData(prev => ({ ...prev, priority: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Related Call</label>
        <Select 
          value={formData.callId || ''} 
          onValueChange={(value) => {
            const call = calls.find(c => c.id === value);
            setFormData(prev => ({ ...prev, callId: value, call }));
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a call..." />
          </SelectTrigger>
          <SelectContent>
            {calls.slice(0, 10).map((call) => (
              <SelectItem key={call.id} value={call.id}>
                {call.callId} - {call.customerName} ({call.serviceType})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Due Date</label>
        <Input
          type="datetime-local"
          value={formData.dueDate ? format(formData.dueDate, "yyyy-MM-dd'T'HH:mm") : ''}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            dueDate: e.target.value ? new Date(e.target.value) : undefined 
          }))}
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Title</label>
        <Input
          value={formData.title || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="Brief description of the task..."
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Description</label>
        <Textarea
          value={formData.description || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Detailed task description..."
          rows={3}
          required
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Create Task
        </Button>
      </div>
    </form>
  );
}

// Task Detail View Component
interface TaskDetailViewProps {
  task: FollowUpTask;
  onAction: (action: string, task: FollowUpTask) => void;
  onClose: () => void;
}

function TaskDetailView({ task, onAction, onClose }: TaskDetailViewProps) {
  const typeConfig = taskTypeConfig[task.type];
  const statusInfo = statusConfig[task.status];
  const priorityInfo = priorityConfig[task.priority];
  const TypeIcon = typeConfig.icon;
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <TypeIcon className={cn('h-5 w-5', typeConfig.color)} />
          {task.title}
        </DialogTitle>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
        <div>
          <span className="text-sm text-muted-foreground">Status</span>
          <div className="flex items-center gap-2">
            <StatusIcon className={cn('h-4 w-4', statusInfo.color)} />
            <Badge variant="outline" className={statusInfo.color}>
              {statusInfo.label}
            </Badge>
          </div>
        </div>
        
        <div>
          <span className="text-sm text-muted-foreground">Priority</span>
          <Badge variant="outline" className={priorityInfo.color}>
            {priorityInfo.label}
          </Badge>
        </div>
        
        <div>
          <span className="text-sm text-muted-foreground">Due Date</span>
          <p className="font-medium">{format(task.dueDate, 'PPpp')}</p>
        </div>
        
        <div>
          <span className="text-sm text-muted-foreground">Assigned To</span>
          <p className="font-medium">{task.assignedTo || 'Unassigned'}</p>
        </div>
      </div>

      <div>
        <h3 className="font-medium mb-2">Description</h3>
        <p className="text-sm text-muted-foreground">{task.description}</p>
      </div>

      {task.notes && (
        <div>
          <h3 className="font-medium mb-2">Notes</h3>
          <p className="text-sm text-muted-foreground">{task.notes}</p>
        </div>
      )}

      <div>
        <h3 className="font-medium mb-2">Related Call</h3>
        <div className="p-3 border rounded-lg">
          <p className="font-medium">{task.callId}</p>
          <p className="text-sm text-muted-foreground">
            Call details would be displayed here
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        
        {task.status === 'pending' && (
          <Button variant="outline" onClick={() => onAction('start', task)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Start Task
          </Button>
        )}
        
        {(task.status === 'pending' || task.status === 'in-progress') && (
          <Button onClick={() => onAction('complete', task)}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark Complete
          </Button>
        )}
      </div>
    </div>
  );
}

export type { FollowUpTask, CallFollowUpSystemProps };
