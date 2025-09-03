import { Router, Response } from 'express';
import { ApiResponse } from '@iam-fileserver/shared';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { NotificationService } from '../services/NotificationService';
import { ActivityLogger } from '../models/Activity';

const router = Router();
const notificationService = new NotificationService();

// Middleware to require admin role
const requireAdmin = (req: AuthRequest, res: Response, next: Function) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Administratorrechte erforderlich',
      timestamp: new Date().toISOString()
    });
  }
  next();
};

// GET /api/notifications - Get user notifications
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const notifications = await notificationService.getUserNotifications(req.user!.id, limit);

    const response: ApiResponse = {
      success: true,
      data: { notifications },
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

// GET /api/notifications/unread - Get unread notifications
router.get('/unread', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await notificationService.getUnreadNotifications(req.user!.id);

    const response: ApiResponse = {
      success: true,
      data: { notifications },
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

// GET /api/notifications/unread/count - Get unread notification count
router.get('/unread/count', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const count = await notificationService.getUnreadCount(req.user!.id);

    const response: ApiResponse = {
      success: true,
      data: { count },
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

// POST /api/notifications/:id/read - Mark notification as read
router.post('/:id/read', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const success = await notificationService.markAsRead(id, req.user!.id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Benachrichtigung nicht gefunden',
        timestamp: new Date().toISOString()
      });
    }

    const response: ApiResponse = {
      success: true,
      data: { message: 'Benachrichtigung als gelesen markiert' },
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

// POST /api/notifications/read-all - Mark all notifications as read
router.post('/read-all', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const count = await notificationService.markAllAsRead(req.user!.id);

    const response: ApiResponse = {
      success: true,
      data: { 
        message: `${count} Benachrichtigungen als gelesen markiert`,
        count 
      },
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

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const success = await notificationService.deleteNotification(id, req.user!.id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Benachrichtigung nicht gefunden',
        timestamp: new Date().toISOString()
      });
    }

    const response: ApiResponse = {
      success: true,
      data: { message: 'Benachrichtigung gelöscht' },
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

// POST /api/notifications/broadcast - Create notification for all users (Admin only)
router.post('/broadcast', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { type, title, message, action_url, target } = req.body;

    if (!type || !title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Typ, Titel und Nachricht sind erforderlich',
        timestamp: new Date().toISOString()
      });
    }

    if (!['info', 'success', 'warning', 'error', 'system'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Ungültiger Benachrichtigungstyp',
        timestamp: new Date().toISOString()
      });
    }

    const notificationData = {
      type,
      title,
      message,
      action_url: action_url || undefined
    };

    if (target === 'admins') {
      await notificationService.createForAllAdmins(notificationData);
      ActivityLogger.logSystemEvent(`Broadcast Benachrichtigung an alle Admins gesendet: "${title}" von ${req.user!.email}`, 'info');
    } else {
      await notificationService.createForAllUsers(notificationData);
      ActivityLogger.logSystemEvent(`Broadcast Benachrichtigung an alle Benutzer gesendet: "${title}" von ${req.user!.email}`, 'info');
    }

    const response: ApiResponse = {
      success: true,
      data: { 
        message: `Benachrichtigung erfolgreich an ${target === 'admins' ? 'alle Admins' : 'alle Benutzer'} gesendet`
      },
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
