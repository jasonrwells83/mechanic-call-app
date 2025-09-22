// Quick Communication Actions Component
// Fast communication templates and actions for customer service

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  Bell,
  Send,
  Clock,
  CheckCircle,
  Star,
  Zap,
  Plus,
  Edit,
  Copy,
  Trash2,
  Settings,
  PhoneCall,
  MessageCircle,
  CalendarPlus,
  BellRing,
  FileText,
  User,
  Car,
  Wrench
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores';
import type { Customer } from '@/types/database';
import type { CommunicationItem } from './CustomerCommunicationTimeline';

interface QuickCommunicationActionsProps {
  customer: Customer;
  onCommunicationSend?: (communication: Partial<CommunicationItem>) => void;
  className?: string;
}

interface CommunicationTemplate {
  id: string;
  name: string;
  type: 'call' | 'email' | 'sms' | 'reminder';
  category: 'appointment' | 'service' | 'follow-up' | 'reminder' | 'quote' | 'general';
  subject?: string;
  content: string;
  variables: string[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  autoSend?: boolean;
  tags: string[];
}

const communicationTemplates: CommunicationTemplate[] = [
  // Appointment Templates
  {
    id: 'apt-confirmation',
    name: 'Appointment Confirmation',
    type: 'email',
    category: 'appointment',
    subject: 'Service Appointment Confirmation - {{date}}',
    content: 'Dear {{customerName}},\n\nThis email confirms your {{serviceType}} appointment scheduled for {{date}} at {{time}}.\n\nVehicle: {{vehicle}}\nEstimated Duration: {{duration}}\nLocation: {{shopAddress}}\n\nPlease arrive 15 minutes early for check-in. If you need to reschedule, please call us at {{shopPhone}}.\n\nBest regards,\n{{shopName}} Team',
    variables: ['customerName', 'serviceType', 'date', 'time', 'vehicle', 'duration', 'shopAddress', 'shopPhone', 'shopName'],
    priority: 'normal',
    tags: ['appointment', 'confirmation'],
  },
  {
    id: 'apt-reminder-24h',
    name: '24-Hour Appointment Reminder',
    type: 'sms',
    category: 'reminder',
    content: 'Hi {{customerName}}, reminder: Your {{serviceType}} appointment is tomorrow at {{time}}. See you then! Reply STOP to opt out.',
    variables: ['customerName', 'serviceType', 'time'],
    priority: 'normal',
    autoSend: true,
    tags: ['reminder', '24hour'],
  },
  {
    id: 'apt-reminder-2h',
    name: '2-Hour Appointment Reminder',
    type: 'sms',
    category: 'reminder',
    content: 'Hi {{customerName}}, your {{serviceType}} appointment is in 2 hours at {{time}}. Please arrive 15 min early. Questions? Call {{shopPhone}}',
    variables: ['customerName', 'serviceType', 'time', 'shopPhone'],
    priority: 'high',
    autoSend: true,
    tags: ['reminder', '2hour'],
  },
  
  // Service Templates
  {
    id: 'service-complete',
    name: 'Service Complete - Ready for Pickup',
    type: 'sms',
    category: 'service',
    content: 'Hi {{customerName}}, your {{vehicle}} is ready for pickup! Total: ${{amount}}. Shop hours: {{hours}}. Thanks for choosing {{shopName}}!',
    variables: ['customerName', 'vehicle', 'amount', 'hours', 'shopName'],
    priority: 'high',
    tags: ['service', 'complete', 'pickup'],
  },
  {
    id: 'service-delay',
    name: 'Service Delay Notification',
    type: 'call',
    category: 'service',
    subject: 'Service Update - Slight Delay',
    content: 'Hi {{customerName}}, I\'m calling to let you know that your {{vehicle}} service is running slightly behind schedule. We discovered {{issue}} and want to make sure everything is done properly. The new estimated completion time is {{newTime}}. We apologize for any inconvenience.',
    variables: ['customerName', 'vehicle', 'issue', 'newTime'],
    priority: 'high',
    tags: ['service', 'delay', 'update'],
  },
  {
    id: 'additional-work',
    name: 'Additional Work Authorization',
    type: 'call',
    category: 'service',
    subject: 'Additional Service Recommendation',
    content: 'Hi {{customerName}}, while servicing your {{vehicle}}, we noticed {{finding}}. We recommend {{recommendation}} for ${{cost}}. This {{urgency}}. Would you like us to proceed?',
    variables: ['customerName', 'vehicle', 'finding', 'recommendation', 'cost', 'urgency'],
    priority: 'urgent',
    tags: ['service', 'authorization', 'additional'],
  },
  
  // Follow-up Templates
  {
    id: 'service-followup',
    name: 'Service Follow-up',
    type: 'email',
    category: 'follow-up',
    subject: 'How was your recent service experience?',
    content: 'Dear {{customerName}},\n\nThank you for choosing {{shopName}} for your {{vehicle}} {{serviceType}}. We hope you\'re satisfied with our service.\n\nWe\'d love to hear about your experience. Please take a moment to leave us a review or let us know if there\'s anything else we can help with.\n\nYour next recommended service: {{nextService}} due around {{nextServiceDate}}.\n\nBest regards,\n{{technicianName}}\n{{shopName}}',
    variables: ['customerName', 'shopName', 'vehicle', 'serviceType', 'nextService', 'nextServiceDate', 'technicianName'],
    priority: 'low',
    tags: ['followup', 'satisfaction', 'review'],
  },
  {
    id: 'maintenance-reminder',
    name: 'Maintenance Reminder',
    type: 'email',
    category: 'reminder',
    subject: '{{vehicle}} Maintenance Due Soon',
    content: 'Dear {{customerName}},\n\nOur records show that your {{vehicle}} is due for {{serviceType}} soon. Based on your driving habits, we recommend scheduling this service within the next {{timeframe}}.\n\nBenefits of timely maintenance:\n• Prevents costly repairs\n• Maintains warranty coverage\n• Ensures optimal performance\n\nCall us at {{shopPhone}} or reply to this email to schedule your appointment.\n\nBest regards,\n{{shopName}} Service Team',
    variables: ['customerName', 'vehicle', 'serviceType', 'timeframe', 'shopPhone', 'shopName'],
    priority: 'normal',
    autoSend: true,
    tags: ['maintenance', 'reminder', 'preventive'],
  },
  
  // Quote Templates
  {
    id: 'quote-ready',
    name: 'Quote Ready',
    type: 'email',
    category: 'quote',
    subject: 'Service Quote for {{vehicle}} - {{serviceType}}',
    content: 'Dear {{customerName}},\n\nThank you for your interest in our services. Please find your detailed quote attached for {{serviceType}} on your {{vehicle}}.\n\nQuote Summary:\n• Service: {{serviceType}}\n• Estimated Cost: ${{totalCost}}\n• Estimated Time: {{duration}}\n• Parts Warranty: {{warranty}}\n• Quote Valid Until: {{validUntil}}\n\nTo schedule your service, please call us at {{shopPhone}} or reply to this email. We look forward to serving you!\n\nBest regards,\n{{advisorName}}\n{{shopName}}',
    variables: ['customerName', 'vehicle', 'serviceType', 'totalCost', 'duration', 'warranty', 'validUntil', 'shopPhone', 'advisorName', 'shopName'],
    priority: 'normal',
    tags: ['quote', 'estimate', 'pricing'],
  },
  
  // General Templates
  {
    id: 'thank-you',
    name: 'Thank You Message',
    type: 'sms',
    category: 'general',
    content: 'Thank you for choosing {{shopName}}, {{customerName}}! We appreciate your business and look forward to serving you again.',
    variables: ['shopName', 'customerName'],
    priority: 'low',
    tags: ['thank-you', 'general'],
  },
  {
    id: 'birthday-greeting',
    name: 'Birthday Greeting',
    type: 'email',
    category: 'general',
    subject: 'Happy Birthday from {{shopName}}!',
    content: 'Dear {{customerName}},\n\nHappy Birthday! 🎉\n\nAs a valued customer, we wanted to take a moment to wish you a wonderful day. To celebrate, we\'re offering you a {{discount}}% discount on your next service visit.\n\nUse code: BIRTHDAY{{year}} when scheduling your appointment.\n\nValid until {{expiryDate}}.\n\nBest wishes,\n{{shopName}} Team',
    variables: ['customerName', 'shopName', 'discount', 'year', 'expiryDate'],
    priority: 'low',
    tags: ['birthday', 'discount', 'celebration'],
  },
];

const quickActions = [
  {
    id: 'call-customer',
    label: 'Call Customer',
    icon: PhoneCall,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    action: 'call',
  },
  {
    id: 'send-sms',
    label: 'Send SMS',
    icon: MessageSquare,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    action: 'sms',
  },
  {
    id: 'send-email',
    label: 'Send Email',
    icon: Mail,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    action: 'email',
  },
  {
    id: 'schedule-appointment',
    label: 'Schedule Appointment',
    icon: CalendarPlus,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    action: 'appointment',
  },
  {
    id: 'set-reminder',
    label: 'Set Reminder',
    icon: BellRing,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    action: 'reminder',
  },
  {
    id: 'add-note',
    label: 'Add Note',
    icon: FileText,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    action: 'note',
  },
];

export function QuickCommunicationActions({
  customer,
  onCommunicationSend,
  className = '',
}: QuickCommunicationActionsProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<CommunicationTemplate | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  
  const { addToast } = useUIStore();

  // Filter templates by category
  const templatesByCategory = communicationTemplates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, CommunicationTemplate[]>);

