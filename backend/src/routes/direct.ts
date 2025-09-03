import { Router, Request, Response } from 'express';
import { DownloadRepository } from '../repositories/DownloadRepository';
import { FileService } from '../services/FileService';
import { ApiResponse } from '@iam-fileserver/shared';
import { ActivityLogger } from '../models/Activity';
import { ApiTokenService } from '../services/ApiTokenService';
import crypto from 'crypto';
import path from 'path';

const router = Router();
const downloadRepository = new DownloadRepository();
const fileService = new FileService();
const apiTokenService = new ApiTokenService();

// Middleware to check API token authentication
const checkApiToken = async (req: Request, res: Response, next: Function) => {
  const authHeader = req.headers.authorization;
  const apiToken = req.headers['x-api-token'] as string;
  
  if (!authHeader && !apiToken) {
    return next(); // Continue without auth for temporary tokens
  }

  try {
    let tokenString = apiToken;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      tokenString = authHeader.substring(7);
    }

    if (tokenString) {
      const token = await apiTokenService.validateToken(tokenString);
      if (token) {
        (req as any).apiToken = token;
      }
    }
  } catch (error) {
    console.error('API token check error:', error);
  }
  
  next();
};

// Store for temporary download tokens
const downloadTokens = new Map<string, { downloadId: string; expiresAt: Date; filename: string }>();

// Cleanup expired tokens every hour
setInterval(() => {
  const now = new Date();
  for (const [token, data] of downloadTokens.entries()) {
    if (data.expiresAt < now) {
      downloadTokens.delete(token);
    }
  }
}, 60 * 60 * 1000);

// GET /api/direct/:id/token - Generate direct download token
router.get('/:id/token', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { expires = '1d' } = req.query;

    const download = await downloadRepository.findById(id);
    if (!download) {
      return res.status(404).json({
        success: false,
        error: 'Download not found',
        timestamp: new Date().toISOString()
      });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Calculate expiration
    let expiresAt = new Date();
    if (expires === '1h') {
      expiresAt.setHours(expiresAt.getHours() + 1);
    } else if (expires === '1d') {
      expiresAt.setDate(expiresAt.getDate() + 1);
    } else if (expires === '7d') {
      expiresAt.setDate(expiresAt.getDate() + 7);
    } else if (expires === '30d') {
      expiresAt.setDate(expiresAt.getDate() + 30);
    } else {
      expiresAt.setDate(expiresAt.getDate() + 1); // Default 1 day
    }

    // Store token
    downloadTokens.set(token, {
      downloadId: id,
      expiresAt,
      filename: download.fileName
    });

    const directUrl = `${req.protocol}://${req.get('host')}/api/direct/${token}`;

    ActivityLogger.logSystemEvent(`Direct download link erstellt für: ${download.title}`, 'info');

    const response: ApiResponse = {
      success: true,
      data: {
        token,
        directUrl,
        expiresAt: expiresAt.toISOString(),
        filename: download.fileName,
        curlCommand: `curl -L -O "${directUrl}"`,
        wgetCommand: `wget "${directUrl}"`
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

// GET /api/direct/download/:id - Direct download with API token
router.get('/download/:id', checkApiToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const apiToken = (req as any).apiToken;

    if (!apiToken) {
      return res.status(401).json({
        success: false,
        error: 'Gültiger API Token erforderlich für Direktdownload',
        timestamp: new Date().toISOString()
      });
    }

    const download = await downloadRepository.findById(id);
    if (!download) {
      return res.status(404).json({
        success: false,
        error: 'Download not found',
        timestamp: new Date().toISOString()
      });
    }

    const fileStats = await fileService.getFileStats(download.filePath);
    if (!fileStats.exists) {
      return res.status(404).json({
        success: false,
        error: 'File not found on disk',
        timestamp: new Date().toISOString()
      });
    }

    ActivityLogger.logSystemEvent(`API Direct download: ${download.title} using token '${apiToken.name}'`, 'success');

    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${download.fileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', fileStats.size || 0);
    res.setHeader('X-Download-Name', download.title);
    res.setHeader('X-Download-Version', download.version);
    res.setHeader('X-Provider-Id', download.providerId);

    // Send file
    res.sendFile(path.resolve(download.filePath));
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
    res.status(500).json(response);
  }
});

// GET /api/direct/:token - Download file using token
router.get('/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const tokenData = downloadTokens.get(token);
    if (!tokenData) {
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired download token',
        timestamp: new Date().toISOString()
      });
    }

    // Check if token expired
    if (tokenData.expiresAt < new Date()) {
      downloadTokens.delete(token);
      return res.status(410).json({
        success: false,
        error: 'Download token has expired',
        timestamp: new Date().toISOString()
      });
    }

    const download = await downloadRepository.findById(tokenData.downloadId);
    if (!download) {
      downloadTokens.delete(token);
      return res.status(404).json({
        success: false,
        error: 'Download file not found',
        timestamp: new Date().toISOString()
      });
    }

    const fileStats = await fileService.getFileStats(download.filePath);
    if (!fileStats.exists) {
      return res.status(404).json({
        success: false,
        error: 'File not found on disk',
        timestamp: new Date().toISOString()
      });
    }

    ActivityLogger.logSystemEvent(`Direct download: ${download.title}`, 'success');

    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${download.fileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', fileStats.size || 0);
    res.setHeader('X-Download-Name', download.title);
    res.setHeader('X-Download-Version', download.version);
    res.setHeader('X-Provider-Id', download.providerId);

    // Send file
    res.sendFile(path.resolve(download.filePath));
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
    res.status(500).json(response);
  }
});

// GET /api/direct/:id/info - Get download info without downloading
router.get('/:id/info', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const download = await downloadRepository.findById(id);
    if (!download) {
      return res.status(404).json({
        success: false,
        error: 'Download not found',
        timestamp: new Date().toISOString()
      });
    }

    const fileStats = await fileService.getFileStats(download.filePath);

    const response: ApiResponse = {
      success: true,
      data: {
        id: download.id,
        title: download.title,
        version: download.version,
        fileName: download.fileName,
        fileSize: download.fileSize,
        provider: download.providerId,
        downloadedAt: download.downloadedAt,
        available: fileStats.exists,
        directDownloadUrl: `${req.protocol}://${req.get('host')}/api/downloads/${id}/download`,
        apiUrl: `${req.protocol}://${req.get('host')}/api/direct/${id}/token`,
        directApiDownloadUrl: `${req.protocol}://${req.get('host')}/api/direct/download/${id}`
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

// GET /api/direct/tokens/list - List active tokens (admin only)
router.get('/tokens/list', async (req: Request, res: Response) => {
  try {
    const activeTokens = Array.from(downloadTokens.entries()).map(([token, data]) => ({
      token: token.substring(0, 8) + '...',  // Only show first 8 chars for security
      downloadId: data.downloadId,
      filename: data.filename,
      expiresAt: data.expiresAt.toISOString(),
      expired: data.expiresAt < new Date()
    }));

    const response: ApiResponse = {
      success: true,
      data: {
        activeTokens: activeTokens.filter(t => !t.expired),
        expiredTokens: activeTokens.filter(t => t.expired).length,
        totalTokens: downloadTokens.size
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
