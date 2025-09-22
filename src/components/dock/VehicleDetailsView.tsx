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
  Car,
  User,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  CheckCircle,
  AlertTriangle,
  Activity,
  Settings,
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
  Camera,
  Paperclip,
  Flag,
  Target,
  Zap,
  Wrench,
  Gauge,
  Fuel,
  Shield,
  Award,
  History,
  Bell,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, addDays, subDays } from 'date-fns';
import { useUIStore } from '@/stores';

export interface VehicleDetails {
  id: string;
  // Basic Information
  make: string;
  model: string;
  year: string;
  vin: string;
  license: string;
  color: string;
  mileage: number;
  engineType: string;
  transmission: string;
  fuelType: string;
  
  // Owner Information
  owner: {
    id: string;
    name: string;
    phone: string;
    email: string;
    address: string;
  };

  // Registration & Insurance
  registration: {
    state: string;
    expirationDate: Date;
    registrationNumber: string;
  };
  insurance: {
    provider: string;
    policyNumber: string;
    expirationDate: Date;
    coverage: string[];
  };

  // Service Information
  lastServiceDate?: Date;
  nextServiceDue?: Date;
  serviceInterval: number; // miles
  warrantyInfo?: {
    type: string;
    expirationDate: Date;
    provider: string;
    coverage: string[];
  };

  // Health & Status
  overallCondition: 'excellent' | 'good' | 'fair' | 'poor';
  healthScore: number; // 0-100
  activeIssues: VehicleIssue[];
  maintenanceAlerts: MaintenanceAlert[];

  // Service History
  serviceHistory: ServiceRecord[];
  
