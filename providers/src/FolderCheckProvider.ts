import fs from 'fs-extra';
import path from 'path';
import { Provider, ProviderStatus } from '@iam-fileserver/shared';
import { BaseProvider, ProviderDownload } from './BaseProvider';

interface FolderCheckConfig {
  watchPath: string; // Path to monitor (e.g., /mnt/storagebox/providers/local)
  checkInterval: number; // Check interval in minutes
}

interface FolderFileInfo {
  filename: string;
  subfolder: string;
  version: string;
  lastModified: Date;
  size: number;
  relativePath: string;
}

export class FolderCheckProvider extends BaseProvider {
  private lastScanTime: Date = new Date(0);
  private knownFiles: Map<string, FolderFileInfo> = new Map();

  constructor(config: Provider) {
    super(config);
  }

  private getFolderCheckConfig(): FolderCheckConfig {
    const defaultConfig: FolderCheckConfig = {
      watchPath: '/mnt/storagebox/providers/local',
      checkInterval: 30 // Check every 30 minutes
    };

    return { ...defaultConfig, ...this.config.config };
  }

  async initialize(): Promise<void> {
    this.logger.info('🚀 Folder Check Provider initializing...');
    
    const config = this.getFolderCheckConfig();
    
    // Check if watch path exists
    if (!await fs.pathExists(config.watchPath)) {
      throw new Error(`Folder Check watch path does not exist: ${config.watchPath}`);
    }

    // Perform initial scan to populate known files
    await this.performInitialScan();
    
    this.updateStatus(ProviderStatus.ACTIVE);
    this.logger.info('✅ Folder Check Provider successfully initialized');
  }

  private async performInitialScan(): Promise<void> {
    this.logger.info('📂 Performing initial scan of folder structure...');
    
    const config = this.getFolderCheckConfig();
    
    // Scan the watch path for subfolders
    const subfolders = await this.getSubfolders(config.watchPath);
    
    for (const subfolder of subfolders) {
      const subfolderPath = path.join(config.watchPath, subfolder);
      await this.scanDirectory(subfolderPath, subfolder);
    }
    
    this.logger.info(`📊 ${this.knownFiles.size} files found in initial scan`);
    this.lastScanTime = new Date();
  }

