import { useState } from 'react';
import {
  Settings as SettingsIcon,
  Server,
  HardDrive,
  Shield,
  Bell,
  Save,
  RefreshCw,
  Info,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useHealth } from '@/hooks/useApi';
import { formatFileSize, cn } from '@/lib/utils';

export function Settings() {
  const { data: health } = useHealth();
  const [activeTab, setActiveTab] = useState('general');
  const [hasChanges, setHasChanges] = useState(false);

  // Mock settings state
  const [settings, setSettings] = useState({
    general: {
      checkInterval: 6,
      retentionDays: 30,
      maxFileSize: 5368709120, // 5GB
      allowedFileTypes: ['.exe', '.zip', '.istapdata', '.bin'],
    },
    notifications: {
      emailEnabled: false,
      emailAddress: '',
      webhookEnabled: false,
      webhookUrl: '',
      notifyOnSuccess: true,
      notifyOnError: true,
    },
    security: {
      requireAuth: false,
      allowedIps: ['127.0.0.1'],
      rateLimitEnabled: true,
      maxRequestsPerMinute: 60,
    }
  });

  const tabs = [
    {
      id: 'general',
      name: 'Allgemein',
      icon: SettingsIcon,
    },
    {
      id: 'notifications',
      name: 'Benachrichtigungen',
      icon: Bell,
    },
    {
      id: 'security',
      name: 'Sicherheit',
      icon: Shield,
    },
    {
      id: 'system',
      name: 'System',
      icon: Server,
    }
  ];

  const handleSave = () => {
    // Mock save functionality
    console.log('Saving settings:', settings);
    setHasChanges(false);
    // Here you would normally send the settings to the API
  };

  const updateSetting = (category: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: value
      }
    }));
    setHasChanges(true);
  };

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
        
        {hasChanges && (
          <button
            onClick={handleSave}
            className="btn-primary flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>Änderungen speichern</span>
          </button>
        )}
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
            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    Allgemeine Einstellungen
                  </h2>
                  
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Überprüfungsintervall (Stunden)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="24"
                        value={settings.general.checkInterval}
                        onChange={(e) => updateSetting('general', 'checkInterval', parseInt(e.target.value))}
                        className="input max-w-xs"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Wie oft sollen Provider automatisch überprüft werden?
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Aufbewahrungszeit (Tage)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={settings.general.retentionDays}
                        onChange={(e) => updateSetting('general', 'retentionDays', parseInt(e.target.value))}
                        className="input max-w-xs"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Nach wie vielen Tagen sollen alte Downloads gelöscht werden?
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Maximale Dateigröße
                      </label>
                      <select
                        value={settings.general.maxFileSize}
                        onChange={(e) => updateSetting('general', 'maxFileSize', parseInt(e.target.value))}
                        className="input max-w-xs"
                      >
                        <option value={1073741824}>1 GB</option>
                        <option value={2147483648}>2 GB</option>
                        <option value={5368709120}>5 GB</option>
                        <option value={10737418240}>10 GB</option>
                        <option value={21474836480}>20 GB</option>
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        Maximale Größe für einzelne Downloads
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Erlaubte Dateitypen
                      </label>
                      <input
                        type="text"
                        value={settings.general.allowedFileTypes.join(', ')}
                        onChange={(e) => updateSetting('general', 'allowedFileTypes', 
                          e.target.value.split(',').map(s => s.trim()))}
                        className="input"
                        placeholder=".exe, .zip, .bin"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Komma-getrennte Liste der erlaubten Dateierweiterungen
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Settings */}
            {activeTab === 'notifications' && (
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    Benachrichtigungseinstellungen
                  </h2>
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">
                          E-Mail-Benachrichtigungen
                        </h3>
                        <p className="text-xs text-gray-500">
                          Benachrichtigungen per E-Mail erhalten
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.notifications.emailEnabled}
                          onChange={(e) => updateSetting('notifications', 'emailEnabled', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>

                    {settings.notifications.emailEnabled && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          E-Mail-Adresse
                        </label>
                        <input
                          type="email"
                          value={settings.notifications.emailAddress}
                          onChange={(e) => updateSetting('notifications', 'emailAddress', e.target.value)}
                          className="input"
                          placeholder="admin@example.com"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">
                          Webhook-Benachrichtigungen
                        </h3>
                        <p className="text-xs text-gray-500">
                          Benachrichtigungen an einen Webhook senden
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.notifications.webhookEnabled}
                          onChange={(e) => updateSetting('notifications', 'webhookEnabled', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>

                    {settings.notifications.webhookEnabled && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Webhook URL
                        </label>
                        <input
                          type="url"
                          value={settings.notifications.webhookUrl}
                          onChange={(e) => updateSetting('notifications', 'webhookUrl', e.target.value)}
                          className="input"
                          placeholder="https://hooks.slack.com/..."
                        />
                      </div>
                    )}

                    <div className="border-t border-gray-200 pt-4">
                      <h3 className="text-sm font-medium text-gray-900 mb-3">
                        Benachrichtigungstypen
                      </h3>
                      
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={settings.notifications.notifyOnSuccess}
                            onChange={(e) => updateSetting('notifications', 'notifyOnSuccess', e.target.checked)}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <label className="ml-2 text-sm text-gray-700">
                            Bei erfolgreichem Download benachrichtigen
                          </label>
                        </div>
                        
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={settings.notifications.notifyOnError}
                            onChange={(e) => updateSetting('notifications', 'notifyOnError', e.target.checked)}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <label className="ml-2 text-sm text-gray-700">
                            Bei Fehlern benachrichtigen
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Security Settings */}
            {activeTab === 'security' && (
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    Sicherheitseinstellungen
                  </h2>
                  
                  <div className="space-y-6">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                        <div>
                          <h3 className="text-sm font-medium text-yellow-800">
                            Sicherheitshinweis
                          </h3>
                          <p className="mt-1 text-sm text-yellow-700">
                            Änderungen an den Sicherheitseinstellungen können die Funktionalität des Systems beeinträchtigen.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Erlaubte IP-Adressen
                      </label>
                      <textarea
                        value={settings.security.allowedIps.join('\n')}
                        onChange={(e) => updateSetting('security', 'allowedIps', 
                          e.target.value.split('\n').filter(ip => ip.trim()))}
                        className="input"
                        rows={4}
                        placeholder="127.0.0.1&#10;192.168.1.0/24"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Eine IP-Adresse oder CIDR-Block pro Zeile. Leer lassen für unbeschränkten Zugang.
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">
                          Rate Limiting aktivieren
                        </h3>
                        <p className="text-xs text-gray-500">
                          Anzahl der Anfragen pro Minute begrenzen
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.security.rateLimitEnabled}
                          onChange={(e) => updateSetting('security', 'rateLimitEnabled', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>

                    {settings.security.rateLimitEnabled && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Max. Anfragen pro Minute
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          value={settings.security.maxRequestsPerMinute}
                          onChange={(e) => updateSetting('security', 'maxRequestsPerMinute', parseInt(e.target.value))}
                          className="input max-w-xs"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* System Information */}
            {activeTab === 'system' && (
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    Systeminformationen
                  </h2>
                  
                  {health && (
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
                                {Math.floor(health.uptime / 3600)}h {Math.floor((health.uptime % 3600) / 60)}m
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

                      {/* Database Info */}
                      <div className="card p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                          Datenbankstatus
                        </h3>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={cn(
                              "w-3 h-3 rounded-full",
                              health.database.connected ? "bg-green-400" : "bg-red-400"
                            )}></div>
                            <span className="text-sm text-gray-900">
                              {health.database.connected ? 'Verbunden' : 'Nicht verbunden'}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500">
                            {health.database.itemCount} Einträge
                          </span>
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
