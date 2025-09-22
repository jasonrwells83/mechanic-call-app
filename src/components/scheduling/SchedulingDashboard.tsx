import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Calendar,
  Clock,
  User,
  MapPin,
  Wrench,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Filter,
  Search,
  TrendingUp,
  Activity,
  Users,
  Car,
  Settings,
  RefreshCw,
  Eye,
  Edit,
  MoreHorizontal,
  Star,
  Zap,
  Target,
  ArrowRight,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { format, startOfDay, endOfDay, addDays, isToday, isTomorrow } from 'date-fns';
import { useUIStore } from '@/stores';

export interface ScheduledAppointment {
  id: string;
  callId: string;
  jobId: string;
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string;
  };
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: string;
    vin: string;
  };
  service: {
    type: string;
    category: 'maintenance' | 'repair' | 'diagnostic' | 'emergency';
    description: string;
    estimatedDuration: number;
    estimatedCost: number;
  };
  scheduling: {
    date: Date;
    startTime: string;
    endTime: string;
    bay: {
      id: string;
      name: string;
      type: string;
    };
    technician: {
      id: string;
      name: string;
      specialties: string[];
      rating: number;
    };
  };
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResourceUtilization {
  bayId: string;
  bayName: string;
  utilizationRate: number;
  scheduledHours: number;
  availableHours: number;
  appointments: ScheduledAppointment[];
}

export interface TechnicianWorkload {
  technicianId: string;
  technicianName: string;
  specialties: string[];
  rating: number;
  workloadHours: number;
  maxHours: number;
  utilizationRate: number;
  appointments: ScheduledAppointment[];
  efficiency: number;
}

interface SchedulingDashboardProps {
  onAppointmentSelect?: (appointment: ScheduledAppointment) => void;
  onAppointmentEdit?: (appointment: ScheduledAppointment) => void;
  onAppointmentCancel?: (appointmentId: string) => void;
  onNewScheduling?: () => void;
  className?: string;
}

// Mock data
const mockAppointments: ScheduledAppointment[] = [
  {
    id: 'apt-1',
    callId: 'CALL-001',
    jobId: 'JOB-001',
    customer: {
      id: 'cust-1',
      name: 'John Smith',
      phone: '(555) 123-4567',
      email: 'john@example.com',
    },
    vehicle: {
      id: 'veh-1',
      make: 'Honda',
      model: 'Civic',
      year: '2020',
      vin: '1HGBH41JXMN109186',
    },
    service: {
      type: 'Oil Change',
      category: 'maintenance',
      description: 'Regular oil change service',
      estimatedDuration: 60,
      estimatedCost: 75,
    },
    scheduling: {
      date: new Date(),
      startTime: '09:00',
      endTime: '10:00',
      bay: {
        id: 'bay-1',
        name: 'Bay 1',
        type: 'general',
      },
      technician: {
        id: 'tech-1',
        name: 'Mike Johnson',
        specialties: ['engine', 'maintenance'],
        rating: 4.8,
      },
    },
    status: 'scheduled',
    priority: 'medium',
    notes: 'Customer requested early morning appointment',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: 'apt-2',
    callId: 'CALL-002',
    jobId: 'JOB-002',
    customer: {
      id: 'cust-2',
      name: 'Sarah Wilson',
      phone: '(555) 987-6543',
      email: 'sarah@example.com',
    },
    vehicle: {
      id: 'veh-2',
      make: 'Toyota',
      model: 'Camry',
      year: '2019',
      vin: '4T1BE46K69U123456',
    },
    service: {
      type: 'Brake Service',
      category: 'repair',
      description: 'Front brake pad replacement',
      estimatedDuration: 120,
      estimatedCost: 350,
    },
    scheduling: {
      date: addDays(new Date(), 1),
      startTime: '14:00',
      endTime: '16:00',
      bay: {
        id: 'bay-2',
        name: 'Bay 2',
        type: 'lift',
      },
      technician: {
        id: 'tech-2',
        name: 'David Chen',
        specialties: ['brakes', 'suspension'],
        rating: 4.9,
      },
    },
    status: 'confirmed',
    priority: 'high',
    notes: 'Customer reported grinding noise',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
  },
];

const STATUS_CONFIGS = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-800', icon: Calendar },
  confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  'in-progress': { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800', icon: Activity },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircle },
  'no-show': { label: 'No Show', color: 'bg-gray-100 text-gray-800', icon: AlertTriangle },
};

