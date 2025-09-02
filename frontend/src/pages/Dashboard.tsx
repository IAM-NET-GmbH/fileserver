import {
  Download,
  Server,
  Activity,
  HardDrive,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import { useHealth, useDownloadStats, useProviders, useActivities } from '@/hooks/useApi';
import { formatFileSize, formatNumber, formatRelativeTime, cn } from '@/lib/utils';

export function Dashboard() {
  const { data: health, isLoading: healthLoading } = useHealth();
  const { data: downloadStats, isLoading: statsLoading } = useDownloadStats();
  const { data: providers, isLoading: providersLoading } = useProviders();
  const { data: activities, isLoading: activitiesLoading } = useActivities(5);

  const isLoading = healthLoading || statsLoading || providersLoading;

  const stats = [
    {
      name: 'Total Downloads',
      value: downloadStats?.totalDownloads || 0,
      format: formatNumber,
      icon: Download,
      color: 'text-blue-600 bg-blue-100',
      trend: '+12%',
      trendUp: true
    },
    {
      name: 'Speicherplatz verwendet',
      value: downloadStats?.totalSize || 0,
      format: formatFileSize,
      icon: HardDrive,
      color: 'text-purple-600 bg-purple-100',
      trend: '+5%',
      trendUp: true
    },
    {
      name: 'Aktive Provider',
      value: providers?.filter(p => p.enabled && p.status === 'active').length || 0,
      format: formatNumber,
      icon: Server,
      color: 'text-green-600 bg-green-100',
      trend: '0%',
      trendUp: false
    },
    {
      name: 'System Uptime',
      value: health?.uptime || 0,
      format: (uptime: number) => {
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        return `${hours}h ${minutes}m`;
      },
      icon: Activity,
      color: 'text-orange-600 bg-orange-100',
      trend: '',
      trendUp: true
    }
  ];

  // Use real activities from API, with fallback to empty array
  const recentActivities = activities || [];

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-96 bg-gray-200 rounded-xl"></div>
          <div className="h-96 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-600">
          Übersicht über Ihr File Server System
        </p>
      </div>

      {/* System Status Alert */}
      {health && health.status !== 'healthy' && (
        <div className={cn(
          "rounded-lg p-4 flex items-start space-x-3",
          health.status === 'degraded' 
            ? "bg-yellow-50 border border-yellow-200" 
            : "bg-red-50 border border-red-200"
        )}>
          <AlertCircle className={cn(
            "w-5 h-5 mt-0.5",
            health.status === 'degraded' ? "text-yellow-600" : "text-red-600"
          )} />
          <div>
            <h3 className={cn(
              "font-medium",
              health.status === 'degraded' ? "text-yellow-800" : "text-red-800"
            )}>
              {health.status === 'degraded' ? 'System eingeschränkt' : 'System nicht verfügbar'}
            </h3>
            <p className={cn(
              "mt-1 text-sm",
              health.status === 'degraded' ? "text-yellow-700" : "text-red-700"
            )}>
              {health.status === 'degraded' 
                ? 'Einige Provider sind nicht verfügbar. Überprüfen Sie die Provider-Einstellungen.'
                : 'Das System ist derzeit nicht vollständig funktionsfähig.'}
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="card p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", stat.color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {stat.format(stat.value)}
                      </div>
                      {stat.trend && (
                        <div className={cn(
                          "ml-2 flex items-baseline text-sm font-semibold",
                          stat.trendUp ? "text-green-600" : "text-red-600"
                        )}>
                          <TrendingUp className="w-3 h-3 mr-1" />
                          {stat.trend}
                        </div>
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Provider Status */}
        <div className="card">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Provider Status</h2>
            <p className="mt-1 text-sm text-gray-500">
              Aktueller Status aller konfigurierten Provider
            </p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {providers?.slice(0, 5).map((provider) => {
                const statusIcons = {
                  active: CheckCircle,
                  error: XCircle,
                  disabled: AlertCircle,
                  checking: Clock
                };
                const StatusIcon = statusIcons[provider.status as keyof typeof statusIcons] || AlertCircle;
                
                const statusColors = {
                  active: 'text-green-600',
                  error: 'text-red-600',
                  disabled: 'text-gray-400',
                  checking: 'text-yellow-600'
                };
                const statusColor = statusColors[provider.status as keyof typeof statusColors] || 'text-gray-400';

                return (
                  <div key={provider.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <StatusIcon className={cn("w-4 h-4", statusColor)} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {provider.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {provider.lastCheck ? formatRelativeTime(provider.lastCheck) : 'Nie'}
                        </p>
                      </div>
                    </div>
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
                      statusColor.replace('text-', 'text-'),
                      provider.status === 'active' ? 'bg-green-100' :
                      provider.status === 'error' ? 'bg-red-100' :
                      provider.status === 'checking' ? 'bg-yellow-100' :
                      'bg-gray-100'
                    )}>
                      {provider.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Letzte Aktivitäten</h2>
            <p className="mt-1 text-sm text-gray-500">
              Übersicht der letzten Systemaktivitäten
            </p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentActivities.map((activity) => {
                const statusIcons = {
                  success: CheckCircle,
                  error: XCircle,
                  info: Clock
                };
                const StatusIcon = statusIcons[activity.status as keyof typeof statusIcons];
                
                const statusColors = {
                  success: 'text-green-600',
                  error: 'text-red-600',
                  info: 'text-blue-600'
                };
                const statusColor = statusColors[activity.status as keyof typeof statusColors];

                return (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <StatusIcon className={cn("w-4 h-4 mt-0.5", statusColor)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        {activity.action}
                      </p>
                      <p className="text-xs text-gray-500">
                        vor {activity.time}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Schnellaktionen</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="btn-primary text-center">
            Provider prüfen
          </button>
          <button className="btn-secondary text-center">
            Downloads anzeigen
          </button>
          <button className="btn-secondary text-center">
            System bereinigen
          </button>
          <button className="btn-secondary text-center">
            Einstellungen
          </button>
        </div>
      </div>
    </div>
  );
}
