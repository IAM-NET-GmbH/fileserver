import { Router, Request, Response } from 'express';
import { ApiResponse } from '@iam-fileserver/shared';
import { ActivityLogger } from '../models/Activity';

const router = Router();

// GET /api/activities - Get recent activities
router.get('/', async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;
    const activities = ActivityLogger.getRecent(parseInt(limit as string));

    const response: ApiResponse = {
      success: true,
      data: activities,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
    res.status(500).json(response);
  }
});

// GET /api/activities/all - Get all activities
router.get('/all', async (req: Request, res: Response) => {
  try {
    const activities = ActivityLogger.getAll();

    const response: ApiResponse = {
      success: true,
      data: activities,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
    res.status(500).json(response);
  }
});

// POST /api/activities/test - Add test activities (development only)
router.post('/test', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: 'Test endpoint not available in production',
      timestamp: new Date().toISOString()
    });
  }

  try {
    // Add some test activities
    ActivityLogger.logSystemEvent('IAM File Server gestartet', 'success');
    ActivityLogger.logProviderCheck('bmw-aos', 'BMW AOS Center', 'success');
    ActivityLogger.logDownload('bmw-aos', 'BMW ISTA-P v4.35.20', 'success');
    ActivityLogger.logSystemEvent('Automatische Bereinigung durchgeführt', 'info');
    ActivityLogger.logProviderCheck('bmw-aos', 'BMW AOS Center', 'success');

    const response: ApiResponse = {
      success: true,
      message: 'Test activities added',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
    res.status(500).json(response);
  }
});

// DELETE /api/activities - Clear all activities
router.delete('/', async (req: Request, res: Response) => {
  try {
    ActivityLogger.clear();

    const response: ApiResponse = {
      success: true,
      message: 'All activities cleared',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
    res.status(500).json(response);
  }
});

export default router;
