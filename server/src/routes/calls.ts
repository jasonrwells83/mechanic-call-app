import { Router, Request, Response } from 'express';
import { databaseService } from '../services/database';
import { CreateCallRequest, UpdateCallRequest, CallQueryFilters, CallOutcome } from '../types/database';

const ALL_OUTCOMES: CallOutcome[] = ['quote-given', 'scheduled', 'follow-up', 'no-action'];

const router = Router();

// GET /api/calls - Get all calls
router.get('/', async (req: Request, res: Response) => {
  try {
    const queryOutcome = typeof req.query.outcome === 'string'
      ? req.query.outcome.split(',').map((value) => value.trim()).filter((value): value is CallOutcome => (ALL_OUTCOMES as string[]).includes(value))
      : undefined;

    const filters: CallQueryFilters = {
      outcome: queryOutcome,
      customerId: typeof req.query.customerId === 'string' ? req.query.customerId : undefined,
      dateRange: typeof req.query.startDate === 'string' && typeof req.query.endDate === 'string' ? {
        start: req.query.startDate,
        end: req.query.endDate,
      } : undefined,
      limit: typeof req.query.limit === 'string' ? Number.parseInt(req.query.limit, 10) : undefined,
      offset: typeof req.query.offset === 'string' ? Number.parseInt(req.query.offset, 10) : undefined,
    };

    const calls = await databaseService.getAllCalls(filters);
    
    res.json({
      success: true,
      data: calls,
      count: calls.length,
    });
  } catch (error) {
    console.error('Error fetching calls:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch calls',
    });
  }
});

// GET /api/calls/:id - Get call by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const call = await databaseService.getCall(id);
    
    if (!call) {
      return res.status(404).json({
        success: false,
        error: 'Call not found',
      });
    }

    res.json({
      success: true,
      data: call,
    });
  } catch (error) {
    console.error('Error fetching call:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch call',
    });
  }
});

// POST /api/calls - Create new call
router.post('/', async (req: Request, res: Response) => {
  try {
    const data: CreateCallRequest = req.body;
    
    // Validate required fields
    if (!data.phone || !data.notes || !data.outcome) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: phone, notes, outcome',
      });
    }

    const call = await databaseService.createCall(data);
    
    res.status(201).json({
      success: true,
      data: call,
      message: 'Call logged successfully',
    });
  } catch (error) {
    console.error('Error creating call:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to log call',
    });
  }
});

// PUT /api/calls/:id - Update call
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data: UpdateCallRequest = req.body;
    
    const call = await databaseService.updateCall(id, data);
    
    if (!call) {
      return res.status(404).json({
        success: false,
        error: 'Call not found',
      });
    }

    res.json({
      success: true,
      data: call,
      message: 'Call updated successfully',
    });
  } catch (error) {
    console.error('Error updating call:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update call',
    });
  }
});

// DELETE /api/calls/:id - Delete call
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = await databaseService.deleteCall(id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Call not found',
      });
    }

    res.json({
      success: true,
      message: 'Call deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting call:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete call',
    });
  }
});

export default router;







