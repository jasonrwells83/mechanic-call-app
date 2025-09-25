import { Router } from 'express';
import { db } from '../config/instantdb';
import { databaseService } from '../services/database';

// Import route modules
import customerRoutes from './customers';
import vehicleRoutes from './vehicles';
import jobRoutes from './jobs';
import appointmentRoutes from './appointments';
import callRoutes from './calls';
import settingsRoutes from './settings';
import dashboardRoutes from './dashboard';

const router = Router();

// Test InstantDB connection
router.get('/test-db', async (req, res) => {
  try {
    // Simple test query - this will create the collections if they don't exist
    const result = await db.query({
      customers: {},
    });
    
    res.json({
      success: true,
      message: 'InstantDB connection successful',
      collections: Object.keys(result),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Database test failed:', error);
    res.status(500).json({
      success: false,
      message: 'InstantDB connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Health check for database service
router.get('/health', async (req, res) => {
  try {
    // Test database service
    const settings = await databaseService.getShopSettings();
    
    res.json({
      success: true,
      message: 'API and database service healthy',
      database: 'connected',
      settings: settings ? 'configured' : 'default',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database service error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Mount route modules
router.use('/customers', customerRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/jobs', jobRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/calls', callRoutes);
router.use('/settings', settingsRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;


