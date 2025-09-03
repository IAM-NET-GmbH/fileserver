import { Router, Request, Response } from 'express';
import { ApiResponse } from '@iam-fileserver/shared';
import { authenticateUser, generateToken, AuthRequest, requireAuth, hasUsers } from '../middleware/auth';
import { ActivityLogger } from '../models/Activity';
import { UserService } from '../services/UserService';

const router = Router();
const userService = new UserService();

// POST /api/auth/login - User login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
        timestamp: new Date().toISOString()
      });
    }

    const user = await authenticateUser(email, password);
    
    if (!user) {
      ActivityLogger.logAuth(`Login fehlgeschlagen für ${email}`, 'error', 'Ungültige Anmeldedaten');
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        timestamp: new Date().toISOString()
      });
    }

    const token = generateToken(user);
    ActivityLogger.logAuth(`Benutzer ${email} erfolgreich angemeldet`, 'success');

    const response: ApiResponse = {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        },
        token
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

// GET /api/auth/setup-required - Check if initial setup is needed
router.get('/setup-required', async (req: Request, res: Response) => {
  try {
    const setupRequired = !(await hasUsers());
    
    const response: ApiResponse = {
      success: true,
      data: { setupRequired },
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

// POST /api/auth/setup - Initial admin user setup
router.post('/setup', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'E-Mail, Passwort und Name sind erforderlich',
        timestamp: new Date().toISOString()
      });
    }

    // Check if setup is allowed
    const setupRequired = !(await hasUsers());
    if (!setupRequired) {
      return res.status(403).json({
        success: false,
        error: 'Initial Setup ist nicht möglich, da bereits Benutzer existieren',
        timestamp: new Date().toISOString()
      });
    }

    const user = await userService.createInitialAdmin({ email, password, name });
    const token = generateToken(user);

    ActivityLogger.logAuth(`Initial Admin ${email} wurde erstellt`, 'success');

    const response: ApiResponse = {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        token
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

// POST /api/auth/logout - User logout (client-side token removal)
router.post('/logout', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    if (req.user) {
      ActivityLogger.logAuth(`Benutzer ${req.user.email} abgemeldet`, 'info');
    }

    const response: ApiResponse = {
      success: true,
      message: 'Successfully logged out',
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

// GET /api/auth/me - Get current user info (fresh from database)
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // Get fresh user data from database
    const user = await userService.getUserById(req.user!.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        timestamp: new Date().toISOString()
      });
    }

    const response: ApiResponse = {
      success: true,
      data: {
        user
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

// POST /api/auth/check-token - Verify token validity
router.post('/check-token', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const response: ApiResponse = {
      success: true,
      data: {
        valid: true,
        user: req.user
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

// POST /api/auth/change-password - Change user password
router.post('/change-password', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Aktuelles und neues Passwort sind erforderlich',
        timestamp: new Date().toISOString()
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Neues Passwort muss mindestens 6 Zeichen lang sein',
        timestamp: new Date().toISOString()
      });
    }

    await userService.changePassword(req.user!.id, currentPassword, newPassword);

    ActivityLogger.logAuth(`Passwort geändert für ${req.user!.email}`, 'info');

    const response: ApiResponse = {
      success: true,
      data: { message: 'Passwort wurde erfolgreich geändert' },
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

