import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Phone,
  Calendar,
  User,
  FileText,
  Settings,
  Plus,
  Edit,
  Save,
  MoreHorizontal,
  TrendingUp,
  Target,
  Award,
  Activity,
  ArrowRight,
  History,
  Star,
  Zap,
  MessageSquare,
  Mail,
  PhoneCall,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { useUIStore } from '@/stores';

export interface CallOutcome {
  id: string;
  callId: string;
  outcome: 'scheduled' | 'quote-sent' | 'follow-up' | 'no-action' | 'incomplete' | 'cancelled' | 'completed';
  status: 'active' | 'completed' | 'pending' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: {
    id: string;
    name: string;
    role: string;
  };
  dueDate?: Date;
  completedAt?: Date;
  notes: string;
  actions: OutcomeAction[];
  tags: string[];
  customerSatisfaction?: number; // 1-5 rating
  followUpRequired: boolean;
  estimatedValue?: number;
  actualValue?: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: {
    id: string;
    name: string;
  };
}

export interface OutcomeAction {
  id: string;
  type: 'call' | 'email' | 'sms' | 'appointment' | 'quote' | 'follow-up' | 'note';
  description: string;
  completedAt?: Date;
  completedBy?: {
    id: string;
    name: string;
  };
  dueDate?: Date;
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
}

export interface OutcomeTemplate {
  id: string;
  name: string;
  outcome: CallOutcome['outcome'];
  description: string;
  defaultActions: Omit<OutcomeAction, 'id' | 'completedAt' | 'completedBy'>[];
  estimatedDuration: number; // minutes
  tags: string[];
}

interface CallOutcomeManagementProps {
  callId: string;
  currentOutcome?: CallOutcome;
  onOutcomeUpdate?: (outcome: CallOutcome) => void;
  onOutcomeCreate?: (outcome: Omit<CallOutcome, 'id' | 'createdAt' | 'updatedAt'>) => void;
  className?: string;
}

// Mock outcome templates
const OUTCOME_TEMPLATES: OutcomeTemplate[] = [
  {
    id: 'template-1',
    name: 'Schedule Service Appointment',
    outcome: 'scheduled',
    description: 'Customer wants to schedule a service appointment',
    estimatedDuration: 15,
    defaultActions: [
      {
        type: 'appointment',
        description: 'Schedule service appointment',
        status: 'pending',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
      },
      {
        type: 'email',
        description: 'Send appointment confirmation email',
        status: 'pending',
        dueDate: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      },
    ],
    tags: ['appointment', 'service'],
  },
  {
    id: 'template-2',
    name: 'Send Quote',
    outcome: 'quote-sent',
    description: 'Customer requested a quote for services',
    estimatedDuration: 30,
    defaultActions: [
      {
        type: 'quote',
        description: 'Prepare and send detailed quote',
        status: 'pending',
        dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
      },
      {
        type: 'follow-up',
        description: 'Follow up on quote in 3 days',
        status: 'pending',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
      },
    ],
    tags: ['quote', 'pricing'],
  },
  {
    id: 'template-3',
    name: 'Schedule Follow-up Call',
    outcome: 'follow-up',
    description: 'Need to follow up with customer',
    estimatedDuration: 10,
    defaultActions: [
      {
        type: 'call',
        description: 'Follow-up call with customer',
        status: 'pending',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
      },
    ],
    tags: ['follow-up', 'call'],
  },
  {
    id: 'template-4',
    name: 'Emergency Service',
    outcome: 'scheduled',
    description: 'Emergency service request - immediate attention',
    estimatedDuration: 5,
    defaultActions: [
      {
        type: 'call',
        description: 'Confirm emergency service details',
        status: 'pending',
        dueDate: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      },
      {
        type: 'appointment',
        description: 'Schedule emergency service slot',
        status: 'pending',
        dueDate: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      },
    ],
    tags: ['emergency', 'urgent'],
  },
];

