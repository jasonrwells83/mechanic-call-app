import { Router, Request, Response } from 'express';
import { databaseService } from '../services/database';
import { ShopSettings } from '../types/database';

const router = Router();

// GET /api/settings - Get shop settings
router.get('/', async (req: Request, res: Response) => {
  try {
    let settings = await databaseService.getShopSettings();
    
    // If no settings exist, create default ones
    if (!settings) {
      settings = await databaseService.createOrUpdateShopSettings({});
    }
    
    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch settings',
    });
  }
});

// PUT /api/settings - Update shop settings
router.put('/', async (req: Request, res: Response) => {
  try {
    const data: Partial<ShopSettings> = req.body;
    
    const settings = await databaseService.createOrUpdateShopSettings(data);
    
    res.json({
      success: true,
      data: settings,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update settings',
    });
  }
});

// GET /api/settings/business-hours - Get business hours only
router.get('/business-hours', async (req: Request, res: Response) => {
  try {
    const settings = await databaseService.getShopSettings();
    
    if (!settings) {
      return res.status(404).json({
        success: false,
        error: 'Settings not found',
      });
    }
    
    res.json({
      success: true,
      data: settings.businessHours,
    });
  } catch (error) {
    console.error('Error fetching business hours:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch business hours',
    });
  }
});

// GET /api/settings/bay-names - Get bay names only
router.get('/bay-names', async (req: Request, res: Response) => {
  try {
    const settings = await databaseService.getShopSettings();
    
    if (!settings) {
      return res.status(404).json({
        success: false,
        error: 'Settings not found',
      });
    }
    
    res.json({
      success: true,
      data: settings.bayNames,
    });
  } catch (error) {
    console.error('Error fetching bay names:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch bay names',
    });
  }
});

// GET /api/settings/status-colors - Get status colors only
router.get('/status-colors', async (req: Request, res: Response) => {
  try {
    const settings = await databaseService.getShopSettings();
    
    if (!settings) {
      return res.status(404).json({
        success: false,
        error: 'Settings not found',
      });
    }
    
    res.json({
      success: true,
      data: settings.statusColors,
    });
  } catch (error) {
    console.error('Error fetching status colors:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch status colors',
    });
  }
});

export default router;











