import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  ChevronRight,
  ChevronLeft,
  X,
  Maximize2,
  Minimize2,
  Settings,
  Pin,
  PinOff,
  User,
  Car,
  Calendar,
  FileText,
  Clock,
  Phone,
  Mail,
  MessageSquare,
  Star,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores';
import { useSelectionStore } from '@/stores/selection-store';
import { JobDetailsView } from '@/components/dock/JobDetailsView';
import { VehicleDetailsView } from '@/components/dock/VehicleDetailsView';

export type DockPanelContext = 
  | 'job-details'
  | 'customer-details' 
  | 'vehicle-details'
  | 'call-details'
  | 'appointment-details'
  | 'empty';

export interface DockPanelState {
  isOpen: boolean;
  width: number;
  context: DockPanelContext;
  contextData: any;
  isPinned: boolean;
  isMaximized: boolean;
}

export interface RightDockPanelProps {
  className?: string;
}

const PANEL_WIDTHS = {
  collapsed: 0,
  normal: 400,
  wide: 600,
  maximized: 800,
};

const CONTEXT_CONFIGS = {
  'job-details': {
    title: 'Job Details',
    icon: Wrench,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  'customer-details': {
    title: 'Customer Details',
    icon: User,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  'vehicle-details': {
    title: 'Vehicle Details',
    icon: Car,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  'call-details': {
    title: 'Call Details',
    icon: Phone,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  'appointment-details': {
    title: 'Appointment Details',
    icon: Calendar,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
  },
  'empty': {
    title: 'Context Panel',
    icon: FileText,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
};

export function RightDockPanel({ className = '' }: RightDockPanelProps) {
  const [panelState, setPanelState] = useState<DockPanelState>({
    isOpen: false,
    width: PANEL_WIDTHS.normal,
    context: 'empty',
    contextData: null,
    isPinned: false,
    isMaximized: false,
  });

  const [isResizing, setIsResizing] = useState(false);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);

  const { addToast } = useUIStore();
  
  // Selection store integration
  const {
    dockContext,
    dockData,
    isDockOpen,
    currentSelection,
    setDockContext,
    toggleDock,
    openDock,
    closeDock,
  } = useSelectionStore();

  // Sync panel state with selection store
  useEffect(() => {
    setPanelState(prev => ({
      ...prev,
      isOpen: isDockOpen,
      context: dockContext,
      contextData: dockData,
    }));
  }, [dockContext, dockData, isDockOpen]);

  // Handle panel toggle
  const togglePanel = useCallback(() => {
    toggleDock();
  }, [toggleDock]);

  // Handle panel close
  const closePanel = useCallback(() => {
    closeDock();
  }, [closeDock]);

  // Handle context change
  const setContext = useCallback((context: DockPanelContext, contextData?: any) => {
    setDockContext(context, contextData);
  }, [setDockContext]);

  // Handle pin toggle
  const togglePin = useCallback(() => {
    setPanelState(prev => ({
      ...prev,
      isPinned: !prev.isPinned,
    }));
    
    addToast({
      type: 'success',
      title: panelState.isPinned ? 'Panel Unpinned' : 'Panel Pinned',
      message: panelState.isPinned ? 'Panel will auto-hide when not in use' : 'Panel will stay open',
      duration: 2000,
    });
  }, [panelState.isPinned, addToast]);

  // Handle maximize toggle
  const toggleMaximize = useCallback(() => {
    setPanelState(prev => ({
      ...prev,
      isMaximized: !prev.isMaximized,
      width: !prev.isMaximized ? PANEL_WIDTHS.maximized : PANEL_WIDTHS.normal,
    }));
  }, []);

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setResizeStartX(e.clientX);
    setResizeStartWidth(panelState.width);
  }, [panelState.width]);

  // Handle resize
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = resizeStartX - e.clientX; // Negative because panel is on the right
      const newWidth = Math.max(300, Math.min(1000, resizeStartWidth + deltaX));
      
      setPanelState(prev => ({
        ...prev,
        width: newWidth,
      }));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeStartX, resizeStartWidth]);

  // Auto-hide logic when not pinned
  useEffect(() => {
    if (panelState.isPinned || !panelState.isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      const panel = document.getElementById('right-dock-panel');
      
      if (panel && !panel.contains(target)) {
        // Add a small delay to prevent immediate closing when clicking to open
        setTimeout(() => {
          setPanelState(prev => ({
            ...prev,
            isOpen: false,
          }));
        }, 100);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [panelState.isPinned, panelState.isOpen]);

  const contextConfig = CONTEXT_CONFIGS[panelState.context];
  const ContextIcon = contextConfig.icon;

  return (
    <>
      {/* Panel Toggle Button (when closed) */}
      {!panelState.isOpen && (
        <div className="fixed right-4 top-1/2 transform -translate-y-1/2 z-40">
          <Button
            variant="outline"
            size="sm"
            onClick={togglePanel}
            className="h-12 w-8 p-0 shadow-lg border-2 bg-white hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Main Panel */}
      <div
        id="right-dock-panel"
        className={cn(
          'fixed right-0 top-0 h-full bg-white border-l shadow-xl z-30 transition-all duration-300 ease-in-out',
          panelState.isOpen ? 'translate-x-0' : 'translate-x-full',
          className
        )}
        style={{ width: panelState.isOpen ? panelState.width : 0 }}
      >
        {/* Resize Handle */}
        <div
          className={cn(
            'absolute left-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors',
            isResizing && 'bg-blue-500'
          )}
          onMouseDown={handleResizeStart}
        />

        {/* Panel Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', contextConfig.bgColor)}>
              <ContextIcon className={cn('h-5 w-5', contextConfig.color)} />
            </div>
            <div>
              <h2 className="font-semibold text-lg">{contextConfig.title}</h2>
              {panelState.contextData && (
                <p className="text-sm text-muted-foreground">
                  {panelState.contextData.title || panelState.contextData.name || 'Details'}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={togglePin}
              className="h-8 w-8 p-0"
              title={panelState.isPinned ? 'Unpin panel' : 'Pin panel'}
            >
              {panelState.isPinned ? (
                <PinOff className="h-4 w-4" />
              ) : (
                <Pin className="h-4 w-4" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMaximize}
              className="h-8 w-8 p-0"
              title={panelState.isMaximized ? 'Restore panel' : 'Maximize panel'}
            >
              {panelState.isMaximized ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={closePanel}
              className="h-8 w-8 p-0"
              title="Close panel"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Panel Content */}
        <ScrollArea className="flex-1 h-[calc(100vh-80px)]">
          <div className="p-4">
            {panelState.context === 'empty' ? (
              <EmptyState onContextSelect={setContext} />
            ) : (
              <ContextContent
                context={panelState.context}
                data={panelState.contextData}
                onContextChange={setContext}
              />
            )}
          </div>
        </ScrollArea>

        {/* Panel Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Width: {panelState.width}px</span>
            <div className="flex items-center gap-2">
              {panelState.isPinned && (
                <Badge variant="secondary" className="text-xs">
                  Pinned
                </Badge>
              )}
              {panelState.isMaximized && (
                <Badge variant="secondary" className="text-xs">
                  Maximized
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Overlay when panel is open and not pinned */}
      {panelState.isOpen && !panelState.isPinned && (
        <div 
          className="fixed inset-0 bg-black/20 z-20"
          onClick={closePanel}
        />
      )}
    </>
  );
}

// Empty state component
function EmptyState({ onContextSelect }: { onContextSelect: (context: DockPanelContext) => void }) {
  const contextOptions = [
    { key: 'job-details' as const, label: 'Job Details', description: 'View and manage job information' },
    { key: 'customer-details' as const, label: 'Customer Details', description: 'Customer information and history' },
    { key: 'vehicle-details' as const, label: 'Vehicle Details', description: 'Vehicle information and service history' },
    { key: 'call-details' as const, label: 'Call Details', description: 'Call information and outcomes' },
    { key: 'appointment-details' as const, label: 'Appointment Details', description: 'Appointment scheduling and details' },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Context Panel</h3>
        <p className="text-muted-foreground">
          Select a context below or click on items throughout the app to view details here.
        </p>
      </div>

      <div className="space-y-3">
        <h4 className="font-medium">Available Contexts</h4>
        {contextOptions.map((option) => {
          const config = CONTEXT_CONFIGS[option.key];
          const Icon = config.icon;

          return (
            <Card
              key={option.key}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onContextSelect(option.key)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-lg', config.bgColor)}>
                    <Icon className={cn('h-4 w-4', config.color)} />
                  </div>
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm text-muted-foreground">{option.description}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// Context content component
function ContextContent({ 
  context, 
  data, 
  onContextChange 
}: { 
  context: DockPanelContext;
  data: any;
  onContextChange: (context: DockPanelContext, data?: any) => void;
}) {
  switch (context) {
    case 'job-details':
      return <JobDetailsContent data={data} onContextChange={onContextChange} />;
    case 'customer-details':
      return <CustomerDetailsContent data={data} onContextChange={onContextChange} />;
    case 'vehicle-details':
      return <VehicleDetailsContent data={data} onContextChange={onContextChange} />;
    case 'call-details':
      return <CallDetailsContent data={data} onContextChange={onContextChange} />;
    case 'appointment-details':
      return <AppointmentDetailsContent data={data} onContextChange={onContextChange} />;
    default:
      return <div>Unknown context</div>;
  }
}

// Content components using dedicated views
function JobDetailsContent({ data, onContextChange }: any) {
  return (
    <JobDetailsView
      jobId={data?.id || 'job-001'}
      onJobUpdate={(job) => console.log('Job updated:', job)}
      onJobAction={(action, jobId) => console.log('Job action:', action, jobId)}
    />
  );
}

function VehicleDetailsContent({ data, onContextChange }: any) {
  return (
    <VehicleDetailsView
      vehicleId={data?.id || 'veh-001'}
      onVehicleUpdate={(vehicle) => console.log('Vehicle updated:', vehicle)}
      onVehicleAction={(action, vehicleId) => console.log('Vehicle action:', action, vehicleId)}
      onContextChange={onContextChange}
    />
  );
}

// Legacy placeholder content components
function LegacyJobDetailsContent({ data, onContextChange }: any) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Job Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Job ID</label>
                <div className="text-sm">JOB-001</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <Badge variant="outline" className="bg-blue-100 text-blue-800">
                  In Progress
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Priority</label>
                <Badge variant="outline" className="bg-orange-100 text-orange-800">
                  High
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Technician</label>
                <div className="text-sm">Mike Johnson</div>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Service Type</label>
              <div className="text-sm mt-1">Brake Pad Replacement</div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Description</label>
              <div className="text-sm mt-1">Replace front brake pads and inspect rotors. Customer reported grinding noise.</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Job Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div className="flex-1">
                <div className="text-sm font-medium">Job Created</div>
                <div className="text-xs text-muted-foreground">2 hours ago</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Activity className="h-4 w-4 text-blue-600" />
              <div className="flex-1">
                <div className="text-sm font-medium">Work Started</div>
                <div className="text-xs text-muted-foreground">1 hour ago</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-gray-400" />
              <div className="flex-1">
                <div className="text-sm font-medium">Estimated Completion</div>
                <div className="text-xs text-muted-foreground">In 1 hour</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CustomerDetailsContent({ data, onContextChange }: any) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Name</label>
              <div className="text-lg font-semibold">John Smith</div>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">(555) 123-4567</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">john@example.com</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">123 Main St, City, ST 12345</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-lg font-semibold">4.8</div>
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs text-muted-foreground">Rating</span>
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">12</div>
                <div className="text-xs text-muted-foreground">Jobs</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">$2,450</div>
                <div className="text-xs text-muted-foreground">Lifetime Value</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm">
              <Phone className="h-4 w-4 mr-2" />
              Call
            </Button>
            <Button variant="outline" size="sm">
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
            <Button variant="outline" size="sm">
              <MessageSquare className="h-4 w-4 mr-2" />
              SMS
            </Button>
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


function CallDetailsContent({ data, onContextChange }: any) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Call Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Call ID</label>
                <div className="text-sm">CALL-001</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Duration</label>
                <div className="text-sm">7 minutes</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Outcome</label>
                <Badge variant="outline" className="bg-blue-100 text-blue-800">
                  Scheduled
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Priority</label>
                <Badge variant="outline" className="bg-orange-100 text-orange-800">
                  High
                </Badge>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Reason</label>
              <div className="text-sm mt-1">Customer reported grinding noise when braking</div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Notes</label>
              <div className="text-sm mt-1">Customer wants appointment scheduled for next week. Mentioned noise is getting worse.</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AppointmentDetailsContent({ data, onContextChange }: any) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Appointment Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Date</label>
                <div className="text-sm">March 25, 2024</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Time</label>
                <div className="text-sm">10:00 AM - 12:00 PM</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Bay</label>
                <div className="text-sm">Bay 2</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Technician</label>
                <div className="text-sm">Mike Johnson</div>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Service</label>
              <div className="text-sm mt-1">Brake Pad Replacement</div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Estimated Cost</label>
              <div className="text-lg font-semibold mt-1">$350</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default RightDockPanel;
