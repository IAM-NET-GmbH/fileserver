import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';

// Layout components
import { Layout } from '@/components/layout/Layout';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

// Page components
import { Dashboard } from '@/pages/Dashboard';
import { Downloads } from '@/pages/Downloads';
import { DownloadDetail } from '@/pages/DownloadDetail';
import { Providers } from '@/pages/Providers';
import { ProviderDetail } from '@/pages/ProviderDetail';
import { Settings } from '@/pages/Settings';
import { NotFound } from '@/pages/NotFound';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    },
    mutations: {
      retry: false,
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="downloads" element={<Downloads />} />
                <Route path="downloads/:id" element={<DownloadDetail />} />
                <Route path="providers" element={<Providers />} />
                <Route path="providers/:id" element={<ProviderDetail />} />
                <Route path="settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
            
            {/* Toast notifications */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                className: 'toast',
                style: {
                  background: 'white',
                  color: '#374151',
                  border: '1px solid #E5E7EB',
                  borderRadius: '0.75rem',
                  fontSize: '14px',
                  fontWeight: '500',
                  padding: '12px 16px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                },
                success: {
                  iconTheme: {
                    primary: '#10B981',
                    secondary: 'white',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#EF4444',
                    secondary: 'white',
                  },
                },
              }}
            />
          </div>
        </Router>
        
        {/* Development tools */}
        {import.meta.env.DEV && (
          <ReactQueryDevtools 
            initialIsOpen={false} 
            position="bottom-right" 
          />
        )}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
