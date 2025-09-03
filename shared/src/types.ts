// Provider Types
export interface Provider {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  lastCheck?: Date;
  status: ProviderStatus;
  config: ProviderConfig;
}

export interface ProviderConfig {
  [key: string]: any;
}

export enum ProviderStatus {
  ACTIVE = 'active',
  ERROR = 'error',
  DISABLED = 'disabled',
  CHECKING = 'checking'
}

// Download Types
export interface DownloadItem {
  id: string;
  providerId: string;
  category: string;
  title: string;
  description?: string;
  version: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  downloadedAt: Date;
  createdAt: Date;
  url?: string;
  checksum?: string;
  tags: string[];
  metadata: Record<string, any>;
}

export interface DownloadCategory {
  id: string;
  name: string;
  description?: string;
  providerId: string;
  itemCount: number;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  version: string;
  uptime: number;
  providers: ProviderHealthCheck[];
  disk: {
    totalSpace: number;
    freeSpace: number;
    usedSpace: number;
  };
}

export interface ProviderHealthCheck {
  id: string;
  name: string;
  status: ProviderStatus;
  lastCheck?: Date;
  lastSuccess?: Date;
  errorMessage?: string;
}

// Filter and Pagination Types
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface DownloadFilter {
  providerId?: string;
  category?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  tags?: string[];
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

// System Configuration
export interface SystemConfig {
  downloadPath: string;
  providers: Provider[];
}

// Settings Types
export interface Settings {
}

// Statistics
export interface SystemStats {
  totalDownloads: number;
  totalSize: number;
  downloadsByProvider: Record<string, number>;
  downloadsByCategory: Record<string, number>;
  recentActivity: DownloadItem[];
  diskUsage: {
    total: number;
    used: number;
    free: number;
  };
}
