import React, { useState } from 'react';
import { CustomerList } from '@/components/customers/CustomerList';
import { CustomerDetailView } from '@/components/customers/CustomerDetailView';
import { CustomerForm } from '@/components/forms/CustomerForm';
import { VehicleForm } from '@/components/forms/VehicleForm';
import { useUIStore } from '@/stores';
import type { Customer } from '@/types/database';

export function CustomersPage() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const { openModal, closeModal, activeModal, selectItem } = useUIStore();

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setViewMode('detail');
    selectItem({
      type: 'customer',
      id: customer.id,
      data: customer,
    });
  };

  const handleCustomerEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    openModal('edit-customer');
  };

  const handleCustomerCreate = () => {
    openModal('create-customer');
  };

  const handleAddVehicle = (customerId: string) => {
    // Set customer context for vehicle creation
    selectItem({
      type: 'customer',
      id: customerId,
      data: selectedCustomer!,
    });
    openModal('create-vehicle');
  };

  const handleCreateJob = (customerId: string, vehicleId?: string) => {
    // Set context for job creation
    selectItem({
      type: 'customer',
      id: customerId,
      data: selectedCustomer!,
    });
    openModal('create-job');
  };

  const handleBack = () => {
    setViewMode('list');
    setSelectedCustomer(null);
  };

  return (
    <div className="p-6">
      {viewMode === 'list' ? (
        <CustomerList
          onCustomerSelect={handleCustomerSelect}
          onCustomerEdit={handleCustomerEdit}
          onCustomerCreate={handleCustomerCreate}
        />
      ) : selectedCustomer ? (
        <CustomerDetailView
          customerId={selectedCustomer.id}
          onBack={handleBack}
          onEdit={handleCustomerEdit}
          onAddVehicle={handleAddVehicle}
          onCreateJob={handleCreateJob}
        />
      ) : null}

      {/* Customer Form Modals */}
      <CustomerForm
        isOpen={activeModal === 'create-customer'}
        onClose={closeModal}
      />
      
      <CustomerForm
        isOpen={activeModal === 'edit-customer'}
        onClose={closeModal}
        customer={selectedCustomer || undefined}
      />

      {/* Vehicle Form Modals */}
      <VehicleForm
        isOpen={activeModal === 'create-vehicle'}
        onClose={closeModal}
        customerId={selectedCustomer?.id}
      />
      
      <VehicleForm
        isOpen={activeModal === 'edit-vehicle'}
        onClose={closeModal}
        customerId={selectedCustomer?.id}
      />
    </div>
  );
}

