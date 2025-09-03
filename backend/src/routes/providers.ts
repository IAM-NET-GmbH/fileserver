import { Router, Request, Response } from 'express';
import { ProviderService } from '../services/ProviderService';
import { ApiResponse } from '@iam-fileserver/shared';

const router = Router();
let providerService: ProviderService | null = null;
let isInitializing = false;

// Initialize provider service with singleton pattern
const initializeProviderService = async (): Promise<ProviderService> => {
  // If already initialized, return existing instance
  if (providerService) {
    return providerService;
  }
  
  // If currently initializing, wait for it to complete
  if (isInitializing) {
    console.log('⏳ ProviderService initialization already in progress, waiting...');
    // Wait for initialization to complete
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (providerService) {
      return providerService;
    }
  }
  
  try {
    isInitializing = true;
    console.log('🚀 Initializing ProviderService for the first time...');
    providerService = new ProviderService();
    await providerService.initialize();
    console.log('✅ ProviderService initialized successfully');
    return providerService;
  } catch (error) {
    console.error('❌ Failed to initialize ProviderService:', error);
    providerService = null; // Reset on error
    throw error;
  } finally {
    isInitializing = false;
  }
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

// POST /api/providers - Create new provider
router.post('/', async (req: Request, res: Response) => {
  try {
    const { id, name, description, type, config } = req.body;
    
    if (!id || !name || !type || !config) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing required fields: id, name, type, config',
        timestamp: new Date().toISOString()
      };
      return res.status(400).json(response);
    }
    
    const service = await initializeProviderService();
    await service.createNewProvider({ id, name, description, type, config });
    
    const response: ApiResponse = {
      success: true,
      message: 'Provider created successfully',
      data: { id },
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
    const { config, name, description } = req.body;

    if (!config) {
      const response: ApiResponse = {
        success: false,
        error: 'Configuration is required',
        timestamp: new Date().toISOString()
      };
      return res.status(400).json(response);
    }

    const service = await initializeProviderService();
    await service.updateProviderConfig(id, config, name, description);

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

// POST /api/providers/:id/rescan - Rescan existing files for a provider
router.post('/:id/rescan', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const service = await initializeProviderService();
    
    // Run rescan in background
    service.rescanProviderFiles(id).catch(error => {
      console.error(`Background rescan failed for provider ${id}:`, error);
    });

    const response: ApiResponse = {
      success: true,
      message: `File rescan initiated for provider ${id}`,
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
