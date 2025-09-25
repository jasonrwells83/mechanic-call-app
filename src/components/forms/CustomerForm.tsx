// Customer Form Component
// Comprehensive form for creating and editing customers with validation

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Save, 
  X, 
  User, 
  Phone, 
  Mail, 
  MapPin,
  Building,
  Calendar,
  UserPlus,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useCreateCustomer, useUpdateCustomer } from '@/hooks/use-customers';
import { useUIStore } from '@/stores';
import type { Customer, CreateCustomerData, UpdateCustomerData } from '@/types/database';

// Form validation schema
const customerFormSchema = z.object({
  name: z.string().min(1, 'Customer name is required').max(100, 'Name too long'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(15, 'Phone number too long'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().optional(),
  // Additional contact information
  alternatePhone: z.string().optional(),
  company: z.string().optional(),
  // Preferences and notes
  preferredContactMethod: z.enum(['phone', 'email']).default('phone'),
  notes: z.string().optional(),
  // Emergency contact
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  // Service preferences
  preferredServiceDays: z.array(z.string()).optional(),
  preferredServiceTime: z.enum(['morning', 'afternoon', 'evening', 'any']).optional(),
  // Billing information
  billingAddress: z.string().optional(),
  taxExempt: z.boolean().optional(),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

interface CustomerFormProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer; // If provided, form is in edit mode
}

export function CustomerForm({ isOpen, onClose, customer }: CustomerFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState<'basic' | 'contact' | 'preferences' | 'billing'>('basic');
  const isEditMode = Boolean(customer);

  // Hooks
  const { mutateAsync: createCustomer } = useCreateCustomer();
  const { mutateAsync: updateCustomer } = useUpdateCustomer();
  const { addToast } = useUIStore();

  // Form setup
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: customer?.name || '',
      phone: customer?.phone || '',
      email: customer?.email || '',
      address: customer?.address || '',
      alternatePhone: '',
      company: '',
      preferredContactMethod: 'phone',
      notes: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      preferredServiceDays: [],
      preferredServiceTime: 'any',
      billingAddress: '',
      taxExempt: false,
    },
  });

  // Reset form when customer changes
  useEffect(() => {
    if (customer) {
      form.reset({
        name: customer.name,
        phone: customer.phone,
        email: customer.email || '',
        address: customer.address || '',
        alternatePhone: '',
        company: '',
        preferredContactMethod: customer.preferredContact ?? 'phone',
        notes: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        preferredServiceDays: [],
        preferredServiceTime: 'any',
        billingAddress: customer.address || '',
        taxExempt: false,
      });
    } else {
      form.reset({
        name: '',
        phone: '',
        email: '',
        address: '',
        alternatePhone: '',
        company: '',
        preferredContactMethod: 'phone',
        notes: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        preferredServiceDays: [],
        preferredServiceTime: 'any',
        billingAddress: '',
        taxExempt: false,
      });
    }
  }, [customer, form]);

  const handleSubmit = async (data: CustomerFormData) => {
    setIsSubmitting(true);

    try {
      if (isEditMode && customer) {
        // Update existing customer
        const updateData: UpdateCustomerData = {
          name: data.name,
          phone: data.phone,
          email: data.email || undefined,
          address: data.address || undefined,
        };

        await updateCustomer({ id: customer.id, data: updateData });

        addToast({
          type: 'success',
          title: 'Customer Updated',
          message: `${data.name} has been updated successfully`,
          duration: 3000,
        });
      } else {
        // Create new customer
        const createData: CreateCustomerData = {
          name: data.name,
          phone: data.phone,
          email: data.email || undefined,
          address: data.address || undefined,
          preferredContact: data.preferredContactMethod || 'phone',
        };

        await createCustomer(createData);

        addToast({
          type: 'success',
          title: 'Customer Created',
          message: `${data.name} has been added to the system`,
          duration: 3000,
        });
      }

      onClose();
      form.reset();
    } catch (error) {
      addToast({
        type: 'error',
        title: isEditMode ? 'Failed to Update Customer' : 'Failed to Create Customer',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setActiveSection('basic');
    onClose();
  };

  // Form validation state
  const formState = form.formState;
  const hasErrors = Object.keys(formState.errors).length > 0;
  const isDirty = formState.isDirty;

  // Section completion status
  const sectionStatus = {
    basic: !formState.errors.name && !formState.errors.phone && form.watch('name') && form.watch('phone'),
    contact: true, // Contact info is optional
    preferences: true, // Preferences are optional
    billing: true, // Billing is optional
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditMode ? (
              <>
                <User className="h-5 w-5" />
                Edit Customer: {customer?.name}
              </>
            ) : (
              <>
                <UserPlus className="h-5 w-5" />
                Add New Customer
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? 'Update customer information and preferences'
              : 'Enter customer details to add them to your database'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Section Navigation */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Form Sections</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant={activeSection === 'basic' ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setActiveSection('basic')}
                >
                  <div className="flex items-center gap-2">
                    {sectionStatus.basic ? (
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    ) : (
                      <Clock className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span>Basic Info</span>
                  </div>
                </Button>
                
                <Button
                  variant={activeSection === 'contact' ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setActiveSection('contact')}
                >
                  <div className="flex items-center gap-2">
                    {sectionStatus.contact ? (
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    ) : (
                      <Clock className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span>Contact Details</span>
                  </div>
                </Button>
                
                <Button
                  variant={activeSection === 'preferences' ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setActiveSection('preferences')}
                >
                  <div className="flex items-center gap-2">
                    {sectionStatus.preferences ? (
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    ) : (
                      <Clock className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span>Preferences</span>
                  </div>
                </Button>
                
                <Button
                  variant={activeSection === 'billing' ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setActiveSection('billing')}
                >
                  <div className="flex items-center gap-2">
                    {sectionStatus.billing ? (
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    ) : (
                      <Clock className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span>Billing Info</span>
                  </div>
                </Button>
              </CardContent>
            </Card>

            {/* Form Status */}
            <Card className="mt-4">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    {hasErrors ? (
                      <>
                        <AlertTriangle className="h-3 w-3 text-red-600" />
                        <span className="text-red-600">Has Errors</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span className="text-green-600">Valid</span>
                      </>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    {isDirty ? (
                      <>
                        <Clock className="h-3 w-3 text-orange-600" />
                        <span className="text-orange-600">Unsaved Changes</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-3 w-3 text-gray-600" />
                        <span className="text-gray-600">No Changes</span>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Form Content */}
          <div className="lg:col-span-3">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                
                {/* Basic Information Section */}
                {activeSection === 'basic' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Basic Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Full Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="John Doe" {...field} />
                              </FormControl>
                              <FormDescription>
                                Customer's full legal name
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Primary Phone *</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input placeholder="(555) 123-4567" className="pl-10" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Address</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input 
                                    type="email" 
                                    placeholder="john@example.com" 
                                    className="pl-10" 
                                    {...field} 
                                  />
                                </div>
                              </FormControl>
                              <FormDescription>
                                Optional - for email communications
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Address</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                  <Textarea
                                    placeholder="123 Main St, City, State, ZIP"
                                    className="pl-10 min-h-[80px]"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              <FormDescription>
                                Service address and mailing address
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Contact Details Section */}
                {activeSection === 'contact' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Additional Contact Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="alternatePhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Alternate Phone</FormLabel>
                              <FormControl>
                                <Input placeholder="(555) 987-6543" {...field} />
                              </FormControl>
                              <FormDescription>
                                Secondary phone number
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="company"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input placeholder="ABC Corporation" className="pl-10" {...field} />
                                </div>
                              </FormControl>
                              <FormDescription>
                                Business or company name
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <Separator />

                      <div>
                        <h4 className="text-sm font-medium mb-3">Emergency Contact</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="emergencyContactName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Emergency Contact Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Jane Doe" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="emergencyContactPhone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Emergency Contact Phone</FormLabel>
                                <FormControl>
                                  <Input placeholder="(555) 111-2222" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Preferences Section */}
                {activeSection === 'preferences' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Service Preferences
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="preferredContactMethod"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Preferred Contact Method</FormLabel>
                              <FormControl>
                                <select
                                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                                  {...field}
                                >
                                  <option value="phone">Phone Call</option>
                                  <option value="email">Email</option>
                                  <option value="text">Text Message</option>
                                </select>
                              </FormControl>
                              <FormDescription>
                                How should we contact you?
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="preferredServiceTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Preferred Service Time</FormLabel>
                              <FormControl>
                                <select
                                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                                  {...field}
                                >
                                  <option value="any">Any Time</option>
                                  <option value="morning">Morning (8AM - 12PM)</option>
                                  <option value="afternoon">Afternoon (12PM - 5PM)</option>
                                  <option value="evening">Evening (5PM - 8PM)</option>
                                </select>
                              </FormControl>
                              <FormDescription>
                                When do you prefer service appointments?
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Customer Notes</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Special instructions, preferences, or important notes about this customer..."
                                className="min-h-[100px]"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Any special instructions or notes about this customer
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Billing Information Section */}
                {activeSection === 'billing' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Billing Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="billingAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Billing Address</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Same as service address or enter different billing address..."
                                className="min-h-[80px]"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Leave blank to use the same as service address
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="taxExempt"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Tax Exempt</FormLabel>
                              <FormDescription>
                                Is this customer exempt from sales tax?
                              </FormDescription>
                            </div>
                            <FormControl>
                              <input
                                type="checkbox"
                                className="h-4 w-4"
                                checked={field.value}
                                onChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                )}
              </form>
            </Form>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasErrors && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Please fix errors
              </Badge>
            )}
            {isDirty && !hasErrors && (
              <Badge variant="secondary" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Unsaved changes
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              type="submit" 
              onClick={form.handleSubmit(handleSubmit)}
              disabled={isSubmitting || hasErrors}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full" />
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditMode ? 'Update Customer' : 'Create Customer'}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { CustomerFormProps };



