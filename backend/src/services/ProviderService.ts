import { Provider, ProviderStatus, DownloadItem } from '@iam-fileserver/shared';
import { BaseProvider, ProviderDownload, BMWProvider, FolderCheckProvider } from '@iam-fileserver/providers';
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
  private isInitialized = false;
  
  // Mutex-like locking für Provider-Operationen
  private providerUpdateLocks: Map<string, Promise<void>> = new Map();
  private providerScanLocks: Map<string, Promise<void>> = new Map();

  constructor() {
    console.log('🏗️ ProviderService constructor called');
    this.providerRepository = new ProviderRepository();
    this.downloadRepository = new DownloadRepository();
    this.fileService = new FileService();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ ProviderService already initialized, skipping...');
      return;
    }
    
    console.log('🔍 Starting ProviderService initialization...');
    
    try {
      await this.loadProviders();
      await this.initializeProviders();
      
      // Note: Scheduler will be started by individual providers if needed
      
      this.isInitialized = true;
      console.log('✅ ProviderService initialization completed');
    } catch (error) {
      console.error('❌ ProviderService initialization failed:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  private async loadProviders(): Promise<void> {
    console.log('📂 Loading providers from database...');
    
    // Create default providers if they don't exist
    if (!await this.providerRepository.exists('bmw-aos')) {
      console.log('⚡ Creating BMW Provider...');
      await this.createDefaultBMWProvider();
    }

    // VW Provider wird nicht mehr automatisch erstellt - kann über Frontend konfiguriert werden
    
    // Load all existing providers from database
    const providerConfigs = await this.providerRepository.findAll();
    console.log(`📋 Found ${providerConfigs.length} providers in database`);
    
    for (const config of providerConfigs) {
      if (config.enabled) {
        console.log(`🔄 Loading enabled provider: ${config.id}`);
        await this.createProvider(config);
      } else {
        console.log(`⏸️ Skipping disabled provider: ${config.id}`);
      }
    }
    
    console.log(`📊 Loaded ${this.providers.size} active providers`);
  }

  private async createDefaultBMWProvider(): Promise<void> {
    const bmwProvider: Provider = {
      id: 'bmw-aos',
      name: 'BMW AOS Center',
      description: 'BMW Aftermarket Online Services - Aktive Downloads von BMW Website zu /mnt/storagebox/providers/bmw',
      enabled: false, // Disabled by default until credentials are configured
      status: ProviderStatus.DISABLED,
      config: {
        username: '',
        password: '',
        authUrl: 'https://aos.bmwgroup.com/auth/login',
        istaPUrl: 'https://aos.bmwgroup.com/ista-p',
        istaNextUrl: 'https://aos.bmwgroup.com/ista-next',
        headless: true,
        downloadPath: '/mnt/storagebox/providers/bmw',
        checkInterval: 360
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

      case 'folder-check':
        provider = new FolderCheckProvider(config);
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
        
        // Scan and register existing files on first initialization
        try {
          await this.withProviderScanLock(id, async () => {
            console.log(`📂 Starte initialer Scan für Provider ${id}...`);
            await this.scanAndRegisterExistingFiles(id);
          });
        } catch (error) {
          console.warn(`⚠️ Initialer Scan für Provider ${id} übersprungen (bereits aktiv): ${error}`);
        }
        
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

  private async scanAndRegisterExistingFiles(providerId: string): Promise<void> {
    const provider = this.providers.get(providerId);
    if (!provider) return;

    try {
      console.log(`🔍 Scanning existing files for provider ${providerId}...`);
      
      // Get existing files from provider
      const existingFiles = await provider.scanExistingFiles();
      
      if (existingFiles.length === 0) {
        console.log(`📋 No existing files found for provider ${providerId}`);
        return;
      }

      let registeredCount = 0;
      let skippedCount = 0;

      for (const fileDownload of existingFiles) {
        try {
          // Check if already registered by exact file path
          const existing = await this.downloadRepository.findAll({
            providerId
          });

          // Check if file with same path already exists
          const isDuplicate = existing.items.some(item => 
            item.filePath === fileDownload.url || 
            (item.title === fileDownload.title && item.category === fileDownload.category)
          );

          if (!isDuplicate) {
            // Register existing file as download
            await this.registerExistingFile(providerId, fileDownload);
            registeredCount++;
            console.log(`📝 Registering new file: ${fileDownload.title}`);
          } else {
            skippedCount++;
            console.log(`⏭️ Skipping duplicate file: ${fileDownload.title}`);
          }
        } catch (error) {
          console.error(`Error registering existing file ${fileDownload.title}:`, error);
        }
      }

      console.log(`✅ Provider ${providerId}: ${registeredCount} existing files registered, ${skippedCount} already known`);
      ActivityLogger.logSystemEvent(`${registeredCount} existierende Dateien für ${providerId} registriert`, 'success');
      
    } catch (error) {
      console.error(`Error scanning existing files for provider ${providerId}:`, error);
    }
  }

  private async registerExistingFile(providerId: string, download: ProviderDownload): Promise<void> {
    try {
      // Get file stats from existing file
      const existingPath = download.url; // URL contains the full path
      const fileStats = await this.fileService.getFileStats(existingPath);
      
      // Create download record for existing file
      const downloadItem: Omit<DownloadItem, 'createdAt'> = {
        id: uuidv4(),
        providerId,
        category: download.category,
        title: download.title,
        description: download.displayName,
        version: download.version,
        fileName: path.basename(existingPath),
        filePath: existingPath, // Use existing file path
        fileSize: fileStats.size || 0,
        downloadedAt: fileStats.lastModified || new Date(),
        url: download.url,
        checksum: fileStats.checksum,
        tags: this.extractTags(download),
        metadata: { 
          ...download.metadata,
          registeredFrom: 'existing_file_scan'
        }
      };

      await this.downloadRepository.create(downloadItem);
      console.log(`📝 Registered existing file: ${download.title}`);
      
    } catch (error) {
      console.error(`Error registering existing file ${download.title}:`, error);
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

    // Add existing file tag
    if (download.metadata?.isExisting) {
      tags.push('existing');
    }

    return tags;
  }

  async getProviderStatus(providerId: string): Promise<Provider | null> {
    return await this.providerRepository.findById(providerId);
  }

  async getAllProviders(): Promise<Provider[]> {
    const providers = await this.providerRepository.findAll();
    console.log('🔍 DEBUG: getAllProviders returned:', providers.map(p => ({ id: p.id, name: p.name, enabled: p.enabled })));
    return providers;
  }

  async enableProvider(providerId: string): Promise<void> {
    const provider = await this.providerRepository.findById(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    // Update database first
    await this.providerRepository.update(providerId, { enabled: true });
    await this.providerRepository.updateStatus(providerId, ProviderStatus.ACTIVE);
    
    // Create and initialize provider instance
    if (!this.providers.has(providerId)) {
      const updatedProvider = { ...provider, enabled: true };
      await this.createProvider(updatedProvider);
      
      const providerInstance = this.providers.get(providerId);
      if (providerInstance) {
        try {
          await providerInstance.initialize();
          console.log(`✅ Provider ${providerId} successfully enabled and initialized`);
          
          // Scan existing files for newly enabled provider
          try {
            await this.withProviderScanLock(providerId, async () => {
              console.log(`📂 Starte Scan für neu aktivierten Provider ${providerId}...`);
              await this.scanAndRegisterExistingFiles(providerId);
            });
          } catch (error) {
            console.warn(`⚠️ Scan für Provider ${providerId} übersprungen (bereits aktiv): ${error}`);
          }
          
          ActivityLogger.logSystemEvent(`Provider ${provider.name} aktiviert`, 'success');
        } catch (error) {
          console.error(`❌ Failed to initialize provider ${providerId}:`, error);
          await this.providerRepository.updateStatus(providerId, ProviderStatus.ERROR);
          ActivityLogger.logSystemEvent(`Fehler beim Aktivieren von ${provider.name}`, 'error');
        }
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

  async createNewProvider(providerData: { id: string, name: string, description: string, type: string, config: any }): Promise<void> {
    console.log('🆕 Creating new provider:', providerData.id);
    
    const newProvider: Provider = {
      id: providerData.id,
      name: providerData.name,
      description: providerData.description,
      enabled: true,
      status: ProviderStatus.DISABLED,
      config: providerData.config
    };

    // Save to database
    await this.providerRepository.create(newProvider);
    
    // Create and initialize provider instance
    await this.createProvider(newProvider);
    const providerInstance = this.providers.get(providerData.id);
    
    if (providerInstance) {
      try {
        await providerInstance.initialize();
        await this.providerRepository.updateStatus(providerData.id, ProviderStatus.ACTIVE);
        
        // Scan existing files for newly created provider
        try {
          await this.withProviderScanLock(providerData.id, async () => {
            console.log(`📂 Starte Scan für neu erstellten Provider ${providerData.id}...`);
            await this.scanAndRegisterExistingFiles(providerData.id);
          });
        } catch (error) {
          console.warn(`⚠️ Scan für Provider ${providerData.id} übersprungen (bereits aktiv): ${error}`);
        }
        
        ActivityLogger.logSystemEvent(`Provider "${providerData.name}" erstellt und gestartet`, 'success');
      } catch (error) {
        await this.providerRepository.updateStatus(providerData.id, ProviderStatus.ERROR);
        ActivityLogger.logSystemEvent(`Fehler beim Starten des Providers "${providerData.name}": ${error}`, 'error');
        throw error;
      }
    }
  }

  /**
   * Hilfsmethode für Provider-Update-Locking
   */
  private async withProviderUpdateLock<T>(providerId: string, operation: () => Promise<T>): Promise<T> {
    // Warten auf bestehende Lock für diesen Provider
    if (this.providerUpdateLocks.has(providerId)) {
      await this.providerUpdateLocks.get(providerId);
    }

    // Neue Lock erstellen
    const lockPromise = (async () => {
      try {
        return await operation();
      } finally {
        // Lock entfernen wenn Operation beendet
        this.providerUpdateLocks.delete(providerId);
      }
    })();

    this.providerUpdateLocks.set(providerId, lockPromise.then(() => {}));
    return lockPromise;
  }

  /**
   * Hilfsmethode für Provider-Scan-Locking
   */
  private async withProviderScanLock<T>(providerId: string, operation: () => Promise<T>): Promise<T> {
    // Prüfen ob bereits ein Scan läuft
    if (this.providerScanLocks.has(providerId)) {
      console.log(`⚠️ Scan für Provider ${providerId} läuft bereits, überspringe...`);
      throw new Error(`Scan für Provider ${providerId} läuft bereits`);
    }

    // Neue Lock erstellen
    const lockPromise = (async () => {
      try {
        return await operation();
      } finally {
        // Lock entfernen wenn Operation beendet
        this.providerScanLocks.delete(providerId);
      }
    })();

    this.providerScanLocks.set(providerId, lockPromise.then(() => {}));
    return lockPromise;
  }

  async updateProviderConfig(providerId: string, config: any, name?: string, description?: string): Promise<void> {
    return this.withProviderUpdateLock(providerId, async () => {
      console.log(`🔒 Provider-Update-Lock für ${providerId} erworben`);
      
      const updateData: any = { config };
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      
      await this.providerRepository.update(providerId, updateData);
      
      // Restart provider with new config
      const provider = this.providers.get(providerId);
      if (provider) {
        console.log(`🧹 Bereinige bestehenden Provider ${providerId}...`);
        await provider.cleanup();
        this.providers.delete(providerId);
      }

      const updatedProvider = await this.providerRepository.findById(providerId);
      if (updatedProvider && updatedProvider.enabled) {
        console.log(`🚀 Erstelle neuen Provider ${providerId} mit aktualisierter Konfiguration...`);
        await this.createProvider(updatedProvider);
        const newProvider = this.providers.get(providerId);
        if (newProvider) {
          await newProvider.initialize();
        }
      }
      
      console.log(`✅ Provider-Update für ${providerId} abgeschlossen`);
    });
  }

  async rescanProviderFiles(providerId: string): Promise<void> {
    return this.withProviderScanLock(providerId, async () => {
      console.log(`🔍 Provider-Scan-Lock für ${providerId} erworben`);
      
      const provider = this.providers.get(providerId);
      if (!provider) {
        throw new Error(`Provider ${providerId} not found`);
      }

      console.log(`📂 Starte Rescan für Provider ${providerId}...`);
      await this.scanAndRegisterExistingFiles(providerId);
      console.log(`✅ Rescan für Provider ${providerId} abgeschlossen`);
    });
  }

  async cleanup(): Promise<void> {
    for (const provider of this.providers.values()) {
      await provider.cleanup();
    }
    this.providers.clear();
  }
}

