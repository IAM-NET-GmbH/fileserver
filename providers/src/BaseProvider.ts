import { Provider, ProviderStatus, DownloadItem } from '@iam-fileserver/shared';
import winston from 'winston';

export interface ProviderDownload {
  title: string;
  version: string;
  url: string;
  category: string;
  displayName: string;
  method: string;
  fileSize?: number;
  metadata?: Record<string, any>;
}

export abstract class BaseProvider {
  protected logger: winston.Logger;
  protected config: Provider;
  
  constructor(config: Provider) {
    this.config = config;
    this.logger = winston.createLogger({
      level: process.env.DEBUG === 'true' ? 'debug' : 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [${level.toUpperCase()}] [${config.id}]: ${message}`;
        })
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ 
          filename: `provider-${config.id}.log`,
          dirname: './logs'
        })
      ]
    });
  }

  // Abstract methods that providers must implement
  abstract initialize(): Promise<void>;
  abstract checkForUpdates(): Promise<ProviderDownload[]>;
  abstract downloadFile(download: ProviderDownload, targetPath: string): Promise<boolean>;
  abstract cleanup(): Promise<void>;

  // Common methods
  getId(): string {
    return this.config.id;
  }

  getName(): string {
    return this.config.name;
  }

  getStatus(): ProviderStatus {
    return this.config.status;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  getLastCheck(): Date | undefined {
    return this.config.lastCheck;
  }

  updateStatus(status: ProviderStatus): void {
    this.config.status = status;
  }

  updateLastCheck(date: Date): void {
    this.config.lastCheck = date;
  }

  protected formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  protected sanitizeFileName(fileName: string): string {
    return fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  }

  protected isNewVersion(currentVersion: string, lastVersion?: string): boolean {
    if (!lastVersion) return true;
    if (currentVersion === 'unknown') return false;
    return currentVersion !== lastVersion;
  }

  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
