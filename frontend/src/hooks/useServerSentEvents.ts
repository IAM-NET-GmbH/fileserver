import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// SSE Data interface for future use
// interface SSEData {
//   type: string;
//   data: any;
//   timestamp: string;
// }

export const useServerSentEvents = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Simple polling as SSE alternative for now
    // This will be replaced with actual SSE when backend supports it
    const interval = setInterval(async () => {
      // Check if we should refresh provider data
      const lastProviderFetch = queryClient.getQueryState(['providers'])?.dataUpdatedAt;
      const now = Date.now();
      
      // If providers haven't been fetched in the last 8 seconds, refresh them
      if (!lastProviderFetch || (now - lastProviderFetch > 8000)) {
        console.log('Auto-refreshing provider data...');
        queryClient.invalidateQueries({ queryKey: ['providers'] });
      }
    }, 12000); // Check every 12 seconds

    return () => clearInterval(interval);
  }, [queryClient]);

  // Function to manually trigger provider refresh
  const refreshProviders = () => {
    queryClient.invalidateQueries({ queryKey: ['providers'] });
    queryClient.refetchQueries({ queryKey: ['providers'] });
  };

  const refreshHealth = () => {
    queryClient.invalidateQueries({ queryKey: ['health'] });
    queryClient.refetchQueries({ queryKey: ['health'] });
  };

  return {
    refreshProviders,
    refreshHealth,
  };
};
