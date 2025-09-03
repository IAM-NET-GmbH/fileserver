import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';

// Auth components
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

// Layout components
import { Layout } from '@/components/layout/Layout';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ApiErrorBoundary } from '@/components/ApiErrorBoundary';

// Page components
import { Dashboard } from '@/pages/Dashboard';
import { Downloads } from '@/pages/Downloads';
import { DownloadDetail } from '@/pages/DownloadDetail';
import { Providers } from '@/pages/Providers';
import { ProviderDetail } from '@/pages/ProviderDetail';
import { Settings } from '@/pages/Settings';
import { Setup } from '@/pages/Setup';
import { UserManagement } from '@/pages/UserManagement';
import { TokenManagement } from '@/pages/TokenManagement';
import { Profile } from '@/pages/Profile';
import { NotFound } from '@/pages/NotFound';

// Create a client with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 2; // Reduced from 3 to 2 for faster feedback
      },
      staleTime: 2 * 60 * 1000, // 2 minutes (reduced from 5 for fresher data)
      gcTime: 10 * 60 * 1000, // 10 minutes cache time
      refetchOnWindowFocus: true, // Refetch when window gets focus
      refetchOnReconnect: true, // Refetch when internet reconnects
      refetchIntervalInBackground: false, // Don't refetch when tab is not active
    },
    mutations: {
      retry: false,
    },
  },
});

// App content component to use auth context
function AppContent() {
  const { setupRequired, isLoading } = useAuth();

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="text-lg font-medium text-gray-700">Lade...</span>
        </div>
      </div>
    );
  }

  // Show setup page if setup is required
  if (setupRequired) {
    return <Setup />;
  }

  // Show normal app
  return (
    <div className="min-h-screen bg-gray-50">
      <ProtectedRoute>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="downloads" element={<Downloads />} />
            <Route path="downloads/:id" element={<DownloadDetail />} />
            <Route path="providers" element={<Providers />} />
            <Route path="providers/:id" element={<ProviderDetail />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="tokens" element={<TokenManagement />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </ProtectedRoute>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ApiErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Router>
              <AppContent />
              
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
            </Router>
          </AuthProvider>
          
          {/* Development tools */}
          {process.env.NODE_ENV === 'development' && (
            <ReactQueryDevtools 
              initialIsOpen={false} 
              position={'bottom-right' as any} 
            />
          )}
        </QueryClientProvider>
      </ApiErrorBoundary>
    </ErrorBoundary>
  );
}

export default App;
