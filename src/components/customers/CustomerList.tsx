// Customer List Component
// Comprehensive customer management with list view, search, and filtering

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  Filter,
  MoreHorizontal,
  Phone,
  Mail,
  MapPin,
  Car,
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
  UserPlus,
  Eye,
  Edit,
  Archive,
  Star,
  Clock,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCustomers } from '@/hooks/use-customers';
import { useJobs } from '@/hooks/use-jobs';
import { useVehicles } from '@/hooks/use-vehicles';
import { AdvancedCustomerSearch } from '@/components/search/AdvancedCustomerSearch';
import type { Customer } from '@/types/database';

interface CustomerListProps {
  onCustomerSelect?: (customer: Customer) => void;
  onCustomerEdit?: (customer: Customer) => void;
  onCustomerCreate?: () => void;
  className?: string;
}

// Customer status based on recent activity
type CustomerStatus = 'active' | 'inactive' | 'new' | 'vip';

function getCustomerStatus(customer: Customer, recentJobs: any[]): CustomerStatus {
  const customerJobs = recentJobs.filter(job => job.customerId === customer.id);
  const lastJobDate = customerJobs.length > 0 
    ? Math.max(...customerJobs.map(job => new Date(job.createdAt).getTime()))
    : 0;
  
  const daysSinceLastJob = (Date.now() - lastJobDate) / (1000 * 60 * 60 * 24);
  const totalJobs = customerJobs.length;
  
  if (totalJobs === 0) return 'new';
  if (totalJobs >= 10 || customerJobs.some(job => job.priority === 'high')) return 'vip';
  if (daysSinceLastJob <= 30) return 'active';
  return 'inactive';
}

const statusConfig = {
  active: {
    label: 'Active',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle,
  },
  inactive: {
    label: 'Inactive',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: Clock,
  },
  new: {
    label: 'New',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Star,
  },
  vip: {
    label: 'VIP',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: TrendingUp,
  },
};