  private async getSubfolders(dirPath: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
    } catch (error) {
      this.logger.error(`❌ Error reading subdirectories of ${dirPath}: ${error}`);
      return [];
    }
  }

  private async scanDirectory(dirPath: string, subfolder: string): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          await this.scanDirectory(fullPath, subfolder);
        } else if (entry.isFile()) {
          const config = this.getFolderCheckConfig();
          const stats = await fs.stat(fullPath);
          const relativePath = path.relative(config.watchPath, fullPath);
          
          const fileInfo: FolderFileInfo = {
            filename: entry.name,
            subfolder,
            version: this.extractVersion(entry.name),
            lastModified: stats.mtime,
            size: stats.size,
            relativePath
          };
          
          this.knownFiles.set(fullPath, fileInfo);
        }
      }
    } catch (error) {
      this.logger.error(`❌ Error scanning ${dirPath}: ${error}`);
    }
  }

  async checkForUpdates(): Promise<ProviderDownload[]> {
    this.logger.info('🔍 Checking for new files in folder structure...');
    
    const config = this.getFolderCheckConfig();
    const newFiles: ProviderDownload[] = [];
    const currentScanTime = new Date();
    
    // Scan the watch path for subfolders
    const subfolders = await this.getSubfolders(config.watchPath);
    
    for (const subfolder of subfolders) {
      const subfolderPath = path.join(config.watchPath, subfolder);
      const subfolderNewFiles = await this.checkDirectoryForUpdates(subfolderPath, subfolder);
      newFiles.push(...subfolderNewFiles);
    }
    
    this.lastScanTime = currentScanTime;
    this.updateLastCheck(currentScanTime);
    
    if (newFiles.length > 0) {
      this.logger.info(`✅ ${newFiles.length} new/updated files found`);
    } else {
      this.logger.info('📋 No new updates found');
    }
    
    return newFiles;
  }

  private async checkDirectoryForUpdates(dirPath: string, subfolder: string): Promise<ProviderDownload[]> {
    const newFiles: ProviderDownload[] = [];
    const config = this.getFolderCheckConfig();
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Recursively check subdirectories
          const subDirFiles = await this.checkDirectoryForUpdates(fullPath, subfolder);
          newFiles.push(...subDirFiles);
        } else if (entry.isFile()) {
          const stats = await fs.stat(fullPath);
          const existingFile = this.knownFiles.get(fullPath);
          
          // Check if file is new or modified
          if (!existingFile || stats.mtime > existingFile.lastModified) {
            const relativePath = path.relative(config.watchPath, fullPath);
            
            const download: ProviderDownload = {
              title: entry.name,
              version: this.extractVersion(entry.name),
              url: fullPath, // Use local path as URL
              category: subfolder,
              displayName: `${subfolder} - ${entry.name}`,
              method: 'folder_check',
              fileSize: stats.size,
              metadata: {
                relativePath,
                lastModified: stats.mtime.toISOString(),
                syncMethod: 'folder_check'
              }
            };
            
            newFiles.push(download);
            
            // Update known files
            const fileInfo: FolderFileInfo = {
              filename: entry.name,
              subfolder,
              version: download.version,
              lastModified: stats.mtime,
              size: stats.size,
              relativePath
            };
            
            this.knownFiles.set(fullPath, fileInfo);
            
            if (!existingFile) {
              this.logger.debug(`📂 New file found: ${relativePath}`);
            } else {
              this.logger.debug(`🔄 File updated: ${relativePath}`);
            }
          }
        }
      }
    } catch (error) {
      this.logger.error(`❌ Error checking ${dirPath}: ${error}`);
    }
    
    return newFiles;
  }

  private extractVersion(filename: string): string {
    // Extract version from filenames - common patterns
    const versionPatterns = [
      /v?(\d+\.\d+\.\d+)/i,
      /(\d+\.\d+)/,
      /(\d{4}-\d{2}-\d{2})/,
      /(\d{4}_\d{2}_\d{2})/,
      /(\d{8})/,
      /_(\d+)_/,
      /(\d+\.\d+\.\d+\.\d+)/
    ];

    for (const pattern of versionPatterns) {
      const match = filename.match(pattern);
      if (match) {
        return match[1];
      }
    }

    // Fallback: use unknown as version
    return 'unknown';
  }

  async downloadFile(download: ProviderDownload, targetPath: string): Promise<boolean> {
    this.logger.info(`📂 Copying file: ${download.displayName}`);

    try {
      const sourcePath = download.url; // URL is actually the local path
      
      // Check if source file still exists
      if (!await fs.pathExists(sourcePath)) {
        throw new Error(`Source file not found: ${sourcePath}`);
      }

      // Ensure target directory exists
      const targetDir = path.dirname(targetPath);
      await fs.ensureDir(targetDir);

      // Copy file
      await fs.copy(sourcePath, targetPath);
      
      // Verify copy
      const stats = await fs.stat(targetPath);
      if (stats.size > 0) {
        this.logger.info(`✅ File successfully copied: ${path.basename(targetPath)} (${this.formatFileSize(stats.size)})`);
        return true;
      } else {
        throw new Error('Kopierte Datei ist leer');
      }
    } catch (error) {
      this.logger.error(`❌ Error copying file: ${error}`);
      
      // Clean up failed copy
      try {
        if (await fs.pathExists(targetPath)) {
          await fs.unlink(targetPath);
        }
      } catch (e) {
        // Ignore cleanup errors
      }
      
      return false;
    }
  }

  // Helper method to get file statistics
  async getFileStatistics(): Promise<{total: number, categories: Record<string, number>}> {
    const stats = {
      total: this.knownFiles.size,
      categories: {} as Record<string, number>
    };

    for (const fileInfo of this.knownFiles.values()) {
      stats.categories[fileInfo.subfolder] = (stats.categories[fileInfo.subfolder] || 0) + 1;
    }

    return stats;
  }

  async scanExistingFiles(): Promise<ProviderDownload[]> {
    this.logger.info('📂 Scanning existing files for initial registration...');
    
    const config = this.getFolderCheckConfig();
    if (!await fs.pathExists(config.watchPath)) {
      this.logger.warn(`Folder Check watch path does not exist: ${config.watchPath}`);
      return [];
    }

    const existingFiles: ProviderDownload[] = [];
    const subfolders = await this.getSubfolders(config.watchPath);
    
    for (const subfolder of subfolders) {
      const subfolderPath = path.join(config.watchPath, subfolder);
      const subfolderFiles = await this.scanDirectoryForExisting(subfolderPath, subfolder);
      existingFiles.push(...subfolderFiles);
    }

    this.logger.info(`📊 ${existingFiles.length} existing files found for registration`);
    return existingFiles;
  }

  private async scanDirectoryForExisting(dirPath: string, subfolder: string): Promise<ProviderDownload[]> {
    const files: ProviderDownload[] = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          const subDirFiles = await this.scanDirectoryForExisting(fullPath, subfolder);
          files.push(...subDirFiles);
        } else if (entry.isFile()) {
          const config = this.getFolderCheckConfig();
          const stats = await fs.stat(fullPath);
          const relativePath = path.relative(config.watchPath, fullPath);
          
          const download: ProviderDownload = {
            title: entry.name,
            version: this.extractVersion(entry.name),
            url: fullPath, // Use full path as URL for existing files
            category: subfolder,
            displayName: `${subfolder} - ${entry.name}`,
            method: 'existing_file',
            fileSize: stats.size,
            metadata: {
              relativePath,
              lastModified: stats.mtime.toISOString(),
              syncMethod: 'existing',
              isExisting: true
            }
          };
          
          files.push(download);
          
          // Add to known files
          const fileInfo: FolderFileInfo = {
            filename: entry.name,
            subfolder,
            version: download.version,
            lastModified: stats.mtime,
            size: stats.size,
            relativePath
          };
          
          this.knownFiles.set(fullPath, fileInfo);
        }
      }
    } catch (error) {
      this.logger.error(`❌ Error scanning ${dirPath}: ${error}`);
    }
    
    return files;
  }

  async cleanup(): Promise<void> {
    this.logger.info('🧹 Folder Check Provider cleaning up...');
    this.knownFiles.clear();
    this.logger.info('✅ Folder Check Provider cleaned up');
  }
}
