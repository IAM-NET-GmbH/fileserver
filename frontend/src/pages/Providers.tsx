import { Link } from 'react-router-dom';
import {
  Server,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Play,
  Pause,
  RefreshCw,
  Settings,
  ExternalLink,
  Activity
} from 'lucide-react';
import {
  useProviders,
  useEnableProvider,
  useDisableProvider,
  useCheckProvider,
  useCheckAllProviders
} from '@/hooks/useApi';
import { formatProviderStatus, getStatusColor, formatRelativeTime, cn } from '@/lib/utils';

export function Providers() {
  const { data: providers, isLoading, error } = useProviders();
  const enableProvider = useEnableProvider();
  const disableProvider = useDisableProvider();
  const checkProvider = useCheckProvider();
  const checkAllProviders = useCheckAllProviders();

  const handleToggleProvider = (id: string, enabled: boolean) => {
    if (enabled) {
      disableProvider.mutate(id);
    } else {
      enableProvider.mutate(id);
    }
  };

  const handleCheckProvider = (id: string) => {
    checkProvider.mutate(id);
  };

  const handleCheckAll = () => {
    checkAllProviders.mutate();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'checking':
        return <Clock className="w-5 h-5 text-yellow-600 animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <Server className="w-12 h-12 mx-auto" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Fehler beim Laden der Provider
        </h2>
        <p className="text-gray-600">{error.message}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Provider</h1>
          <p className="mt-1 text-gray-600">
            Verwalten Sie Ihre Download-Provider
          </p>
        </div>
        <button
          onClick={handleCheckAll}
          disabled={checkAllProviders.isPending}
          className={cn(
            "btn-primary flex items-center space-x-2",
            checkAllProviders.isPending && "opacity-50 cursor-not-allowed"
          )}
        >
          <RefreshCw className={cn("w-4 h-4", checkAllProviders.isPending && "animate-spin")} />
          <span>Alle prüfen</span>
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Server className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Gesamt
                </dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  {providers?.length || 0}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Aktiv
                </dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  {providers?.filter(p => p.enabled && p.status === 'active').length || 0}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                <XCircle className="w-4 h-4 text-red-600" />
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Fehler
                </dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  {providers?.filter(p => p.status === 'error').length || 0}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <Pause className="w-4 h-4 text-gray-600" />
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Deaktiviert
                </dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  {providers?.filter(p => !p.enabled).length || 0}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Providers List */}
      {providers && providers.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {providers.map((provider) => (
            <div key={provider.id} className="card hover:shadow-medium transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    {/* Provider Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                        <Server className="w-6 h-6 text-white" />
                      </div>
                    </div>

                    {/* Provider Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/providers/${provider.id}`}
                          className="text-lg font-semibold text-gray-900 hover:text-primary-600"
                        >
                          {provider.name}
                        </Link>
                        {getStatusIcon(provider.status)}
                      </div>
                      
                      <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                        {provider.description}
                      </p>

                      <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                        <span className={cn(
                          "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                          getStatusColor(provider.status)
                        )}>
                          {formatProviderStatus(provider.status)}
                        </span>
                        
                        {provider.lastCheck && (
                          <>
                            <span>•</span>
                            <span>Letzte Überprüfung: {formatRelativeTime(provider.lastCheck)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    {/* Enable/Disable Toggle */}
                    <button
                      onClick={() => handleToggleProvider(provider.id, provider.enabled)}
                      disabled={enableProvider.isPending || disableProvider.isPending}
                      className={cn(
                        "btn-sm flex items-center space-x-1",
                        provider.enabled
                          ? "btn-ghost text-red-600 hover:text-red-700 hover:bg-red-50"
                          : "btn-ghost text-green-600 hover:text-green-700 hover:bg-green-50"
                      )}
                      title={provider.enabled ? "Provider deaktivieren" : "Provider aktivieren"}
                    >
                      {provider.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>

                    {/* Check Provider */}
                    <button
                      onClick={() => handleCheckProvider(provider.id)}
                      disabled={checkProvider.isPending || provider.status === 'checking'}
                      className="btn-secondary btn-sm"
                      title="Provider prüfen"
                    >
                      <RefreshCw className={cn(
                        "w-4 h-4",
                        (checkProvider.isPending || provider.status === 'checking') && "animate-spin"
                      )} />
                    </button>

                    {/* Settings */}
                    <Link
                      to={`/providers/${provider.id}`}
                      className="btn-secondary btn-sm"
                      title="Provider-Einstellungen"
                    >
                      <Settings className="w-4 h-4" />
                    </Link>

                    {/* View Details */}
                    <Link
                      to={`/providers/${provider.id}`}
                      className="btn-secondary btn-sm"
                      title="Provider-Details anzeigen"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                {/* Provider Configuration Summary */}
                {provider.enabled && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-4 text-gray-500">
                        <span className="flex items-center space-x-1">
                          <Activity className="w-3 h-3" />
                          <span>Status: {formatProviderStatus(provider.status)}</span>
                        </span>
                        {provider.id === 'bmw-aos' && (
                          <span>BMW AOS Center Integration</span>
                        )}
                      </div>
                      
                      {provider.status === 'active' && (
                        <span className="text-green-600 text-xs font-medium">
                          Läuft ordnungsgemäß
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Server className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Keine Provider konfiguriert
          </h2>
          <p className="text-gray-600">
            Es sind noch keine Download-Provider konfiguriert.
          </p>
        </div>
      )}
    </div>
  );
}
