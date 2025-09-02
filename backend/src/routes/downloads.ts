import { Router, Request, Response } from 'express';
import { DownloadRepository } from '../repositories/DownloadRepository';
import { FileService } from '../services/FileService';
import { ApiResponse, DownloadFilter, SortOptions } from '@iam-fileserver/shared';
import path from 'path';

const router = Router();
const downloadRepository = new DownloadRepository();
const fileService = new FileService();

// GET /api/downloads - Get all downloads with filtering and pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      providerId,
      category,
      search,
      dateFrom,
      dateTo,
      tags,
      sortField = 'downloadedAt',
      sortDirection = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    const filter: DownloadFilter = {};
    if (providerId) filter.providerId = providerId as string;
    if (category) filter.category = category as string;
    if (search) filter.search = search as string;
    if (dateFrom) filter.dateFrom = new Date(dateFrom as string);
    if (dateTo) filter.dateTo = new Date(dateTo as string);
    if (tags) filter.tags = Array.isArray(tags) ? tags as string[] : [tags as string];

    const sort: SortOptions = {
      field: sortField as string,
      direction: sortDirection as 'asc' | 'desc'
    };

    const result = await downloadRepository.findAll(
      filter,
      sort,
      parseInt(page as string),
      parseInt(limit as string)
    );

    const response: ApiResponse = {
      success: true,
      data: result,
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

// GET /api/downloads/:id - Get download by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const download = await downloadRepository.findById(id);

    if (!download) {
      const response: ApiResponse = {
        success: false,
        error: 'Download not found',
        timestamp: new Date().toISOString()
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: download,
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

// GET /api/downloads/:id/download - Download file
router.get('/:id/download', async (req: Request, res: Response) => {
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
    
    if (!fileStats.exists) {
      return res.status(404).json({
        success: false,
        error: 'File not found on disk',
        timestamp: new Date().toISOString()
      });
    }

    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${download.fileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', fileStats.size || 0);

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

// DELETE /api/downloads/:id - Delete download
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const download = await downloadRepository.findById(id);

    if (!download) {
      const response: ApiResponse = {
        success: false,
        error: 'Download not found',
        timestamp: new Date().toISOString()
      };
      return res.status(404).json(response);
    }

    // Delete file from disk
    try {
      await fileService.deleteFile(download.filePath);
    } catch (error) {
      console.warn(`Failed to delete file ${download.filePath}:`, error);
    }

    // Delete from database
    await downloadRepository.delete(id);

    const response: ApiResponse = {
      success: true,
      message: 'Download deleted successfully',
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

// GET /api/downloads/stats - Get download statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await downloadRepository.getStats();

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

export default router;
