import axios, { AxiosInstance } from 'axios';
import { ApiResponse, DownloadItem, Provider, PaginatedResponse, DownloadFilter, SortOptions, Settings } from '@iam-fileserver/shared';
import { authManager } from './auth';

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
  private client: AxiosInstance | null = null;

  constructor() {
    console.log('🏗️ Starting ApiService constructor...');
    console.log('🔍 Constructor context - this:', this);
    console.log('🔍 Constructor context - prototype:', Object.getPrototypeOf(this));
    this.initializeClient();
    console.log('🏁 ApiService constructor completed, client initialized:', !!this.client);
  }

  private initializeClient(): void {
    try {
      console.log('🔧 Initializing Axios client...');
      
      // Check axios availability
      if (!axios) {
        throw new Error('Axios module not available');
      }
      
      if (typeof axios.create !== 'function') {
        throw new Error('axios.create is not a function');
      }

      console.log('✅ Axios module is available, creating client...');

      const client = axios.create({
        baseURL: '/api',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
        validateStatus: (status) => status < 500,
      });

      // Verify client was created successfully
      if (!client) {
        throw new Error('axios.create returned null/undefined');
      }
      
      if (typeof client.post !== 'function') {
        throw new Error('Client POST method is not available');
      }
      
      if (typeof client.get !== 'function') {
        throw new Error('Client GET method is not available');
      }

      // All checks passed - assign to instance
      this.client = client;
      console.log('✅ API Client initialized successfully with all methods available');
      
      // Setup interceptors
      this.setupInterceptors();
    } catch (error) {
      console.error('❌ Failed to initialize API client:', error);
      this.client = null;
      throw new Error(`API Client initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private ensureClientInitialized(): AxiosInstance {
    console.log('🔍 ensureClientInitialized called, client exists:', !!this.client);
    
    if (!this.client) {
      console.error('💥 API client is null - attempting re-initialization...');
      try {
        this.initializeClient();
        if (!this.client) {
          throw new Error('Re-initialization failed - client is still null');
        }
        console.log('✅ Client re-initialized successfully');
      } catch (error) {
        console.error('💥 Re-initialization failed:', error);
        throw new Error('API client not initialized and re-initialization failed');
      }
    }
    
    // Verify client has required methods
    if (typeof this.client.get !== 'function') {
      console.error('💥 Client GET method not available');
      throw new Error('Client GET method not available');
    }
    
    console.log('✅ Client is ready and has all required methods');
    return this.client;
  }
  
  private setupInterceptors(): void {
    if (!this.client) {
      console.error('⚠️ Cannot setup interceptors - client not initialized');
      return;
    }
    
    console.log('🔧 Setting up interceptors...');

    // Request interceptor to add auth headers
    this.client.interceptors.request.use(
      (config) => {
        const token = authManager.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          authManager.logout();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
    
    console.log('✅ Interceptors setup complete');
  }

  // Downloads
  async getDownloads(
    filters: DownloadFilter = {},
    sort: SortOptions = { field: 'createdAt', direction: 'desc' },
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<DownloadItem>> {
    try {
      const client = this.ensureClientInitialized();
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...Object.entries(filters).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== '') {
            acc[key] = value.toString();
          }
          return acc;
        }, {} as Record<string, string>),
        ...Object.entries(sort).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== '') {
            acc[key] = value.toString();
          }
          return acc;
        }, {} as Record<string, string>)
      });

      const response = await client.get<ApiResponse<PaginatedResponse<DownloadItem>>>(`/downloads?${params}`);
      return response.data.data!;
    } catch (error: any) {
      console.error('❌ Downloads API Fehler:', error);
      const endpointError = new ApiError(
        `API-Endpunkt nicht erreichbar: GET /api/downloads - ${error.message}`,
        error.response?.status || 0,
        error.response?.data
      );
      console.error('❌ Downloads API Fehler:', endpointError);
      throw endpointError;
    }
  }

  async getDownload(id: string): Promise<DownloadItem> {
    const client = this.ensureClientInitialized();
    const response = await client.get<ApiResponse<DownloadItem>>(`/downloads/${id}`);
    return response.data.data!;
  }

  async deleteDownload(id: string): Promise<void> {
    const client = this.ensureClientInitialized();
    await client.delete(`/downloads/${id}`);
  }

  async getDownloadStats(): Promise<any> {
    const client = this.ensureClientInitialized();
    const response = await client.get<ApiResponse>('/downloads/stats');
    return response.data.data;
  }

  // Provider helper
  getDownloadUrl(id: string): string {
    return `/api/downloads/${id}/file`;
  }

  // Providers
  async getProviders(): Promise<Provider[]> {
    try {
      const client = this.ensureClientInitialized();
      const response = await client.get<ApiResponse<Provider[]>>('/providers');
      return response.data.data!;
    } catch (error: any) {
      console.error('❌ Providers API Fehler:', error);
      const endpointError = new ApiError(
        `API-Endpunkt nicht erreichbar: GET /api/providers - ${error.message}`,
        error.response?.status || 0,
        error.response?.data
      );
      console.error('❌ Provider API Fehler:', endpointError);
      throw endpointError;
    }
  }

  async getProvider(id: string): Promise<Provider> {
    try {
      const client = this.ensureClientInitialized();
      const response = await client.get<ApiResponse<Provider>>(`/providers/${id}`);
      return response.data.data!;
    } catch (error: any) {
      console.error('❌ Provider API Fehler:', error);
      const endpointError = new ApiError(
        `API-Endpunkt nicht erreichbar: GET /api/providers/${id} - ${error.message}`,
        error.response?.status || 0,
        error.response?.data
      );
      console.error('❌ Provider API Fehler:', endpointError);
      throw endpointError;
    }
  }

  async enableProvider(id: string): Promise<void> {
    try {
      console.log(`🔄 Enabling provider: ${id}`);
      const client = this.ensureClientInitialized();
      
      console.log(`📡 Making POST request to /providers/${id}/enable`);
      const response = await client.post(`/providers/${id}/enable`);
      console.log(`✅ Provider ${id} enabled successfully. Response:`, response.status);
    } catch (error: any) {
      console.error(`❌ Error enabling provider ${id}:`, error);
      const errorMessage = error.message || 'Unbekannter Fehler';
      const endpointError = new ApiError(
        `API-Endpunkt nicht erreichbar: POST /api/providers/${id}/enable - ${errorMessage}`,
        error.response?.status || 0,
        error.response?.data
      );
      throw endpointError;
    }
  }

  async disableProvider(id: string): Promise<void> {
    try {
      console.log(`🔄 Disabling provider: ${id}`);
      const client = this.ensureClientInitialized();
      
      console.log(`📡 Making POST request to /providers/${id}/disable`);
      const response = await client.post(`/providers/${id}/disable`);
      console.log(`✅ Provider ${id} disabled successfully. Response:`, response.status);
    } catch (error: any) {
      console.error(`❌ Error disabling provider ${id}:`, error);
      const errorMessage = error.message || 'Unbekannter Fehler';
      const endpointError = new ApiError(
        `API-Endpunkt nicht erreichbar: POST /api/providers/${id}/disable - ${errorMessage}`,
        error.response?.status || 0,
        error.response?.data
      );
      throw endpointError;
    }
  }

  async checkProvider(id: string): Promise<void> {
    try {
      const client = this.ensureClientInitialized();
      await client.post(`/providers/${id}/check`);
    } catch (error: any) {
      console.error('❌ Check Provider API Fehler:', error);
      const endpointError = new ApiError(
        `API-Endpunkt nicht erreichbar: POST /api/providers/${id}/check - ${error.message}`,
        error.response?.status || 0,
        error.response?.data
      );
      console.error('❌ Provider API Fehler:', endpointError);
      throw endpointError;
    }
  }

  async checkAllProviders(): Promise<void> {
    try {
      const client = this.ensureClientInitialized();
      await client.post('/providers/check-all');
    } catch (error: any) {
      console.error('❌ Check All Providers API Fehler:', error);
      const endpointError = new ApiError(
        `API-Endpunkt nicht erreichbar: POST /api/providers/check-all - ${error.message}`,
        error.response?.status || 0,
        error.response?.data
      );
      console.error('❌ Provider API Fehler:', endpointError);
      throw endpointError;
    }
  }

  async createProvider(id: string, name: string, description: string = '', type: string, config: any): Promise<void> {
    try {
      console.log(`🔄 Creating provider: ${id}`);
      const client = this.ensureClientInitialized();
      
      console.log(`📡 Making POST request to /providers`);
      const response = await client.post('/providers', {
        id,
        name,
        description,
        type,
        config
      });
      console.log(`✅ Provider ${id} created successfully. Response:`, response.status);
    } catch (error: any) {
      console.error(`❌ Error creating provider ${id}:`, error);
      const errorMessage = error.message || 'Unbekannter Fehler';
      const endpointError = new ApiError(
        `API-Endpunkt nicht erreichbar: POST /api/providers - ${errorMessage}`,
        error.response?.status || 0,
        error.response?.data
      );
      throw endpointError;
    }
  }

  async updateProviderConfig(id: string, config: any, name?: string, description?: string): Promise<void> {
    const updateData: any = { config };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    
    try {
      const client = this.ensureClientInitialized();
      await client.put(`/providers/${id}/config`, updateData);
    } catch (error: any) {
      console.error('❌ Update Provider Config API Fehler:', error);
      const endpointError = new ApiError(
        `API-Endpunkt nicht erreichbar: PUT /api/providers/${id}/config - ${error.message}`,
        error.response?.status || 0,
        error.response?.data
      );
      console.error('❌ Provider API Fehler:', endpointError);
      throw endpointError;
    }
  }

  // Activities
  async getActivities(limit: number = 10): Promise<any[]> {
    const client = this.ensureClientInitialized();
    const response = await client.get<ApiResponse<any[]>>(`/activities?limit=${limit}`);
    return response.data.data!;
  }

  async getAllActivities(): Promise<any[]> {
    const client = this.ensureClientInitialized();
    const response = await client.get<ApiResponse<any[]>>('/activities/all');
    return response.data.data!;
  }

  async addTestActivities(): Promise<void> {
    const client = this.ensureClientInitialized();
    await client.post('/activities/test');
  }

  async clearActivities(): Promise<void> {
    const client = this.ensureClientInitialized();
    await client.delete('/activities');
  }

  // Settings
  async getSettings(): Promise<Settings> {
    const client = this.ensureClientInitialized();
    const response = await client.get<ApiResponse<Settings>>('/settings');
    return response.data.data!;
  }

  async updateSettings(settings: Settings): Promise<Settings> {
    const client = this.ensureClientInitialized();
    const response = await client.put<ApiResponse<Settings>>('/settings', settings);
    return response.data.data!;
  }

  async resetSettings(): Promise<Settings> {
    const client = this.ensureClientInitialized();
    const response = await client.post<ApiResponse<Settings>>('/settings/reset');
    return response.data.data!;
  }

  // Health Check
  async getHealth(): Promise<any> {
    try {
      const client = this.ensureClientInitialized();
      const response = await client.get<ApiResponse<any>>('/health');
      return response.data.data!;
    } catch (error: any) {
      console.error('❌ Health Check API Fehler:', error);
      return {};
    }
  }

  async getStatus(): Promise<any> {
    try {
      const client = this.ensureClientInitialized();
      const response = await client.get<ApiResponse<any>>('/health/status');
      return response.data.data!;
    } catch (error: any) {
      console.error('❌ Status API Fehler:', error);
      return {};
    }
  }

  async getProvidersHealth(): Promise<any[]> {
    try {
      const client = this.ensureClientInitialized();
      const response = await client.get<ApiResponse<any[]>>('/providers/health');
      return response.data.data!;
    } catch (error: any) {
      console.error('❌ Providers Health API Fehler:', error);
      return [];
    }
  }

  async ping(): Promise<boolean> {
    try {
      await axios.get('/ping', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}

// Create API instance with better error handling
const createApiService = (): ApiService => {
  try {
    const instance = new ApiService();
    console.log('🚀 API Service initialized');
    
    // Create bound methods to preserve 'this' context
    const boundApi = {
      ...instance,
      getHealth: instance.getHealth.bind(instance),
      getStatus: instance.getStatus.bind(instance),
      getProvidersHealth: instance.getProvidersHealth.bind(instance),
      getDownloads: instance.getDownloads.bind(instance),
      getProviders: instance.getProviders.bind(instance),
      enableProvider: instance.enableProvider.bind(instance),
      disableProvider: instance.disableProvider.bind(instance),
      checkProvider: instance.checkProvider.bind(instance),
      checkAllProviders: instance.checkAllProviders.bind(instance),
      createProvider: instance.createProvider.bind(instance),
      updateProviderConfig: instance.updateProviderConfig.bind(instance),
      getDownload: instance.getDownload.bind(instance),
      deleteDownload: instance.deleteDownload.bind(instance),
      getDownloadStats: instance.getDownloadStats.bind(instance),
      getProvider: instance.getProvider.bind(instance),
      getActivities: instance.getActivities.bind(instance),
      getAllActivities: instance.getAllActivities.bind(instance),
      addTestActivities: instance.addTestActivities.bind(instance),
      clearActivities: instance.clearActivities.bind(instance),
      getSettings: instance.getSettings.bind(instance),
      updateSettings: instance.updateSettings.bind(instance),
      resetSettings: instance.resetSettings.bind(instance),
      getDownloadUrl: instance.getDownloadUrl.bind(instance),
      ping: instance.ping.bind(instance),
    } as ApiService;
    
    console.log('✅ Bound API methods created');
    return boundApi;
  } catch (error) {
    console.error('💥 Failed to create API Service:', error);
    throw error;
  }
};

// Singleton instance
const api: ApiService = createApiService();

export { api };
export default api;