import { Router, Request, Response } from 'express';
import { ApiResponse, HealthCheck, ProviderHealthCheck } from '@iam-fileserver/shared';
import { ProviderService } from '../services/ProviderService';
import { FileService } from '../services/FileService';
import { DownloadRepository } from '../repositories/DownloadRepository';
import { Database } from '../database/database';
import os from 'os';

const router = Router();
let providerService: ProviderService;
let fileService: FileService;
let downloadRepository: DownloadRepository;

// Initialize services
const initializeServices = async () => {
  if (!providerService) {
    providerService = new ProviderService();
    await providerService.initialize();
  }
  if (!fileService) {
    fileService = new FileService();
  }
  if (!downloadRepository) {
    downloadRepository = new DownloadRepository();
  }
};

// GET /api/health - Health check endpoint
router.get('/', async (req: Request, res: Response) => {
  try {
    await initializeServices();

    // Get system uptime
    const uptime = process.uptime();



    // Get providers status
    const providers = await providerService.getAllProviders();
    const providerHealthChecks: ProviderHealthCheck[] = providers.map(provider => ({
      id: provider.id,
      name: provider.name,
      status: provider.status,
      lastCheck: provider.lastCheck,
      lastSuccess: provider.lastCheck, // Simplified - in a real app you'd track success separately
      errorMessage: provider.status === 'error' ? 'Provider encountered an error' : undefined
    }));

    // Get disk usage
    const diskUsage = await fileService.getDiskUsage();

    // Determine overall system status
    let systemStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    
    if (providers.some(p => p.enabled && p.status === 'error')) {
      systemStatus = 'degraded';
    }

    const healthCheck: HealthCheck = {
      status: systemStatus,
      version: process.env.npm_package_version || '1.0.0',
      uptime,
      providers: providerHealthChecks,
      disk: {
        totalSpace: diskUsage.total,
        freeSpace: diskUsage.free,
        usedSpace: diskUsage.used
      }
    };

    const response: ApiResponse<HealthCheck> = {
      success: true,
      data: healthCheck,
      timestamp: new Date().toISOString()
    };

    // Return appropriate HTTP status code based on health
    const statusCode = systemStatus === 'healthy' ? 200 : 
                      systemStatus === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
    res.status(503).json(response);
  }
});

// GET /api/health/status - Simple status endpoint
router.get('/status', async (req: Request, res: Response) => {
  try {
    await initializeServices();

    const providers = await providerService.getAllProviders();
    const enabledProviders = providers.filter(p => p.enabled);
    const activeProviders = enabledProviders.filter(p => p.status === 'active');

    const status = {
      status: 'online',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      providers: {
        total: providers.length,
        enabled: enabledProviders.length,
        active: activeProviders.length,
        lastCheck: enabledProviders.length > 0 
          ? Math.max(...enabledProviders.map(p => p.lastCheck?.getTime() || 0))
          : null
      },
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version
      }
    };

    const response: ApiResponse = {
      success: true,
      data: status,
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

// GET /api/health/providers - Provider-specific health information
router.get('/providers', async (req: Request, res: Response) => {
  try {
    await initializeServices();

    const providers = await providerService.getAllProviders();
    const providerHealth = providers.map(provider => ({
      id: provider.id,
      name: provider.name,
      enabled: provider.enabled,
      status: provider.status,
      lastCheck: provider.lastCheck,
      timeSinceLastCheck: provider.lastCheck 
        ? Date.now() - provider.lastCheck.getTime() 
        : null,
      description: provider.description
    }));

    const response: ApiResponse = {
      success: true,
      data: {
        providers: providerHealth,
        summary: {
          total: providers.length,
          enabled: providers.filter(p => p.enabled).length,
          active: providers.filter(p => p.status === 'active').length,
          error: providers.filter(p => p.status === 'error').length
        }
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
