import { Router, Request, Response } from 'express';
import { databaseService } from '../services/database';
import { CreateVehicleRequest, UpdateVehicleRequest, VehicleQueryFilters } from '../types/database';

const router = Router();

const parseIdsParam = (value: unknown): string[] | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const ids = value.split(',').map((token) => token.trim()).filter(Boolean);
  return ids.length > 0 ? ids : undefined;
};

const parseNumberParam = (value: unknown): number | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};

// GET /api/vehicles - Get all vehicles
router.get('/', async (req: Request, res: Response) => {
  try {
    const filters: VehicleQueryFilters = {};
    const { customerId, ids, make, model, year, search } = req.query;

    if (typeof customerId === 'string' && customerId.trim()) {
      filters.customerId = customerId.trim();
    }

    const parsedIds = parseIdsParam(ids);
    if (parsedIds) {
      filters.ids = parsedIds;
    }

    if (typeof make === 'string' && make.trim()) {
      filters.make = make.trim();
    }

    if (typeof model === 'string' && model.trim()) {
      filters.model = model.trim();
    }

    const parsedYear = parseNumberParam(year);
    if (parsedYear !== undefined) {
      filters.year = parsedYear;
    }

    if (typeof search === 'string' && search.trim()) {
      filters.search = search.trim();
    }

    const vehicles = await databaseService.getAllVehicles(filters);

    res.json({
      success: true,
      data: vehicles,
      count: vehicles.length,
    });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch vehicles',
    });
  }
});

// GET /api/vehicles/search - Search vehicles
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!query) {
      return res.json({ success: true, data: [], count: 0 });
    }

    const vehicles = await databaseService.getAllVehicles({ search: query });
    res.json({ success: true, data: vehicles, count: vehicles.length });
  } catch (error) {
    console.error('Error searching vehicles:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search vehicles',
    });
  }
});

// GET /api/vehicles/stats - Aggregate vehicle statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const filters: VehicleQueryFilters = {};
    if (typeof req.query.customerId === 'string' && req.query.customerId.trim()) {
      filters.customerId = req.query.customerId.trim();
    }

    const vehicles = await databaseService.getAllVehicles(filters);
    const byMake = vehicles.reduce<Record<string, number>>((acc, vehicle) => {
      acc[vehicle.make] = (acc[vehicle.make] || 0) + 1;
      return acc;
    }, {});
    const byYear = vehicles.reduce<Record<string, number>>((acc, vehicle) => {
      const key = String(vehicle.year);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        total: vehicles.length,
        byMake,
        byYear,
      },
    });
  } catch (error) {
    console.error('Error fetching vehicle stats:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch vehicle stats',
    });
  }
});

// GET /api/vehicles/alerts - Vehicles with maintenance alerts (placeholder)
router.get('/alerts', async (_req: Request, res: Response) => {
  res.json({ success: true, data: [], count: 0 });
});

// GET /api/vehicles/:id/service-history - Service history for a vehicle
router.get('/:id/service-history', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const jobs = await databaseService.getAllJobs({ vehicleId: id });
    res.json({ success: true, data: jobs, count: jobs.length });
  } catch (error) {
    console.error('Error fetching vehicle service history:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch vehicle service history',
    });
  }
});
// GET /api/vehicles/:id - Get vehicle by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const vehicle = await databaseService.getVehicle(id);
    
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found',
      });
    }

    res.json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch vehicle',
    });
  }
});

// POST /api/vehicles - Create new vehicle
router.post('/', async (req: Request, res: Response) => {
  try {
    const data: CreateVehicleRequest = req.body;
    
    // Validate required fields
    if (!data.customerId || !data.year || !data.make || !data.model) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: customerId, year, make, model',
      });
    }

    const vehicle = await databaseService.createVehicle(data);
    
    res.status(201).json({
      success: true,
      data: vehicle,
      message: 'Vehicle created successfully',
    });
  } catch (error) {
    console.error('Error creating vehicle:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create vehicle',
    });
  }
});

// PUT /api/vehicles/:id - Update vehicle
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data: UpdateVehicleRequest = req.body;
    
    const vehicle = await databaseService.updateVehicle(id, data);
    
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found',
      });
    }

    res.json({
      success: true,
      data: vehicle,
      message: 'Vehicle updated successfully',
    });
  } catch (error) {
    console.error('Error updating vehicle:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update vehicle',
    });
  }
});

// DELETE /api/vehicles/:id - Delete vehicle
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = await databaseService.deleteVehicle(id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found',
      });
    }

    res.json({
      success: true,
      message: 'Vehicle deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete vehicle',
    });
  }
});

export default router;

