import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  ChevronRight,
  ChevronLeft,
  X,
  Maximize2,
  Minimize2,
  User,
  Car,
  Calendar,
  FileText,
  Phone,
  Mail,
  MessageSquare,
  Wrench,
  LayoutGrid,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSelectionStore } from '@/stores/selection-store';
import type { DockPayload, SelectionItem, SelectionType } from '@/stores/selection-store';
import { JobDetailsView } from '@/components/dock/JobDetailsView';
import type { JobNotePayload } from '@/components/dock/JobDetailsView';
import { VehicleDetailsView } from '@/components/dock/VehicleDetailsView';
import { CustomerDetailsView } from '@/components/dock/CustomerDetailsView';
import { CallDetailsView } from '@/components/dock/CallDetailsView';
import { AppointmentDetailsView } from '@/components/dock/AppointmentDetailsView';
import {
  useJob,
  useVehicle,
  useCustomer,
  useCall,
  useAppointment,
  useUpdateJob,
  usePrefetchJob,
  usePrefetchVehicle,
  usePrefetchCustomer,
  usePrefetchCall,
  usePrefetchAppointment,
} from '@/hooks';
import type {
  AppointmentWithJob,
  Call,
  CustomerWithVehicles,
  JobWithRelations,
  JobNote,
  VehicleWithHistory,
} from '@/types';

export type DockPanelContext = 
  | 'job-details'
  | 'customer-details' 
  | 'vehicle-details'
  | 'call-details'
  | 'appointment-details'
  | 'menu'
  | 'empty';

interface PanelLayoutState {
  width: number;
  isPinned: boolean;
  isMaximized: boolean;
}

interface ContextViewState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  onRetry?: () => Promise<unknown>;
  onRefresh?: () => Promise<unknown>;
}

