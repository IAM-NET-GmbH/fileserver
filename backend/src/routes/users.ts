import { Router, Response } from 'express';
import { ApiResponse } from '@iam-fileserver/shared';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { UserService } from '../services/UserService';
import { ActivityLogger } from '../models/Activity';

const router = Router();
const userService = new UserService();

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

// GET /api/users - Get all users (Admin only)
router.get('/', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const users = await userService.getAllUsers();

    const response: ApiResponse = {
      success: true,
      data: { users },
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

// GET /api/users/:id - Get user by ID (Admin only)
router.get('/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Benutzer nicht gefunden',
        timestamp: new Date().toISOString()
      });
    }

    const response: ApiResponse = {
      success: true,
      data: { user },
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

// POST /api/users - Create new user (Admin only)
router.post('/', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'E-Mail, Passwort und Name sind erforderlich',
        timestamp: new Date().toISOString()
      });
    }

    if (role && !['user', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Ungültige Rolle. Erlaubt: user, admin',
        timestamp: new Date().toISOString()
      });
    }

    const user = await userService.createUser({
      email,
      password,
      name,
      role: role || 'user'
    });

    ActivityLogger.logAuth(`Neuer Benutzer ${email} wurde erstellt von ${req.user?.email}`, 'success');

    const response: ApiResponse = {
      success: true,
      data: { user },
      timestamp: new Date().toISOString()
    };

    res.status(201).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
    res.status(400).json(response);
  }
});

// PUT /api/users/:id - Update user (Admin only)
router.put('/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { email, password, name, role, is_active } = req.body;

    if (role && !['user', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Ungültige Rolle. Erlaubt: user, admin',
        timestamp: new Date().toISOString()
      });
    }

    const updateData: any = {};
    if (email) updateData.email = email;
    if (password) updateData.password = password;
    if (name) updateData.name = name;
    if (role) updateData.role = role;
    if (is_active !== undefined) updateData.is_active = is_active;

    const user = await userService.updateUser(id, updateData);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Benutzer nicht gefunden',
        timestamp: new Date().toISOString()
      });
    }

    ActivityLogger.logAuth(`Benutzer ${user.email} wurde aktualisiert von ${req.user?.email}`, 'info');

    const response: ApiResponse = {
      success: true,
      data: { user },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
    res.status(400).json(response);
  }
});

// DELETE /api/users/:id - Delete user (Admin only)
router.delete('/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user!.id;

    const userToDelete = await userService.getUserById(id);
    if (!userToDelete) {
      return res.status(404).json({
        success: false,
        error: 'Benutzer nicht gefunden',
        timestamp: new Date().toISOString()
      });
    }

    const success = await userService.deleteUser(id, currentUserId);

    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Benutzer konnte nicht gelöscht werden',
        timestamp: new Date().toISOString()
      });
    }

    ActivityLogger.logAuth(`Benutzer ${userToDelete.email} wurde gelöscht von ${req.user?.email}`, 'info');

    const response: ApiResponse = {
      success: true,
      data: { message: 'Benutzer wurde erfolgreich gelöscht' },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
    res.status(400).json(response);
  }
});

export default router;
