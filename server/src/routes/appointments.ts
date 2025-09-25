import { Router, Request, Response } from 'express';
import { databaseService } from '../services/database';
import { CreateAppointmentRequest, UpdateAppointmentRequest } from '../types/database';

const router = Router();

// GET /api/appointments - Get all appointments
router.get('/', async (req: Request, res: Response) => {
  try {
    const appointments = await databaseService.getAllAppointments();
    
    res.json({
      success: true,
      data: appointments,
      count: appointments.length,
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch appointments',
    });
  }
});

// GET /api/appointments/:id - Get appointment by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const appointment = await databaseService.getAppointment(id);
    
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found',
      });
    }

    res.json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    console.error('Error fetching appointment:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch appointment',
    });
  }
});

// POST /api/appointments - Create new appointment
router.post('/', async (req: Request, res: Response) => {
  try {
    const data: CreateAppointmentRequest = req.body;
    
    // Validate required fields
    if (!data.jobId || !data.bay || !data.startAt || !data.endAt) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: jobId, bay, startAt, endAt',
      });
    }

    const appointment = await databaseService.createAppointment(data);
    
    res.status(201).json({
      success: true,
      data: appointment,
      message: 'Appointment created successfully',
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create appointment',
    });
  }
});

// PUT /api/appointments/:id - Update appointment
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data: UpdateAppointmentRequest = req.body;
    
    const appointment = await databaseService.updateAppointment(id, data);
    
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found',
      });
    }

    res.json({
      success: true,
      data: appointment,
      message: 'Appointment updated successfully',
    });
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update appointment',
    });
  }
});

// DELETE /api/appointments/:id - Delete appointment
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = await databaseService.deleteAppointment(id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found',
      });
    }

    res.json({
      success: true,
      message: 'Appointment deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete appointment',
    });
  }
});

export default router;











