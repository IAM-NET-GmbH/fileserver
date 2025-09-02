import { Router, Request, Response } from 'express';
import { ProviderService } from '../services/ProviderService';
import { ApiResponse } from '@iam-fileserver/shared';

const router = Router();
let providerService: ProviderService;

// Initialize provider service
const initializeProviderService = async () => {
  if (!providerService) {
    providerService = new ProviderService();
    await providerService.initialize();
  }
  return providerService;
};

// GET /api/providers - Get all providers
router.get('/', async (req: Request, res: Response) => {
  try {
    const service = await initializeProviderService();
    const providers = await service.getAllProviders();

    const response: ApiResponse = {
      success: true,
      data: providers,
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

// GET /api/providers/:id - Get provider by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const service = await initializeProviderService();
    const provider = await service.getProviderStatus(id);

    if (!provider) {
      const response: ApiResponse = {
        success: false,
        error: 'Provider not found',
        timestamp: new Date().toISOString()
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: provider,
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

// POST /api/providers/:id/enable - Enable provider
router.post('/:id/enable', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const service = await initializeProviderService();
    await service.enableProvider(id);

    const response: ApiResponse = {
      success: true,
      message: `Provider ${id} enabled successfully`,
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

// POST /api/providers/:id/disable - Disable provider
router.post('/:id/disable', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const service = await initializeProviderService();
    await service.disableProvider(id);

    const response: ApiResponse = {
      success: true,
      message: `Provider ${id} disabled successfully`,
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

// POST /api/providers/:id/check - Manually trigger provider check
router.post('/:id/check', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const service = await initializeProviderService();
    
    // Run check in background
    service.checkProvider(id).catch(error => {
      console.error(`Background check failed for provider ${id}:`, error);
    });

    const response: ApiResponse = {
      success: true,
      message: `Check initiated for provider ${id}`,
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

// PUT /api/providers/:id/config - Update provider configuration
router.put('/:id/config', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { config } = req.body;

    if (!config) {
      const response: ApiResponse = {
        success: false,
        error: 'Configuration is required',
        timestamp: new Date().toISOString()
      };
      return res.status(400).json(response);
    }

    const service = await initializeProviderService();
    await service.updateProviderConfig(id, config);

    const response: ApiResponse = {
      success: true,
      message: `Configuration updated for provider ${id}`,
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

// POST /api/providers/check-all - Check all enabled providers
router.post('/check-all', async (req: Request, res: Response) => {
  try {
    const service = await initializeProviderService();
    
    // Run checks in background
    service.checkAllProviders().catch(error => {
      console.error('Background check failed for all providers:', error);
    });

    const response: ApiResponse = {
      success: true,
      message: 'Check initiated for all enabled providers',
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
