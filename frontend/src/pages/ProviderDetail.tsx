import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Server,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Play,
  Pause,
  RefreshCw,
  Settings,
  Activity,
  Calendar,
  Download
} from 'lucide-react';
import {
  useProvider,
  useEnableProvider,
  useDisableProvider,
  useCheckProvider,
  useDownloads
} from '@/hooks/useApi';
import { formatProviderStatus, getStatusColor, formatRelativeTime, formatDate, cn } from '@/lib/utils';
import { ProviderConfig } from '@/components/ProviderConfig';

export function ProviderDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: provider, isLoading, error } = useProvider(id!);
  const { data: downloads } = useDownloads({ providerId: id }, { field: 'downloadedAt', direction: 'desc' }, 1, 10);
  
  const enableProvider = useEnableProvider();
  const disableProvider = useDisableProvider();
  const checkProvider = useCheckProvider();

  const handleToggleProvider = () => {
    if (!provider) return;
    
    if (provider.enabled) {
      disableProvider.mutate(provider.id);
    } else {
      enableProvider.mutate(provider.id);
    }
  };

  const handleCheckProvider = () => {
    if (!provider) return;
    checkProvider.mutate(provider.id);
  };

  const [showConfig, setShowConfig] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'error':
        return <XCircle className="w-6 h-6 text-red-600" />;
      case 'checking':
        return <Clock className="w-6 h-6 text-yellow-600 animate-spin" />;
      default:
        return <AlertCircle className="w-6 h-6 text-gray-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 bg-gray-200 rounded"></div>
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        </div>
        <div className="card p-6">
          <div className="space-y-4">
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <Server className="w-12 h-12 mx-auto" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Provider nicht gefunden
        </h2>
        <p className="text-gray-600 mb-4">
          Der angeforderte Provider konnte nicht gefunden werden.
        </p>
        <Link to="/providers" className="btn-primary">
          Zurück zu Providern
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/providers"
            className="btn-ghost btn-sm flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Zurück</span>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Provider Details</h1>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleCheckProvider}
            disabled={checkProvider.isPending || provider.status === 'checking'}
            className={cn(
              "btn-secondary flex items-center space-x-2",
              (checkProvider.isPending || provider.status === 'checking') && "opacity-50 cursor-not-allowed"
            )}
          >
            <RefreshCw className={cn(
              "w-4 h-4",
              (checkProvider.isPending || provider.status === 'checking') && "animate-spin"
            )} />
            <span>Prüfen</span>
          </button>

          <button
            onClick={handleToggleProvider}
            disabled={enableProvider.isPending || disableProvider.isPending}
            className={cn(
              "btn-primary flex items-center space-x-2",
              provider.enabled
                ? "bg-red-600 hover:bg-red-700"
                : "bg-green-600 hover:bg-green-700"
            )}
          >
            {provider.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{provider.enabled ? 'Deaktivieren' : 'Aktivieren'}</span>
          </button>

          <button
            onClick={() => setShowConfig(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Konfigurieren</span>
          </button>
        </div>
      </div>

      {/* Provider Overview */}
      <div className="card">
        <div className="p-6">
          <div className="flex items-start space-x-6">
            {/* Provider Icon */}
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                <Server className="w-8 h-8 text-white" />
              </div>
            </div>

            {/* Provider Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3">
                <h2 className="text-2xl font-bold text-gray-900">{provider.name}</h2>
                {getStatusIcon(provider.status)}
              </div>
              
              <p className="mt-2 text-gray-600">{provider.description}</p>

              <div className="mt-4 flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <span className={cn(
                    "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium",
                    getStatusColor(provider.status)
                  )}>
                    {formatProviderStatus(provider.status)}
                  </span>
                </div>

                <div className="flex items-center space-x-2 text-gray-500">
                  <Activity className="w-4 h-4" />
                  <span>{provider.enabled ? 'Aktiviert' : 'Deaktiviert'}</span>
                </div>

                {provider.lastCheck && (
                  <div className="flex items-center space-x-2 text-gray-500">
                    <Calendar className="w-4 h-4" />
                    <span>Letzte Überprüfung: {formatRelativeTime(provider.lastCheck)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Configuration */}
          <div className="card">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Konfiguration</span>
              </h3>
            </div>
            <div className="p-6">
              {provider.config && Object.keys(provider.config).length > 0 ? (
                <dl className="space-y-4">
                  {Object.entries(provider.config).map(([key, value]) => {
                    // Hide sensitive values
                    const isSensitive = key.toLowerCase().includes('password') || 
                                       key.toLowerCase().includes('secret') ||
                                       key.toLowerCase().includes('token');
                    
                    return (
                      <div key={key}>
                        <dt className="text-sm font-medium text-gray-500 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {isSensitive 
                            ? '••••••••' 
                            : typeof value === 'object' 
                              ? JSON.stringify(value, null, 2)
                              : String(value)
                          }
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  Keine Konfiguration verfügbar
                </p>
              )}
            </div>
          </div>

          {/* Recent Downloads */}
          <div className="card">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
                  <Download className="w-5 h-5" />
                  <span>Letzte Downloads</span>
                </h3>
                <Link
                  to={`/downloads?providerId=${provider.id}`}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Alle anzeigen →
                </Link>
              </div>
            </div>
            <div className="p-6">
              {downloads && downloads.items.length > 0 ? (
                <div className="space-y-4">
                  {downloads.items.slice(0, 5).map((download) => (
                    <div key={download.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/downloads/${download.id}`}
                          className="text-sm font-medium text-gray-900 hover:text-primary-600 truncate block"
                        >
                          {download.title}
                        </Link>
                        <div className="mt-1 flex items-center space-x-2 text-xs text-gray-500">
                          <span>{download.category}</span>
                          <span>•</span>
                          <span>{formatDate(download.downloadedAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  Noch keine Downloads von diesem Provider
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Statistics and Actions */}
        <div className="space-y-6">
          {/* Statistics */}
          <div className="card">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Statistiken</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Downloads gesamt</span>
                <span className="text-sm font-medium text-gray-900">
                  {downloads?.total || 0}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <span className={cn(
                  "text-sm font-medium",
                  provider.status === 'active' ? 'text-green-600' :
                  provider.status === 'error' ? 'text-red-600' :
                  provider.status === 'checking' ? 'text-yellow-600' :
                  'text-gray-600'
                )}>
                  {formatProviderStatus(provider.status)}
                </span>
              </div>

              {provider.lastCheck && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Letzte Überprüfung</span>
                  <span className="text-sm text-gray-900">
                    {formatDate(provider.lastCheck)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Aktionen</h3>
            </div>
            <div className="p-6 space-y-3">
              <button
                onClick={handleCheckProvider}
                disabled={checkProvider.isPending || provider.status === 'checking'}
                className="btn-primary w-full flex items-center justify-center space-x-2"
              >
                <RefreshCw className={cn(
                  "w-4 h-4",
                  (checkProvider.isPending || provider.status === 'checking') && "animate-spin"
                )} />
                <span>Provider prüfen</span>
              </button>

              <button
                onClick={handleToggleProvider}
                disabled={enableProvider.isPending || disableProvider.isPending}
                className={cn(
                  "btn-secondary w-full flex items-center justify-center space-x-2",
                  provider.enabled
                    ? "text-red-600 hover:text-red-700 hover:bg-red-50"
                    : "text-green-600 hover:text-green-700 hover:bg-green-50"
                )}
              >
                {provider.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{provider.enabled ? 'Deaktivieren' : 'Aktivieren'}</span>
              </button>

              <Link
                to={`/downloads?providerId=${provider.id}`}
                className="btn-secondary w-full text-center flex items-center justify-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Downloads anzeigen</span>
              </Link>
            </div>
          </div>

          {/* Provider Information */}
          <div className="card">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Information</h3>
            </div>
            <div className="p-6">
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Provider ID</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono">{provider.id}</dd>
                </div>
                
                <div>
                  <dt className="text-sm font-medium text-gray-500">Typ</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {provider.id === 'bmw-aos' ? 'BMW AOS Center' : 'Custom Provider'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Provider Configuration Modal */}
      {showConfig && (
        <ProviderConfig
          provider={provider}
          onClose={() => setShowConfig(false)}
        />
      )}
    </div>
  );
}
