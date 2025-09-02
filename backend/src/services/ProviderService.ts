import { Provider, ProviderStatus, DownloadItem } from '@iam-fileserver/shared';
import { BaseProvider, ProviderDownload, BMWProvider } from '@iam-fileserver/providers';
import { ProviderRepository } from '../repositories/ProviderRepository';
import { DownloadRepository } from '../repositories/DownloadRepository';
import { FileService } from './FileService';
import { ActivityLogger } from '../models/Activity';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

export class ProviderService {
  private providers: Map<string, BaseProvider> = new Map();
  private providerRepository: ProviderRepository;
  private downloadRepository: DownloadRepository;
  private fileService: FileService;

  constructor() {
    this.providerRepository = new ProviderRepository();
    this.downloadRepository = new DownloadRepository();
    this.fileService = new FileService();
  }

  async initialize(): Promise<void> {
    await this.loadProviders();
    await this.initializeProviders();
  }

  private async loadProviders(): Promise<void> {
    const providerConfigs = await this.providerRepository.findAll();
    
    for (const config of providerConfigs) {
      if (config.enabled) {
        await this.createProvider(config);
      }
    }

    // Create default BMW provider if it doesn't exist
    if (!await this.providerRepository.exists('bmw-aos')) {
      await this.createDefaultBMWProvider();
    }
  }

  private async createDefaultBMWProvider(): Promise<void> {
    const bmwProvider: Provider = {
      id: 'bmw-aos',
      name: 'BMW AOS Center',
      description: 'BMW Aftermarket Online Services - ISTA-P und ISTA-Next Downloads',
      enabled: false, // Disabled by default until configured
      status: ProviderStatus.DISABLED,
      config: {
        username: process.env.BMW_USERNAME || '',
        password: process.env.BMW_PASSWORD || '',
        authUrl: process.env.BMW_AUTH_URL || 'https://aos.bmwgroup.com/auth/login',
        istaPUrl: process.env.BMW_ISTA_P_URL || 'https://aos.bmwgroup.com/ista-p',
        istaNextUrl: process.env.BMW_ISTA_NEXT_URL || 'https://aos.bmwgroup.com/ista-next',
        headless: process.env.HEADLESS === 'true'
      }
    };

    await this.providerRepository.create(bmwProvider);
    ActivityLogger.logSystemEvent(`BMW AOS Provider erstellt`, 'success');
  }

  private async createProvider(config: Provider): Promise<void> {
    let provider: BaseProvider | null = null;

    switch (config.id) {
      case 'bmw-aos':
        provider = new BMWProvider(config);
        break;
      // Add more providers here as needed
      default:
        console.warn(`Unknown provider type: ${config.id}`);
        return;
    }

    if (provider) {
      this.providers.set(config.id, provider);
    }
  }

  private async initializeProviders(): Promise<void> {
    for (const [id, provider] of this.providers.entries()) {
      try {
        await provider.initialize();
        await this.providerRepository.updateStatus(id, ProviderStatus.ACTIVE);
      } catch (error) {
        console.error(`Failed to initialize provider ${id}:`, error);
        await this.providerRepository.updateStatus(id, ProviderStatus.ERROR);
      }
    }
  }

  async checkAllProviders(): Promise<void> {
    const promises = Array.from(this.providers.entries()).map(async ([id, provider]) => {
      if (provider.isEnabled()) {
        await this.checkProvider(id);
      }
    });

    await Promise.allSettled(promises);
  }

