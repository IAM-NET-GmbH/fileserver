import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse, DownloadItem, Provider, HealthCheck, PaginatedResponse, DownloadFilter, SortOptions } from '@iam-fileserver/shared';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        if (response.data.success === false) {
          throw new ApiError(
            response.data.error || 'API request failed',
            response.status,
            response.data
          );
        }
        return response;
      },
      (error) => {
        if (error.response) {
          const apiError = new ApiError(
            error.response.data?.error || error.message,
            error.response.status,
            error.response.data
          );
          throw apiError;
        }
        throw new ApiError(error.message, 0);
      }
    );
  }

  // Health endpoints
  async getHealth(): Promise<HealthCheck> {
    const response = await this.client.get<ApiResponse<HealthCheck>>('/health');
    return response.data.data!;
  }

  async getStatus(): Promise<any> {
    const response = await this.client.get<ApiResponse>('/health/status');
    return response.data.data;
  }

  async getProvidersHealth(): Promise<any> {
    const response = await this.client.get<ApiResponse>('/health/providers');
    return response.data.data;
  }

  // Downloads endpoints
  async getDownloads(
    filter: DownloadFilter = {},
    sort: SortOptions = { field: 'downloadedAt', direction: 'desc' },
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<DownloadItem>> {
    const params = new URLSearchParams();
    
    if (filter.providerId) params.append('providerId', filter.providerId);
    if (filter.category) params.append('category', filter.category);
    if (filter.search) params.append('search', filter.search);
    if (filter.dateFrom) params.append('dateFrom', filter.dateFrom.toISOString());
    if (filter.dateTo) params.append('dateTo', filter.dateTo.toISOString());
    if (filter.tags) filter.tags.forEach(tag => params.append('tags', tag));
    
    params.append('sortField', sort.field);
    params.append('sortDirection', sort.direction);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await this.client.get<ApiResponse<PaginatedResponse<DownloadItem>>>(
      `/downloads?${params.toString()}`
    );
    return response.data.data!;
  }

  async getDownload(id: string): Promise<DownloadItem> {
    const response = await this.client.get<ApiResponse<DownloadItem>>(`/downloads/${id}`);
    return response.data.data!;
  }

  async deleteDownload(id: string): Promise<void> {
    await this.client.delete(`/downloads/${id}`);
  }

  async getDownloadStats(): Promise<any> {
    const response = await this.client.get<ApiResponse>('/downloads/stats');
    return response.data.data;
  }

  // Download file
  getDownloadUrl(id: string): string {
    return `/api/downloads/${id}/download`;
  }

  // Providers endpoints
  async getProviders(): Promise<Provider[]> {
    const response = await this.client.get<ApiResponse<Provider[]>>('/providers');
    return response.data.data!;
  }

  async getProvider(id: string): Promise<Provider> {
    const response = await this.client.get<ApiResponse<Provider>>(`/providers/${id}`);
    return response.data.data!;
  }

  async enableProvider(id: string): Promise<void> {
    await this.client.post(`/providers/${id}/enable`);
  }

  async disableProvider(id: string): Promise<void> {
    await this.client.post(`/providers/${id}/disable`);
  }

  async checkProvider(id: string): Promise<void> {
    await this.client.post(`/providers/${id}/check`);
  }

  async checkAllProviders(): Promise<void> {
    await this.client.post('/providers/check-all');
  }

  async updateProviderConfig(id: string, config: any): Promise<void> {
    await this.client.put(`/providers/${id}/config`, { config });
  }

  // Activities endpoints
  async getActivities(limit: number = 10): Promise<any[]> {
    const response = await this.client.get<ApiResponse<any[]>>(`/activities?limit=${limit}`);
    return response.data.data!;
  }

  async getAllActivities(): Promise<any[]> {
    const response = await this.client.get<ApiResponse<any[]>>('/activities/all');
    return response.data.data!;
  }

  async addTestActivities(): Promise<void> {
    await this.client.post('/activities/test');
  }

  async clearActivities(): Promise<void> {
    await this.client.delete('/activities');
  }

  // Utility methods
  async ping(): Promise<boolean> {
    try {
      await axios.get('/ping', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}

export const api = new ApiService();
export default api;
