import React, { useState, useCallback } from 'react';
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
import { Progress } from '@/components/ui/progress';
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
  Wrench,
  User,
  Car,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  CheckCircle,
  AlertTriangle,
  Activity,
  Pause,
  Play,
  Square,
  Edit,
  Save,
  X,
  Plus,
  MoreHorizontal,
  Phone,
  Mail,
  MessageSquare,
  Star,
  MapPin,
  Timer,
  TrendingUp,
  Settings,
  Camera,
  Paperclip,
  Flag,
  Target,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, addHours } from 'date-fns';
import { useUIStore } from '@/stores';

export interface JobDetails {
  id: string;
  jobNumber: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'paused' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'maintenance' | 'repair' | 'diagnostic' | 'emergency';
  
  // Customer & Vehicle
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string;
    address: string;
  };
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: string;
    vin: string;
    license: string;
    mileage: number;
    color: string;
  };

  // Scheduling
  scheduledDate?: Date;
  startDate?: Date;
  completedDate?: Date;
  estimatedDuration: number; // minutes
  actualDuration?: number; // minutes
  
  // Assignment
  assignedTechnician?: {
    id: string;
    name: string;
    specialties: string[];
    rating: number;
  };
  bay?: {
    id: string;
    name: string;
    type: string;
  };

  // Financial
  estimatedCost: number;
  actualCost?: number;
  laborCost?: number;
  partsCost?: number;
  invoiceNumber?: string;
  
  // Progress
  progressPercentage: number;
  milestones: JobMilestone[];
  
  // Communication
  notes: JobNote[];
  attachments: JobAttachment[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface JobMilestone {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  completedAt?: Date;
  completedBy?: string;
  estimatedDuration: number;
  actualDuration?: number;
}

export interface JobNote {
  id: string;
  content: string;
  type: 'general' | 'technical' | 'customer' | 'internal';
  author: string;
  createdAt: Date;
  isImportant: boolean;
}

export interface JobAttachment {
  id: string;
  name: string;
  type: 'image' | 'document' | 'video';
  url: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
}

interface JobDetailsViewProps {
  jobId: string;
  onJobUpdate?: (job: JobDetails) => void;
  onJobAction?: (action: string, jobId: string) => void;
  className?: string;
}

// Mock job data
const mockJob: JobDetails = {
  id: 'job-001',
  jobNumber: 'JOB-001',
  title: 'Brake Pad Replacement',
  description: 'Replace front brake pads and inspect rotors. Customer reported grinding noise when braking.',
  status: 'in-progress',
  priority: 'high',
  category: 'repair',
  invoiceNumber: 'INV-1042',
  
  customer: {
    id: 'cust-001',
    name: 'John Smith',
    phone: '(555) 123-4567',
    email: 'john@example.com',
    address: '123 Main St, City, ST 12345',
  },
  
  vehicle: {
    id: 'veh-001',
    make: 'Honda',
    model: 'Civic',
    year: '2020',
    vin: '1HGBH41JXMN109186',
    license: 'ABC-1234',
    mileage: 45230,
    color: 'Silver',
  },

  scheduledDate: new Date(),
  startDate: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  estimatedDuration: 180, // 3 hours
  actualDuration: 120, // 2 hours so far

  assignedTechnician: {
    id: 'tech-001',
    name: 'Mike Johnson',
    specialties: ['brakes', 'suspension', 'general-repair'],
    rating: 4.8,
  },

  bay: {
    id: 'bay-002',
    name: 'Bay 2',
    type: 'lift',
  },

  estimatedCost: 350,
  actualCost: 320,
  laborCost: 200,
  partsCost: 120,

  progressPercentage: 65,
  milestones: [
    {
      id: 'milestone-1',
      title: 'Initial Inspection',
      description: 'Inspect brake system and identify issues',
      status: 'completed',
      completedAt: new Date(Date.now() - 90 * 60 * 1000),
      completedBy: 'Mike Johnson',
      estimatedDuration: 30,
      actualDuration: 25,
    },
    {
      id: 'milestone-2',
      title: 'Remove Old Brake Pads',
      description: 'Remove worn brake pads and clean calipers',
      status: 'completed',
      completedAt: new Date(Date.now() - 60 * 60 * 1000),
      completedBy: 'Mike Johnson',
      estimatedDuration: 45,
      actualDuration: 40,
    },
    {
      id: 'milestone-3',
      title: 'Install New Brake Pads',
      description: 'Install new brake pads and reassemble',
      status: 'in-progress',
      estimatedDuration: 60,
      actualDuration: 45,
    },
    {
      id: 'milestone-4',
      title: 'Final Testing',
      description: 'Test brake system and road test',
      status: 'pending',
      estimatedDuration: 45,
    },
  ],

  notes: [
    {
      id: 'note-1',
      content: 'Customer mentioned grinding noise started 2 weeks ago',
      type: 'customer',
      author: 'Sarah Johnson',
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      isImportant: true,
    },
    {
      id: 'note-2',
      content: 'Front rotors are within spec, no replacement needed',
      type: 'technical',
      author: 'Mike Johnson',
      createdAt: new Date(Date.now() - 90 * 60 * 1000),
      isImportant: false,
    },
  ],

  attachments: [
    {
      id: 'att-1',
      name: 'brake-inspection-photos.jpg',
      type: 'image',
      url: '/attachments/brake-inspection.jpg',
      size: 2048576, // 2MB
      uploadedBy: 'Mike Johnson',
      uploadedAt: new Date(Date.now() - 90 * 60 * 1000),
    },
  ],

  createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
  updatedAt: new Date(Date.now() - 30 * 60 * 1000),
  createdBy: 'Sarah Johnson',
};

const STATUS_CONFIGS = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-800', icon: Clock },
  'in-progress': { label: 'In Progress', color: 'bg-blue-100 text-blue-800', icon: Activity },
  paused: { label: 'Paused', color: 'bg-yellow-100 text-yellow-800', icon: Pause },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: X },
};

