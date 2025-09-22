// Customer Communication Timeline Component
// Unified timeline showing all customer communications and interactions

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  Bell,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  Info,
  Plus,
  Filter,
  Search,
  Send,
  PhoneCall,
  MessageCircle,
  CalendarCheck,
  BellRing,
  FileText,
  ExternalLink,
  MoreHorizontal,
  Star,
  Archive,
  Reply,
  Forward,
  Trash2,
  Edit3,
  Eye,
  Download,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { useCustomer } from '@/hooks/use-customers';
import { useJobs } from '@/hooks/use-jobs';
import { useUIStore } from '@/stores';
import type { Customer } from '@/types/database';

// Communication types and interfaces
interface CommunicationItem {
  id: string;
  type: 'call' | 'email' | 'sms' | 'appointment' | 'reminder' | 'note' | 'quote' | 'invoice';
  direction: 'inbound' | 'outbound' | 'system';
  timestamp: Date;
  subject?: string;
  content: string;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'pending' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  attachments?: {
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
  }[];
  metadata?: {
    duration?: number; // for calls
    phoneNumber?: string;
    emailAddress?: string;
    appointmentId?: string;
    jobId?: string;
    reminderType?: string;
    templateUsed?: string;
  };
  createdBy: {
    id: string;
    name: string;
    role: string;
    avatar?: string;
  };
  relatedItems?: {
    type: 'job' | 'appointment' | 'quote' | 'invoice';
    id: string;
    title: string;
  }[];
}

interface CustomerCommunicationTimelineProps {
  customer: Customer;
  onCommunicationAdd?: (communication: Partial<CommunicationItem>) => void;
  onCommunicationUpdate?: (id: string, updates: Partial<CommunicationItem>) => void;
  className?: string;
}

// Communication type configuration
const communicationConfig = {
  call: {
    icon: Phone,
    label: 'Phone Call',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-200',
  },
  email: {
    icon: Mail,
    label: 'Email',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-200',
  },
  sms: {
    icon: MessageSquare,
    label: 'SMS',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-200',
  },
  appointment: {
    icon: Calendar,
    label: 'Appointment',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-200',
  },
  reminder: {
    icon: Bell,
    label: 'Reminder',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-200',
  },
  note: {
    icon: FileText,
    label: 'Note',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
  },
  quote: {
    icon: FileText,
    label: 'Quote',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    borderColor: 'border-indigo-200',
  },
  invoice: {
    icon: FileText,
    label: 'Invoice',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-200',
  },
};

const statusConfig = {
  sent: { label: 'Sent', color: 'text-blue-600', icon: Send },
  delivered: { label: 'Delivered', color: 'text-green-600', icon: CheckCircle },
  read: { label: 'Read', color: 'text-green-700', icon: Eye },
  failed: { label: 'Failed', color: 'text-red-600', icon: AlertCircle },
  pending: { label: 'Pending', color: 'text-yellow-600', icon: Clock },
  completed: { label: 'Completed', color: 'text-green-600', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'text-gray-600', icon: AlertCircle },
};