  // Replace template variables with actual values
  const processTemplate = useCallback((template: CommunicationTemplate): CommunicationTemplate => {
    const variables = {
      customerName: customer.name,
      shopName: 'AutoCare Plus',
      shopPhone: '(555) 123-4567',
      shopAddress: '123 Main St, Anytown, ST 12345',
      vehicle: 'Honda Civic 2020', // This would come from customer's vehicle data
      date: new Date().toLocaleDateString(),
      time: '10:00 AM',
      hours: '8AM-6PM',
      technicianName: 'Mike Johnson',
      advisorName: 'Sarah Wilson',
      serviceType: 'Oil Change',
      amount: '89.99',
      duration: '1 hour',
      // Add more variables as needed
    };

    let processedContent = template.content;
    let processedSubject = template.subject || '';

    // Replace variables in content and subject
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      processedContent = processedContent.replace(new RegExp(placeholder, 'g'), value);
      processedSubject = processedSubject.replace(new RegExp(placeholder, 'g'), value);
    });

    return {
      ...template,
      content: processedContent,
      subject: processedSubject,
    };
  }, [customer]);

  const handleQuickAction = useCallback((actionId: string) => {
    setSelectedAction(actionId);
    
    // Find relevant templates for this action
    const relevantTemplates = communicationTemplates.filter(template => {
      if (actionId === 'call-customer') return template.type === 'call';
      if (actionId === 'send-sms') return template.type === 'sms';
      if (actionId === 'send-email') return template.type === 'email';
      if (actionId === 'set-reminder') return template.type === 'reminder';
      return false;
    });

    if (relevantTemplates.length > 0) {
      setShowTemplateDialog(true);
    } else {
      // Handle actions without templates
      handleDirectAction(actionId);
    }
  }, []);

  const handleDirectAction = useCallback((actionId: string) => {
    switch (actionId) {
      case 'call-customer':
        // In a real app, this would integrate with a phone system
        addToast({
          type: 'info',
          title: 'Calling Customer',
          message: `Initiating call to ${customer.phone}`,
          duration: 3000,
        });
        break;
      case 'schedule-appointment':
        // This would open the appointment scheduling modal
        addToast({
          type: 'info',
          title: 'Schedule Appointment',
          message: 'Opening appointment scheduler...',
          duration: 2000,
        });
        break;
      case 'add-note':
        // This would open a quick note dialog
        setSelectedAction('note');
        setShowTemplateDialog(true);
        break;
      default:
        break;
    }
  }, [customer, addToast]);

  const handleTemplateSelect = useCallback((template: CommunicationTemplate) => {
    const processedTemplate = processTemplate(template);
    setSelectedTemplate(processedTemplate);
  }, [processTemplate]);

  const handleSendCommunication = useCallback(() => {
    if (!selectedTemplate && !customMessage) return;

    const communication: Partial<CommunicationItem> = {
      type: selectedTemplate?.type || 'note',
      direction: 'outbound',
      subject: selectedTemplate?.subject,
      content: selectedTemplate?.content || customMessage,
      priority: selectedTemplate?.priority || 'normal',
      timestamp: new Date(),
      status: 'sent',
      createdBy: {
        id: 'current-user',
        name: 'Current User',
        role: 'Service Advisor',
      },
    };

    onCommunicationSend?.(communication);
    
    addToast({
      type: 'success',
      title: 'Communication Sent',
      message: `${selectedTemplate?.name || 'Message'} sent successfully`,
      duration: 3000,
    });

    // Reset form
    setSelectedTemplate(null);
    setCustomMessage('');
    setShowTemplateDialog(false);
    setSelectedAction(null);
  }, [selectedTemplate, customMessage, onCommunicationSend, addToast]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.id}
                  variant="outline"
                  className={cn(
                    'h-auto p-4 flex flex-col gap-2 hover:scale-105 transition-transform',
                    action.bgColor,
                    'border-2'
                  )}
                  onClick={() => handleQuickAction(action.id)}
                >
                  <Icon className={cn('h-6 w-6', action.color)} />
                  <span className="text-xs font-medium">{action.label}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Popular Templates */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Popular Templates
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowTemplateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              All Templates
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {communicationTemplates.slice(0, 4).map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => handleTemplateSelect(template)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{template.name}</span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {template.type}
                    </Badge>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {template.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {template.content}
                  </p>
                </div>
                <Button variant="ghost" size="sm">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Template Selection Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedAction ? `${quickActions.find(a => a.id === selectedAction)?.label} Templates` : 'Communication Templates'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {Object.entries(templatesByCategory).map(([category, templates]) => (
              <div key={category}>
                <h3 className="font-medium capitalize mb-3 flex items-center gap-2">
                  {category === 'appointment' && <Calendar className="h-4 w-4" />}
                  {category === 'service' && <Wrench className="h-4 w-4" />}
                  {category === 'follow-up' && <CheckCircle className="h-4 w-4" />}
                  {category === 'reminder' && <Bell className="h-4 w-4" />}
                  {category === 'quote' && <FileText className="h-4 w-4" />}
                  {category === 'general' && <User className="h-4 w-4" />}
                  {category} Templates
                </h3>
                <div className="grid gap-3">
                  {templates.map((template) => (
                    <Card
                      key={template.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{template.name}</span>
                            <Badge variant="outline" className="text-xs capitalize">
                              {template.type}
                            </Badge>
                            {template.priority !== 'normal' && (
                              <Badge 
                                variant="secondary" 
                                className={cn(
                                  'text-xs',
                                  template.priority === 'urgent' && 'bg-red-100 text-red-700',
                                  template.priority === 'high' && 'bg-orange-100 text-orange-700',
                                  template.priority === 'low' && 'bg-gray-100 text-gray-700'
                                )}
                              >
                                {template.priority}
                              </Badge>
                            )}
                            {template.autoSend && (
                              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                                Auto-send
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm">
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {template.subject && (
                          <p className="text-sm font-medium mb-2">
                            Subject: {template.subject}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
                          {template.content}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {template.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}

            {/* Custom Message Option */}
            <div>
              <h3 className="font-medium mb-3">Custom Message</h3>
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Subject (Optional)</label>
                      <Input placeholder="Message subject..." />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Message</label>
                      <Textarea
                        placeholder="Type your custom message..."
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        rows={4}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Select defaultValue="normal">
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low Priority</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High Priority</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button onClick={handleSendCommunication} disabled={!customMessage}>
                        <Send className="h-4 w-4 mr-2" />
                        Send Custom Message
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Selected Template Preview */}
      {selectedTemplate && (
        <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Preview & Send: {selectedTemplate.name}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="capitalize">{selectedTemplate.type}</Badge>
                  <Badge variant="secondary" className="capitalize">{selectedTemplate.priority}</Badge>
                </div>
                {selectedTemplate.subject && (
                  <p className="font-medium mb-2">Subject: {selectedTemplate.subject}</p>
                )}
                <p className="text-sm whitespace-pre-wrap">{selectedTemplate.content}</p>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSendCommunication}>
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export type { QuickCommunicationActionsProps };