  // Documentation
  photos: VehiclePhoto[];
  documents: VehicleDocument[];
  notes: VehicleNote[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  addedBy: string;
}

export interface VehicleIssue {
  id: string;
  type: 'mechanical' | 'electrical' | 'body' | 'interior' | 'safety';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  reportedDate: Date;
  reportedBy: string;
  estimatedCost?: number;
  status: 'open' | 'in-progress' | 'resolved';
}

export interface MaintenanceAlert {
  id: string;
  type: 'scheduled' | 'overdue' | 'upcoming' | 'recall';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  dueDate?: Date;
  dueMileage?: number;
  estimatedCost?: number;
  category: string;
}

export interface ServiceRecord {
  id: string;
  jobId?: string;
  date: Date;
  mileage: number;
  serviceType: string;
  description: string;
  technician: string;
  cost: number;
  laborHours: number;
  partsUsed: string[];
  warranty?: {
    duration: number; // months
    type: string;
  };
  status: 'completed' | 'warranty-active' | 'warranty-expired';
  rating?: number;
  customerNotes?: string;
}

export interface VehiclePhoto {
  id: string;
  url: string;
  type: 'exterior' | 'interior' | 'engine' | 'damage' | 'repair' | 'before' | 'after';
  description: string;
  takenDate: Date;
  takenBy: string;
  associatedJobId?: string;
}

export interface VehicleDocument {
  id: string;
  name: string;
  type: 'registration' | 'insurance' | 'warranty' | 'manual' | 'receipt' | 'inspection' | 'other';
  url: string;
  size: number;
  uploadedDate: Date;
  uploadedBy: string;
  expirationDate?: Date;
}

export interface VehicleNote {
  id: string;
  content: string;
  type: 'general' | 'maintenance' | 'issue' | 'customer-preference';
  author: string;
  createdAt: Date;
  isImportant: boolean;
  relatedJobId?: string;
}

interface VehicleDetailsViewProps {
  vehicleId: string;
  onVehicleUpdate?: (vehicle: VehicleDetails) => void;
  onVehicleAction?: (action: string, vehicleId: string) => void;
  onContextChange?: (context: string, data?: any) => void;
  className?: string;
}

// Mock vehicle data
const mockVehicle: VehicleDetails = {
  id: 'veh-001',
  make: 'Honda',
  model: 'Civic',
  year: '2020',
  vin: '1HGBH41JXMN109186',
  license: 'ABC-1234',
  color: 'Silver',
  mileage: 45230,
  engineType: '2.0L 4-Cylinder',
  transmission: 'CVT Automatic',
  fuelType: 'Gasoline',

  owner: {
    id: 'cust-001',
    name: 'John Smith',
    phone: '(555) 123-4567',
    email: 'john@example.com',
    address: '123 Main St, City, ST 12345',
  },

  registration: {
    state: 'CA',
    expirationDate: new Date(2024, 11, 15), // Dec 15, 2024
    registrationNumber: 'CA123456789',
  },

  insurance: {
    provider: 'State Farm',
    policyNumber: 'SF-123456789',
    expirationDate: new Date(2024, 5, 30), // June 30, 2024
    coverage: ['Liability', 'Collision', 'Comprehensive'],
  },

  lastServiceDate: subDays(new Date(), 45),
  nextServiceDue: addDays(new Date(), 30),
  serviceInterval: 5000,

  warrantyInfo: {
    type: 'Powertrain Warranty',
    expirationDate: new Date(2025, 7, 15), // Aug 15, 2025
    provider: 'Honda',
    coverage: ['Engine', 'Transmission', 'Drivetrain'],
  },

  overallCondition: 'good',
  healthScore: 78,

  activeIssues: [
    {
      id: 'issue-1',
      type: 'mechanical',
      severity: 'medium',
      title: 'Brake Pad Wear',
      description: 'Front brake pads showing signs of wear, replacement recommended within 2000 miles',
      reportedDate: subDays(new Date(), 10),
      reportedBy: 'Mike Johnson',
      estimatedCost: 350,
      status: 'open',
    },
  ],

  maintenanceAlerts: [
    {
      id: 'alert-1',
      type: 'upcoming',
      priority: 'medium',
      title: 'Oil Change Due',
      description: 'Next oil change is due in 770 miles or 30 days',
      dueDate: addDays(new Date(), 30),
      dueMileage: 50000,
      estimatedCost: 75,
      category: 'routine-maintenance',
    },
    {
      id: 'alert-2',
      type: 'scheduled',
      priority: 'low',
      title: 'Tire Rotation',
      description: 'Tire rotation recommended every 5,000-7,500 miles',
      dueMileage: 47500,
      estimatedCost: 50,
      category: 'maintenance',
    },
  ],

  serviceHistory: [
    {
      id: 'service-1',
      jobId: 'job-001',
      date: subDays(new Date(), 45),
      mileage: 42000,
      serviceType: 'Oil Change',
      description: 'Regular oil change service with filter replacement',
      technician: 'Mike Johnson',
      cost: 75,
      laborHours: 0.5,
      partsUsed: ['Oil Filter', 'Engine Oil (5W-30)'],
      warranty: {
        duration: 6,
        type: 'Parts & Labor',
      },
      status: 'warranty-active',
      rating: 5,
      customerNotes: 'Great service, very professional',
    },
    {
      id: 'service-2',
      date: subDays(new Date(), 120),
      mileage: 38500,
      serviceType: 'Brake Inspection',
      description: 'Annual brake system inspection',
      technician: 'Sarah Wilson',
      cost: 0,
      laborHours: 0.5,
      partsUsed: [],
      status: 'completed',
      rating: 5,
    },
  ],

  photos: [
    {
      id: 'photo-1',
      url: '/photos/vehicle-exterior-1.jpg',
      type: 'exterior',
      description: 'Vehicle exterior - driver side',
      takenDate: new Date(),
      takenBy: 'Mike Johnson',
    },
  ],

  documents: [
    {
      id: 'doc-1',
      name: 'Vehicle Registration',
      type: 'registration',
      url: '/documents/registration.pdf',
      size: 1024000, // 1MB
      uploadedDate: new Date(),
      uploadedBy: 'John Smith',
      expirationDate: new Date(2024, 11, 15),
    },
  ],

  notes: [
    {
      id: 'note-1',
      content: 'Customer prefers synthetic oil for all oil changes',
      type: 'customer-preference',
      author: 'Mike Johnson',
      createdAt: subDays(new Date(), 45),
      isImportant: true,
    },
  ],

  createdAt: subDays(new Date(), 365),
  updatedAt: new Date(),
  addedBy: 'Sarah Johnson',
};

const CONDITION_CONFIGS = {
  excellent: { label: 'Excellent', color: 'bg-green-100 text-green-800', score: 90 },
  good: { label: 'Good', color: 'bg-blue-100 text-blue-800', score: 75 },
  fair: { label: 'Fair', color: 'bg-yellow-100 text-yellow-800', score: 60 },
  poor: { label: 'Poor', color: 'bg-red-100 text-red-800', score: 40 },
};

const ISSUE_SEVERITY_CONFIGS = {
  low: { label: 'Low', color: 'bg-green-100 text-green-800' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-800' },
  critical: { label: 'Critical', color: 'bg-red-100 text-red-800' },
};

const ALERT_PRIORITY_CONFIGS = {
  low: { label: 'Low', color: 'bg-green-100 text-green-800' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-800' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-800' },
};

export function VehicleDetailsView({
  vehicleId,
  onVehicleUpdate,
  onVehicleAction,
  onContextChange,
  className = '',
}: VehicleDetailsViewProps) {
  const [vehicle, setVehicle] = useState<VehicleDetails>(mockVehicle);
  const [isEditing, setIsEditing] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [newNote, setNewNote] = useState({ content: '', type: 'general' as const, isImportant: false });

  const { addToast } = useUIStore();

  // Calculate health score color
  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  // Calculate next service info
  const getNextServiceInfo = () => {
    const mileageUntilService = (vehicle.nextServiceDue ? 50000 : vehicle.mileage + vehicle.serviceInterval) - vehicle.mileage;
    const daysUntilService = vehicle.nextServiceDue 
      ? Math.ceil((vehicle.nextServiceDue.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 30;
    
    return { mileageUntilService, daysUntilService };
  };

  const handleVehicleAction = useCallback((action: string) => {
    onVehicleAction?.(action, vehicle.id);
    
    addToast({
      type: 'success',
      title: 'Action Completed',
      message: `Vehicle ${action} completed successfully`,
      duration: 3000,
    });
  }, [vehicle.id, onVehicleAction, addToast]);

  const handleAddNote = useCallback(() => {
    if (!newNote.content.trim()) return;

    const note: VehicleNote = {
      id: `note-${Date.now()}`,
      content: newNote.content,
      type: newNote.type,
      author: 'Current User',
      createdAt: new Date(),
      isImportant: newNote.isImportant,
    };

    setVehicle(prev => ({
      ...prev,
      notes: [note, ...prev.notes],
      updatedAt: new Date(),
    }));

    setNewNote({ content: '', type: 'general', isImportant: false });
    setShowNoteDialog(false);

    addToast({
      type: 'success',
      title: 'Note Added',
      message: 'Vehicle note has been added successfully',
      duration: 3000,
    });
  }, [newNote, addToast]);

  const conditionConfig = CONDITION_CONFIGS[vehicle.overallCondition];
  const { mileageUntilService, daysUntilService } = getNextServiceInfo();

  return (
    <div className={cn('space-y-6', className)}>
      {/* Vehicle Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Car className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {vehicle.license} • {vehicle.mileage.toLocaleString()} miles
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={conditionConfig.color}>
                  {conditionConfig.label} Condition
                </Badge>
                <Badge variant="outline">
                  {vehicle.fuelType}
                </Badge>
                <Badge variant="outline">
                  {vehicle.transmission}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onContextChange?.('customer-details', { id: vehicle.owner.id })}
              >
                <User className="h-4 w-4 mr-2" />
                Owner
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Vehicle Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Vehicle
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
                    <Calendar className="mr-2 h-4 w-4" />
                    Schedule Service
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Health & Status Overview */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Vehicle Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Health Score</span>
                <span className={cn('text-2xl font-bold', getHealthScoreColor(vehicle.healthScore))}>
                  {vehicle.healthScore}%
                </span>
              </div>
              <Progress value={vehicle.healthScore} className="h-2" />
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Active Issues</span>
                  <div className="font-semibold">{vehicle.activeIssues.length}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Alerts</span>
                  <div className="font-semibold">{vehicle.maintenanceAlerts.length}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Next Service
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-2xl font-bold">{daysUntilService} days</div>
                <div className="text-sm text-muted-foreground">
                  or {mileageUntilService} miles
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Last Service</span>
                  <span>{vehicle.lastServiceDate ? formatDistanceToNow(vehicle.lastServiceDate, { addSuffix: true }) : 'Never'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Service Interval</span>
                  <span>{vehicle.serviceInterval.toLocaleString()} miles</span>
                </div>
              </div>

              <Button size="sm" className="w-full">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Service
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">History ({vehicle.serviceHistory.length})</TabsTrigger>
          <TabsTrigger value="issues">Issues ({vehicle.activeIssues.length})</TabsTrigger>
          <TabsTrigger value="documents">Docs ({vehicle.documents.length})</TabsTrigger>
          <TabsTrigger value="notes">Notes ({vehicle.notes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4">
            {/* Vehicle Specifications */}
            <Card>
              <CardHeader>
                <CardTitle>Vehicle Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Make</Label>
                        <div className="text-sm mt-1">{vehicle.make}</div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Model</Label>
                        <div className="text-sm mt-1">{vehicle.model}</div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Year</Label>
                        <div className="text-sm mt-1">{vehicle.year}</div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Color</Label>
                        <div className="text-sm mt-1">{vehicle.color}</div>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">VIN</Label>
                      <div className="text-sm mt-1 font-mono">{vehicle.vin}</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Engine</Label>
                        <div className="text-sm mt-1">{vehicle.engineType}</div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Transmission</Label>
                        <div className="text-sm mt-1">{vehicle.transmission}</div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Fuel Type</Label>
                        <div className="text-sm mt-1">{vehicle.fuelType}</div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Mileage</Label>
                        <div className="text-sm mt-1">{vehicle.mileage.toLocaleString()} miles</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Owner & Registration */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Owner Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="font-semibold">{vehicle.owner.name}</div>
                    <div className="text-sm text-muted-foreground">{vehicle.owner.phone}</div>
                    <div className="text-sm text-muted-foreground">{vehicle.owner.email}</div>
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
                    <FileText className="h-4 w-4" />
                    Registration & Insurance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Registration</Label>
                    <div className="text-sm mt-1">
                      {vehicle.registration.state} • Exp: {format(vehicle.registration.expirationDate, 'MMM d, yyyy')}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Insurance</Label>
                    <div className="text-sm mt-1">
                      {vehicle.insurance.provider} • Exp: {format(vehicle.insurance.expirationDate, 'MMM d, yyyy')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Maintenance Alerts */}
            {vehicle.maintenanceAlerts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Maintenance Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {vehicle.maintenanceAlerts.map((alert) => {
                      const priorityConfig = ALERT_PRIORITY_CONFIGS[alert.priority];

                      return (
                        <div key={alert.id} className="flex items-start gap-3 p-3 border rounded-lg">
                          <div className="p-2 bg-orange-100 rounded-lg">
                            <Bell className="h-4 w-4 text-orange-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{alert.title}</span>
                              <Badge variant="outline" className={priorityConfig.color}>
                                {priorityConfig.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{alert.description}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              {alert.dueDate && (
                                <span>Due: {format(alert.dueDate, 'MMM d, yyyy')}</span>
                              )}
                              {alert.dueMileage && (
                                <span>At: {alert.dueMileage.toLocaleString()} miles</span>
                              )}
                              {alert.estimatedCost && (
                                <span>Est: ${alert.estimatedCost}</span>
                              )}
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            Schedule
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Service History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vehicle.serviceHistory.map((service) => (
                  <div key={service.id} className="flex items-start gap-4 p-4 border rounded-lg">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Wrench className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-medium">{service.serviceType}</h4>
                          <p className="text-sm text-muted-foreground">{service.description}</p>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">${service.cost}</div>
                          <div className="text-sm text-muted-foreground">
                            {format(service.date, 'MMM d, yyyy')}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Mileage: {service.mileage.toLocaleString()}</span>
                        <span>Technician: {service.technician}</span>
                        <span>Labor: {service.laborHours}h</span>
                        {service.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span>{service.rating}</span>
                          </div>
                        )}
                      </div>

                      {service.warranty && (
                        <div className="mt-2">
                          <Badge variant="outline" className="bg-green-100 text-green-800">
                            {service.warranty.duration} Month {service.warranty.type} Warranty
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {vehicle.serviceHistory.length === 0 && (
                  <div className="text-center py-8">
                    <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Service History</h3>
                    <p className="text-muted-foreground">
                      Service records will appear here once work is completed.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Active Issues</h3>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Report Issue
            </Button>
          </div>

          <div className="space-y-3">
            {vehicle.activeIssues.map((issue) => {
              const severityConfig = ISSUE_SEVERITY_CONFIGS[issue.severity];

              return (
                <Card key={issue.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{issue.title}</h4>
                          <Badge variant="outline" className={severityConfig.color}>
                            {severityConfig.label}
                          </Badge>
                          <Badge variant="outline">
                            {issue.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{issue.description}</p>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Reported: {formatDistanceToNow(issue.reportedDate, { addSuffix: true })}</span>
                          <span>By: {issue.reportedBy}</span>
                          {issue.estimatedCost && (
                            <span>Est. Cost: ${issue.estimatedCost}</span>
                          )}
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Create Job
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {vehicle.activeIssues.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Active Issues</h3>
                  <p className="text-muted-foreground">
                    This vehicle has no reported issues. Great condition!
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Documents & Photos</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Camera className="h-4 w-4 mr-2" />
                Take Photo
              </Button>
              <Button variant="outline" size="sm">
                <Paperclip className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vehicle.documents.map((document) => (
              <Card key={document.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{document.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {(document.size / 1024 / 1024).toFixed(1)} MB • 
                        {formatDistanceToNow(document.uploadedDate, { addSuffix: true })}
                      </div>
                      {document.expirationDate && (
                        <div className="text-xs text-muted-foreground">
                          Expires: {format(document.expirationDate, 'MMM d, yyyy')}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {vehicle.photos.map((photo) => (
              <Card key={photo.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Camera className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{photo.description}</div>
                      <div className="text-xs text-muted-foreground">
                        {photo.type} • {formatDistanceToNow(photo.takenDate, { addSuffix: true })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        By: {photo.takenBy}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {vehicle.documents.length === 0 && vehicle.photos.length === 0 && (
              <Card className="md:col-span-2">
                <CardContent className="p-8 text-center">
                  <Paperclip className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Documents or Photos</h3>
                  <p className="text-muted-foreground mb-4">
                    Add photos, registration, insurance, or other documents.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button variant="outline">
                      <Camera className="h-4 w-4 mr-2" />
                      Take Photo
                    </Button>
                    <Button variant="outline">
                      <Paperclip className="h-4 w-4 mr-2" />
                      Upload Document
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Vehicle Notes</h3>
            <Button onClick={() => setShowNoteDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Note
            </Button>
          </div>

          <div className="space-y-3">
            {vehicle.notes.map((note) => (
              <Card key={note.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <FileText className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">
                          {note.type.replace('-', ' ')}
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
            ))}

            {vehicle.notes.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Notes Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Add notes to keep track of important vehicle information.
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
      </Tabs>

      {/* Add Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Vehicle Note</DialogTitle>
            <DialogDescription>
              Add a note to keep track of important vehicle information.
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
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="issue">Issue</SelectItem>
                  <SelectItem value="customer-preference">Customer Preference</SelectItem>
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
