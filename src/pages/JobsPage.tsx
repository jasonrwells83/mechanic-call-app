import React, { useState } from 'react';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { JobForm } from '@/components/forms/JobForm';
import { useUIStore } from '@/stores';
import type { Job } from '@/types/database';

export function JobsPage() {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const { openModal, closeModal, activeModal, selectItem } = useUIStore();

  const handleJobClick = (job: Job) => {
    setSelectedJob(job);
    selectItem({
      type: 'job',
      id: job.id,
      data: job,
    });
  };

  const handleJobEdit = (job: Job) => {
    setSelectedJob(job);
    openModal('edit-job');
  };

  const handleJobCreate = () => {
    openModal('create-job');
  };

  return (
    <div className="p-6">
      <KanbanBoard
        onJobClick={handleJobClick}
        onJobEdit={handleJobEdit}
        onJobCreate={handleJobCreate}
      />

      {/* Job Form Modals */}
      <JobForm
        isOpen={activeModal === 'create-job'}
        onClose={closeModal}
        initialStatus="incoming-call"
      />
      
      <JobForm
        isOpen={activeModal === 'edit-job'}
        onClose={closeModal}
        job={selectedJob || undefined}
      />
    </div>
  );
}

