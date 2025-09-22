// Advanced Customer Search Component
// Comprehensive search and filtering system for customers

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Save,
  Download,
  MoreHorizontal,
  Users,
  Calendar,
  DollarSign,
  Car,
  Phone,
  Mail,
  MapPin,
  Star,
  AlertTriangle,
  CheckCircle,
  Clock,
  SlidersHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCustomers } from '@/hooks/use-customers';
import { useJobs } from '@/hooks/use-jobs';
import { useVehicles } from '@/hooks/use-vehicles';
import { useUIStore } from '@/stores';
import type { Customer } from '@/types/database';

interface SearchFilters {
  query: string;
  status: string[];
  hasVehicles: boolean | null;
  hasActiveJobs: boolean | null;
  registrationDate: {
    from?: string;
    to?: string;
  };
  totalJobs: {
    min?: number;
    max?: number;
  };
  totalRevenue: {
    min?: number;
    max?: number;
  };
  location: string[];
  preferredContact: string[];
}

interface SavedFilter {
  id: string;
  name: string;
  filters: SearchFilters;
  createdAt: Date;
}

interface AdvancedCustomerSearchProps {
  onResults: (customers: Customer[]) => void;
  onCustomerSelect?: (customer: Customer) => void;
  className?: string;
}

export function AdvancedCustomerSearch({
  onResults,
  onCustomerSelect,
  className = '',
}: AdvancedCustomerSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    status: [],
    hasVehicles: null,
    hasActiveJobs: null,
    registrationDate: {},
    totalJobs: {},
    totalRevenue: {},
    location: [],
    preferredContact: [],
  });

  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Hooks
  const { data: customersResponse, isLoading } = useCustomers();
  const { data: jobsResponse } = useJobs();
  const { data: vehiclesResponse } = useVehicles();
  const { addToast } = useUIStore();

  const customers = customersResponse?.data || [];
  const jobs = jobsResponse?.data || [];
  const vehicles = vehiclesResponse?.data || [];

  // Create customer analytics
  const customerAnalytics = useMemo(() => {
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
      if (activeJobs.length > 0) {
        status = 'active';
      } else if (customerJobs.length >= 10 || totalRevenue > 5000) {
        status = 'vip';
      } else if (lastJobDate && (Date.now() - lastJobDate.getTime()) <= 30 * 24 * 60 * 60 * 1000) {
        status = 'recent';
      }
      
      // Extract location from address
      const location = customer.address ? customer.address.split(',').pop()?.trim() || '' : '';
      
      return {
        ...customer,
        totalJobs: customerJobs.length,
        completedJobs: completedJobs.length,
        activeJobs: activeJobs.length,
        totalVehicles: customerVehicles.length,
        totalRevenue,
        lastJobDate,
        status,
        location,
        preferredContact: 'phone', // Default, would come from customer data
      };
    });
  }, [customers, jobs, vehicles]);

  // Apply filters
  const filteredCustomers = useMemo(() => {
    let filtered = customerAnalytics;

    // Text search
    if (filters.query) {
      const query = filters.query.toLowerCase();
      filtered = filtered.filter(customer =>
        customer.name.toLowerCase().includes(query) ||
        customer.email?.toLowerCase().includes(query) ||
        customer.phone.includes(query) ||
        customer.address?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(customer => filters.status.includes(customer.status));
    }

    // Has vehicles filter
    if (filters.hasVehicles !== null) {
      filtered = filtered.filter(customer => 
        filters.hasVehicles ? customer.totalVehicles > 0 : customer.totalVehicles === 0
      );
    }

    // Has active jobs filter
    if (filters.hasActiveJobs !== null) {
      filtered = filtered.filter(customer => 
        filters.hasActiveJobs ? customer.activeJobs > 0 : customer.activeJobs === 0
      );
    }

    // Registration date filter
    if (filters.registrationDate.from || filters.registrationDate.to) {
      filtered = filtered.filter(customer => {
        const regDate = new Date(customer.createdAt);
        const fromDate = filters.registrationDate.from ? new Date(filters.registrationDate.from) : null;
        const toDate = filters.registrationDate.to ? new Date(filters.registrationDate.to) : null;
        
        return (!fromDate || regDate >= fromDate) && (!toDate || regDate <= toDate);
      });
    }

    // Total jobs filter
    if (filters.totalJobs.min !== undefined || filters.totalJobs.max !== undefined) {
      filtered = filtered.filter(customer => {
        const jobs = customer.totalJobs;
        return (filters.totalJobs.min === undefined || jobs >= filters.totalJobs.min) &&
               (filters.totalJobs.max === undefined || jobs <= filters.totalJobs.max);
      });
    }

    // Total revenue filter
    if (filters.totalRevenue.min !== undefined || filters.totalRevenue.max !== undefined) {
      filtered = filtered.filter(customer => {
        const revenue = customer.totalRevenue;
        return (filters.totalRevenue.min === undefined || revenue >= filters.totalRevenue.min) &&
               (filters.totalRevenue.max === undefined || revenue <= filters.totalRevenue.max);
      });
    }

    // Location filter
    if (filters.location.length > 0) {
      filtered = filtered.filter(customer => 
        filters.location.some(loc => customer.location.toLowerCase().includes(loc.toLowerCase()))
      );
    }

    // Preferred contact filter
    if (filters.preferredContact.length > 0) {
      filtered = filtered.filter(customer => 
        filters.preferredContact.includes(customer.preferredContact)
      );
    }

    return filtered;
  }, [customerAnalytics, filters]);

  // Update results when filtered customers change
  React.useEffect(() => {
    onResults(filteredCustomers);
  }, [filteredCustomers, onResults]);

  // Get unique values for filter options
  const filterOptions = useMemo(() => {
    const locations = [...new Set(customerAnalytics.map(c => c.location).filter(Boolean))];
    const statuses = [...new Set(customerAnalytics.map(c => c.status))];
    
    return {
      locations: locations.sort(),
      statuses: statuses.sort(),
      preferredContacts: ['phone', 'email', 'text'],
    };
  }, [customerAnalytics]);

  const handleFilterChange = useCallback((key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleArrayFilterToggle = useCallback((key: keyof SearchFilters, value: string) => {
    setFilters(prev => {
      const currentArray = prev[key] as string[];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value];
      return { ...prev, [key]: newArray };
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      query: '',
      status: [],
      hasVehicles: null,
      hasActiveJobs: null,
      registrationDate: {},
      totalJobs: {},
      totalRevenue: {},
      location: [],
      preferredContact: [],
    });
  }, []);

  const saveCurrentFilter = useCallback(() => {
    const name = prompt('Enter a name for this filter:');
    if (name) {
      const newFilter: SavedFilter = {
        id: Date.now().toString(),
        name,
        filters: { ...filters },
        createdAt: new Date(),
      };
      setSavedFilters(prev => [...prev, newFilter]);
      addToast({
        type: 'success',
        title: 'Filter Saved',
        message: `Filter "${name}" has been saved`,
        duration: 3000,
      });
    }
  }, [filters, addToast]);

  const loadSavedFilter = useCallback((savedFilter: SavedFilter) => {
    setFilters(savedFilter.filters);
    addToast({
      type: 'info',
      title: 'Filter Loaded',
      message: `Loaded filter "${savedFilter.name}"`,
      duration: 2000,
    });
  }, [addToast]);

  const exportResults = useCallback(() => {
    // In a real app, this would export to CSV or Excel
    const csvContent = filteredCustomers.map(customer => 
      `${customer.name},${customer.phone},${customer.email || ''},${customer.totalJobs},${customer.totalRevenue}`
    ).join('\n');
    
    console.log('Export CSV:', csvContent);
    addToast({
      type: 'info',
      title: 'Export Ready',
      message: `${filteredCustomers.length} customers ready for export`,
      duration: 3000,
    });
  }, [filteredCustomers, addToast]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.query) count++;
    if (filters.status.length > 0) count++;
    if (filters.hasVehicles !== null) count++;
    if (filters.hasActiveJobs !== null) count++;
    if (filters.registrationDate.from || filters.registrationDate.to) count++;
    if (filters.totalJobs.min !== undefined || filters.totalJobs.max !== undefined) count++;
    if (filters.totalRevenue.min !== undefined || filters.totalRevenue.max !== undefined) count++;
    if (filters.location.length > 0) count++;
    if (filters.preferredContact.length > 0) count++;
    return count;
  }, [filters]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Customer Search & Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary">{activeFilterCount} active</Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAdvanced(!showAdvanced)}>
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                {showAdvanced ? 'Hide' : 'Show'} Filters
                {showAdvanced ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={saveCurrentFilter}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Filter
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportResults}>
                    <Download className="mr-2 h-4 w-4" />
                    Export Results
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={clearFilters}>
                    <X className="mr-2 h-4 w-4" />
                    Clear All Filters
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Basic Search */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search customers by name, phone, email, or address..."
                value={filters.query}
                onChange={(e) => handleFilterChange('query', e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="text-sm text-muted-foreground">
              {filteredCustomers.length} of {customers.length} customers
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-sm font-medium">Quick Filters:</span>
            <Button
              variant={filters.status.includes('active') ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleArrayFilterToggle('status', 'active')}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Active
            </Button>
            <Button
              variant={filters.status.includes('vip') ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleArrayFilterToggle('status', 'vip')}
            >
              <Star className="h-3 w-3 mr-1" />
              VIP
            </Button>
            <Button
              variant={filters.hasActiveJobs === true ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange('hasActiveJobs', filters.hasActiveJobs === true ? null : true)}
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              Has Active Jobs
            </Button>
            <Button
              variant={filters.hasVehicles === true ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange('hasVehicles', filters.hasVehicles === true ? null : true)}
            >
              <Car className="h-3 w-3 mr-1" />
              Has Vehicles
            </Button>
          </div>

          {/* Saved Filters */}
          {savedFilters.length > 0 && (
            <div className="mb-4">
              <span className="text-sm font-medium">Saved Filters:</span>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {savedFilters.map((savedFilter) => (
                  <Button
                    key={savedFilter.id}
                    variant="outline"
                    size="sm"
                    onClick={() => loadSavedFilter(savedFilter)}
                  >
                    {savedFilter.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Advanced Filters */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleContent className="space-y-4">
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Status Filter */}
                <div>
                  <h4 className="font-medium mb-2">Customer Status</h4>
                  <div className="space-y-2">
                    {filterOptions.statuses.map((status) => (
                      <div key={status} className="flex items-center space-x-2">
                        <Checkbox
                          id={`status-${status}`}
                          checked={filters.status.includes(status)}
                          onCheckedChange={() => handleArrayFilterToggle('status', status)}
                        />
                        <label
                          htmlFor={`status-${status}`}
                          className="text-sm capitalize cursor-pointer"
                        >
                          {status}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Location Filter */}
                <div>
                  <h4 className="font-medium mb-2">Location</h4>
                  <ScrollArea className="h-24">
                    <div className="space-y-2">
                      {filterOptions.locations.map((location) => (
                        <div key={location} className="flex items-center space-x-2">
                          <Checkbox
                            id={`location-${location}`}
                            checked={filters.location.includes(location)}
                            onCheckedChange={() => handleArrayFilterToggle('location', location)}
                          />
                          <label
                            htmlFor={`location-${location}`}
                            className="text-sm cursor-pointer"
                          >
                            {location}
                          </label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Contact Preference */}
                <div>
                  <h4 className="font-medium mb-2">Preferred Contact</h4>
                  <div className="space-y-2">
                    {filterOptions.preferredContacts.map((method) => (
                      <div key={method} className="flex items-center space-x-2">
                        <Checkbox
                          id={`contact-${method}`}
                          checked={filters.preferredContact.includes(method)}
                          onCheckedChange={() => handleArrayFilterToggle('preferredContact', method)}
                        />
                        <label
                          htmlFor={`contact-${method}`}
                          className="text-sm capitalize cursor-pointer"
                        >
                          {method}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Registration Date */}
                <div>
                  <h4 className="font-medium mb-2">Registration Date</h4>
                  <div className="space-y-2">
                    <Input
                      type="date"
                      placeholder="From"
                      value={filters.registrationDate.from || ''}
                      onChange={(e) => handleFilterChange('registrationDate', {
                        ...filters.registrationDate,
                        from: e.target.value
                      })}
                    />
                    <Input
                      type="date"
                      placeholder="To"
                      value={filters.registrationDate.to || ''}
                      onChange={(e) => handleFilterChange('registrationDate', {
                        ...filters.registrationDate,
                        to: e.target.value
                      })}
                    />
                  </div>
                </div>

                {/* Total Jobs Range */}
                <div>
                  <h4 className="font-medium mb-2">Total Jobs</h4>
                  <div className="space-y-2">
                    <Input
                      type="number"
                      placeholder="Min jobs"
                      value={filters.totalJobs.min || ''}
                      onChange={(e) => handleFilterChange('totalJobs', {
                        ...filters.totalJobs,
                        min: e.target.value ? parseInt(e.target.value) : undefined
                      })}
                    />
                    <Input
                      type="number"
                      placeholder="Max jobs"
                      value={filters.totalJobs.max || ''}
                      onChange={(e) => handleFilterChange('totalJobs', {
                        ...filters.totalJobs,
                        max: e.target.value ? parseInt(e.target.value) : undefined
                      })}
                    />
                  </div>
                </div>

                {/* Revenue Range */}
                <div>
                  <h4 className="font-medium mb-2">Total Revenue</h4>
                  <div className="space-y-2">
                    <Input
                      type="number"
                      placeholder="Min revenue"
                      value={filters.totalRevenue.min || ''}
                      onChange={(e) => handleFilterChange('totalRevenue', {
                        ...filters.totalRevenue,
                        min: e.target.value ? parseFloat(e.target.value) : undefined
                      })}
                    />
                    <Input
                      type="number"
                      placeholder="Max revenue"
                      value={filters.totalRevenue.max || ''}
                      onChange={(e) => handleFilterChange('totalRevenue', {
                        ...filters.totalRevenue,
                        max: e.target.value ? parseFloat(e.target.value) : undefined
                      })}
                    />
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="font-medium">{filteredCustomers.length}</span> customers found
              </div>
              {activeFilterCount > 0 && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <X className="h-3 w-3 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportResults}>
                <Download className="h-4 w-4 mr-2" />
                Export ({filteredCustomers.length})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export type { AdvancedCustomerSearchProps, SearchFilters };