export function CustomerList({
  onCustomerSelect,
  onCustomerEdit,
  onCustomerCreate,
  className = '',
}: CustomerListProps) {
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'new' | 'vip'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'totalSpent' | 'lastVisit' | 'jobCount'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Fetch data
  const { data: customersResponse, isLoading: customersLoading } = useCustomers();
  const { data: jobsResponse } = useJobs();
  const { data: vehiclesResponse } = useVehicles();

  const customers = customersResponse?.data || [];
  const jobs = jobsResponse?.data || [];
  const vehicles = vehiclesResponse?.data || [];

  // Create customer statistics
  const customerStats = useMemo(() => {
    return customers.map(customer => {
      const customerJobs = jobs.filter(job => job.customerId === customer.id);
      const customerVehicles = vehicles.filter(vehicle => vehicle.customerId === customer.id);
      
      const totalJobs = customerJobs.length;
      const activeJobs = customerJobs.filter(job => 
        job.status === 'scheduled' || job.status === 'in-bay' || job.status === 'waiting-parts'
      ).length;
      
      const lastJobDate = customerJobs.length > 0 
        ? new Date(Math.max(...customerJobs.map(job => new Date(job.createdAt).getTime())))
        : null;
      
      const totalRevenue = customerJobs
        .filter(job => job.status === 'completed')
        .reduce((sum, job) => sum + (job.estHours * 100), 0); // Simplified revenue calculation
      
      const status = getCustomerStatus(customer, jobs);
      
      return {
        ...customer,
        totalJobs,
        activeJobs,
        totalVehicles: customerVehicles.length,
        lastJobDate,
        totalRevenue,
        status,
        vehicles: customerVehicles,
      };
    });
  }, [customers, jobs, vehicles]);

  // Filter and sort customers
  const filteredAndSortedCustomers = useMemo(() => {
    let filtered = customerStats.filter(customer => {
      const matchesSearch = !searchQuery || 
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone.includes(searchQuery);
      
      const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    // Sort customers
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'lastJob':
          aValue = a.lastJobDate?.getTime() || 0;
          bValue = b.lastJobDate?.getTime() || 0;
          break;
        case 'totalJobs':
          aValue = a.totalJobs;
          bValue = b.totalJobs;
          break;
        case 'created':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [customerStats, searchQuery, statusFilter, sortBy, sortOrder]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const total = customers.length;
    const active = customerStats.filter(c => c.status === 'active').length;
    const newCustomers = customerStats.filter(c => c.status === 'new').length;
    const vipCustomers = customerStats.filter(c => c.status === 'vip').length;
    const totalRevenue = customerStats.reduce((sum, c) => sum + c.totalRevenue, 0);
    
    return { total, active, newCustomers, vipCustomers, totalRevenue };
  }, [customers.length, customerStats]);

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleCustomerAction = (customer: Customer, action: string) => {
    switch (action) {
      case 'view':
        onCustomerSelect?.(customer);
        break;
      case 'edit':
        onCustomerEdit?.(customer);
        break;
      case 'archive':
        // Handle archive action
        console.log('Archive customer:', customer.id);
        break;
    }
  };

  if (customersLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  // Use filtered customers from advanced search or fall back to all customers
  const displayCustomers = filteredCustomers.length > 0 || showAdvancedSearch ? filteredCustomers : filteredAndSortedCustomers;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Advanced Search */}
      {showAdvancedSearch && (
        <AdvancedCustomerSearch
          onResults={setFilteredCustomers}
          onCustomerSelect={onCustomerSelect}
        />
      )}

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.total}</div>
            <p className="text-xs text-muted-foreground">
              {summaryStats.newCustomers} new this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summaryStats.active}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((summaryStats.active / summaryStats.total) * 100)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VIP Customers</CardTitle>
            <Star className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{summaryStats.vipCustomers}</div>
            <p className="text-xs text-muted-foreground">
              High-value customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summaryStats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              From completed jobs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${summaryStats.total > 0 ? Math.round(summaryStats.totalRevenue / summaryStats.total) : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Per customer
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Customer Database
                <Badge variant="secondary">{displayCustomers.length}</Badge>
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                >
                  <Search className="h-4 w-4 mr-2" />
                  {showAdvancedSearch ? 'Simple' : 'Advanced'} Search
                </Button>
                <Button onClick={onCustomerCreate}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Customer
                </Button>
              </div>
            </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CustomerStatus | 'all')}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="new">New</option>
              <option value="vip">VIP</option>
            </select>

            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field as typeof sortBy);
                setSortOrder(order as 'asc' | 'desc');
              }}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="lastJob-desc">Recent Jobs</option>
              <option value="totalJobs-desc">Most Jobs</option>
              <option value="created-desc">Newest</option>
              <option value="created-asc">Oldest</option>
            </select>
          </div>

          {/* Customer Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Vehicles</TableHead>
                  <TableHead>Jobs</TableHead>
                  <TableHead>Last Service</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayCustomers.map((customer) => {
                  const StatusIcon = statusConfig[customer.status].icon;
                  
                  return (
                    <TableRow 
                      key={customer.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => onCustomerSelect?.(customer)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {customer.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{customer.name}</div>
                            {customer.address && (
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {customer.address.split(',')[0]}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3" />
                            {customer.phone}
                          </div>
                          {customer.email && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {customer.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge className={cn("text-xs", statusConfig[customer.status].color)}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig[customer.status].label}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Car className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{customer.totalVehicles}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{customer.totalJobs} total</div>
                          {customer.activeJobs > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {customer.activeJobs} active
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {customer.lastJobDate ? (
                          <div className="text-sm">
                            {customer.lastJobDate.toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <div className="font-medium">
                          ${customer.totalRevenue.toLocaleString()}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              className="h-8 w-8 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCustomerAction(customer, 'view');
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCustomerAction(customer, 'edit');
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Customer
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCustomerAction(customer, 'archive');
                              }}
                              className="text-red-600"
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              Archive
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
          {displayCustomers.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No customers found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Get started by adding your first customer'
                }
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Button onClick={onCustomerCreate}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add First Customer
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export type { CustomerListProps };
