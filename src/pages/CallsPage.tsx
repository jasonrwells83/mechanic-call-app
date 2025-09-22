// Calls Page Component
// Main page for call management system

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { JobForm } from '@/components/forms/JobForm';
import { CallList, type Call } from '@/components/calls/CallList';
import { CallOutcomeAnalytics } from '@/components/calls/CallOutcomeAnalytics';
import { CallFollowUpSystem } from '@/components/calls/CallFollowUpSystem';
import { CallOutcomeManagement } from '@/components/calls/CallOutcomeManagement';
import { CallSchedulingIntegration } from '@/components/scheduling/CallSchedulingIntegration';
import { SchedulingDashboard } from '@/components/scheduling/SchedulingDashboard';
import { useUIStore } from '@/stores';
import {
  Phone,
  PhoneCall,
  Plus,
  Clock,
  Users,
  TrendingUp,
  Calendar,
  Settings,
  Target
} from 'lucide-react';

export function CallsPage() {
  const [showIntakeForm, setShowIntakeForm] = useState(false);
  const [showEditCall, setShowEditCall] = useState(false);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'analytics' | 'followups' | 'outcomes' | 'scheduling'>('list');
  const [showOutcomeManagement, setShowOutcomeManagement] = useState(false);
  const [showSchedulingIntegration, setShowSchedulingIntegration] = useState(false);
  const [selectedCallForOutcome, setSelectedCallForOutcome] = useState<Call | null>(null);
  const [selectedCallForScheduling, setSelectedCallForScheduling] = useState<Call | null>(null);
  
  // Mock call data - in real app, this would come from API
  const mockCalls: Call[] = [];

  const { addToast } = useUIStore();

  const handleCallCreate = () => {
    setShowIntakeForm(true);
  };

  const handleCallEdit = (call: Call) => {
    setSelectedCall(call);
    setShowEditCall(true);
  };

  const handleCallSelect = (call: Call) => {
    setSelectedCall(call);
    // Could open a detailed view or perform other actions
  };

  const handleCallDelete = (callId: string) => {
    // In a real app, this would delete from the database
    addToast({
      type: 'success',
      title: 'Call Deleted',
      message: `Call ${callId} has been deleted successfully`,
      duration: 3000,
    });
  };

  const handleJobConversion = (call: Call, job: any, appointment?: any) => {
    // In a real app, this would update the database and sync data
    console.log('Job conversion completed:', { call, job, appointment });
    
    addToast({
      type: 'success',
      title: 'Conversion Successful',
      message: `Call ${call.callId} has been converted to ${job ? 'job' : ''}${job && appointment ? ' and ' : ''}${appointment ? 'appointment' : ''}`,
      duration: 4000,
    });
  };

  const handleOutcomeManagement = (call: Call) => {
    setSelectedCallForOutcome(call);
    setShowOutcomeManagement(true);
  };

  const handleSchedulingIntegration = (call: Call) => {
    setSelectedCallForScheduling(call);
    setShowSchedulingIntegration(true);
  };

  const handleSchedulingComplete = (appointment: any, job: any) => {
    console.log('Scheduling completed:', { appointment, job });
    setShowSchedulingIntegration(false);
    setSelectedCallForScheduling(null);
    addToast({
      type: 'success',
      title: 'Appointment Scheduled',
      message: 'Call has been successfully converted to a scheduled appointment',
      duration: 4000,
    });
  };

  const handleIntakeFormClose = () => {
    setShowIntakeForm(false);
    setShowEditCall(false);
    setSelectedCall(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Phone className="h-8 w-8" />
            Call Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage customer calls, track outcomes, and schedule follow-ups
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-lg">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-r-none"
            >
              <Phone className="h-4 w-4 mr-2" />
              Calls
            </Button>
            <Button
              variant={viewMode === 'analytics' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('analytics')}
              className="rounded-none border-l-0"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Analytics
            </Button>
            <Button
              variant={viewMode === 'followups' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('followups')}
              className="rounded-none border-l-0"
            >
              <Clock className="h-4 w-4 mr-2" />
              Follow-ups
            </Button>
            <Button
              variant={viewMode === 'outcomes' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('outcomes')}
              className="rounded-none border-l-0"
            >
              <Target className="h-4 w-4 mr-2" />
              Outcomes
            </Button>
            <Button
              variant={viewMode === 'scheduling' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('scheduling')}
              className="rounded-l-none border-l-0"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Scheduling
            </Button>
          </div>
          
          <Button onClick={handleCallCreate}>
            <PhoneCall className="h-4 w-4 mr-2" />
            Take Call
          </Button>
        </div>
      </div>

      {/* Main Content */}
      {viewMode === 'list' && (
        <CallList
          onCallSelect={handleCallSelect}
          onCallEdit={handleCallEdit}
          onCallCreate={handleCallCreate}
          onCallDelete={handleCallDelete}
          onJobConversion={handleJobConversion}
        />
      )}

      {viewMode === 'analytics' && (
        <CallOutcomeAnalytics
          calls={mockCalls}
          timeRange="month"
        />
      )}

      {viewMode === 'followups' && (
        <CallFollowUpSystem
          calls={mockCalls}
          onFollowUpComplete={(taskId, outcome) => {
            console.log('Follow-up completed:', taskId, outcome);
          }}
          onFollowUpCreate={(task) => {
            console.log('Follow-up created:', task);
          }}
        />
      )}


      {viewMode === 'outcomes' && (
        <div className="max-w-6xl mx-auto">
          <CallOutcomeManagement
            callId="CALL-001"
            onOutcomeUpdate={(outcome) => {
              console.log('Outcome updated:', outcome);
            }}
            onOutcomeCreate={(outcome) => {
              console.log('Outcome created:', outcome);
            }}
          />
        </div>
      )}

      {viewMode === 'scheduling' && (
        <SchedulingDashboard
          onAppointmentSelect={(appointment) => {
            console.log('Appointment selected:', appointment);
          }}
          onAppointmentEdit={(appointment) => {
            console.log('Appointment edit:', appointment);
          }}
          onAppointmentCancel={(appointmentId) => {
            console.log('Appointment cancelled:', appointmentId);
          }}
          onNewScheduling={() => {
            console.log('New scheduling requested');
          }}
        />
      )}

      {/* Call Intake Form - Uses Unified JobForm */}
      <JobForm
        isOpen={showIntakeForm}
        onClose={handleIntakeFormClose}
        intakeMode={true}
        initialStatus="intake"
      />

      {/* Outcome Management Modal */}
      <Dialog open={showOutcomeManagement} onOpenChange={setShowOutcomeManagement}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Call Outcome Management
            </DialogTitle>
          </DialogHeader>
          {selectedCallForOutcome && (
            <CallOutcomeManagement
              callId={selectedCallForOutcome.callId}
              onOutcomeUpdate={(outcome) => {
                console.log('Outcome updated:', outcome);
                setShowOutcomeManagement(false);
              }}
              onOutcomeCreate={(outcome) => {
                console.log('Outcome created:', outcome);
                setShowOutcomeManagement(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Scheduling Integration Modal */}
      <Dialog open={showSchedulingIntegration} onOpenChange={setShowSchedulingIntegration}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Schedule Appointment
            </DialogTitle>
          </DialogHeader>
          {selectedCallForScheduling && (
            <CallSchedulingIntegration
              callId={selectedCallForScheduling.callId}
              jobData={{
                callId: selectedCallForScheduling.callId,
                customerId: selectedCallForScheduling.customerId || 'cust-1',
                vehicleId: selectedCallForScheduling.vehicleId || 'veh-1',
                serviceType: selectedCallForScheduling.serviceType,
                serviceCategory: selectedCallForScheduling.serviceCategory,
                priority: selectedCallForScheduling.servicePriority,
                estimatedDuration: 120, // default 2 hours
                requiredSkills: ['general-repair'],
                requiredEquipment: ['general'],
                preferredTimeSlots: [
                  {
                    date: new Date(),
                    timePreference: 'morning' as const,
                  },
                ],
                notes: selectedCallForScheduling.callNotes,
                customerRequests: selectedCallForScheduling.customerConcerns || [],
              }}
              onSchedulingComplete={handleSchedulingComplete}
              onSchedulingCancel={() => setShowSchedulingIntegration(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CallsPage;