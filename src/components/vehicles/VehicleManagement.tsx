// Vehicle Management Component
// Comprehensive vehicle management for customer detail view

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  Car,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Wrench,
  Calendar,
  Gauge,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
  History,
  MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVehicles, useDeleteVehicle } from '@/hooks/use-vehicles';
import { useJobs } from '@/hooks/use-jobs';
import { useUIStore } from '@/stores';
import type { Vehicle, Customer } from '@/types/database';

interface VehicleManagementProps {
  customer: Customer;
  onAddVehicle?: () => void;
  onEditVehicle?: (vehicle: Vehicle) => void;
  onCreateJob?: (vehicleId: string) => void;
  className?: string;
}

export function VehicleManagement({
  customer,
  onAddVehicle,
  onEditVehicle,
  onCreateJob,
  className = '',
}: VehicleManagementProps) {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Hooks
  const { data: vehiclesResponse, isLoading } = useVehicles({ customerId: customer.id });
  const { data: jobsResponse } = useJobs({ customerId: customer.id });
  const { mutateAsync: deleteVehicle } = useDeleteVehicle();
  const { addToast } = useUIStore();

  const vehicles = vehiclesResponse?.data || [];
  const jobs = jobsResponse?.data || [];

  // Calculate vehicle statistics
  const vehicleStats = vehicles.map(vehicle => {
    const vehicleJobs = jobs.filter(job => job.vehicleId === vehicle.id);
    const completedJobs = vehicleJobs.filter(job => job.status === 'completed');
    const activeJobs = vehicleJobs.filter(job => 
      job.status === 'scheduled' || job.status === 'in-bay' || job.status === 'waiting-parts'
    );
    
    const lastServiceDate = completedJobs.length > 0 
      ? new Date(Math.max(...completedJobs.map(job => new Date(job.createdAt).getTime())))
      : null;
    
    const totalRevenue = completedJobs.reduce((sum, job) => sum + (job.estHours * 100), 0);
    
    // Determine vehicle status
    let status: 'active' | 'needs-service' | 'inactive' = 'inactive';
    if (activeJobs.length > 0) {
      status = 'active';
    } else if (lastServiceDate) {
      const daysSinceService = (Date.now() - lastServiceDate.getTime()) / (1000 * 60 * 60 * 24);
      status = daysSinceService > 180 ? 'needs-service' : 'inactive';
    }
    
    return {
      ...vehicle,
      totalJobs: vehicleJobs.length,
      completedJobs: completedJobs.length,
      activeJobs: activeJobs.length,
      lastServiceDate,
      totalRevenue,
      status,
    };
  });

  const handleVehicleAction = async (vehicle: Vehicle, action: string) => {
    switch (action) {
      case 'edit':
        onEditVehicle?.(vehicle);
        break;
      case 'create-job':
        onCreateJob?.(vehicle.id);
        break;
      case 'delete':
        if (confirm(`Are you sure you want to delete the ${vehicle.year} ${vehicle.make} ${vehicle.model}?`)) {
          try {
            await deleteVehicle(vehicle.id);
            addToast({
              type: 'success',
              title: 'Vehicle Deleted',
              message: `${vehicle.year} ${vehicle.make} ${vehicle.model} has been removed`,
              duration: 3000,
            });
          } catch (error) {
            addToast({
              type: 'error',
              title: 'Failed to Delete Vehicle',
              message: error instanceof Error ? error.message : 'An error occurred',
              duration: 5000,
            });
          }
        }
        break;
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      active: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
      'needs-service': { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: AlertTriangle },
      inactive: { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: Clock },
    };
    
    const statusConfig = config[status as keyof typeof config] || config.inactive;
    const Icon = statusConfig.icon;
    
    return (
      <Badge className={cn('text-xs', statusConfig.color)}>
        <Icon className="h-2 w-2 mr-1" />
        {status === 'needs-service' ? 'Needs Service' : status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getVehicleIcon = (make: string) => {
    // Simple vehicle icon based on make - could be expanded with actual brand icons
    return make.charAt(0).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Summary */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Vehicle Management</h3>
          <p className="text-sm text-muted-foreground">
            {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <Button onClick={onAddVehicle}>
          <Plus className="h-4 w-4 mr-2" />
          Add Vehicle
        </Button>
      </div>

      {/* Vehicle Grid */}
      {vehicles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicleStats.map((vehicle) => (
            <Card 
              key={vehicle.id}
              className={cn(
                'transition-all duration-200 hover:shadow-md cursor-pointer',
                selectedVehicle?.id === vehicle.id && 'ring-2 ring-primary/50'
              )}
              onClick={() => setSelectedVehicle(selectedVehicle?.id === vehicle.id ? null : vehicle)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {getVehicleIcon(vehicle.make)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">
                        {vehicle.year} {vehicle.make}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{vehicle.model}</p>
                    </div>
                  </div>
                  
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
                      <DropdownMenuItem onClick={() => handleVehicleAction(vehicle, 'create-job')}>
                        <Wrench className="mr-2 h-4 w-4" />
                        Create Job
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleVehicleAction(vehicle, 'edit')}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Vehicle
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleVehicleAction(vehicle, 'delete')}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {/* Vehicle Status */}
                <div className="flex items-center justify-between">
                  {getStatusBadge(vehicle.status)}
                  {vehicle.activeJobs > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {vehicle.activeJobs} active job{vehicle.activeJobs !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>

                {/* Vehicle Details */}
                <div className="space-y-2">
                  {vehicle.licensePlate && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="font-mono">{vehicle.licensePlate}</span>
                    </div>
                  )}
                  
                  {vehicle.mileage && (
                    <div className="flex items-center gap-2 text-sm">
                      <Gauge className="h-3 w-3 text-muted-foreground" />
                      <span>{vehicle.mileage.toLocaleString()} miles</span>
                    </div>
                  )}
                  
                  {vehicle.lastServiceDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span>Last service: {vehicle.lastServiceDate.toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Service Statistics */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="text-center">
                    <div className="text-lg font-semibold">{vehicle.totalJobs}</div>
                    <div className="text-xs text-muted-foreground">Total Jobs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">{vehicle.completedJobs}</div>
                    <div className="text-xs text-muted-foreground">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">${vehicle.totalRevenue.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Revenue</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Empty State */
        <Card>
          <CardContent className="text-center py-12">
            <Car className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No vehicles registered</h3>
            <p className="text-muted-foreground mb-4">
              Add vehicles to track service history and create jobs
            </p>
            <Button onClick={onAddVehicle}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Vehicle
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Selected Vehicle Details */}
      {selectedVehicle && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Vehicle Information */}
              <div>
                <h4 className="font-medium mb-3">Vehicle Information</h4>
                <div className="space-y-2 text-sm">
                  {selectedVehicle.vin && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">VIN:</span>
                      <span className="font-mono">{selectedVehicle.vin}</span>
                    </div>
                  )}
                  {selectedVehicle.licensePlate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">License Plate:</span>
                      <span className="font-mono">{selectedVehicle.licensePlate}</span>
                    </div>
                  )}
                  {selectedVehicle.mileage && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mileage:</span>
                      <span>{selectedVehicle.mileage.toLocaleString()} miles</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Added:</span>
                    <span>{new Date(selectedVehicle.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Service Summary */}
              <div>
                <h4 className="font-medium mb-3">Service Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Jobs:</span>
                    <span className="font-medium">{selectedVehicle.totalJobs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Completed Jobs:</span>
                    <span className="font-medium">{selectedVehicle.completedJobs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Active Jobs:</span>
                    <span className="font-medium">{selectedVehicle.activeJobs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Revenue:</span>
                    <span className="font-medium">${selectedVehicle.totalRevenue.toLocaleString()}</span>
                  </div>
                  {selectedVehicle.lastServiceDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Service:</span>
                      <span>{selectedVehicle.lastServiceDate.toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 mt-6 pt-4 border-t">
              <Button onClick={() => handleVehicleAction(selectedVehicle, 'create-job')}>
                <Wrench className="h-4 w-4 mr-2" />
                Create Job
              </Button>
              <Button variant="outline" onClick={() => handleVehicleAction(selectedVehicle, 'edit')}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Vehicle
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setSelectedVehicle(null)}
                className="ml-auto"
              >
                Close Details
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export type { VehicleManagementProps };