const PRIORITY_CONFIGS = {
  low: { label: 'Low', color: 'bg-green-100 text-green-800' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-800' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-800' },
};

export function SchedulingDashboard({
  onAppointmentSelect,
  onAppointmentEdit,
  onAppointmentCancel,
  onNewScheduling,
  className = '',
}: SchedulingDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('today');
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'resources'>('list');

  const { addToast } = useUIStore();

  // Filter appointments
  const filteredAppointments = useMemo(() => {
    let filtered = mockAppointments;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(apt =>
        apt.customer.name.toLowerCase().includes(query) ||
        apt.customer.phone.includes(query) ||
        apt.vehicle.make.toLowerCase().includes(query) ||
        apt.vehicle.model.toLowerCase().includes(query) ||
        apt.service.type.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(apt => apt.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(apt => apt.priority === priorityFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(apt => {
        switch (dateFilter) {
          case 'today':
            return isToday(apt.scheduling.date);
          case 'tomorrow':
            return isTomorrow(apt.scheduling.date);
          case 'week':
            return apt.scheduling.date >= now && apt.scheduling.date <= addDays(now, 7);
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [searchQuery, statusFilter, priorityFilter, dateFilter]);

  // Calculate dashboard statistics
  const dashboardStats = useMemo(() => {
    const total = mockAppointments.length;
    const today = mockAppointments.filter(apt => isToday(apt.scheduling.date)).length;
    const confirmed = mockAppointments.filter(apt => apt.status === 'confirmed').length;
    const inProgress = mockAppointments.filter(apt => apt.status === 'in-progress').length;
    const completed = mockAppointments.filter(apt => apt.status === 'completed').length;
    const urgent = mockAppointments.filter(apt => apt.priority === 'urgent').length;

    const totalRevenue = mockAppointments
      .filter(apt => apt.status === 'completed')
      .reduce((sum, apt) => sum + apt.service.estimatedCost, 0);

    const avgDuration = mockAppointments.length > 0
      ? Math.round(mockAppointments.reduce((sum, apt) => sum + apt.service.estimatedDuration, 0) / mockAppointments.length)
      : 0;

    return {
      total,
      today,
      confirmed,
      inProgress,
      completed,
      urgent,
      totalRevenue,
      avgDuration,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, []);

  // Calculate resource utilization
  const resourceUtilization = useMemo(() => {
    const bays = ['Bay 1', 'Bay 2', 'Bay 3', 'Bay 4'];
    return bays.map(bayName => {
      const bayAppointments = mockAppointments.filter(apt => apt.scheduling.bay.name === bayName);
      const scheduledHours = bayAppointments.reduce((sum, apt) => sum + (apt.service.estimatedDuration / 60), 0);
      const availableHours = 8; // 8 hour work day
      const utilizationRate = Math.round((scheduledHours / availableHours) * 100);

      return {
        bayId: bayName.toLowerCase().replace(' ', '-'),
        bayName,
        utilizationRate,
        scheduledHours,
        availableHours,
        appointments: bayAppointments,
      };
    });
  }, []);

  // Calculate technician workload
  const technicianWorkload = useMemo(() => {
    const technicians = ['Mike Johnson', 'David Chen', 'Sarah Wilson', 'Lisa Rodriguez'];
    return technicians.map(techName => {
      const techAppointments = mockAppointments.filter(apt => apt.scheduling.technician.name === techName);
      const workloadHours = techAppointments.reduce((sum, apt) => sum + (apt.service.estimatedDuration / 60), 0);
      const maxHours = 8;
      const utilizationRate = Math.round((workloadHours / maxHours) * 100);
      const efficiency = Math.random() * 20 + 80; // Mock efficiency 80-100%

      return {
        technicianId: techName.toLowerCase().replace(' ', '-'),
        technicianName: techName,
        specialties: ['general', 'maintenance'],
        rating: 4.5 + Math.random() * 0.5,
        workloadHours,
        maxHours,
        utilizationRate,
        appointments: techAppointments,
        efficiency: Math.round(efficiency),
      };
    });
  }, []);

  const handleAppointmentAction = useCallback((action: string, appointment: ScheduledAppointment) => {
    switch (action) {
      case 'view':
        onAppointmentSelect?.(appointment);
        break;
      case 'edit':
        onAppointmentEdit?.(appointment);
        break;
      case 'cancel':
        onAppointmentCancel?.(appointment.id);
        addToast({
          type: 'success',
          title: 'Appointment Cancelled',
          message: `Appointment ${appointment.id} has been cancelled`,
          duration: 3000,
        });
        break;
      case 'confirm':
        // Handle confirmation
        addToast({
          type: 'success',
          title: 'Appointment Confirmed',
          message: `Appointment ${appointment.id} has been confirmed`,
          duration: 3000,
        });
        break;
    }
  }, [onAppointmentSelect, onAppointmentEdit, onAppointmentCancel, addToast]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Scheduling Dashboard</h1>
          <p className="text-muted-foreground">
            Manage appointments, resources, and technician workloads
          </p>
        </div>
        <Button onClick={onNewScheduling}>
          <Plus className="h-4 w-4 mr-2" />
          New Appointment
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.total}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardStats.today} scheduled today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Activity className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{dashboardStats.inProgress}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardStats.confirmed} confirmed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Target className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{dashboardStats.completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {dashboardStats.completed} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">${dashboardStats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Avg: ${Math.round(dashboardStats.totalRevenue / (dashboardStats.completed || 1))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="list">Appointments</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          </TabsList>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search appointments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(STATUS_CONFIGS).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="tomorrow">Tomorrow</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="list" className="space-y-4">
          <div className="space-y-4">
            {filteredAppointments.map((appointment) => {
              const statusConfig = STATUS_CONFIGS[appointment.status];
              const priorityConfig = PRIORITY_CONFIGS[appointment.priority];
              const StatusIcon = statusConfig.icon;

              return (
                <Card key={appointment.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-center min-w-16">
                          <div className="text-lg font-semibold">
                            {format(appointment.scheduling.date, 'MMM d')}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(appointment.scheduling.date, 'EEE')}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{appointment.customer.name}</span>
                            <Badge variant="outline" className={priorityConfig.color}>
                              {priorityConfig.label}
                            </Badge>
                            <Badge variant="outline" className={statusConfig.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {appointment.vehicle.year} {appointment.vehicle.make} {appointment.vehicle.model}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {appointment.scheduling.startTime} - {appointment.scheduling.endTime}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {appointment.scheduling.bay.name}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {appointment.scheduling.technician.name}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right space-y-2">
                        <div className="text-lg font-semibold">
                          ${appointment.service.estimatedCost}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {appointment.service.type}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleAppointmentAction('view', appointment)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAppointmentAction('edit', appointment)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Appointment
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {appointment.status === 'scheduled' && (
                              <DropdownMenuItem onClick={() => handleAppointmentAction('confirm', appointment)}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Confirm
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => handleAppointmentAction('cancel', appointment)}
                              className="text-red-600"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancel
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {filteredAppointments.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Appointments Found</h3>
                  <p className="text-muted-foreground">
                    No appointments match your current filters. Try adjusting your search criteria.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="resources" className="space-y-6">
          <div className="grid gap-6">
            {/* Bay Utilization */}
            <Card>
              <CardHeader>
                <CardTitle>Service Bay Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {resourceUtilization.map((bay) => (
                    <div key={bay.bayId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <MapPin className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium">{bay.bayName}</div>
                          <div className="text-sm text-muted-foreground">
                            {bay.scheduledHours.toFixed(1)}h scheduled of {bay.availableHours}h available
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className={cn(
                              'h-2 rounded-full',
                              bay.utilizationRate > 90 ? 'bg-red-500' :
                              bay.utilizationRate > 70 ? 'bg-orange-500' :
                              'bg-green-500'
                            )}
                            style={{ width: `${Math.min(bay.utilizationRate, 100)}%` }}
                          />
                        </div>
                        <div className="font-semibold min-w-12 text-right">
                          {bay.utilizationRate}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Technician Workload */}
            <Card>
              <CardHeader>
                <CardTitle>Technician Workload</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {technicianWorkload.map((tech) => (
                    <div key={tech.technicianId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <User className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{tech.technicianName}</span>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm">{tech.rating.toFixed(1)}</span>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {tech.workloadHours.toFixed(1)}h workload • {tech.efficiency}% efficiency
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className={cn(
                              'h-2 rounded-full',
                              tech.utilizationRate > 90 ? 'bg-red-500' :
                              tech.utilizationRate > 70 ? 'bg-orange-500' :
                              'bg-green-500'
                            )}
                            style={{ width: `${Math.min(tech.utilizationRate, 100)}%` }}
                          />
                        </div>
                        <div className="font-semibold min-w-12 text-right">
                          {tech.utilizationRate}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Calendar View</h3>
              <p className="text-muted-foreground mb-4">
                Calendar integration will be implemented with FullCalendar component.
              </p>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Configure Calendar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
