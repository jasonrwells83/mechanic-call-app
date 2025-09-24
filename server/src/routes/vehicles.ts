import { Router, Request, Response } from 'express';
import { databaseService } from '../services/database';
import { CreateVehicleRequest, UpdateVehicleRequest } from '../types/database';

const router = Router();

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