// Mock outcome data
const mockOutcome: CallOutcome = {
  id: 'outcome-1',
  callId: 'CALL-001',
  outcome: 'scheduled',
  status: 'active',
  priority: 'medium',
  assignedTo: {
    id: 'user1',
    name: 'Sarah Johnson',
    role: 'Service Advisor',
  },
  dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
  notes: 'Customer wants oil change scheduled for next week',
  followUpRequired: false,
  estimatedValue: 150,
  tags: ['maintenance', 'oil-change'],
  actions: [
    {
      id: 'action-1',
      type: 'appointment',
      description: 'Schedule oil change appointment',
      status: 'completed',
      completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      completedBy: {
        id: 'user1',
        name: 'Sarah Johnson',
      },
      dueDate: new Date(Date.now() - 60 * 60 * 1000),
    },
    {
      id: 'action-2',
      type: 'email',
      description: 'Send appointment confirmation',
      status: 'pending',
      dueDate: new Date(Date.now() + 30 * 60 * 1000),
    },
  ],
  createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
  updatedAt: new Date(Date.now() - 30 * 60 * 1000),
  createdBy: {
    id: 'user1',
    name: 'Sarah Johnson',
  },
};

const OUTCOME_CONFIGS = {
  scheduled: {
    label: 'Scheduled',
    color: 'bg-blue-100 text-blue-800',
    icon: Calendar,
    description: 'Appointment has been scheduled',
  },
  'quote-sent': {
    label: 'Quote Sent',
    color: 'bg-purple-100 text-purple-800',
    icon: FileText,
    description: 'Quote has been prepared and sent',
  },
  'follow-up': {
    label: 'Follow-up Required',
    color: 'bg-orange-100 text-orange-800',
    icon: Clock,
    description: 'Requires follow-up action',
  },
  'no-action': {
    label: 'No Action Required',
    color: 'bg-gray-100 text-gray-800',
    icon: CheckCircle,
    description: 'Call completed, no further action needed',
  },
  incomplete: {
    label: 'Incomplete',
    color: 'bg-yellow-100 text-yellow-800',
    icon: AlertTriangle,
    description: 'Call was incomplete or interrupted',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-800',
    icon: XCircle,
    description: 'Call or appointment was cancelled',
  },
  completed: {
    label: 'Completed',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle,
    description: 'All actions completed successfully',
  },
};

const ACTION_CONFIGS = {
  call: { label: 'Phone Call', icon: Phone, color: 'bg-blue-100 text-blue-800' },
  email: { label: 'Email', icon: Mail, color: 'bg-green-100 text-green-800' },
  sms: { label: 'SMS', icon: MessageSquare, color: 'bg-purple-100 text-purple-800' },
  appointment: { label: 'Appointment', icon: Calendar, color: 'bg-orange-100 text-orange-800' },
  quote: { label: 'Quote', icon: FileText, color: 'bg-yellow-100 text-yellow-800' },
  'follow-up': { label: 'Follow-up', icon: ArrowRight, color: 'bg-indigo-100 text-indigo-800' },
  note: { label: 'Note', icon: FileText, color: 'bg-gray-100 text-gray-800' },
};

