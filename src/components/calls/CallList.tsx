// Call List Component
// Comprehensive call management with outcome tracking and filtering

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CallSearchAndFilter, type CallSearchFilters } from './CallSearchAndFilter';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CallToJobConverter } from './CallToJobConverter';
import {
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  User,
  Car,
  Calendar,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  XCircle,
  MoreHorizontal,
  Search,
  Filter,
  Plus,
  Edit,
  Eye,
  Trash2,
  Download,
  RefreshCw,
  Star,
  MessageSquare,
  Mail,
  UserPlus,
  CalendarPlus,
  FileText,
  TrendingUp,
  Activity,
  Users,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { useUIStore } from '@/stores';
import type { CallIntakeData } from './CallIntakeForm';

interface Call extends CallIntakeData {
  id: string;
  status: 'active' | 'completed' | 'missed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: {
    id: string;
    name: string;
    role: string;
  };
  tags: string[];
  rating?: number; // Customer satisfaction rating
}

interface CallListProps {
  onCallSelect?: (call: Call) => void;
  onCallEdit?: (call: Call) => void;
  onCallCreate?: () => void;
  onCallDelete?: (callId: string) => void;
  onJobConversion?: (call: Call, job: any, appointment?: any) => void;
  className?: string;
}

// Mock call data - in real app, this would come from API
const mockCalls: Call[] = [
  {
    id: 'CALL-001',
    callId: 'CALL-001',
    phoneNumber: '(555) 123-4567',
    callStartTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    callDuration: 420, // 7 minutes
    isNewCustomer: false,
    customerName: 'John Smith',
    customerPhone: '(555) 123-4567',
    customerEmail: 'john@example.com',
    isNewVehicle: false,
    vehicleMake: 'Honda',
    vehicleModel: 'Civic',
    vehicleYear: '2020',
    serviceType: 'Oil Change',
    serviceCategory: 'maintenance',
    servicePriority: 'normal',
    serviceDescription: 'Regular oil change service',
    callReason: 'Routine maintenance',
    callNotes: 'Customer wants to schedule oil change for next week',
    customerConcerns: ['Due for service'],
    followUpRequired: false,
    appointmentRequested: true,
    quoteRequested: false,
    callOutcome: 'scheduled',
    nextAction: 'Schedule appointment',
    callTakenBy: 'Sarah Johnson',
    callSource: 'phone',
    status: 'completed',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    assignedTo: {
      id: 'user1',
      name: 'Sarah Johnson',
      role: 'Service Advisor',
    },
    tags: ['maintenance', 'scheduled'],
    rating: 5,
  },
  {
    id: 'CALL-002',
    callId: 'CALL-002',
    phoneNumber: '(555) 987-6543',
    callStartTime: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    callDuration: 180, // 3 minutes
    isNewCustomer: true,
    customerName: 'Maria Garcia',
    customerPhone: '(555) 987-6543',
    isNewVehicle: true,
    vehicleMake: 'Toyota',
    vehicleModel: 'Camry',
    vehicleYear: '2019',
    serviceType: 'Brake Inspection',
    serviceCategory: 'inspection',
    servicePriority: 'high',
    serviceDescription: 'Customer hearing grinding noise when braking',
    callReason: 'Brake concerns',
    callNotes: 'Urgent brake inspection needed',
    customerConcerns: ['Strange noises', 'Brake issues'],
    followUpRequired: true,
    appointmentRequested: true,
    quoteRequested: true,
    callOutcome: 'follow-up',
    nextAction: 'Call back with appointment availability',
    callTakenBy: 'Mike Chen',
    callSource: 'phone',
    status: 'completed',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    assignedTo: {
      id: 'user2',
      name: 'Mike Chen',
      role: 'Service Advisor',
    },
    tags: ['new-customer', 'urgent', 'follow-up'],
    rating: 4,
  },
  {
    id: 'CALL-003',
    callId: 'CALL-003',
    phoneNumber: '(555) 456-7890',
    callStartTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    callDuration: 0, // Missed call
    isNewCustomer: false,
    customerName: 'Robert Johnson',
    customerPhone: '(555) 456-7890',
    isNewVehicle: false,
    vehicleMake: 'Ford',
    vehicleModel: 'F-150',
    vehicleYear: '2018',
    serviceType: 'Engine Repair',
    serviceCategory: 'repair',
    servicePriority: 'urgent',
    serviceDescription: 'Engine making strange noise',
    callReason: 'Engine problems',
    callNotes: 'Missed call - left voicemail',
    customerConcerns: ['Strange noises', 'Engine problems'],
    followUpRequired: true,
    appointmentRequested: false,
    quoteRequested: false,
    callOutcome: 'incomplete',
    nextAction: 'Call back customer',
    callTakenBy: 'System',
    callSource: 'phone',
    status: 'missed',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    tags: ['missed', 'urgent', 'engine'],
  },
];