const priorityConfig = {
  low: { label: 'Low', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  normal: { label: 'Normal', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  high: { label: 'High', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  urgent: { label: 'Urgent', color: 'text-red-600', bgColor: 'bg-red-100' },
};

export function CustomerCommunicationTimeline({
  customer,
  onCommunicationAdd,
  onCommunicationUpdate,
  className = '',
}: CustomerCommunicationTimelineProps) {
  const [filter, setFilter] = useState<{
    type: string;
    direction: string;
    dateRange: string;
    status: string;
    priority: string;
    search: string;
  }>({
    type: 'all',
    direction: 'all',
    dateRange: 'all',
    status: 'all',
    priority: 'all',
    search: '',
  });

  const [showNewCommunication, setShowNewCommunication] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CommunicationItem | null>(null);
  const [groupByDate, setGroupByDate] = useState(true);

  // Hooks
  const { data: customerData } = useCustomer(customer.id);
  const { data: jobsResponse } = useJobs({ customerId: customer.id });
  const { addToast } = useUIStore();

  const jobs = jobsResponse?.data || [];

  // Mock communication data - in real app, this would come from API
  const mockCommunications: CommunicationItem[] = useMemo(() => [
    {
      id: '1',
      type: 'call',
      direction: 'inbound',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      subject: 'Service Inquiry',
      content: 'Customer called asking about brake service pricing and availability. Discussed options and scheduled appointment.',
      status: 'completed',
      priority: 'normal',
      metadata: {
        duration: 420, // 7 minutes
        phoneNumber: customer.phone,
      },
      createdBy: {
        id: 'user1',
        name: 'Sarah Johnson',
        role: 'Service Advisor',
      },
      relatedItems: [
        {
          type: 'job',
          id: 'job1',
          title: 'Brake Service - Honda Civic',
        },
      ],
    },
    {
      id: '2',
      type: 'email',
      direction: 'outbound',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      subject: 'Service Appointment Confirmation',
      content: 'Dear ' + customer.name + ',\n\nThis email confirms your brake service appointment scheduled for tomorrow at 10:00 AM. Please bring your vehicle 15 minutes early for check-in.\n\nBest regards,\nAuto Shop Team',
      status: 'read',
      priority: 'normal',
      metadata: {
        emailAddress: customer.email,
        templateUsed: 'appointment-confirmation',
      },
      createdBy: {
        id: 'system',
        name: 'System',
        role: 'Automated',
      },
      relatedItems: [
        {
          type: 'appointment',
          id: 'apt1',
          title: 'Brake Service Appointment',
        },
      ],
    },
    {
      id: '3',
      type: 'sms',
      direction: 'outbound',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      content: 'Hi ' + customer.name.split(' ')[0] + ', your Honda Civic is ready for pickup! Total: $245. Shop hours: 8AM-6PM. Thanks!',
      status: 'delivered',
      priority: 'normal',
      metadata: {
        phoneNumber: customer.phone,
        templateUsed: 'ready-for-pickup',
      },
      createdBy: {
        id: 'user2',
        name: 'Mike Chen',
        role: 'Technician',
      },
    },
    {
      id: '4',
      type: 'reminder',
      direction: 'system',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      subject: 'Service Reminder',
      content: 'Automated reminder sent to customer about upcoming oil change service due in 2 weeks.',
      status: 'sent',
      priority: 'low',
      metadata: {
        reminderType: 'oil-change',
        emailAddress: customer.email,
      },
      createdBy: {
        id: 'system',
        name: 'System',
        role: 'Automated',
      },
    },
    {
      id: '5',
      type: 'note',
      direction: 'outbound',
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
      subject: 'Customer Preference Note',
      content: 'Customer prefers text messages over phone calls. Mentioned they work night shifts and are usually available after 2 PM.',
      status: 'completed',
      priority: 'normal',
      createdBy: {
        id: 'user1',
        name: 'Sarah Johnson',
        role: 'Service Advisor',
      },
    },
  ], [customer]);

  // Filter communications
  const filteredCommunications = useMemo(() => {
    let filtered = mockCommunications;

    // Apply filters
    if (filter.type !== 'all') {
      filtered = filtered.filter(item => item.type === filter.type);
    }

    if (filter.direction !== 'all') {
      filtered = filtered.filter(item => item.direction === filter.direction);
    }

    if (filter.status !== 'all') {
      filtered = filtered.filter(item => item.status === filter.status);
    }

    if (filter.priority !== 'all') {
      filtered = filtered.filter(item => item.priority === filter.priority);
    }

    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      filtered = filtered.filter(item =>
        item.content.toLowerCase().includes(searchLower) ||
        item.subject?.toLowerCase().includes(searchLower) ||
        item.createdBy.name.toLowerCase().includes(searchLower)
      );
    }

    // Date range filter
    if (filter.dateRange !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      
      switch (filter.dateRange) {
        case 'today':
          cutoff.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoff.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoff.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          cutoff.setMonth(now.getMonth() - 3);
          break;
      }
      
      if (filter.dateRange !== 'all') {
        filtered = filtered.filter(item => item.timestamp >= cutoff);
      }
    }

    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [mockCommunications, filter]);

  // Group communications by date if enabled
  const groupedCommunications = useMemo(() => {
    if (!groupByDate) {
      return { 'All Communications': filteredCommunications };
    }

    const groups: Record<string, CommunicationItem[]> = {};
    
    filteredCommunications.forEach(item => {
      let dateKey: string;
      
      if (isToday(item.timestamp)) {
        dateKey = 'Today';
      } else if (isYesterday(item.timestamp)) {
        dateKey = 'Yesterday';
      } else {
        dateKey = format(item.timestamp, 'MMMM d, yyyy');
      }
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(item);
    });

    return groups;
  }, [filteredCommunications, groupByDate]);

  // Handle new communication
  const handleAddCommunication = useCallback((communication: Partial<CommunicationItem>) => {
    onCommunicationAdd?.(communication);
    setShowNewCommunication(false);
    addToast({
      type: 'success',
      title: 'Communication Added',
      message: 'New communication has been recorded',
      duration: 3000,
    });
  }, [onCommunicationAdd, addToast]);

  // Render communication item
  const renderCommunicationItem = (item: CommunicationItem) => {
    const config = communicationConfig[item.type];
    const statusInfo = statusConfig[item.status];
    const priorityInfo = priorityConfig[item.priority];
    const Icon = config.icon;
    const StatusIcon = statusInfo.icon;

    return (
      <div key={item.id} className="group relative">
        {/* Timeline connector */}
        <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-border group-last:hidden" />
        
        <div className="flex gap-4">
          {/* Icon */}
          <div className={cn(
            'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-2',
            config.bgColor,
            config.borderColor
          )}>
            <Icon className={cn('h-5 w-5', config.color)} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pb-6">
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedItem(item)}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn('text-sm font-medium', config.color)}>
                        {config.label}
                      </span>
                      {item.direction === 'inbound' && (
                        <Badge variant="outline" className="text-xs">Inbound</Badge>
                      )}
                      {item.direction === 'outbound' && (
                        <Badge variant="outline" className="text-xs">Outbound</Badge>
                      )}
                      {item.priority !== 'normal' && (
                        <Badge variant="secondary" className={cn('text-xs', priorityInfo.color)}>
                          {priorityInfo.label}
                        </Badge>
                      )}
                    </div>
                    
                    {item.subject && (
                      <h4 className="font-medium text-sm mb-1">{item.subject}</h4>
                    )}
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatDistanceToNow(item.timestamp, { addSuffix: true })}</span>
                      <span>•</span>
                      <span>{item.createdBy.name}</span>
                      {item.metadata?.duration && (
                        <>
                          <span>•</span>
                          <span>{Math.floor(item.metadata.duration / 60)}m {item.metadata.duration % 60}s</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center gap-1">
                      <StatusIcon className={cn('h-3 w-3', statusInfo.color)} />
                      <span className={cn('text-xs', statusInfo.color)}>
                        {statusInfo.label}
                      </span>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Reply className="mr-2 h-4 w-4" />
                          Reply
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Forward className="mr-2 h-4 w-4" />
                          Forward
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Star className="mr-2 h-4 w-4" />
                          Mark Important
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Archive className="mr-2 h-4 w-4" />
                          Archive
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                  {item.content}
                </p>

                {/* Related Items */}
                {item.relatedItems && item.relatedItems.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {item.relatedItems.map((related, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        <ExternalLink className="h-2 w-2 mr-1" />
                        {related.title}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Attachments */}
                {item.attachments && item.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {item.attachments.map((attachment) => (
                      <Button key={attachment.id} variant="outline" size="sm" className="h-6 text-xs">
                        <Download className="h-2 w-2 mr-1" />
                        {attachment.name}
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Communication Timeline
              <Badge variant="secondary">{filteredCommunications.length}</Badge>
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setGroupByDate(!groupByDate)}>
                {groupByDate ? 'Ungroup' : 'Group by Date'}
              </Button>
              
              <Dialog open={showNewCommunication} onOpenChange={setShowNewCommunication}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Communication
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add New Communication</DialogTitle>
                  </DialogHeader>
                  <NewCommunicationForm
                    customer={customer}
                    onSubmit={handleAddCommunication}
                    onCancel={() => setShowNewCommunication(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="font-medium">Filters</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search communications..."
                  value={filter.search}
                  onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Type Filter */}
            <Select value={filter.type} onValueChange={(value) => setFilter(prev => ({ ...prev, type: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="call">Phone Calls</SelectItem>
                <SelectItem value="email">Emails</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="appointment">Appointments</SelectItem>
                <SelectItem value="reminder">Reminders</SelectItem>
                <SelectItem value="note">Notes</SelectItem>
              </SelectContent>
            </Select>

            {/* Direction Filter */}
            <Select value={filter.direction} onValueChange={(value) => setFilter(prev => ({ ...prev, direction: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Directions</SelectItem>
                <SelectItem value="inbound">Inbound</SelectItem>
                <SelectItem value="outbound">Outbound</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Range Filter */}
            <Select value={filter.dateRange} onValueChange={(value) => setFilter(prev => ({ ...prev, dateRange: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Past Week</SelectItem>
                <SelectItem value="month">Past Month</SelectItem>
                <SelectItem value="quarter">Past 3 Months</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={filter.status} onValueChange={(value) => setFilter(prev => ({ ...prev, status: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardContent className="pt-6">
          {filteredCommunications.length > 0 ? (
            <ScrollArea className="h-[600px]">
              <div className="space-y-0">
                {Object.entries(groupedCommunications).map(([dateGroup, items]) => (
                  <div key={dateGroup}>
                    {groupByDate && (
                      <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 mb-4">
                        <h3 className="font-medium text-sm text-muted-foreground border-b pb-2">
                          {dateGroup}
                        </h3>
                      </div>
                    )}
                    {items.map(renderCommunicationItem)}
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-12">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Communications Found</h3>
              <p className="text-muted-foreground mb-4">
                {filter.search || filter.type !== 'all' || filter.direction !== 'all'
                  ? 'Try adjusting your filters to see more communications.'
                  : 'No communications have been recorded for this customer yet.'
                }
              </p>
              <Button onClick={() => setShowNewCommunication(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Communication
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Communication Detail Modal */}
      {selectedItem && (
        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent className="max-w-3xl">
            <CommunicationDetailView
              communication={selectedItem}
              onUpdate={(updates) => {
                onCommunicationUpdate?.(selectedItem.id, updates);
                setSelectedItem(null);
              }}
              onClose={() => setSelectedItem(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// New Communication Form Component
interface NewCommunicationFormProps {
  customer: Customer;
  onSubmit: (communication: Partial<CommunicationItem>) => void;
  onCancel: () => void;
}

function NewCommunicationForm({ customer, onSubmit, onCancel }: NewCommunicationFormProps) {
  const [formData, setFormData] = useState({
    type: 'note' as CommunicationItem['type'],
    direction: 'outbound' as CommunicationItem['direction'],
    subject: '',
    content: '',
    priority: 'normal' as CommunicationItem['priority'],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const communication: Partial<CommunicationItem> = {
      ...formData,
      timestamp: new Date(),
      status: 'completed',
      createdBy: {
        id: 'current-user',
        name: 'Current User',
        role: 'Service Advisor',
      },
    };

    onSubmit(communication);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Type</label>
          <Select value={formData.type} onValueChange={(value: CommunicationItem['type']) => 
            setFormData(prev => ({ ...prev, type: value }))
          }>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="call">Phone Call</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="note">Note</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Priority</label>
          <Select value={formData.priority} onValueChange={(value: CommunicationItem['priority']) => 
            setFormData(prev => ({ ...prev, priority: value }))
          }>
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

      {formData.type !== 'note' && (
        <div>
          <label className="text-sm font-medium mb-2 block">Subject</label>
          <Input
            value={formData.subject}
            onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
            placeholder="Communication subject..."
          />
        </div>
      )}

      <div>
        <label className="text-sm font-medium mb-2 block">Content</label>
        <Textarea
          value={formData.content}
          onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
          placeholder="Enter communication details..."
          rows={4}
          required
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Add Communication
        </Button>
      </div>
    </form>
  );
}

// Communication Detail View Component
interface CommunicationDetailViewProps {
  communication: CommunicationItem;
  onUpdate: (updates: Partial<CommunicationItem>) => void;
  onClose: () => void;
}

function CommunicationDetailView({ communication, onUpdate, onClose }: CommunicationDetailViewProps) {
  const config = communicationConfig[communication.type];
  const statusInfo = statusConfig[communication.status];
  const Icon = config.icon;
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Icon className={cn('h-5 w-5', config.color)} />
          {config.label} Details
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {/* Header Info */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <span className="text-sm text-muted-foreground">Date & Time</span>
            <p className="font-medium">{format(communication.timestamp, 'PPpp')}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Status</span>
            <div className="flex items-center gap-2">
              <StatusIcon className={cn('h-4 w-4', statusInfo.color)} />
              <span className={cn('font-medium', statusInfo.color)}>{statusInfo.label}</span>
            </div>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Created By</span>
            <p className="font-medium">{communication.createdBy.name}</p>
            <p className="text-sm text-muted-foreground">{communication.createdBy.role}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Priority</span>
            <Badge variant="secondary" className={priorityConfig[communication.priority].color}>
              {priorityConfig[communication.priority].label}
            </Badge>
          </div>
        </div>

        {/* Subject */}
        {communication.subject && (
          <div>
            <h3 className="font-medium mb-2">Subject</h3>
            <p className="text-sm">{communication.subject}</p>
          </div>
        )}

        {/* Content */}
        <div>
          <h3 className="font-medium mb-2">Content</h3>
          <div className="p-4 bg-muted/30 rounded-lg">
            <p className="text-sm whitespace-pre-wrap">{communication.content}</p>
          </div>
        </div>

        {/* Metadata */}
        {communication.metadata && (
          <div>
            <h3 className="font-medium mb-2">Additional Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {communication.metadata.duration && (
                <div>
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="ml-2">{Math.floor(communication.metadata.duration / 60)}m {communication.metadata.duration % 60}s</span>
                </div>
              )}
              {communication.metadata.phoneNumber && (
                <div>
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="ml-2">{communication.metadata.phoneNumber}</span>
                </div>
              )}
              {communication.metadata.emailAddress && (
                <div>
                  <span className="text-muted-foreground">Email:</span>
                  <span className="ml-2">{communication.metadata.emailAddress}</span>
                </div>
              )}
              {communication.metadata.templateUsed && (
                <div>
                  <span className="text-muted-foreground">Template:</span>
                  <span className="ml-2 capitalize">{communication.metadata.templateUsed.replace('-', ' ')}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Related Items */}
        {communication.relatedItems && communication.relatedItems.length > 0 && (
          <div>
            <h3 className="font-medium mb-2">Related Items</h3>
            <div className="space-y-2">
              {communication.relatedItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{item.title}</span>
                  <Badge variant="outline" className="text-xs capitalize">{item.type}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button variant="outline">
          <Edit3 className="h-4 w-4 mr-2" />
          Edit
        </Button>
        <Button>
          <Reply className="h-4 w-4 mr-2" />
          Reply
        </Button>
      </div>
    </div>
  );
}

export type { CommunicationItem, CustomerCommunicationTimelineProps };