interface DockContextData {
  job: ContextViewState<JobWithRelations>;
  customer: ContextViewState<CustomerWithVehicles>;
  vehicle: ContextViewState<VehicleWithHistory>;
  call: ContextViewState<Call>;
  appointment: ContextViewState<AppointmentWithJob>;
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
  'menu': {
    title: 'Context Panel',
    icon: FileText,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
};

export function RightDockPanel({ className = '' }: RightDockPanelProps) {
  const [panelLayout, setPanelLayout] = useState<PanelLayoutState>({
    width: PANEL_WIDTHS.normal,
    isPinned: false,
    isMaximized: false,
  });

  const [isResizing, setIsResizing] = useState(false);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(PANEL_WIDTHS.normal);

  const isDockOpen = useSelectionStore((state) => state.isDockOpen);
  const dockContext = useSelectionStore((state) => state.dockContext);
  const dockData = useSelectionStore((state) => state.dockData);
  const dockView = useSelectionStore((state) => state.dockView);
  const dockPayload = useSelectionStore((state) => state.dockPayload);
  const toggleDock = useSelectionStore((state) => state.toggleDock);
  const closeDock = useSelectionStore((state) => state.closeDock);
  const setDockContext = useSelectionStore((state) => state.setDockContext);
  const showMenu = useSelectionStore((state) => state.showMenu);
  const recentItems = useSelectionStore((state) => state.recentItems);
  const selectItem = useSelectionStore((state) => state.selectItem);

  const prefetchJob = usePrefetchJob();
  const prefetchCustomer = usePrefetchCustomer();
  const prefetchVehicle = usePrefetchVehicle();
  const prefetchCall = usePrefetchCall();
  const prefetchAppointment = usePrefetchAppointment();

  const handleRecentHover = useCallback(
    (item: SelectionItem) => {
      if (!item?.id) {
        return;
      }
      switch (item.type) {
        case 'job':
          prefetchJob(item.id);
          break;
        case 'customer':
          prefetchCustomer(item.id);
          break;
        case 'vehicle':
          prefetchVehicle(item.id);
          break;
        case 'call':
          prefetchCall(item.id);
          break;
        case 'appointment':
          prefetchAppointment(item.id);
          break;
        default:
          break;
      }
    },
    [prefetchJob, prefetchCustomer, prefetchVehicle, prefetchCall, prefetchAppointment]
  );

  const getFallbackData = useCallback(
    <T,>(type: SelectionType, contextKey: DockPanelContext): T | null => {
      if (dockPayload?.entityType === type) {
        return ((dockPayload.initialData ?? dockData) as T | null) ?? null;
      }
      if (!dockPayload && dockContext === contextKey && dockData) {
        return (dockData as T | null) ?? null;
      }
      return null;
    },
    [dockPayload, dockContext, dockData]
  );

  const entityId = dockPayload?.entityId ?? '';
  const isContextView = dockView === 'context';

  const jobEnabled = isContextView && dockContext === 'job-details' && dockPayload?.entityType === 'job' && !!entityId;
  const customerEnabled =
    isContextView && dockContext === 'customer-details' && dockPayload?.entityType === 'customer' && !!entityId;
  const vehicleEnabled =
    isContextView && dockContext === 'vehicle-details' && dockPayload?.entityType === 'vehicle' && !!entityId;
  const callEnabled = isContextView && dockContext === 'call-details' && dockPayload?.entityType === 'call' && !!entityId;
  const appointmentEnabled =
    isContextView && dockContext === 'appointment-details' && dockPayload?.entityType === 'appointment' && !!entityId;

  const jobQuery = useJob(entityId, jobEnabled);
  const customerQuery = useCustomer(entityId, customerEnabled);
  const vehicleQuery = useVehicle(entityId, vehicleEnabled);
  const callQuery = useCall(entityId, callEnabled);
  const appointmentQuery = useAppointment(entityId, appointmentEnabled);

  const jobFallback = getFallbackData<JobWithRelations>('job', 'job-details');
  const customerFallback = getFallbackData<CustomerWithVehicles>('customer', 'customer-details');
  const vehicleFallback = getFallbackData<VehicleWithHistory>('vehicle', 'vehicle-details');
  const callFallback = getFallbackData<Call>('call', 'call-details');
  const appointmentFallback = getFallbackData<AppointmentWithJob>('appointment', 'appointment-details');

  const jobData = jobEnabled
    ? (jobQuery.data?.data as JobWithRelations | undefined) ?? jobFallback
    : jobFallback;
  const customerData = customerEnabled
    ? (customerQuery.data?.data as CustomerWithVehicles | undefined) ?? customerFallback
    : customerFallback;
  const vehicleData = vehicleEnabled
    ? (vehicleQuery.data?.data as VehicleWithHistory | undefined) ?? vehicleFallback
    : vehicleFallback;
  const callData = callEnabled ? (callQuery.data?.data as Call | undefined) ?? callFallback : callFallback;
  const appointmentData = appointmentEnabled
    ? (appointmentQuery.data?.data as AppointmentWithJob | undefined) ?? appointmentFallback
    : appointmentFallback;

  const jobErrorMessage = getQueryErrorMessage(jobQuery.data?.error, jobQuery.error);
  const customerErrorMessage = getQueryErrorMessage(customerQuery.data?.error, customerQuery.error);
  const vehicleErrorMessage = getQueryErrorMessage(vehicleQuery.data?.error, vehicleQuery.error);
  const callErrorMessage = getQueryErrorMessage(callQuery.data?.error, callQuery.error);
  const appointmentErrorMessage = getQueryErrorMessage(appointmentQuery.data?.error, appointmentQuery.error);

  const contextData: DockContextData = {
    job: {
      data: jobData ?? null,
      isLoading: jobEnabled && !jobData && jobQuery.isLoading,
      error: !jobData ? jobErrorMessage : null,
      onRetry: jobEnabled ? () => jobQuery.refetch() : undefined,
      onRefresh: jobEnabled ? () => jobQuery.refetch() : undefined,
    },
    customer: {
      data: customerData ?? null,
      isLoading: customerEnabled && !customerData && customerQuery.isLoading,
      error: !customerData ? customerErrorMessage : null,
      onRetry: customerEnabled ? () => customerQuery.refetch() : undefined,
      onRefresh: customerEnabled ? () => customerQuery.refetch() : undefined,
    },
    vehicle: {
      data: vehicleData ?? null,
      isLoading: vehicleEnabled && !vehicleData && vehicleQuery.isLoading,
      error: !vehicleData ? vehicleErrorMessage : null,
      onRetry: vehicleEnabled ? () => vehicleQuery.refetch() : undefined,
      onRefresh: vehicleEnabled ? () => vehicleQuery.refetch() : undefined,
    },
    call: {
      data: callData ?? null,
      isLoading: callEnabled && !callData && callQuery.isLoading,
      error: !callData ? callErrorMessage : null,
      onRetry: callEnabled ? () => callQuery.refetch() : undefined,
      onRefresh: callEnabled ? () => callQuery.refetch() : undefined,
    },
    appointment: {
      data: appointmentData ?? null,
      isLoading: appointmentEnabled && !appointmentData && appointmentQuery.isLoading,
      error: !appointmentData ? appointmentErrorMessage : null,
      onRetry: appointmentEnabled ? () => appointmentQuery.refetch() : undefined,
      onRefresh: appointmentEnabled ? () => appointmentQuery.refetch() : undefined,
    },
  };

  const togglePanel = useCallback(() => {
    toggleDock();
  }, [toggleDock]);

  const closePanel = useCallback(() => {
    closeDock();
  }, [closeDock]);

  const handleMenuClick = useCallback(() => {
    showMenu();
  }, [showMenu]);

  const setContext = useCallback((context: DockPanelContext) => {
    setDockContext(context);
  }, [setDockContext]);

  const toggleMaximize = useCallback(() => {
    setPanelLayout((prev) => ({
      ...prev,
      isMaximized: !prev.isMaximized,
      width: !prev.isMaximized ? PANEL_WIDTHS.maximized : PANEL_WIDTHS.normal,
    }));
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setResizeStartX(e.clientX);
    setResizeStartWidth(panelLayout.width);
  }, [panelLayout.width]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = resizeStartX - e.clientX; // Negative because panel is on the right
      const newWidth = Math.max(300, Math.min(1000, resizeStartWidth + deltaX));

      setPanelLayout((prev) => ({
        ...prev,
        width: newWidth,
        isMaximized: newWidth >= PANEL_WIDTHS.maximized ? prev.isMaximized : false,
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
    if (panelLayout.isPinned || !isDockOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      const panel = document.getElementById('right-dock-panel');

      if (panel && !panel.contains(target)) {
        setTimeout(() => {
          closeDock();
        }, 100);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [panelLayout.isPinned, isDockOpen, closeDock]);
  const contextConfig = CONTEXT_CONFIGS[dockContext] ?? CONTEXT_CONFIGS['menu'];
  const ContextIcon = contextConfig.icon;
  const shouldShowMenu = dockView === 'menu' || dockContext === 'menu' || dockContext === 'empty';
  const hasContextData = Boolean(dockData);

  return (
    <>
      {/* Panel Toggle Button (when closed) */}
      {!isDockOpen && (
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
          isDockOpen ? 'translate-x-0' : 'translate-x-full',
          className
        )}
        style={{ width: isDockOpen ? panelLayout.width : 0 }}
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
              {hasContextData && (
                <p className="text-sm text-muted-foreground">
                  {dockData.title || dockData.name || 'Details'}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMenuClick}
              className="h-8 px-3"
              title="Open dock menu"
            >
              <LayoutGrid className="mr-2 h-4 w-4" aria-hidden="true" />
              Menu
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMaximize}
              className="h-8 w-8 p-0"
              title={panelLayout.isMaximized ? 'Restore panel' : 'Maximize panel'}
            >
              {panelLayout.isMaximized ? (
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
            {shouldShowMenu ? (
              <MenuView
                onContextSelect={setContext}
                recentItems={recentItems}
                onRecentSelect={selectItem}
                onRecentHover={handleRecentHover}
              />
            ) : (
              <ContextContent
                context={dockContext}
                payload={dockPayload}
                contextData={contextData}
              />
            )}
          </div>
        </ScrollArea>

        {/* Panel Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Width: {panelLayout.width}px</span>
            <div className="flex items-center gap-2">
              {panelLayout.isMaximized && (
                <Badge variant="secondary" className="text-xs">
                  Maximized
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Overlay when panel is open and not pinned */}
      {isDockOpen && !panelLayout.isPinned && (
        <div 
          className="fixed inset-0 bg-black/20 z-20"
          onClick={closePanel}
        />
      )}
    </>
  );
}

// Menu view component
function MenuView({
  onContextSelect,
  recentItems,
  onRecentSelect,
  onRecentHover,
}: {
  onContextSelect: (context: DockPanelContext) => void;
  recentItems: SelectionItem[];
  onRecentSelect: (item: Omit<SelectionItem, 'timestamp'>) => void;
  onRecentHover?: (item: SelectionItem) => void;
}) {
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

      <div className="space-y-3">
        <h4 className="font-medium">Recent Activity</h4>
        {recentItems.length === 0 ? (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">No recent selections yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentItems.slice(0, 5).map((item) => (
              <Card
                key={`${item.type}-${item.id}`}
                className="cursor-pointer hover:shadow-sm transition-shadow"
                onClick={() =>
                  onRecentSelect({
                    id: item.id,
                    type: item.type,
                    title: item.title,
                    subtitle: item.subtitle,
                    data: item.data,
                  })
                }
                onMouseEnter={() => onRecentHover?.(item)}
                onFocus={() => onRecentHover?.(item)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{item.title}</div>
                    {item.subtitle && (
                      <div className="text-xs text-muted-foreground">{item.subtitle}</div>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

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

// Context content component
function ContextContent({
  context,
  payload,
  contextData,
}: {
  context: DockPanelContext;
  payload: DockPayload | null;
  contextData: DockContextData;
}) {
  switch (context) {
    case 'job-details':
      return <JobDetailsContent payload={payload} state={contextData.job} />;
    case 'customer-details':
      return <CustomerDetailsContent payload={payload} state={contextData.customer} />;
    case 'vehicle-details':
      return <VehicleDetailsContent payload={payload} state={contextData.vehicle} />;
    case 'call-details':
      return <CallDetailsContent payload={payload} state={contextData.call} />;
    case 'appointment-details':
      return <AppointmentDetailsContent payload={payload} state={contextData.appointment} />;
    default:
      return <div>Unknown context</div>;
  }
}

// Content components using dedicated views
function JobDetailsContent({
  payload,
  state,
}: {
  payload: DockPayload | null;
  state: ContextViewState<JobWithRelations>;
}) {
  const jobId = payload?.entityId ?? state.data?.id ?? 'job-unknown';
  const { mutateAsync: updateJobMutation } = useUpdateJob();

  const handleAddNote = useCallback(
    async (notePayload: JobNotePayload, id: string) => {
      if (!state.data) {
        return;
      }

      const existingNotes = state.data.noteEntries ?? [];
      const tempId =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `temp-note-${Date.now()}`;

      const optimisticNote: JobNote = {
        id: tempId,
        author: 'Shop Team',
        content: notePayload.content,
        createdAt: new Date().toISOString(),
        type: notePayload.type ?? 'general',
        isImportant: notePayload.isImportant ?? false,
      };

      await updateJobMutation({
        id,
        data: {
          noteEntries: [optimisticNote, ...existingNotes],
        },
      });
    },
    [state.data, updateJobMutation],
  );
  return (
    <JobDetailsView
      jobId={jobId}
      job={state.data}
      isLoading={state.isLoading}
      error={state.error}
      onRetry={state.onRetry}
      onRefresh={state.onRefresh}
      onJobAction={(action, id) => console.log('Job action:', action, id)}
      onAddNote={state.data ? handleAddNote : undefined}
      onInvoiceChange={(invoice, id) => console.log('Invoice updated:', invoice, id)}
    />
  );
}

function VehicleDetailsContent({
  payload,
  state,
}: {
  payload: DockPayload | null;
  state: ContextViewState<VehicleWithHistory>;
}) {
  const vehicleId = payload?.entityId ?? state.data?.id ?? 'vehicle-unknown';
  return (
    <VehicleDetailsView
      vehicleId={vehicleId}
      vehicle={state.data ?? null}
      isLoading={state.isLoading}
      error={state.error}
      onRetry={state.onRetry}
      onRefresh={state.onRefresh}
      onAddNote={(note, id) => console.log('Vehicle note submitted:', note, id)}
    />
  );
}

function CustomerDetailsContent({
  payload,
  state,
}: {
  payload: DockPayload | null;
  state: ContextViewState<CustomerWithVehicles>;
}) {
  const customerId = payload?.entityId ?? state.data?.id ?? 'customer-unknown';
  return (
    <CustomerDetailsView
      customerId={customerId}
      customer={state.data ?? null}
      isLoading={state.isLoading}
      error={state.error}
      onRetry={state.onRetry}
      onRefresh={state.onRefresh}
    />
  );
}

function CallDetailsContent({
  payload,
  state,
}: {
  payload: DockPayload | null;
  state: ContextViewState<Call>;
}) {
  const callId = payload?.entityId ?? state.data?.id ?? 'call-unknown';
  return (
    <CallDetailsView
      callId={callId}
      call={state.data ?? null}
      isLoading={state.isLoading}
      error={state.error}
      onRetry={state.onRetry}
      onRefresh={state.onRefresh}
      onScheduleFollowUp={(id) => console.log('Schedule follow-up for call:', id)}
    />
  );
}

function AppointmentDetailsContent({
  payload,
  state,
}: {
  payload: DockPayload | null;
  state: ContextViewState<AppointmentWithJob>;
}) {
  const appointmentId = payload?.entityId ?? state.data?.id ?? 'appointment-unknown';
  return (
    <AppointmentDetailsView
      appointmentId={appointmentId}
      appointment={state.data ?? null}
      isLoading={state.isLoading}
      error={state.error}
      onRetry={state.onRetry}
      onRefresh={state.onRefresh}
      onEdit={(id) => console.log('Edit appointment', id)}
    />
  );
}

function getQueryErrorMessage(responseError?: string, error?: unknown): string | null {
  if (responseError) {
    return responseError;
  }
  if (!error) {
    return null;
  }
  if (error instanceof Error) {
    return error.message;
  }
  try {
    return String(error);
  } catch {
    return 'Unknown error';
  }
}

export default RightDockPanel;


