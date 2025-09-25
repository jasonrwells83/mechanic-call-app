import { Router, Request, Response } from 'express';
import { databaseService } from '../services/database';
import { CreateJobRequest, UpdateJobRequest, JobQueryFilters, JobStatus, JobPriority, Bay } from '../types/database';

const router = Router();

const JOB_STATUSES: JobStatus[] = ['intake', 'incoming-call', 'scheduled', 'in-progress', 'in-bay', 'waiting-parts', 'completed'];
const JOB_PRIORITIES: JobPriority[] = ['low', 'medium', 'high'];

const parseCsvParam = <T extends string>(value: unknown, allowed: readonly T[]): T[] | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const tokens = value.split(',').map((token) => token.trim()).filter(Boolean);
  const filtered = tokens.filter((token): token is T => (allowed as readonly string[]).includes(token));
  return filtered.length > 0 ? filtered : undefined;
};

const parseBayParam = (value: unknown): Bay[] | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const tokens = value.split(',').map((token) => token.trim()).filter(Boolean);
  return tokens.length > 0 ? tokens as Bay[] : undefined;
};

const parseNumberParam = (value: unknown): number | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};

// GET /api/jobs - Get all jobs
router.get('/', async (req: Request, res: Response) => {
  try {
    const filters: JobQueryFilters = {
      status: parseCsvParam(req.query.status, JOB_STATUSES),
      priority: parseCsvParam(req.query.priority, JOB_PRIORITIES),
      bay: parseBayParam(req.query.bay),
      customerId: typeof req.query.customerId === 'string' ? req.query.customerId : undefined,
      vehicleId: typeof req.query.vehicleId === 'string' ? req.query.vehicleId : undefined,
      dateRange: typeof req.query.startDate === 'string' && typeof req.query.endDate === 'string' ? {
        start: req.query.startDate,
        end: req.query.endDate,
      } : undefined,
      limit: parseNumberParam(req.query.limit),
      offset: parseNumberParam(req.query.offset),
    };

    const jobs = await databaseService.getAllJobs(filters);
    
    res.json({
      success: true,
      data: jobs,
      count: jobs.length,
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch jobs',
    });
  }
});

// GET /api/jobs/:id - Get job by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const job = await databaseService.getJob(id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch job',
    });
  }
});

// POST /api/jobs - Create new job
router.post('/', async (req: Request, res: Response) => {
  try {
    const data: CreateJobRequest = req.body;
    
    // Validate required fields
    if (!data.title || !data.customerId || !data.vehicleId || !data.estHours || !data.priority) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, customerId, vehicleId, estHours, priority',
      });
    }

    const job = await databaseService.createJob(data);
    
    res.status(201).json({
      success: true,
      data: job,
      message: 'Job created successfully',
    });
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create job',
    });
  }
});

// PUT /api/jobs/:id - Update job
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data: UpdateJobRequest = req.body;
    
    const job = await databaseService.updateJob(id, data);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    res.json({
      success: true,
      data: job,
      message: 'Job updated successfully',
    });
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update job',
    });
  }
});

// PATCH /api/jobs/:id/status - Update job status
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required',
      });
    }

    const job = await databaseService.updateJob(id, { status });
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    res.json({
      success: true,
      data: job,
      message: 'Job status updated successfully',
    });
  } catch (error) {
    console.error('Error updating job status:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update job status',
    });
  }
});

// DELETE /api/jobs/:id - Delete job
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = await databaseService.deleteJob(id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    res.json({
      success: true,
      message: 'Job deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete job',
    });
  }
});

export default router;