const PRIORITY_CONFIGS = {
  low: { label: 'Low', color: 'bg-green-100 text-green-800' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-800' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-800' },
};

const NOTE_TYPE_CONFIGS = {
  general: { label: 'General', color: 'bg-gray-100 text-gray-800', icon: FileText },
  technical: { label: 'Technical', color: 'bg-blue-100 text-blue-800', icon: Settings },
  customer: { label: 'Customer', color: 'bg-green-100 text-green-800', icon: User },
  internal: { label: 'Internal', color: 'bg-purple-100 text-purple-800', icon: Flag },
};

export function JobDetailsView({
  jobId,
  onJobUpdate,
  onJobAction,
  className = '',
}: JobDetailsViewProps) {
  const [job, setJob] = useState<JobDetails>(mockJob);
  const [isEditing, setIsEditing] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [newNote, setNewNote] = useState({ content: '', type: 'general' as const, isImportant: false });
  const [invoiceValue, setInvoiceValue] = useState(job.invoiceNumber ?? '');
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  const { addToast } = useUIStore();

  React.useEffect(() => {
    setInvoiceValue(job.invoiceNumber ?? '');
  }, [job.invoiceNumber]);

  const invoicePattern = /^[A-Za-z0-9\-\/]{1,20}$/;

  const validateAndSaveInvoice = (rawValue: string) => {
    const trimmed = rawValue.trim();

    if (trimmed === '') {
      setInvoiceError(null);
      setJob((prev) => ({ ...prev, invoiceNumber: undefined }));
      return;
    }

    if (!invoicePattern.test(trimmed)) {
      setInvoiceError('Use 1-20 characters: letters, numbers, dash, or slash.');
      return;
    }

    setInvoiceError(null);
    setJob((prev) => ({ ...prev, invoiceNumber: trimmed }));
  };

  const handleInvoiceBlur = () => {
    validateAndSaveInvoice(invoiceValue);
  };

  // Calculate progress
  const completedMilestones = job.milestones.filter(m => m.status === 'completed').length;
  const totalMilestones = job.milestones.length;
  const calculatedProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  // Calculate time remaining
  const timeElapsed = job.startDate ? Date.now() - job.startDate.getTime() : 0;
  const timeRemaining = job.estimatedDuration * 60 * 1000 - timeElapsed;

  const handleJobAction = useCallback((action: string) => {
    onJobAction?.(action, job.id);
    
    // Update local state based on action
    switch (action) {
      case 'start':
        setJob(prev => ({
          ...prev,
          status: 'in-progress',
          startDate: new Date(),
          updatedAt: new Date(),
        }));
        break;
      case 'pause':
        setJob(prev => ({
          ...prev,
          status: 'paused',
          updatedAt: new Date(),
        }));
        break;
      case 'complete':
        setJob(prev => ({
          ...prev,
          status: 'completed',
          completedDate: new Date(),
          progressPercentage: 100,
          updatedAt: new Date(),
        }));
        break;
    }

    addToast({
      type: 'success',
      title: 'Job Updated',
      message: `Job ${job.jobNumber} has been ${action}ed`,
      duration: 3000,
    });
  }, [job.id, job.jobNumber, onJobAction, addToast]);

  const handleAddNote = useCallback(() => {
    if (!newNote.content.trim()) return;

    const note: JobNote = {
      id: `note-${Date.now()}`,
      content: newNote.content,
      type: newNote.type,
      author: 'Current User',
      createdAt: new Date(),
      isImportant: newNote.isImportant,
    };

    setJob(prev => ({
      ...prev,
      notes: [note, ...prev.notes],
      updatedAt: new Date(),
    }));

    setNewNote({ content: '', type: 'general', isImportant: false });
    setShowNoteDialog(false);

    addToast({
      type: 'success',
      title: 'Note Added',
      message: 'Job note has been added successfully',
      duration: 3000,
    });
  }, [newNote, addToast]);

  const handleMilestoneComplete = useCallback((milestoneId: string) => {
    setJob(prev => ({
      ...prev,
      milestones: prev.milestones.map(milestone =>
        milestone.id === milestoneId
          ? {
              ...milestone,
              status: 'completed' as const,
              completedAt: new Date(),
              completedBy: 'Current User',
              actualDuration: milestone.estimatedDuration, // Mock actual duration
            }
          : milestone
      ),
      progressPercentage: Math.min(100, prev.progressPercentage + 25), // Increase progress
      updatedAt: new Date(),
    }));

    addToast({
      type: 'success',
      title: 'Milestone Completed',
      message: 'Job milestone has been marked as completed',
      duration: 3000,
    });
  }, [addToast]);

  const statusConfig = STATUS_CONFIGS[job.status];
  const priorityConfig = PRIORITY_CONFIGS[job.priority];
  const StatusIcon = statusConfig.icon;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Job Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Wrench className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{job.title}</h2>
                  <p className="text-sm text-muted-foreground">{job.jobNumber}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={statusConfig.color}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusConfig.label}
                </Badge>
                <Badge variant="outline" className={priorityConfig.color}>
                  {priorityConfig.label} Priority
                </Badge>
                <Badge variant="outline">
                  {job.category}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {job.status === 'pending' && (
                <Button size="sm" onClick={() => handleJobAction('start')}>
                  <Play className="h-4 w-4 mr-2" />
                  Start Job
                </Button>
              )}
              {job.status === 'in-progress' && (
                <>
                  <Button variant="outline" size="sm" onClick={() => handleJobAction('pause')}>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </Button>
                  <Button size="sm" onClick={() => handleJobAction('complete')}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete
                  </Button>
                </>
              )}
              {job.status === 'paused' && (
                <Button size="sm" onClick={() => handleJobAction('start')}>
                  <Play className="h-4 w-4 mr-2" />
                  Resume
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Job Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Job
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowNoteDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Note
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Camera className="mr-2 h-4 w-4" />
                    Take Photo
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Paperclip className="mr-2 h-4 w-4" />
                    Attach File
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Progress Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">{calculatedProgress}%</span>
            </div>
            <Progress value={calculatedProgress} className="h-2" />
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>{completedMilestones} of {totalMilestones} milestones</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span>
                  {timeRemaining > 0 
                    ? `${Math.round(timeRemaining / (60 * 1000))} min remaining`
                    : 'Overdue'
                  }
                </span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span>${job.actualCost || job.estimatedCost}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-purple-600" />
                <span>{job.assignedTechnician?.name || 'Unassigned'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="notes">Notes ({job.notes.length})</TabsTrigger>
          <TabsTrigger value="attachments">Files ({job.attachments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <div className="grid gap-4">
            {/* Customer & Vehicle Info */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Customer
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="font-semibold">{job.customer.name}</div>
                    <div className="text-sm text-muted-foreground">{job.customer.phone}</div>
                    <div className="text-sm text-muted-foreground">{job.customer.email}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Phone className="h-3 w-3 mr-1" />
                      Call
                    </Button>
                    <Button variant="outline" size="sm">
                      <Mail className="h-3 w-3 mr-1" />
                      Email
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    Vehicle
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="font-semibold">
                      {job.vehicle.year} {job.vehicle.make} {job.vehicle.model}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {job.vehicle.license} • {job.vehicle.mileage.toLocaleString()} miles
                    </div>
                    <div className="text-sm text-muted-foreground font-mono">
                      {job.vehicle.vin}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Job Details */}
            <Card>
              <CardHeader>
                <CardTitle>Job Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Description</Label>
                    <p className="text-sm mt-1">{job.description}</p>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Scheduled Date</Label>
                      <div className="text-sm mt-1">
                        {job.scheduledDate ? format(job.scheduledDate, 'MMM d, yyyy h:mm a') : 'Not scheduled'}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Estimated Duration</Label>
                      <div className="text-sm mt-1">{job.estimatedDuration} minutes</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Bay Assignment</Label>
                      <div className="text-sm mt-1">{job.bay?.name || 'Not assigned'}</div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Estimated Cost</Label>
                    <div className="text-sm mt-1 font-semibold">${job.estimatedCost}</div>
                  </div>
                    <div>
                      <Label className="text-sm font-medium">Labor Cost</Label>
                      <div className="text-sm mt-1">${job.laborCost || 0}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Parts Cost</Label>
                      <div className="text-sm mt-1">${job.partsCost || 0}</div>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="job-invoice-number" className="text-sm font-medium">
                      Invoice # (optional)
                    </Label>
                    <Input
                      id="job-invoice-number"
                      value={invoiceValue}
                      onChange={(event) => {
                        const value = event.target.value;
                        setInvoiceValue(value);
                        if (value.trim() === '' || invoicePattern.test(value.trim())) {
                          setInvoiceError(null);
                        }
                      }}
                      onBlur={handleInvoiceBlur}
                      placeholder="e.g. INV-1042"
                      maxLength={20}
                      className="max-w-xs font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional. Paste the number from your invoicing program.
                    </p>
                    {invoiceError && (
                      <p className="text-xs text-destructive">{invoiceError}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Job Milestones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {job.milestones.map((milestone, index) => {
                  const isCompleted = milestone.status === 'completed';
                  const isInProgress = milestone.status === 'in-progress';
                  const isPending = milestone.status === 'pending';

                  return (
                    <div key={milestone.id} className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center',
                          isCompleted && 'bg-green-100',
                          isInProgress && 'bg-blue-100',
                          isPending && 'bg-gray-100'
                        )}>
                          {isCompleted && <CheckCircle className="h-4 w-4 text-green-600" />}
                          {isInProgress && <Activity className="h-4 w-4 text-blue-600" />}
                          {isPending && <Clock className="h-4 w-4 text-gray-600" />}
                        </div>
                        {index < job.milestones.length - 1 && (
                          <div className={cn(
                            'w-0.5 h-12 mt-2',
                            isCompleted ? 'bg-green-200' : 'bg-gray-200'
                          )} />
                        )}
                      </div>

                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{milestone.title}</h4>
                          {isPending && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMilestoneComplete(milestone.id)}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Complete
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{milestone.description}</p>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Est: {milestone.estimatedDuration} min</span>
                          {milestone.actualDuration && (
                            <span>Actual: {milestone.actualDuration} min</span>
                          )}
                          {milestone.completedAt && (
                            <span>Completed: {formatDistanceToNow(milestone.completedAt, { addSuffix: true })}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Job Notes</h3>
            <Button onClick={() => setShowNoteDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Note
            </Button>
          </div>

          <div className="space-y-3">
            {job.notes.map((note) => {
              const noteConfig = NOTE_TYPE_CONFIGS[note.type];
              const NoteIcon = noteConfig.icon;

              return (
                <Card key={note.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn('p-2 rounded-lg', noteConfig.color)}>
                        <NoteIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className={noteConfig.color}>
                            {noteConfig.label}
                          </Badge>
                          {note.isImportant && (
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                              <Star className="h-3 w-3 mr-1" />
                              Important
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            by {note.author} • {formatDistanceToNow(note.createdAt, { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm">{note.content}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {job.notes.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Notes Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Add notes to keep track of important information about this job.
                  </p>
                  <Button onClick={() => setShowNoteDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Note
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="attachments" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Attachments</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Camera className="h-4 w-4 mr-2" />
                Take Photo
              </Button>
              <Button variant="outline" size="sm">
                <Paperclip className="h-4 w-4 mr-2" />
                Attach File
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {job.attachments.map((attachment) => (
              <Card key={attachment.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      {attachment.type === 'image' && <Camera className="h-4 w-4 text-blue-600" />}
                      {attachment.type === 'document' && <FileText className="h-4 w-4 text-blue-600" />}
                      {attachment.type === 'video' && <Activity className="h-4 w-4 text-blue-600" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{attachment.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {(attachment.size / 1024 / 1024).toFixed(1)} MB • 
                        {formatDistanceToNow(attachment.uploadedAt, { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {job.attachments.length === 0 && (
              <Card className="md:col-span-2">
                <CardContent className="p-8 text-center">
                  <Paperclip className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Attachments</h3>
                  <p className="text-muted-foreground mb-4">
                    Add photos, documents, or other files related to this job.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button variant="outline">
                      <Camera className="h-4 w-4 mr-2" />
                      Take Photo
                    </Button>
                    <Button variant="outline">
                      <Paperclip className="h-4 w-4 mr-2" />
                      Attach File
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Job Note</DialogTitle>
            <DialogDescription>
              Add a note to keep track of important information about this job.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="note-type">Note Type</Label>
              <Select
                value={newNote.type}
                onValueChange={(value) => setNewNote(prev => ({ ...prev, type: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(NOTE_TYPE_CONFIGS).map(([key, config]) => (
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

            <div>
              <Label htmlFor="note-content">Note Content</Label>
              <Textarea
                id="note-content"
                value={newNote.content}
                onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter your note here..."
                rows={4}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="important"
                checked={newNote.isImportant}
                onChange={(e) => setNewNote(prev => ({ ...prev, isImportant: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="important" className="text-sm">
                Mark as important
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddNote} disabled={!newNote.content.trim()}>
              Add Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
