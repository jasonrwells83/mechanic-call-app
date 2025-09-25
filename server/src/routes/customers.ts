import { Router, Request, Response } from 'express';
import { databaseService } from '../services/database';
import { CreateCustomerRequest, UpdateCustomerRequest, CustomerQueryFilters } from '../types/database';

const router = Router();

// GET /api/customers - Get all customers
router.get('/', async (req: Request, res: Response) => {
  try {
    const filters: CustomerQueryFilters = {
      search: req.query.search as string,
      preferredContact: req.query.preferredContact ?
        (req.query.preferredContact as string).split(',') as ('phone' | 'email')[] :
        undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    };

    const hasActiveJobsParam = req.query.hasActiveJobs;
    if (typeof hasActiveJobsParam === 'string') {
      filters.hasActiveJobs = hasActiveJobsParam === 'true';
    }

    const customers = await databaseService.getAllCustomers(filters);
    
    res.json({
      success: true,
      data: customers,
      count: customers.length,
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch customers',
    });
  }
});

// GET /api/customers/:id - Get customer by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const customer = await databaseService.getCustomer(id);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found',
      });
    }

    res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch customer',
    });
  }
});

// POST /api/customers - Create new customer
router.post('/', async (req: Request, res: Response) => {
  try {
    const data: CreateCustomerRequest = req.body;
    
    // Validate required fields
    if (!data.name || !data.phone || !data.preferredContact) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, phone, preferredContact',
      });
    }

    const customer = await databaseService.createCustomer(data);
    
    res.status(201).json({
      success: true,
      data: customer,
      message: 'Customer created successfully',
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create customer',
    });
  }
});

// PUT /api/customers/:id - Update customer
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data: UpdateCustomerRequest = req.body;
    
    const customer = await databaseService.updateCustomer(id, data);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found',
      });
    }

    res.json({
      success: true,
      data: customer,
      message: 'Customer updated successfully',
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update customer',
    });
  }
});

// DELETE /api/customers/:id - Delete customer
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = await databaseService.deleteCustomer(id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found',
      });
    }

    res.json({
      success: true,
      message: 'Customer deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete customer',
    });
  }
});

// GET /api/customers/:id/vehicles - Get customer's vehicles
router.get('/:id/vehicles', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // First check if customer exists
    const customer = await databaseService.getCustomer(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found',
      });
    }

    const vehicles = await databaseService.getVehiclesByCustomer(id);
    
    res.json({
      success: true,
      data: vehicles,
      count: vehicles.length,
    });
  } catch (error) {
    console.error('Error fetching customer vehicles:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch customer vehicles',
    });
  }
});

export default router;











