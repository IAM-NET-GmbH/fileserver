import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { DownloadItem, sanitizeFileName, formatFileSize } from '@iam-fileserver/shared';
import { DownloadRepository } from '../repositories/DownloadRepository';

export class FileService {
  private downloadRepository: DownloadRepository;
  private downloadPath: string;

  constructor() {
    this.downloadRepository = new DownloadRepository();
    this.downloadPath = process.env.DOWNLOAD_PATH || './downloads';
    this.ensureDownloadDirectory();
  }

  private async ensureDownloadDirectory(): Promise<void> {
    await fs.ensureDir(this.downloadPath);
  }

  async getDownloadPath(): Promise<string> {
    return this.downloadPath;
  }

  async getFileStats(filePath: string): Promise<{
    exists: boolean;
    size?: number;
    lastModified?: Date;
    checksum?: string;
  }> {
    try {
      const fullPath = path.resolve(filePath);
      const exists = await fs.pathExists(fullPath);
      
      if (!exists) {
        return { exists: false };
      }

      const stats = await fs.stat(fullPath);
      const checksum = await this.calculateChecksum(fullPath);

      return {
        exists: true,
        size: stats.size,
        lastModified: stats.mtime,
        checksum
      };
    } catch (error) {
      return { exists: false };
    }
  }

  async calculateChecksum(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('error', err => reject(err));
      stream.on('data', chunk => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
    });
  }

  async moveFile(sourcePath: string, targetPath: string): Promise<void> {
    const targetDir = path.dirname(targetPath);
    await fs.ensureDir(targetDir);
    await fs.move(sourcePath, targetPath, { overwrite: true });
  }

  async copyFile(sourcePath: string, targetPath: string): Promise<void> {
    const targetDir = path.dirname(targetPath);
    await fs.ensureDir(targetDir);
    await fs.copy(sourcePath, targetPath, { overwrite: true });
  }

  async deleteFile(filePath: string): Promise<void> {
    const fullPath = path.resolve(filePath);
    if (await fs.pathExists(fullPath)) {
      await fs.remove(fullPath);
    }
  }

  async validateFile(filePath: string, expectedChecksum?: string): Promise<boolean> {
    if (!await fs.pathExists(filePath)) {
      return false;
    }

    if (expectedChecksum) {
      const actualChecksum = await this.calculateChecksum(filePath);
      return actualChecksum === expectedChecksum;
    }

    return true;
  }

  async generateUniqueFileName(originalName: string, directory?: string): Promise<string> {
    const sanitized = sanitizeFileName(originalName);
    const dir = directory || this.downloadPath;
    
    let fileName = sanitized;
    let counter = 1;
    
    while (await fs.pathExists(path.join(dir, fileName))) {
      const ext = path.extname(sanitized);
      const name = path.basename(sanitized, ext);
      fileName = `${name}_${counter}${ext}`;
      counter++;
    }

    return fileName;
  }

  async cleanupOldFiles(retentionDays: number): Promise<{
    deletedFiles: number;
    freedSpace: number;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const allDownloads = await this.downloadRepository.findAll();
    let deletedFiles = 0;
    let freedSpace = 0;

    for (const download of allDownloads.items) {
      if (download.downloadedAt < cutoffDate) {
        try {
          const fileStats = await this.getFileStats(download.filePath);
          if (fileStats.exists) {
            await this.deleteFile(download.filePath);
            freedSpace += fileStats.size || 0;
            deletedFiles++;
          }
          await this.downloadRepository.delete(download.id);
        } catch (error) {
          console.error(`Failed to cleanup file ${download.filePath}:`, error);
        }
      }
    }

    return { deletedFiles, freedSpace };
  }

  async getDiskUsage(): Promise<{
    total: number;
    used: number;
    free: number;
  }> {
    try {
      // Simple implementation using downloads size
      // In a real implementation, you might want to use statvfs or du command
      const downloadsStats = await this.getDownloadsSize();
      return {
        total: 1024 * 1024 * 1024 * 100, // Assume 100GB total (mock value)
        used: downloadsStats,
        free: (1024 * 1024 * 1024 * 100) - downloadsStats
      };
    } catch (error) {
      // Fallback
      const downloadsStats = await this.getDownloadsSize();
      return {
        total: 0,
        used: downloadsStats,
        free: 0
      };
    }
  }

  async getDownloadsSize(): Promise<number> {
    const allDownloads = await this.downloadRepository.findAll();
    return allDownloads.items.reduce((total, download) => total + download.fileSize, 0);
  }

  createDownloadFilePath(providerId: string, category: string, fileName: string): string {
    return path.join(this.downloadPath, providerId, category, fileName);
  }

  async ensureProviderDirectory(providerId: string, category?: string): Promise<string> {
    const dir = category 
      ? path.join(this.downloadPath, providerId, category)
      : path.join(this.downloadPath, providerId);
    
    await fs.ensureDir(dir);
    return dir;
  }
}
