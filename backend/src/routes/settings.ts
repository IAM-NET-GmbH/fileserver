import { Router } from 'express';
import { SettingsService } from '../services/SettingsService';
import { ApiResponse, Settings } from '@iam-fileserver/shared';

const router = Router();
const settingsService = new SettingsService();

/**
 * GET /api/settings
 * Get system settings
 */
router.get('/', async (req, res) => {
  try {
    const settings = await settingsService.getSettings();
    
    const response: ApiResponse<Settings> = {
      success: true,
      data: settings,
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error getting settings:', error);
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
    
    res.status(500).json(response);
  }
});

/**
 * PUT /api/settings
 * Update system settings
 */
router.put('/', async (req, res) => {
  try {
    const updatedSettings = await settingsService.updateSettings(req.body);
    
    const response: ApiResponse<Settings> = {
      success: true,
      data: updatedSettings,
      message: 'Einstellungen erfolgreich gespeichert',
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error updating settings:', error);
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
    
    res.status(500).json(response);
  }
});

/**
 * POST /api/settings/reset
 * Reset settings to default values
 */
router.post('/reset', async (req, res) => {
  try {
    const defaultSettings = await settingsService.resetToDefaults();
    
    const response: ApiResponse<Settings> = {
      success: true,
      data: defaultSettings,
      message: 'Einstellungen wurden auf Standardwerte zurückgesetzt',
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error resetting settings:', error);
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
    
    res.status(500).json(response);
  }
});

export default router;