const statusConfig = {
  active: {
    label: 'Active',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: Phone,
  },
  completed: {
    label: 'Completed',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: CheckCircle,
  },
  missed: {
    label: 'Missed',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    icon: XCircle,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    icon: XCircle,
  },
};

const outcomeConfig = {
  scheduled: {
    label: 'Scheduled',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: Calendar,
  },
  'quote-sent': {
    label: 'Quote Sent',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: FileText,
  },
  'follow-up': {
    label: 'Follow-up',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    icon: Clock,
  },
  'no-action': {
    label: 'No Action',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    icon: CheckCircle,
  },
  transferred: {
    label: 'Transferred',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    icon: Phone,
  },
  incomplete: {
    label: 'Incomplete',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    icon: AlertTriangle,
  },
};

const priorityConfig = {
  low: { label: 'Low', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  normal: { label: 'Normal', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  high: { label: 'High', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  urgent: { label: 'Urgent', color: 'text-red-600', bgColor: 'bg-red-100' },
};

export function CallList({
  onCallSelect,
  onCallEdit,
  onCallCreate,
  onCallDelete,
  onJobConversion,
  className = '',
}: CallListProps) {
  const [filters, setFilters] = useState<CallSearchFilters>({
    searchQuery: '',
    outcome: [],
    priority: [],
    dateRange: { start: null, end: null },
    customer: '',
    callType: [],
    followUpRequired: null,
    convertedToJob: null,
    tags: [],
  });
  const [sortBy, setSortBy] = useState<'date' | 'customer' | 'priority' | 'outcome'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [showJobConverter, setShowJobConverter] = useState<Call | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const { addToast } = useUIStore();

  // Filter and sort calls
  const filteredAndSortedCalls = useMemo(() => {
    let filtered = mockCalls;

    // Apply search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(call =>
        call.customerName.toLowerCase().includes(query) ||
        call.phoneNumber.includes(query) ||
        call.serviceType.toLowerCase().includes(query) ||
        call.callNotes.toLowerCase().includes(query) ||
        call.vehicleMake.toLowerCase().includes(query) ||
        call.vehicleModel.toLowerCase().includes(query) ||
        call.customerEmail?.toLowerCase().includes(query) ||
        call.callReason.toLowerCase().includes(query) ||
        call.serviceDescription.toLowerCase().includes(query)
      );
    }

    // Apply outcome filter
    if (filters.outcome.length > 0) {
      filtered = filtered.filter(call => filters.outcome.includes(call.callOutcome));
    }

    // Apply priority filter
    if (filters.priority.length > 0) {
      filtered = filtered.filter(call => filters.priority.includes(call.servicePriority));
    }

    // Apply customer filter
    if (filters.customer) {
      const customerQuery = filters.customer.toLowerCase();
      filtered = filtered.filter(call =>
        call.customerName.toLowerCase().includes(customerQuery) ||
        call.customerEmail?.toLowerCase().includes(customerQuery)
      );
    }

    // Apply call type filter (map to service category for now)
    if (filters.callType.length > 0) {
      filtered = filtered.filter(call => filters.callType.includes(call.serviceCategory));
    }

    // Apply follow-up filter
    if (filters.followUpRequired !== null) {
      filtered = filtered.filter(call => call.followUpRequired === filters.followUpRequired);
    }

    // Apply conversion filter (mock logic - in real app would check actual conversion status)
    if (filters.convertedToJob !== null) {
      filtered = filtered.filter(call => {
        const isConverted = call.callOutcome === 'scheduled' || call.appointmentRequested;
        return filters.convertedToJob ? isConverted : !isConverted;
      });
    }

    // Apply date range filter
    if (filters.dateRange.start || filters.dateRange.end) {
      filtered = filtered.filter(call => {
        const callDate = call.createdAt;
        const start = filters.dateRange.start;
        const end = filters.dateRange.end;
        
        if (start && end) {
          return callDate >= start && callDate <= end;
        } else if (start) {
          return callDate >= start;
        } else if (end) {
          return callDate <= end;
        }
        return true;
      });
    }

    // Sort calls
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'date':
          aValue = a.createdAt.getTime();
          bValue = b.createdAt.getTime();
          break;
        case 'customer':
          aValue = a.customerName.toLowerCase();
          bValue = b.customerName.toLowerCase();
          break;
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
          aValue = priorityOrder[a.servicePriority];
          bValue = priorityOrder[b.servicePriority];
          break;
        case 'outcome':
          aValue = a.callOutcome;
          bValue = b.callOutcome;
          break;
        default:
          aValue = a.createdAt.getTime();
          bValue = b.createdAt.getTime();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [filters, sortBy, sortOrder]);

  // Calculate statistics
  const callStats = useMemo(() => {
    const total = mockCalls.length;
    const completed = mockCalls.filter(c => c.status === 'completed').length;
    const missed = mockCalls.filter(c => c.status === 'missed').length;
    const followUps = mockCalls.filter(c => c.followUpRequired).length;
    const avgDuration = mockCalls
      .filter(c => c.callDuration && c.callDuration > 0)
      .reduce((sum, c) => sum + (c.callDuration || 0), 0) / 
      mockCalls.filter(c => c.callDuration && c.callDuration > 0).length || 0;
    
    return {
      total,
      completed,
      missed,
      followUps,
      avgDuration: Math.round(avgDuration),
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, []);

  const handleCallAction = useCallback((action: string, call: Call) => {
    switch (action) {
      case 'view':
        setSelectedCall(call);
        onCallSelect?.(call);
        break;
      case 'edit':
        onCallEdit?.(call);
        break;
      case 'delete':
        onCallDelete?.(call.id);
        addToast({
          type: 'success',
          title: 'Call Deleted',
          message: `Call ${call.callId} has been deleted`,
          duration: 3000,
        });
        break;
      case 'follow-up':
        // Handle follow-up action
        addToast({
          type: 'info',
          title: 'Follow-up Scheduled',
          message: `Follow-up scheduled for ${call.customerName}`,
          duration: 3000,
        });
        break;
      case 'schedule':
        // Handle appointment scheduling
        addToast({
          type: 'info',
          title: 'Scheduling Appointment',
          message: `Opening scheduler for ${call.customerName}`,
          duration: 2000,
        });
        break;
      case 'convert':
        // Handle job conversion
        setShowJobConverter(call);
        break;
      default:
        break;
    }
  }, [onCallSelect, onCallEdit, onCallDelete, addToast]);

  const formatCallDuration = (seconds: number) => {
    if (seconds === 0) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCallTime = (date: Date) => {
    if (isToday(date)) {
      return `Today ${format(date, 'h:mm a')}`;
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, h:mm a');
    }
  };

  // Filter handlers
  const handleFiltersChange = useCallback((newFilters: CallSearchFilters) => {
    setIsSearching(true);
    setFilters(newFilters);
    // Simulate search delay for better UX
    setTimeout(() => setIsSearching(false), 300);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      searchQuery: '',
      outcome: [],
      priority: [],
      dateRange: { start: null, end: null },
      customer: '',
      callType: [],
      followUpRequired: null,
      convertedToJob: null,
      tags: [],
    });
  }, []);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{callStats.total}</div>
            <p className="text-xs text-muted-foreground">
              All time calls
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{callStats.completed}</div>
            <p className="text-xs text-muted-foreground">
              {callStats.completionRate}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Missed</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{callStats.missed}</div>
            <p className="text-xs text-muted-foreground">
              Need follow-up
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Follow-ups</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{callStats.followUps}</div>
            <p className="text-xs text-muted-foreground">
              Pending action
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCallDuration(callStats.avgDuration)}</div>
            <p className="text-xs text-muted-foreground">
              Per call
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Call Management
              <Badge variant="secondary">{filteredAndSortedCalls.length}</Badge>
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              
              <Button onClick={onCallCreate}>
                <Plus className="h-4 w-4 mr-2" />
                New Call
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Advanced Search and Filters */}
          <div className="mb-6">
            <CallSearchAndFilter
              onFiltersChange={handleFiltersChange}
              onClearFilters={handleClearFilters}
              totalResults={filteredAndSortedCalls.length}
              isSearching={isSearching}
            />
          </div>

          {/* Calls Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button variant="ghost" size="sm" onClick={() => {
                      setSortBy('date');
                      setSortOrder(sortBy === 'date' && sortOrder === 'desc' ? 'asc' : 'desc');
                    }}>
                      Date/Time
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" onClick={() => {
                      setSortBy('customer');
                      setSortOrder(sortBy === 'customer' && sortOrder === 'desc' ? 'asc' : 'desc');
                    }}>
                      Customer
                    </Button>
                  </TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" onClick={() => {
                      setSortBy('priority');
                      setSortOrder(sortBy === 'priority' && sortOrder === 'desc' ? 'asc' : 'desc');
                    }}>
                      Priority
                    </Button>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" onClick={() => {
                      setSortBy('outcome');
                      setSortOrder(sortBy === 'outcome' && sortOrder === 'desc' ? 'asc' : 'desc');
                    }}>
                      Outcome
                    </Button>
                  </TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedCalls.map((call) => {
                  const statusInfo = statusConfig[call.status];
                  const outcomeInfo = outcomeConfig[call.callOutcome];
                  const priorityInfo = priorityConfig[call.servicePriority];
                  const StatusIcon = statusInfo.icon;
                  const OutcomeIcon = outcomeInfo.icon;
                  
                  return (
                    <TableRow 
                      key={call.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleCallAction('view', call)}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">
                            {formatCallTime(call.callStartTime)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {call.callId}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-medium">{call.customerName}</div>
                            <div className="text-sm text-muted-foreground">
                              {call.phoneNumber}
                            </div>
                          </div>
                          {call.isNewCustomer && (
                            <Badge variant="outline" className="text-xs">New</Badge>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">{call.serviceType}</div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {call.serviceCategory}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm">
                          {call.vehicleYear} {call.vehicleMake} {call.vehicleModel}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={cn('text-xs', priorityInfo.color)}
                        >
                          {priorityInfo.label}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <StatusIcon className={cn('h-3 w-3', statusInfo.color)} />
                          <Badge 
                            variant="outline" 
                            className={cn('text-xs', statusInfo.color)}
                          >
                            {statusInfo.label}
                          </Badge>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <OutcomeIcon className={cn('h-3 w-3', outcomeInfo.color)} />
                          <Badge 
                            variant="outline" 
                            className={cn('text-xs', outcomeInfo.color)}
                          >
                            {outcomeInfo.label}
                          </Badge>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm font-mono">
                          {formatCallDuration(call.callDuration || 0)}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleCallAction('view', call);
                            }}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleCallAction('edit', call);
                            }}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Call
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {call.followUpRequired && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleCallAction('follow-up', call);
                              }}>
                                <Clock className="mr-2 h-4 w-4" />
                                Schedule Follow-up
                              </DropdownMenuItem>
                            )}
                            {call.appointmentRequested && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleCallAction('schedule', call);
                              }}>
                                <CalendarPlus className="mr-2 h-4 w-4" />
                                Schedule Appointment
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleCallAction('convert', call);
                            }}>
                              <Zap className="mr-2 h-4 w-4" />
                              Convert to Job
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCallAction('delete', call);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Call
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Empty State */}
          {filteredAndSortedCalls.length === 0 && (
            <div className="text-center py-12">
              <Phone className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No calls found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== 'all' || outcomeFilter !== 'all' || priorityFilter !== 'all' || dateFilter !== 'all'
                  ? 'Try adjusting your filters to see more calls.'
                  : 'No calls have been recorded yet.'
                }
              </p>
              <Button onClick={onCallCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Record First Call
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Call Detail Modal */}
      {selectedCall && (
        <Dialog open={!!selectedCall} onOpenChange={() => setSelectedCall(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <CallDetailView
              call={selectedCall}
              onEdit={() => handleCallAction('edit', selectedCall)}
              onClose={() => setSelectedCall(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Job Conversion Modal */}
      {showJobConverter && (
        <Dialog open={!!showJobConverter} onOpenChange={() => setShowJobConverter(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Convert Call to Job</DialogTitle>
            </DialogHeader>
            <CallToJobConverter
              call={showJobConverter}
              onConversionComplete={(job, appointment) => {
                onJobConversion?.(showJobConverter, job, appointment);
                setShowJobConverter(null);
              }}
              onCancel={() => setShowJobConverter(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Call Detail View Component
interface CallDetailViewProps {
  call: Call;
  onEdit: () => void;
  onClose: () => void;
}

function CallDetailView({ call, onEdit, onClose }: CallDetailViewProps) {
  const statusInfo = statusConfig[call.status];
  const outcomeInfo = outcomeConfig[call.callOutcome];
  const priorityInfo = priorityConfig[call.servicePriority];
  const StatusIcon = statusInfo.icon;
  const OutcomeIcon = outcomeInfo.icon;

  return (
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Call Details - {call.callId}
        </DialogTitle>
      </DialogHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Call Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Call Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status:</span>
              <div className="flex items-center gap-2">
                <StatusIcon className={cn('h-4 w-4', statusInfo.color)} />
                <Badge variant="outline" className={statusInfo.color}>
                  {statusInfo.label}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Outcome:</span>
              <div className="flex items-center gap-2">
                <OutcomeIcon className={cn('h-4 w-4', outcomeInfo.color)} />
                <Badge variant="outline" className={outcomeInfo.color}>
                  {outcomeInfo.label}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Priority:</span>
              <Badge variant="outline" className={priorityInfo.color}>
                {priorityInfo.label}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Duration:</span>
              <span className="font-mono">{call.callDuration ? `${Math.floor(call.callDuration / 60)}:${(call.callDuration % 60).toString().padStart(2, '0')}` : 'N/A'}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Date:</span>
              <span>{format(call.callStartTime, 'PPpp')}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Taken By:</span>
              <span>{call.callTakenBy}</span>
            </div>
          </CardContent>
        </Card>

        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-sm text-muted-foreground">Name:</span>
              <p className="font-medium">{call.customerName}</p>
            </div>
            
            <div>
              <span className="text-sm text-muted-foreground">Phone:</span>
              <p>{call.customerPhone}</p>
            </div>
            
            {call.customerEmail && (
              <div>
                <span className="text-sm text-muted-foreground">Email:</span>
                <p>{call.customerEmail}</p>
              </div>
            )}
            
            <div>
              <span className="text-sm text-muted-foreground">Vehicle:</span>
              <p>{call.vehicleYear} {call.vehicleMake} {call.vehicleModel}</p>
            </div>
            
            {call.isNewCustomer && (
              <Badge variant="outline" className="text-xs">New Customer</Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Service Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Service Request</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-muted-foreground">Service Type:</span>
              <p className="font-medium">{call.serviceType}</p>
            </div>
            
            <div>
              <span className="text-sm text-muted-foreground">Category:</span>
              <p className="capitalize">{call.serviceCategory}</p>
            </div>
          </div>
          
          <div>
            <span className="text-sm text-muted-foreground">Description:</span>
            <p className="mt-1">{call.serviceDescription}</p>
          </div>
          
          {call.customerConcerns.length > 0 && (
            <div>
              <span className="text-sm text-muted-foreground">Customer Concerns:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {call.customerConcerns.map((concern, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {concern}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Call Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Call Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <span className="text-sm text-muted-foreground">Reason for Call:</span>
              <p className="mt-1">{call.callReason}</p>
            </div>
            
            <div>
              <span className="text-sm text-muted-foreground">Notes:</span>
              <p className="mt-1 whitespace-pre-wrap">{call.callNotes}</p>
            </div>
            
            {call.nextAction && (
              <div>
                <span className="text-sm text-muted-foreground">Next Action:</span>
                <p className="mt-1 font-medium">{call.nextAction}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button onClick={onEdit}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Call
        </Button>
      </div>
    </div>
  );
}

export type { Call, CallListProps };
