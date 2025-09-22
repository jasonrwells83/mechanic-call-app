import React, { useState, useCallback, useMemo } from 'react';
import { Search, Filter, X, Calendar, User, Clock, AlertTriangle, FileText, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';

export interface CallSearchFilters {
  searchQuery: string;
  outcome: string[];
  priority: string[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  customer: string;
  callType: string[];
  followUpRequired: boolean | null;
  convertedToJob: boolean | null;
  tags: string[];
}

export interface CallSearchAndFilterProps {
  onFiltersChange: (filters: CallSearchFilters) => void;
  onClearFilters: () => void;
  totalResults?: number;
  isSearching?: boolean;
}

const DEFAULT_FILTERS: CallSearchFilters = {
  searchQuery: '',
  outcome: [],
  priority: [],
  dateRange: {
    start: null,
    end: null,
  },
  customer: '',
  callType: [],
  followUpRequired: null,
  convertedToJob: null,
  tags: [],
};

const CALL_OUTCOMES = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'scheduled', label: 'Scheduled', color: 'bg-blue-100 text-blue-800' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-100 text-gray-800' },
  { value: 'no-show', label: 'No Show', color: 'bg-red-100 text-red-800' },
  { value: 'follow-up', label: 'Follow-up Required', color: 'bg-orange-100 text-orange-800' },
];

const PRIORITY_LEVELS = [
  { value: 'low', label: 'Low', color: 'bg-green-100 text-green-800' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' },
];

const CALL_TYPES = [
  { value: 'service-request', label: 'Service Request' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'quote-request', label: 'Quote Request' },
  { value: 'follow-up', label: 'Follow-up' },
  { value: 'complaint', label: 'Complaint' },
  { value: 'inquiry', label: 'General Inquiry' },
  { value: 'appointment', label: 'Appointment Booking' },
  { value: 'cancellation', label: 'Cancellation' },
];

const QUICK_FILTERS = [
  { 
    label: 'Today\'s Calls', 
    icon: Calendar,
    filters: { 
      dateRange: { 
        start: new Date(), 
        end: new Date() 
      } 
    } 
  },
  { 
    label: 'Pending Follow-ups', 
    icon: Clock,
    filters: { 
      outcome: ['follow-up'], 
      followUpRequired: true 
    } 
  },
  { 
    label: 'High Priority', 
    icon: AlertTriangle,
    filters: { 
      priority: ['high', 'urgent'] 
    } 
  },
  { 
    label: 'Not Converted', 
    icon: FileText,
    filters: { 
      convertedToJob: false,
      outcome: ['pending', 'follow-up'] 
    } 
  },
  { 
    label: 'Scheduled Jobs', 
    icon: Star,
    filters: { 
      outcome: ['scheduled'],
      convertedToJob: true 
    } 
  },
];

export function CallSearchAndFilter({
  onFiltersChange,
  onClearFilters,
  totalResults = 0,
  isSearching = false,
}: CallSearchAndFilterProps) {
  const [filters, setFilters] = useState<CallSearchFilters>(DEFAULT_FILTERS);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.searchQuery) count++;
    if (filters.outcome.length > 0) count++;
    if (filters.priority.length > 0) count++;
    if (filters.dateRange.start || filters.dateRange.end) count++;
    if (filters.customer) count++;
    if (filters.callType.length > 0) count++;
    if (filters.followUpRequired !== null) count++;
    if (filters.convertedToJob !== null) count++;
    if (filters.tags.length > 0) count++;
    return count;
  }, [filters]);

  const handleFilterChange = useCallback((newFilters: Partial<CallSearchFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  }, [filters, onFiltersChange]);

  const handleClearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    onClearFilters();
  }, [onClearFilters]);

  const handleQuickFilter = useCallback((quickFilter: typeof QUICK_FILTERS[0]) => {
    const updatedFilters = { ...filters, ...quickFilter.filters };
    setFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  }, [filters, onFiltersChange]);

  const handleArrayFilterChange = useCallback((
    key: keyof CallSearchFilters,
    value: string,
    checked: boolean
  ) => {
    const currentArray = filters[key] as string[];
    const newArray = checked
      ? [...currentArray, value]
      : currentArray.filter(item => item !== value);
    
    handleFilterChange({ [key]: newArray });
  }, [filters, handleFilterChange]);

  return (
    <div className="space-y-4">
      {/* Search Bar and Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Main Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search calls by customer, description, notes, or phone number..."
            value={filters.searchQuery}
            onChange={(e) => handleFilterChange({ searchQuery: e.target.value })}
            className="pl-10 pr-4"
          />
          {filters.searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFilterChange({ searchQuery: '' })}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Filter Toggle Button */}
        <Button
          variant="outline"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFilterCount}
            </Badge>
          )}
          {showAdvancedFilters ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>

        {/* Clear Filters Button */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            onClick={handleClearFilters}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Clear All
          </Button>
        )}
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {QUICK_FILTERS.map((quickFilter) => {
          const Icon = quickFilter.icon;
          return (
            <Button
              key={quickFilter.label}
              variant="outline"
              size="sm"
              onClick={() => handleQuickFilter(quickFilter)}
              className="flex items-center gap-2"
            >
              <Icon className="h-3 w-3" />
              {quickFilter.label}
            </Button>
          );
        })}
      </div>

      {/* Advanced Filters */}
      <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
        <CollapsibleContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4 border rounded-lg bg-gray-50">
            
            {/* Call Outcome Filter */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Call Outcome</Label>
              <div className="space-y-2">
                {CALL_OUTCOMES.map((outcome) => (
                  <div key={outcome.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`outcome-${outcome.value}`}
                      checked={filters.outcome.includes(outcome.value)}
                      onCheckedChange={(checked) =>
                        handleArrayFilterChange('outcome', outcome.value, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={`outcome-${outcome.value}`}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <span className={`px-2 py-1 rounded-full text-xs ${outcome.color}`}>
                        {outcome.label}
                      </span>
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Priority Filter */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Priority Level</Label>
              <div className="space-y-2">
                {PRIORITY_LEVELS.map((priority) => (
                  <div key={priority.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`priority-${priority.value}`}
                      checked={filters.priority.includes(priority.value)}
                      onCheckedChange={(checked) =>
                        handleArrayFilterChange('priority', priority.value, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={`priority-${priority.value}`}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <span className={`px-2 py-1 rounded-full text-xs ${priority.color}`}>
                        {priority.label}
                      </span>
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Call Type Filter */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Call Type</Label>
              <div className="space-y-2">
                {CALL_TYPES.map((type) => (
                  <div key={type.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`type-${type.value}`}
                      checked={filters.callType.includes(type.value)}
                      onCheckedChange={(checked) =>
                        handleArrayFilterChange('callType', type.value, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={`type-${type.value}`}
                      className="text-sm cursor-pointer"
                    >
                      {type.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Date Range</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Popover open={showDatePicker === 'start'} onOpenChange={(open) => setShowDatePicker(open ? 'start' : null)}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-left font-normal"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {filters.dateRange.start ? format(filters.dateRange.start, 'MMM dd, yyyy') : 'Start Date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={filters.dateRange.start || undefined}
                        onSelect={(date) => {
                          handleFilterChange({
                            dateRange: { ...filters.dateRange, start: date || null }
                          });
                          setShowDatePicker(null);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <Popover open={showDatePicker === 'end'} onOpenChange={(open) => setShowDatePicker(open ? 'end' : null)}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-left font-normal"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {filters.dateRange.end ? format(filters.dateRange.end, 'MMM dd, yyyy') : 'End Date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={filters.dateRange.end || undefined}
                        onSelect={(date) => {
                          handleFilterChange({
                            dateRange: { ...filters.dateRange, end: date || null }
                          });
                          setShowDatePicker(null);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                {(filters.dateRange.start || filters.dateRange.end) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFilterChange({ dateRange: { start: null, end: null } })}
                    className="w-full text-xs"
                  >
                    Clear Date Range
                  </Button>
                )}
              </div>
            </div>

            {/* Customer Search */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Customer</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by customer name..."
                  value={filters.customer}
                  onChange={(e) => handleFilterChange({ customer: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Additional Filters */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Additional Options</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="follow-up-required"
                    checked={filters.followUpRequired === true}
                    onCheckedChange={(checked) =>
                      handleFilterChange({ followUpRequired: checked ? true : null })
                    }
                  />
                  <Label htmlFor="follow-up-required" className="text-sm cursor-pointer">
                    Requires Follow-up
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="converted-to-job"
                    checked={filters.convertedToJob === true}
                    onCheckedChange={(checked) =>
                      handleFilterChange({ convertedToJob: checked ? true : null })
                    }
                  />
                  <Label htmlFor="converted-to-job" className="text-sm cursor-pointer">
                    Converted to Job
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="not-converted"
                    checked={filters.convertedToJob === false}
                    onCheckedChange={(checked) =>
                      handleFilterChange({ convertedToJob: checked ? false : null })
                    }
                  />
                  <Label htmlFor="not-converted" className="text-sm cursor-pointer">
                    Not Converted
                  </Label>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center gap-2">
          {isSearching ? (
            <span>Searching...</span>
          ) : (
            <span>
              {totalResults} call{totalResults !== 1 ? 's' : ''} found
              {activeFilterCount > 0 && ` with ${activeFilterCount} filter${activeFilterCount !== 1 ? 's' : ''} applied`}
            </span>
          )}
        </div>
        
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2">
            <span>Active filters:</span>
            <div className="flex gap-1">
              {filters.searchQuery && <Badge variant="secondary">Search</Badge>}
              {filters.outcome.length > 0 && <Badge variant="secondary">Outcome ({filters.outcome.length})</Badge>}
              {filters.priority.length > 0 && <Badge variant="secondary">Priority ({filters.priority.length})</Badge>}
              {(filters.dateRange.start || filters.dateRange.end) && <Badge variant="secondary">Date Range</Badge>}
              {filters.customer && <Badge variant="secondary">Customer</Badge>}
              {filters.callType.length > 0 && <Badge variant="secondary">Type ({filters.callType.length})</Badge>}
              {filters.followUpRequired !== null && <Badge variant="secondary">Follow-up</Badge>}
              {filters.convertedToJob !== null && <Badge variant="secondary">Conversion</Badge>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
