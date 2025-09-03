import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { promisify } from 'util';
import { exec } from 'child_process';
import { DownloadItem, sanitizeFileName, formatFileSize } from '@iam-fileserver/shared';
import { DownloadRepository } from '../repositories/DownloadRepository';

const execAsync = promisify(exec);

export class FileService {
  private downloadRepository: DownloadRepository;
  private downloadPath: string;

  constructor() {
    this.downloadRepository = new DownloadRepository();
    this.downloadPath = process.env.DOWNLOAD_PATH || '/mnt/storagebox';
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
      
      // No checksum calculation - use file size and name for identification
      const checksum = `${path.basename(filePath)}_${stats.size}`;

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

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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



  async getDiskUsage(): Promise<{
    total: number;
    used: number;
    free: number;
  }> {
    try {
      // Get disk usage for the actual download path (SMB mount)
      const { stdout } = await execAsync(`df -B1 "${this.downloadPath}"`);
      const lines = stdout.trim().split('\n');
      
      if (lines.length >= 2) {
        const dataLine = lines[1];
        const columns = dataLine.split(/\s+/);
        
        if (columns.length >= 4) {
          const total = parseInt(columns[1], 10) || 0;
          const used = parseInt(columns[2], 10) || 0;
          const available = parseInt(columns[3], 10) || 0;
          
          return {
            total,
            used,
            free: available
          };
        }
      }
      
      throw new Error('Unable to parse df output');
    } catch (error) {
      console.warn(`Could not get disk usage for ${this.downloadPath}:`, error);
      
      // Fallback: Try to get at least the used size from downloaded files
      try {
        const downloadsStats = await this.getDownloadsSize();
        return {
          total: 0, // Unknown total space
          used: downloadsStats,
          free: 0   // Unknown free space
        };
      } catch (fallbackError) {
        return {
          total: 0,
          used: 0,
          free: 0
        };
      }
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
