import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DownloadFilter, SortOptions } from '@iam-fileserver/shared';
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
} as const;

// Health hooks
export const useHealth = () => {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: api.getHealth,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });
};

export const useStatus = () => {
  return useQuery({
    queryKey: queryKeys.status,
    queryFn: api.getStatus,
    refetchInterval: 15000, // Refetch every 15 seconds
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
    keepPreviousData: true,
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
    queryFn: api.getProviders,
    staleTime: 60000, // Provider data doesn't change often
  });
};

export const useProvider = (id: string) => {
  return useQuery({
    queryKey: queryKeys.provider(id),
    queryFn: () => api.getProvider(id),
    enabled: !!id,
  });
};

export const useEnableProvider = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.enableProvider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      queryClient.invalidateQueries({ queryKey: ['health'] });
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
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      queryClient.invalidateQueries({ queryKey: ['health'] });
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

export const useUpdateProviderConfig = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, config }: { id: string; config: any }) => 
      api.updateProviderConfig(id, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
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
