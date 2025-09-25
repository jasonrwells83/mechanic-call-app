// Customer List Component
// Comprehensive customer management with list view, search, and filtering

import { useState, useMemo } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  MoreHorizontal,
  Phone,
  Mail,
  MapPin,
  Car,
  DollarSign,
  TrendingUp,
  Users,
  UserPlus,
  Eye,
  Edit,
  Archive,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCustomers, useDeleteCustomer } from '@/hooks/use-customers';
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

interface ExtendedCustomer extends Customer {
  totalJobs: number;
  activeJobs: number;
  totalVehicles: number;
  lastJobDate: Date | null;
  totalRevenue: number;
  vehicles: any[];
}


export function CustomerList({
  onCustomerSelect,
  onCustomerEdit,
  onCustomerCreate,
  className = '',
}: CustomerListProps) {
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'lastJob' | 'totalJobs' | 'created'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch data
  const { data: customersResponse, isLoading: customersLoading } = useCustomers();
  const { data: jobsResponse } = useJobs();
  const { data: vehiclesResponse } = useVehicles();

  // Delete customer mutation
  const deleteCustomerMutation = useDeleteCustomer();

  const customers = customersResponse?.data || [];
  const jobs = jobsResponse?.data || [];
  const vehicles = (vehiclesResponse as any)?.data || [];

  // Create customer statistics
  const customerStats = useMemo((): ExtendedCustomer[] => {
    return customers.map((customer: Customer) => {
      const customerJobs = jobs.filter((job: any) => job.customerId === customer.id);
      const customerVehicles = vehicles.filter((vehicle: any) => vehicle.customerId === customer.id);
      
      const totalJobs = customerJobs.length;
      const activeJobs = customerJobs.filter((job: any) => 
        job.status === 'scheduled' || job.status === 'in-bay' || job.status === 'waiting-parts'
      ).length;
      
      const lastJobDate = customerJobs.length > 0 
        ? new Date(Math.max(...customerJobs.map((job: any) => new Date(job.createdAt).getTime())))
        : null;
      
      const totalRevenue = customerJobs
        .filter((job: any) => job.status === 'completed')
        .reduce((sum: number, job: any) => sum + (job.estHours * 100), 0); // Simplified revenue calculation
      
      return {
        ...customer,
        totalJobs,
        activeJobs,
        totalVehicles: customerVehicles.length,
        lastJobDate,
        totalRevenue,
        vehicles: customerVehicles,
      };
    });
  }, [customers, jobs, vehicles]);

  // Filter and sort customers
  const filteredAndSortedCustomers = useMemo((): ExtendedCustomer[] => {
    const filtered = customerStats.filter((customer: ExtendedCustomer) => {
      const matchesSearch = !searchQuery || 
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone.includes(searchQuery);
      
      return matchesSearch;
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
  }, [customerStats, searchQuery, sortBy, sortOrder]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const total = customers.length;
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const newCustomers = customerStats.filter(c => new Date(c.createdAt) >= thisMonth).length;
    const totalRevenue = customerStats.reduce((sum, c) => sum + c.totalRevenue, 0);
    
    return { total, newCustomers, totalRevenue };
  }, [customers.length, customerStats]);


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
      case 'delete':
        setCustomerToDelete(customer);
        setShowDeleteDialog(true);
        break;
    }
  };

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;
    
    try {
      await deleteCustomerMutation.mutateAsync(customerToDelete.id);
      setShowDeleteDialog(false);
      setCustomerToDelete(null);
    } catch (error) {
      // Error is handled by the mutation hook
      console.error('Delete failed:', error);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setCustomerToDelete(null);
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
  const displayCustomers: ExtendedCustomer[] = filteredCustomers.length > 0 || showAdvancedSearch ? 
    filteredCustomers.map(customer => {
      const stats = customerStats.find(c => c.id === customer.id);
      return stats || {
        ...customer,
        totalJobs: 0,
        activeJobs: 0,
        totalVehicles: 0,
        lastJobDate: null,
        totalRevenue: 0,
        vehicles: []
      };
    }) : filteredAndSortedCustomers;

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <TableHead>Vehicles</TableHead>
                  <TableHead>Jobs</TableHead>
                  <TableHead>Last Service</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayCustomers.map((customer) => {
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
                              className="text-orange-600"
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              Archive
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCustomerAction(customer, 'delete');
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
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
                {searchQuery 
                  ? 'Try adjusting your search criteria'
                  : 'Get started by adding your first customer'
                }
              </p>
              {!searchQuery && (
                <Button onClick={onCustomerCreate}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add First Customer
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Customer</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{customerToDelete?.name}</strong>? 
              This action cannot be undone and will permanently remove the customer 
              and all associated data from the system.
              {customerToDelete && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="text-sm text-red-800">
                    <strong>This will also delete:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>All customer vehicles</li>
                      <li>All service history and jobs</li>
                      <li>All communication records</li>
                      <li>All appointments and scheduling data</li>
                    </ul>
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={handleDeleteCancel}
              disabled={deleteCustomerMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              variant="outline" 
              onClick={handleDeleteConfirm}
              disabled={deleteCustomerMutation.isPending}
              className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
            >
              {deleteCustomerMutation.isPending ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Customer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export type { CustomerListProps };
