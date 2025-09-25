import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Car, User, Wrench } from 'lucide-react';

interface RightDockProps {
  onToggleCollapse: () => void;
}

export function RightDock({ onToggleCollapse }: RightDockProps) {
  // Mock data for demonstration
  const selectedItem = {
    type: 'job',
    data: {
      id: 'JOB-001',
      title: 'Oil Change & Inspection',
      status: 'in-bay',
      customer: 'John Smith',
      vehicle: '2020 Honda Civic',
      bay: 'Bay 1',
      estimatedHours: 1.5,
      notes: 'Customer requested full synthetic oil. Check brake pads during inspection.'
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'scheduled': { variant: 'secondary' as const, className: 'bg-status-scheduled border-status-scheduled-border' },
      'in-bay': { variant: 'default' as const, className: 'bg-status-in-bay' },
      'waiting-parts': { variant: 'outline' as const, className: 'bg-status-waiting-parts border-status-waiting-parts-border status-waiting-parts' },
      'completed': { variant: 'secondary' as const, className: 'bg-status-completed border-status-completed-border' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.scheduled;
    
    return (
      <Badge variant={config.variant} className={config.className}>
        {status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  return (
    <div className="flex flex-col h-full border-l">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-sm">Context Panel</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {selectedItem ? (
            <>
              {/* Job Details */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{selectedItem.data.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {selectedItem.data.id}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-muted-foreground" />
                      {getStatusBadge(selectedItem.data.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Bay:</span>
                      <p className="font-medium">{selectedItem.data.bay}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Est. Hours:</span>
                      <p className="font-medium">{selectedItem.data.estimatedHours}h</p>
                    </div>
                  </div>
                  
                  {selectedItem.data.notes && (
                    <div>
                      <span className="text-muted-foreground text-sm">Notes:</span>
                      <p className="text-sm mt-1 p-2 bg-muted/50 rounded text-muted-foreground">
                        {selectedItem.data.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Separator />

              {/* Customer Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Customer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">{selectedItem.data.customer}</p>
                    <p className="text-muted-foreground">Regular customer</p>
                    <Button variant="outline" size="sm" className="w-full">
                      View Full Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Vehicle Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    Vehicle
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">{selectedItem.data.vehicle}</p>
                    <p className="text-muted-foreground">Last service: 3 months ago</p>
                    <Button variant="outline" size="sm" className="w-full">
                      View Service History
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Select a job, customer, or vehicle to view details</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}