export function CallOutcomeManagement({
  callId,
  currentOutcome,
  onOutcomeUpdate,
  onOutcomeCreate,
  className = '',
}: CallOutcomeManagementProps) {
  const [outcome, setOutcome] = useState<CallOutcome>(currentOutcome || mockOutcome);
  const [isEditing, setIsEditing] = useState(!currentOutcome);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [newAction, setNewAction] = useState<Partial<OutcomeAction>>({
    type: 'call',
    description: '',
    status: 'pending',
  });

  const { addToast } = useUIStore();

  // Calculate outcome statistics
  const outcomeStats = useMemo(() => {
    const totalActions = outcome.actions.length;
    const completedActions = outcome.actions.filter(a => a.status === 'completed').length;
    const pendingActions = outcome.actions.filter(a => a.status === 'pending').length;
    const overdueActions = outcome.actions.filter(a => 
      a.status === 'pending' && a.dueDate && a.dueDate < new Date()
    ).length;

    return {
      totalActions,
      completedActions,
      pendingActions,
      overdueActions,
      completionRate: totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0,
    };
  }, [outcome.actions]);

  const handleOutcomeChange = useCallback((field: keyof CallOutcome, value: any) => {
    setOutcome(prev => ({
      ...prev,
      [field]: value,
      updatedAt: new Date(),
    }));
  }, []);

  const handleSaveOutcome = useCallback(() => {
    if (currentOutcome) {
      onOutcomeUpdate?.(outcome);
    } else {
      onOutcomeCreate?.(outcome);
    }
    setIsEditing(false);
    addToast({
      type: 'success',
      title: 'Outcome Saved',
      message: 'Call outcome has been saved successfully',
      duration: 3000,
    });
  }, [outcome, currentOutcome, onOutcomeUpdate, onOutcomeCreate, addToast]);

  const handleApplyTemplate = useCallback((template: OutcomeTemplate) => {
    const newActions: OutcomeAction[] = template.defaultActions.map((action, index) => ({
      ...action,
      id: `action-${Date.now()}-${index}`,
    }));

    setOutcome(prev => ({
      ...prev,
      outcome: template.outcome,
      actions: [...prev.actions, ...newActions],
      tags: [...new Set([...prev.tags, ...template.tags])],
      updatedAt: new Date(),
    }));

    setShowTemplateDialog(false);
    addToast({
      type: 'success',
      title: 'Template Applied',
      message: `Applied template: ${template.name}`,
      duration: 3000,
    });
  }, [addToast]);

  const handleAddAction = useCallback(() => {
    if (!newAction.description) return;

    const action: OutcomeAction = {
      id: `action-${Date.now()}`,
      type: newAction.type || 'call',
      description: newAction.description,
      status: 'pending',
      dueDate: newAction.dueDate,
      notes: newAction.notes,
    };

    setOutcome(prev => ({
      ...prev,
      actions: [...prev.actions, action],
      updatedAt: new Date(),
    }));

    setNewAction({
      type: 'call',
      description: '',
      status: 'pending',
    });
    setShowActionDialog(false);

    addToast({
      type: 'success',
      title: 'Action Added',
      message: 'New action has been added to the outcome',
      duration: 3000,
    });
  }, [newAction, addToast]);

  const handleCompleteAction = useCallback((actionId: string) => {
    setOutcome(prev => ({
      ...prev,
      actions: prev.actions.map(action =>
        action.id === actionId
          ? {
              ...action,
              status: 'completed' as const,
              completedAt: new Date(),
              completedBy: {
                id: 'current-user',
                name: 'Current User',
              },
            }
          : action
      ),
      updatedAt: new Date(),
    }));

    addToast({
      type: 'success',
      title: 'Action Completed',
      message: 'Action has been marked as completed',
      duration: 3000,
    });
  }, [addToast]);

  const outcomeConfig = OUTCOME_CONFIGS[outcome.outcome];
  const OutcomeIcon = outcomeConfig.icon;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Outcome Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', outcomeConfig.color.replace('text-', 'bg-').replace('800', '200'))}>
                <OutcomeIcon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Call Outcome Management
                  <Badge variant="outline" className={outcomeConfig.color}>
                    {outcomeConfig.label}
                  </Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {outcomeConfig.description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <Button size="sm" onClick={handleSaveOutcome}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setShowTemplateDialog(true)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Apply Template
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowActionDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Action
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <History className="mr-2 h-4 w-4" />
                    View History
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Outcome Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{outcomeStats.totalActions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{outcomeStats.completedActions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{outcomeStats.pendingActions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{outcomeStats.completionRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Outcome Details</TabsTrigger>
          <TabsTrigger value="actions">Actions ({outcomeStats.totalActions})</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Outcome Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="outcome-type">Outcome Type</Label>
                  <Select
                    value={outcome.outcome}
                    onValueChange={(value) => handleOutcomeChange('outcome', value)}
                    disabled={!isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(OUTCOME_CONFIGS).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <config.icon className="h-4 w-4" />
                            {config.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={outcome.priority}
                    onValueChange={(value) => handleOutcomeChange('priority', value)}
                    disabled={!isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Priority</SelectItem>
                      <SelectItem value="medium">Medium Priority</SelectItem>
                      <SelectItem value="high">High Priority</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimated-value">Estimated Value</Label>
                  <Input
                    id="estimated-value"
                    type="number"
                    value={outcome.estimatedValue || ''}
                    onChange={(e) => handleOutcomeChange('estimatedValue', parseFloat(e.target.value) || undefined)}
                    disabled={!isEditing}
                    placeholder="Enter estimated value"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="due-date">Due Date</Label>
                  <Input
                    id="due-date"
                    type="datetime-local"
                    value={outcome.dueDate ? format(outcome.dueDate, "yyyy-MM-dd'T'HH:mm") : ''}
                    onChange={(e) => handleOutcomeChange('dueDate', e.target.value ? new Date(e.target.value) : undefined)}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={outcome.notes}
                  onChange={(e) => handleOutcomeChange('notes', e.target.value)}
                  disabled={!isEditing}
                  placeholder="Add notes about this outcome..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {outcome.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                  {isEditing && (
                    <Button variant="outline" size="sm">
                      <Plus className="h-3 w-3 mr-1" />
                      Add Tag
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Action Items</h3>
            <Button onClick={() => setShowActionDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Action
            </Button>
          </div>

          <div className="space-y-3">
            {outcome.actions.map((action) => {
              const actionConfig = ACTION_CONFIGS[action.type];
              const ActionIcon = actionConfig.icon;
              const isOverdue = action.status === 'pending' && action.dueDate && action.dueDate < new Date();

              return (
                <Card key={action.id} className={cn(
                  'transition-colors',
                  action.status === 'completed' && 'bg-green-50 border-green-200',
                  isOverdue && 'bg-red-50 border-red-200'
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={cn('p-2 rounded-lg', actionConfig.color)}>
                          <ActionIcon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{action.description}</span>
                            <Badge variant="outline" className={actionConfig.color}>
                              {actionConfig.label}
                            </Badge>
                            {action.status === 'completed' && (
                              <Badge variant="outline" className="bg-green-100 text-green-800">
                                Completed
                              </Badge>
                            )}
                            {isOverdue && (
                              <Badge variant="destructive">
                                Overdue
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {action.dueDate && (
                              <span>Due: {format(action.dueDate, 'MMM d, yyyy h:mm a')}</span>
                            )}
                            {action.completedAt && (
                              <span>Completed: {formatDistanceToNow(action.completedAt, { addSuffix: true })}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {action.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => handleCompleteAction(action.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Complete
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Action
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <FileText className="mr-2 h-4 w-4" />
                              Add Notes
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {outcome.actions.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Actions Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Add action items to track follow-up tasks for this call outcome.
                  </p>
                  <Button onClick={() => setShowActionDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Action
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Outcome History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Outcome Created</p>
                    <p className="text-sm text-muted-foreground">
                      Created by {outcome.createdBy.name} • {formatDistanceToNow(outcome.createdAt, { addSuffix: true })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Edit className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">Last Updated</p>
                    <p className="text-sm text-muted-foreground">
                      Updated {formatDistanceToNow(outcome.updatedAt, { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Template Selection Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Apply Outcome Template</DialogTitle>
            <DialogDescription>
              Choose a template to quickly set up common outcome workflows with predefined actions.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {OUTCOME_TEMPLATES.map((template) => {
              const templateConfig = OUTCOME_CONFIGS[template.outcome];
              const TemplateIcon = templateConfig.icon;

              return (
                <Card
                  key={template.id}
                  className={cn(
                    'cursor-pointer transition-colors hover:bg-muted',
                    selectedTemplate === template.id && 'border-primary bg-primary/5'
                  )}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={cn('p-2 rounded-lg', templateConfig.color.replace('text-', 'bg-').replace('800', '200'))}>
                        <TemplateIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{template.name}</h4>
                          <Badge variant="outline" className={templateConfig.color}>
                            {templateConfig.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {template.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{template.defaultActions.length} actions</span>
                          <span>~{template.estimatedDuration} min</span>
                          <div className="flex gap-1">
                            {template.tags.map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const template = OUTCOME_TEMPLATES.find(t => t.id === selectedTemplate);
                if (template) handleApplyTemplate(template);
              }}
              disabled={!selectedTemplate}
            >
              Apply Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Action</DialogTitle>
            <DialogDescription>
              Create a new action item for this call outcome.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="action-type">Action Type</Label>
              <Select
                value={newAction.type}
                onValueChange={(value) => setNewAction(prev => ({ ...prev, type: value as OutcomeAction['type'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ACTION_CONFIGS).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <config.icon className="h-4 w-4" />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="action-description">Description</Label>
              <Input
                id="action-description"
                value={newAction.description || ''}
                onChange={(e) => setNewAction(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what needs to be done..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="action-due-date">Due Date (Optional)</Label>
              <Input
                id="action-due-date"
                type="datetime-local"
                value={newAction.dueDate ? format(newAction.dueDate, "yyyy-MM-dd'T'HH:mm") : ''}
                onChange={(e) => setNewAction(prev => ({ 
                  ...prev, 
                  dueDate: e.target.value ? new Date(e.target.value) : undefined 
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="action-notes">Notes (Optional)</Label>
              <Textarea
                id="action-notes"
                value={newAction.notes || ''}
                onChange={(e) => setNewAction(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add any additional notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAction} disabled={!newAction.description}>
              Add Action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
