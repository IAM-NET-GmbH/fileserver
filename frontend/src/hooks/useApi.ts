import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DownloadFilter, SortOptions, Settings } from '@iam-fileserver/shared';
import toast from 'react-hot-toast';

// Query keys
export const queryKeys = {
  health: ['health'],
  status: ['status'],
  providersHealth: ['providers', 'health'],
  downloads: (filter?: DownloadFilter, sort?: SortOptions, page?: number, limit?: number) => 
    ['downloads', { filter, sort, page, limit }],
  download: (id: string) => ['download', id],
  downloadStats: ['downloads', 'stats'],
  providers: ['providers'],
  provider: (id: string) => ['provider', id],
  settings: ['settings'],
} as const;

// Health hooks
export const useHealth = () => {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: () => {
      console.log('🔍 useHealth: Calling api.getHealth, api instance:', api);
      if (!api || typeof api.getHealth !== 'function') {
        console.error('❌ api instance or getHealth method not available');
        throw new Error('API service not properly initialized');
      }
      return api.getHealth();
    },
    refetchInterval: 20000, // Refetch every 20 seconds
    staleTime: 5000, // Consider data stale after 5 seconds
    refetchIntervalInBackground: false,
  });
};

export const useStatus = () => {
  return useQuery({
    queryKey: queryKeys.status,
    queryFn: () => {
      console.log('🔍 useStatus: Calling api.getStatus, api instance:', api);
      if (!api || typeof api.getStatus !== 'function') {
        console.error('❌ api instance or getStatus method not available');
        throw new Error('API service not properly initialized');
      }
      return api.getStatus();
    },
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 5000,
    refetchIntervalInBackground: false,
  });
};

export const useProvidersHealth = () => {
  return useQuery({
    queryKey: queryKeys.providersHealth,
    queryFn: api.getProvidersHealth,
    refetchInterval: 30000,
  });
};

// Downloads hooks
export const useDownloads = (
  filter: DownloadFilter = {},
  sort: SortOptions = { field: 'downloadedAt', direction: 'desc' },
  page: number = 1,
  limit: number = 20
) => {
  return useQuery({
    queryKey: queryKeys.downloads(filter, sort, page, limit),
    queryFn: () => api.getDownloads(filter, sort, page, limit),
    placeholderData: (previousData) => previousData, // Ersatz für keepPreviousData
    staleTime: 30000,
  });
};

export const useDownload = (id: string) => {
  return useQuery({
    queryKey: queryKeys.download(id),
    queryFn: () => api.getDownload(id),
    enabled: !!id,
  });
};

export const useDownloadStats = () => {
  return useQuery({
    queryKey: queryKeys.downloadStats,
    queryFn: api.getDownloadStats,
    refetchInterval: 60000, // Refetch every minute
  });
};

export const useDeleteDownload = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.deleteDownload,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['downloads'] });
      queryClient.invalidateQueries({ queryKey: ['downloads', 'stats'] });
      toast.success('Download erfolgreich gelöscht');
    },
    onError: (error: any) => {
      toast.error(`Fehler beim Löschen: ${error.message}`);
    },
  });
};

// Providers hooks
export const useProviders = () => {
  return useQuery({
    queryKey: queryKeys.providers,
    queryFn: async () => {
      try {
        return await api.getProviders();
      } catch (error) {
        console.error('Provider API Error:', error);
        throw error;
      }
    },
    staleTime: 5000, // 5 seconds - for responsive provider updates
    refetchInterval: 10000, // Auto-refresh every 10 seconds
    refetchIntervalInBackground: false,
    retry: 3,
    retryDelay: 1000,
  });
};

export const useProvider = (id: string) => {
  return useQuery({
    queryKey: queryKeys.provider(id),
    queryFn: () => api.getProvider(id),
    enabled: !!id,
    staleTime: 3000, // 3 seconds for individual provider
    refetchInterval: 15000, // Refresh every 15 seconds
    refetchIntervalInBackground: false,
  });
};

export const useEnableProvider = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.enableProvider,
    onSuccess: () => {
      // Immediate refresh for responsive UI updates
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      queryClient.invalidateQueries({ queryKey: ['health'] });
      queryClient.invalidateQueries({ queryKey: ['providers', 'health'] });
      // Force immediate refetch
      queryClient.refetchQueries({ queryKey: ['providers'] });
      toast.success('Provider erfolgreich aktiviert');
    },
    onError: (error: any) => {
      toast.error(`Fehler beim Aktivieren: ${error.message}`);
    },
  });
};

