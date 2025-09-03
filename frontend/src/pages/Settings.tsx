import { useState, useEffect } from 'react';
import {
  Server,
  HardDrive,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  RotateCcw
} from 'lucide-react';
import { useHealth, useSettings, useUpdateSettings, useResetSettings } from '@/hooks/useApi';
import { formatFileSize, cn } from '@/lib/utils';
import { Settings as SettingsType } from '@iam-fileserver/shared';

export function Settings() {
  const { data: health } = useHealth();
  const { data: serverSettings, isLoading: settingsLoading, error: settingsError } = useSettings();
  const updateSettings = useUpdateSettings();
  const resetSettings = useResetSettings();
  
  const [activeTab, setActiveTab] = useState('system');
  const [hasChanges, setHasChanges] = useState(false);
  const [settings, setSettings] = useState<SettingsType | null>(null);

  // Update local settings when server data loads
  useEffect(() => {
    if (serverSettings && !settings) {
      setSettings(serverSettings);
    }
  }, [serverSettings, settings]);

  const tabs = [
    {
      id: 'system',
      name: 'System',
      icon: Server,
    }
  ];

  const handleSave = () => {
    if (!settings) return;
    
    updateSettings.mutate(settings, {
      onSuccess: () => {
        setHasChanges(false);
      }
    });
  };

  const handleReset = () => {
    if (confirm('Sind Sie sicher, dass Sie alle Einstellungen auf die Standardwerte zurücksetzen möchten?')) {
      resetSettings.mutate(undefined, {
        onSuccess: (resetData) => {
          setSettings(resetData);
          setHasChanges(false);
        }
      });
    }
  };

  // Settings updater - for future use
  // const updateSetting = (category: string, key: string, value: any) => {
  //   if (!settings) return;
  //   setSettings(prev => {
  //     if (!prev) return null;
  //     const currentCategory = prev[category as keyof typeof prev];
  //     return {
  //       ...prev,
  //       [category]: {
  //         ...(typeof currentCategory === 'object' && currentCategory !== null ? currentCategory : {}),
  //         [key]: value
  //       }
  //     };
  //   });
  //   setHasChanges(true);
  // };

  // Loading state
  if (settingsLoading || !settings) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <div className="space-y-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-10 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-3">
              <div className="card p-6">
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-12 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (settingsError) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <AlertCircle className="w-12 h-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Fehler beim Laden der Einstellungen
          </h2>
          <p className="text-gray-600">{settingsError.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>
          <p className="mt-1 text-gray-600">
            Systemkonfiguration und Präferenzen verwalten
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={updateSettings.isPending}
              className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateSettings.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>
                {updateSettings.isPending ? 'Speichere...' : 'Änderungen speichern'}
              </span>
            </button>
          )}
          <button
            onClick={handleReset}
            disabled={resetSettings.isPending}
            className="btn-secondary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resetSettings.isPending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
            <span>
              {resetSettings.isPending ? 'Zurücksetzen...' : 'Zurücksetzen'}
            </span>
          </button>
        </div>
      </div>

      {/* Settings Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors text-left",
                    activeTab === tab.id
                      ? "bg-primary-50 text-primary-700 border-r-2 border-primary-500"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Icon className="mr-3 h-4 w-4" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="card">

            {/* System Information */}
            {activeTab === 'system' && (
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    Systeminformationen
                  </h2>
                  
                  {health ? (
                    <div className="space-y-6">
                      {/* System Status */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="card p-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <CheckCircle className="w-8 h-8 text-green-500" />
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-500">Status</p>
                              <p className="text-lg font-semibold text-gray-900 capitalize">
                                {health.status}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="card p-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <RefreshCw className="w-8 h-8 text-blue-500" />
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-500">Uptime</p>
                              <p className="text-lg font-semibold text-gray-900">
                                {health.uptime ? 
                                  `${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m` 
                                  : 'Unbekannt'
                                }
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="card p-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <Server className="w-8 h-8 text-purple-500" />
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-500">Version</p>
                              <p className="text-lg font-semibold text-gray-900">
                                {health.version}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Disk Usage */}
                      <div className="card p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center space-x-2">
                          <HardDrive className="w-5 h-5" />
                          <span>Speicherplatz</span>
                        </h3>
                        
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between text-sm">
                              <span>Verwendet</span>
                              <span>{formatFileSize(health.disk.usedSpace)}</span>
                            </div>
                            <div className="mt-1 relative pt-1">
                              <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                                <div
                                  style={{
                                    width: health.disk.totalSpace > 0 
                                      ? `${(health.disk.usedSpace / health.disk.totalSpace) * 100}%`
                                      : '0%'
                                  }}
                                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary-500"
                                ></div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Gesamt:</span>
                              <span className="ml-2 font-medium">
                                {formatFileSize(health.disk.totalSpace)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Verfügbar:</span>
                              <span className="ml-2 font-medium">
                                {formatFileSize(health.disk.freeSpace)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>


                    </div>
                  ) : (
                    <div className="card p-6">
                      <div className="flex items-center justify-center py-8">
                        <div className="text-center">
                          <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-spin" />
                          <p className="text-sm text-gray-500">Lade Systeminformationen...</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
