// Global Customer Search Component
// Quick search component for navigation and global access

import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Search,
  User,
  Phone,
  Mail,
  Car,
  Wrench,
  Plus,
  ArrowRight,
  Star,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCustomers } from '@/hooks/use-customers';
import { useJobs } from '@/hooks/use-jobs';
import { useVehicles } from '@/hooks/use-vehicles';
import { useUIStore } from '@/stores';
import type { Customer } from '@/types/database';

interface GlobalCustomerSearchProps {
  onCustomerSelect?: (customer: Customer) => void;
  onCreateCustomer?: () => void;
  placeholder?: string;
  className?: string;
  variant?: 'button' | 'input' | 'icon';
}

export function GlobalCustomerSearch({
  onCustomerSelect,
  onCreateCustomer,
  placeholder = "Search customers...",
  className = '',
  variant = 'input',
}: GlobalCustomerSearchProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Hooks
  const { data: customersResponse, isLoading } = useCustomers();
  const { data: jobsResponse } = useJobs();
  const { data: vehiclesResponse } = useVehicles();
  const { selectItem, openModal } = useUIStore();

  const customers = customersResponse?.data || [];
  const jobs = jobsResponse?.data || [];
  const vehicles = vehiclesResponse?.data || [];

  // Enhanced customer data with analytics
  const enhancedCustomers = useMemo(() => {
    return customers.map(customer => {
      const customerJobs = jobs.filter(job => job.customerId === customer.id);
      const customerVehicles = vehicles.filter(vehicle => vehicle.customerId === customer.id);
      
      const completedJobs = customerJobs.filter(job => job.status === 'completed');
      const activeJobs = customerJobs.filter(job => 
        job.status === 'scheduled' || job.status === 'in-bay' || job.status === 'waiting-parts'
      );
      
      const totalRevenue = completedJobs.reduce((sum, job) => sum + (job.estHours * 100), 0);
      const lastJobDate = customerJobs.length > 0 
        ? new Date(Math.max(...customerJobs.map(job => new Date(job.createdAt).getTime())))
        : null;
      
      // Determine customer status
      let status = 'inactive';
      let statusIcon = Clock;
      let statusColor = 'text-gray-500';
      
      if (activeJobs.length > 0) {
        status = 'active';
        statusIcon = CheckCircle;
        statusColor = 'text-green-600';
      } else if (customerJobs.length >= 10 || totalRevenue > 5000) {
        status = 'vip';
        statusIcon = Star;
        statusColor = 'text-purple-600';
      } else if (lastJobDate && (Date.now() - lastJobDate.getTime()) <= 30 * 24 * 60 * 60 * 1000) {
        status = 'recent';
        statusIcon = CheckCircle;
        statusColor = 'text-blue-600';
      }
      
      return {
        ...customer,
        totalJobs: customerJobs.length,
        activeJobs: activeJobs.length,
        totalVehicles: customerVehicles.length,
        totalRevenue,
        lastJobDate,
        status,
        statusIcon,
        statusColor,
        // Search relevance score
        relevanceScore: 0,
      };
    });
  }, [customers, jobs, vehicles]);

  // Filter and rank customers based on search query
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) {
      // Return recent customers when no search query
      return enhancedCustomers
        .filter(customer => customer.status === 'active' || customer.status === 'recent')
        .sort((a, b) => {
          if (a.lastJobDate && b.lastJobDate) {
            return b.lastJobDate.getTime() - a.lastJobDate.getTime();
          }
          return b.totalJobs - a.totalJobs;
        })
        .slice(0, 8);
    }

    const query = searchQuery.toLowerCase();
    
    return enhancedCustomers
      .map(customer => {
        let score = 0;
        
        // Name matching (highest priority)
        if (customer.name.toLowerCase().includes(query)) {
          score += customer.name.toLowerCase().startsWith(query) ? 100 : 50;
        }
        
        // Phone matching
        if (customer.phone.includes(query)) {
          score += 80;
        }
        
        // Email matching
        if (customer.email?.toLowerCase().includes(query)) {
          score += 60;
        }
        
        // Address matching
        if (customer.address?.toLowerCase().includes(query)) {
          score += 30;
        }
        
        // Boost score for VIP and active customers
        if (customer.status === 'vip') score += 20;
        if (customer.status === 'active') score += 15;
        
        return { ...customer, relevanceScore: score };
      })
      .filter(customer => customer.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 10);
  }, [enhancedCustomers, searchQuery]);

  const handleCustomerSelect = useCallback((customer: Customer) => {
    setOpen(false);
    setDialogOpen(false);
    setSearchQuery('');
    
    // Update global state
    selectItem({
      type: 'customer',
      id: customer.id,
      data: customer,
    });
    
    onCustomerSelect?.(customer);
  }, [onCustomerSelect, selectItem]);

  const handleCreateCustomer = useCallback(() => {
    setOpen(false);
    setDialogOpen(false);
    setSearchQuery('');
    
    if (onCreateCustomer) {
      onCreateCustomer();
    } else {
      openModal('create-customer');
    }
  }, [onCreateCustomer, openModal]);

  // Render customer item
  const renderCustomerItem = (customer: any) => {
    const StatusIcon = customer.statusIcon;
    
    return (
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">{customer.name}</p>
              <StatusIcon className={cn('h-3 w-3', customer.statusColor)} />
            </div>
            
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Phone className="h-2 w-2" />
                {customer.phone}
              </div>
              {customer.totalJobs > 0 && (
                <div className="flex items-center gap-1">
                  <Wrench className="h-2 w-2" />
                  {customer.totalJobs} jobs
                </div>
              )}
              {customer.totalVehicles > 0 && (
                <div className="flex items-center gap-1">
                  <Car className="h-2 w-2" />
                  {customer.totalVehicles} vehicles
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          {customer.status === 'vip' && (
            <Badge variant="secondary" className="text-xs">VIP</Badge>
          )}
          {customer.activeJobs > 0 && (
            <Badge variant="outline" className="text-xs">
              {customer.activeJobs} active
            </Badge>
          )}
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
        </div>
      </div>
    );
  };

  // Button variant
  if (variant === 'button') {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("justify-start", className)}>
            <Search className="h-4 w-4 mr-2" />
            {placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-0" align="start">
          <Command>
            <CommandInput 
              placeholder={placeholder}
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>
                <div className="text-center py-6">
                  <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground mb-2">No customers found</p>
                  <Button size="sm" onClick={handleCreateCustomer}>
                    <Plus className="h-3 w-3 mr-1" />
                    Create Customer
                  </Button>
                </div>
              </CommandEmpty>
              
              {!searchQuery && (
                <CommandGroup heading="Recent & Active">
                  {filteredCustomers.map((customer) => (
                    <CommandItem
                      key={customer.id}
                      onSelect={() => handleCustomerSelect(customer)}
                      className="p-3"
                    >
                      {renderCustomerItem(customer)}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              
              {searchQuery && filteredCustomers.length > 0 && (
                <CommandGroup heading="Search Results">
                  {filteredCustomers.map((customer) => (
                    <CommandItem
                      key={customer.id}
                      onSelect={() => handleCustomerSelect(customer)}
                      className="p-3"
                    >
                      {renderCustomerItem(customer)}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              
              <CommandSeparator />
              <CommandGroup>
                <CommandItem onSelect={handleCreateCustomer} className="p-3">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Create New Customer
                  </div>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }

  // Icon variant
  if (variant === 'icon') {
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className={className}>
            <Search className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Customers
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Input
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
            
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleCustomerSelect(customer)}
                    >
                      {renderCustomerItem(customer)}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground mb-2">
                      {searchQuery ? 'No customers found' : 'Start typing to search customers'}
                    </p>
                    <Button size="sm" onClick={handleCreateCustomer}>
                      <Plus className="h-3 w-3 mr-1" />
                      Create Customer
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Input variant (default)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={cn("relative", className)}>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            className="pl-10 cursor-pointer"
            readOnly
            onClick={() => setOpen(true)}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="start">
        <Command>
          <CommandInput 
            placeholder={placeholder}
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              <div className="text-center py-6">
                <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground mb-2">No customers found</p>
                <Button size="sm" onClick={handleCreateCustomer}>
                  <Plus className="h-3 w-3 mr-1" />
                  Create Customer
                </Button>
              </div>
            </CommandEmpty>
            
            {!searchQuery && (
              <CommandGroup heading="Recent & Active">
                {filteredCustomers.map((customer) => (
                  <CommandItem
                    key={customer.id}
                    onSelect={() => handleCustomerSelect(customer)}
                    className="p-3"
                  >
                    {renderCustomerItem(customer)}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            
            {searchQuery && filteredCustomers.length > 0 && (
              <CommandGroup heading="Search Results">
                {filteredCustomers.map((customer) => (
                  <CommandItem
                    key={customer.id}
                    onSelect={() => handleCustomerSelect(customer)}
                    className="p-3"
                  >
                    {renderCustomerItem(customer)}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            
            <CommandSeparator />
            <CommandGroup>
              <CommandItem onSelect={handleCreateCustomer} className="p-3">
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create New Customer
                </div>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export type { GlobalCustomerSearchProps };