export const useDisableProvider = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.disableProvider,
    onSuccess: () => {
      // Immediate refresh for responsive UI updates
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      queryClient.invalidateQueries({ queryKey: ['health'] });
      queryClient.invalidateQueries({ queryKey: ['providers', 'health'] });
      // Force immediate refetch
      queryClient.refetchQueries({ queryKey: ['providers'] });
      toast.success('Provider erfolgreich deaktiviert');
    },
    onError: (error: any) => {
      toast.error(`Fehler beim Deaktivieren: ${error.message}`);
    },
  });
};

export const useCheckProvider = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.checkProvider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      queryClient.invalidateQueries({ queryKey: ['downloads'] });
      queryClient.invalidateQueries({ queryKey: ['health'] });
      // Force immediate refetch to show "checking" status
      queryClient.refetchQueries({ queryKey: ['providers'] });
      toast.success('Provider-Überprüfung gestartet');
    },
    onError: (error: any) => {
      toast.error(`Fehler bei der Überprüfung: ${error.message}`);
    },
  });
};

export const useCheckAllProviders = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.checkAllProviders,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      queryClient.invalidateQueries({ queryKey: ['downloads'] });
      toast.success('Überprüfung aller Provider gestartet');
    },
    onError: (error: any) => {
      toast.error(`Fehler bei der Überprüfung: ${error.message}`);
    },
  });
};

export const useCreateProvider = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, name, description, type, config }: { 
      id: string; 
      name: string; 
      description?: string;
      type: string;
      config: any; 
    }) => api.createProvider(id, name, description, type, config),
    onSuccess: (_, variables) => {
      // Invalidate and refetch providers
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      queryClient.invalidateQueries({ queryKey: ['health'] });
      queryClient.refetchQueries({ queryKey: ['providers'] });
      toast.success(`Provider "${variables.name}" erfolgreich erstellt`);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.message || 'Fehler beim Erstellen des Providers';
      toast.error(errorMessage);
    }
  });
};

export const useUpdateProviderConfig = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, config, name, description }: { id: string; config: any; name?: string; description?: string }) => 
      api.updateProviderConfig(id, config, name, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      queryClient.invalidateQueries({ queryKey: ['health'] });
      // Force immediate refetch to show config changes
      queryClient.refetchQueries({ queryKey: ['providers'] });
      toast.success('Provider-Konfiguration erfolgreich aktualisiert');
    },
    onError: (error: any) => {
      toast.error(`Fehler beim Aktualisieren: ${error.message}`);
    },
  });
};

// Activities hooks
export const useActivities = (limit: number = 10) => {
  return useQuery({
    queryKey: ['activities', limit],
    queryFn: () => api.getActivities(limit),
    refetchInterval: 30000, // Refetch every 30 seconds for live updates
    staleTime: 10000,
  });
};

export const useAllActivities = () => {
  return useQuery({
    queryKey: ['activities', 'all'],
    queryFn: api.getAllActivities,
    staleTime: 60000,
  });
};

export const useAddTestActivities = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.addTestActivities,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast.success('Test-Aktivitäten hinzugefügt');
    },
    onError: (error: any) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });
};

export const useClearActivities = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.clearActivities,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast.success('Aktivitäten gelöscht');
    },
    onError: (error: any) => {
      toast.error(`Fehler beim Löschen: ${error.message}`);
    },
  });
};

// Settings hooks
export const useSettings = () => {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: api.getSettings,
    staleTime: 300000, // Settings don't change often, cache for 5 minutes
  });
};

export const useUpdateSettings = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (settings: Settings) => api.updateSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings });
      toast.success('Einstellungen erfolgreich gespeichert');
    },
    onError: (error: any) => {
      toast.error(`Fehler beim Speichern: ${error.message}`);
    },
  });
};

export const useResetSettings = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.resetSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings });
      toast.success('Einstellungen wurden zurückgesetzt');
    },
    onError: (error: any) => {
      toast.error(`Fehler beim Zurücksetzen: ${error.message}`);
    },
  });
};

// Connection status hook
export const useConnectionStatus = () => {
  return useQuery({
    queryKey: ['connection'],
    queryFn: api.ping,
    refetchInterval: 10000,
    retry: false,
    staleTime: 0,
  });
};
