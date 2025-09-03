import { Settings } from '@iam-fileserver/shared';
import fs from 'fs-extra';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'settings.json');

export class SettingsService {
  private settings: Settings | null = null;

  private getDefaultSettings(): Settings {
    return {
    };
  }

  async getSettings(): Promise<Settings> {
    if (this.settings) {
      return this.settings;
    }

    try {
      // Ensure data directory exists
      await fs.ensureDir(path.dirname(SETTINGS_FILE));
      
      if (await fs.pathExists(SETTINGS_FILE)) {
        const data = await fs.readJson(SETTINGS_FILE);
        this.settings = { ...this.getDefaultSettings(), ...data };
      } else {
        this.settings = this.getDefaultSettings();
        await this.saveSettings();
      }
    } catch (error) {
      console.error('Error loading settings, using defaults:', error);
      this.settings = this.getDefaultSettings();
    }

    // Ensure we always return settings
    if (!this.settings) {
      this.settings = this.getDefaultSettings();
    }

    return this.settings;
  }

  async updateSettings(newSettings: Partial<Settings>): Promise<Settings> {
    const currentSettings = await this.getSettings();
    
    // Deep merge settings
    this.settings = {
      ...currentSettings,
      ...newSettings
    };

    await this.saveSettings();
    return this.settings;
  }

  async resetToDefaults(): Promise<Settings> {
    this.settings = this.getDefaultSettings();
    await this.saveSettings();
    return this.settings;
  }

  private async saveSettings(): Promise<void> {
    if (!this.settings) return;

    try {
      await fs.ensureDir(path.dirname(SETTINGS_FILE));
      await fs.writeJson(SETTINGS_FILE, this.settings, { spaces: 2 });
    } catch (error) {
      console.error('Error saving settings:', error);
      throw new Error('Failed to save settings');
    }
  }

  // Get specific setting values




}
