import { Router, Response } from 'express';
import { ApiResponse } from '@iam-fileserver/shared';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { ApiTokenService } from '../services/ApiTokenService';
import { ActivityLogger } from '../models/Activity';

const router = Router();
const apiTokenService = new ApiTokenService();

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

// GET /api/api-tokens - Get all API tokens (Admin only)
router.get('/', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tokens = await apiTokenService.getAllTokens();

    // Hide actual token values for security
    const sanitizedTokens = tokens.map(token => ({
      ...token,
      token: `${token.token.substring(0, 8)}...${token.token.substring(token.token.length - 4)}`
    }));

    const response: ApiResponse = {
      success: true,
      data: { tokens: sanitizedTokens },
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

// GET /api/api-tokens/stats - Get token statistics (Admin only)
router.get('/stats', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const stats = await apiTokenService.getTokenStats();

    const response: ApiResponse = {
      success: true,
      data: stats,
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

// GET /api/api-tokens/:id - Get API token by ID (Admin only)
router.get('/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const token = await apiTokenService.getTokenById(id);

    if (!token) {
      return res.status(404).json({
        success: false,
        error: 'API Token nicht gefunden',
        timestamp: new Date().toISOString()
      });
    }

    // Show full token only on individual request
    const response: ApiResponse = {
      success: true,
      data: { token },
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

// POST /api/api-tokens - Create new API token (Admin only)
router.post('/', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, expires_at } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Token-Name ist erforderlich',
        timestamp: new Date().toISOString()
      });
    }

    const tokenData = {
      name,
      description,
      created_by: req.user!.id,
      expires_at: expires_at ? new Date(expires_at) : undefined
    };

    const token = await apiTokenService.createToken(tokenData);

    ActivityLogger.logSystemEvent(`API Token '${name}' wurde erstellt von ${req.user!.email}`, 'success');

    const response: ApiResponse = {
      success: true,
      data: { token },
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

// PUT /api/api-tokens/:id - Update API token (Admin only)
router.put('/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, is_active, expires_at } = req.body;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (expires_at !== undefined) updateData.expires_at = expires_at ? new Date(expires_at) : null;

    const token = await apiTokenService.updateToken(id, updateData);

    if (!token) {
      return res.status(404).json({
        success: false,
        error: 'API Token nicht gefunden',
        timestamp: new Date().toISOString()
      });
    }

    ActivityLogger.logSystemEvent(`API Token '${token.name}' wurde aktualisiert von ${req.user!.email}`, 'info');

    const response: ApiResponse = {
      success: true,
      data: { token },
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

// DELETE /api/api-tokens/:id - Delete API token (Admin only)
router.delete('/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const tokenToDelete = await apiTokenService.getTokenById(id);
    if (!tokenToDelete) {
      return res.status(404).json({
        success: false,
        error: 'API Token nicht gefunden',
        timestamp: new Date().toISOString()
      });
    }

    const success = await apiTokenService.deleteToken(id);

    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'API Token konnte nicht gelöscht werden',
        timestamp: new Date().toISOString()
      });
    }

    ActivityLogger.logSystemEvent(`API Token '${tokenToDelete.name}' wurde gelöscht von ${req.user!.email}`, 'info');

    const response: ApiResponse = {
      success: true,
      data: { message: 'API Token wurde erfolgreich gelöscht' },
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