  async checkProvider(providerId: string): Promise<void> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    try {
      await this.providerRepository.updateStatus(providerId, ProviderStatus.CHECKING);
      
      const downloads = await provider.checkForUpdates();
      let successCount = 0;
      let errorCount = 0;

      for (const download of downloads) {
        try {
          const isNew = await this.isNewDownload(providerId, download);
          if (isNew) {
            const success = await this.processDownload(providerId, download);
            if (success) {
              successCount++;
            } else {
              errorCount++;
            }
          }
        } catch (error) {
          console.error(`Error processing download from ${providerId}:`, error);
          errorCount++;
        }
      }

      await this.providerRepository.updateStatus(providerId, ProviderStatus.ACTIVE, new Date());
      console.log(`Provider ${providerId}: ${successCount} successful, ${errorCount} failed downloads`);
      
      const providerConfig = await this.providerRepository.findById(providerId);
      ActivityLogger.logProviderCheck(providerId, providerConfig?.name || providerId, 'success');

    } catch (error) {
      console.error(`Error checking provider ${providerId}:`, error);
      await this.providerRepository.updateStatus(providerId, ProviderStatus.ERROR);
      
      const providerConfig = await this.providerRepository.findById(providerId);
      ActivityLogger.logProviderCheck(providerId, providerConfig?.name || providerId, 'error');
    }
  }

  private async isNewDownload(providerId: string, download: ProviderDownload): Promise<boolean> {
    const existing = await this.downloadRepository.findAll({
      providerId,
      category: download.category
    });

    // Check if we already have this version
    const existingVersions = existing.items.map(item => item.version);
    return !existingVersions.includes(download.version) || download.version === 'unknown';
  }

  private async processDownload(providerId: string, download: ProviderDownload): Promise<boolean> {
    const provider = this.providers.get(providerId);
    if (!provider) return false;

    try {
      // Generate unique filename
      const originalFileName = this.extractFileName(download.url) || `${download.category}_${download.version}`;
      const fileName = await this.fileService.generateUniqueFileName(originalFileName);
      
      // Create target path
      const targetDir = await this.fileService.ensureProviderDirectory(providerId, download.category);
      const targetPath = path.join(targetDir, fileName);

      // Download file
      const success = await provider.downloadFile(download, targetPath);
      
      if (success) {
        // Get file stats
        const fileStats = await this.fileService.getFileStats(targetPath);
        
        // Create download record
        const downloadItem: Omit<DownloadItem, 'createdAt'> = {
          id: uuidv4(),
          providerId,
          category: download.category,
          title: download.title,
          description: download.displayName,
          version: download.version,
          fileName,
          filePath: targetPath,
          fileSize: fileStats.size || 0,
          downloadedAt: new Date(),
          url: download.url,
          checksum: fileStats.checksum,
          tags: this.extractTags(download),
          metadata: download.metadata || {}
        };

        await this.downloadRepository.create(downloadItem);
        ActivityLogger.logDownload(providerId, download.title, 'success', downloadItem.id);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`Error processing download from ${providerId}:`, error);
      ActivityLogger.logDownload(providerId, download.title, 'error');
      return false;
    }
  }

  private extractFileName(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      return pathname.split('/').pop() || null;
    } catch (error) {
      return null;
    }
  }

  private extractTags(download: ProviderDownload): string[] {
    const tags: string[] = [];
    
    if (download.metadata?.appType) {
      tags.push(download.metadata.appType);
    }
    
    tags.push(download.category);
    
    if (download.version !== 'unknown') {
      tags.push(`v${download.version}`);
    }

    return tags;
  }

  async getProviderStatus(providerId: string): Promise<Provider | null> {
    return await this.providerRepository.findById(providerId);
  }

  async getAllProviders(): Promise<Provider[]> {
    return await this.providerRepository.findAll();
  }

  async enableProvider(providerId: string): Promise<void> {
    const provider = await this.providerRepository.findById(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    await this.providerRepository.update(providerId, { enabled: true });
    
    if (!this.providers.has(providerId)) {
      await this.createProvider({ ...provider, enabled: true });
      const providerInstance = this.providers.get(providerId);
      if (providerInstance) {
        await providerInstance.initialize();
      }
    }
  }

  async disableProvider(providerId: string): Promise<void> {
    await this.providerRepository.update(providerId, { enabled: false });
    await this.providerRepository.updateStatus(providerId, ProviderStatus.DISABLED);
    
    const provider = this.providers.get(providerId);
    if (provider) {
      await provider.cleanup();
      this.providers.delete(providerId);
    }
  }

  async updateProviderConfig(providerId: string, config: any): Promise<void> {
    await this.providerRepository.update(providerId, { config });
    
    // Restart provider with new config
    const provider = this.providers.get(providerId);
    if (provider) {
      await provider.cleanup();
      this.providers.delete(providerId);
    }

    const updatedProvider = await this.providerRepository.findById(providerId);
    if (updatedProvider && updatedProvider.enabled) {
      await this.createProvider(updatedProvider);
      const newProvider = this.providers.get(providerId);
      if (newProvider) {
        await newProvider.initialize();
      }
    }
  }

  async cleanup(): Promise<void> {
    for (const provider of this.providers.values()) {
      await provider.cleanup();
    }
    this.providers.clear();
  }
}
