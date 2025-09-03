import { useState } from 'react';
import {
  Settings,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Globe,
  Clock,
  Link,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Info,
  Folder
} from 'lucide-react';
import { Provider } from '@iam-fileserver/shared';
import { useUpdateProviderConfig } from '@/hooks/useApi';


interface ProviderConfigProps {
  provider: Provider;
  onClose: () => void;
}

interface BMWConfig {
  username: string;
  password: string;
  authUrl: string;
  istaPUrl: string;
  istaNextUrl: string;
  headless: boolean;
  downloadPath: string;
  customPages?: CustomPage[];
  checkInterval?: number; // in minutes
}

interface VWConfig {
  watchPath: string;
  categories: string[];
  checkInterval: number;
}

interface FolderCheckConfig {
  watchPath: string;
  checkInterval: number;
}

interface CustomPage {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  selectors: string[];
  checkInterval?: number;
}

export function ProviderConfig({ provider, onClose }: ProviderConfigProps) {
  const updateProviderConfig = useUpdateProviderConfig();
  const [showPassword, setShowPassword] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [providerName, setProviderName] = useState(provider.name);
  const [providerDescription, setProviderDescription] = useState(provider.description);
  
  // Initialize config based on provider type
  const [config, setConfig] = useState(() => {
    if (provider.id === 'vw-webdav') {
      return {
        watchPath: provider.config.watchPath || '/mnt/storagebox/providers/vw',
        categories: provider.config.categories || ['BTAC', 'FMC', 'Odis', 'Odis_Fallback', 'Provider', 'Service42', 'Service42-MMI'],
        checkInterval: provider.config.checkInterval || 15,
      } as VWConfig;
    } else if (provider.id.includes('folder-check')) {
      return {
        watchPath: provider.config.watchPath || '/mnt/storagebox/providers/local',
        checkInterval: provider.config.checkInterval || 30,
      } as FolderCheckConfig;
    } else {
      return {
        username: provider.config.username || '',
        password: provider.config.password || '',
        authUrl: provider.config.authUrl || 'https://aos.bmwgroup.com/auth/login',
        istaPUrl: provider.config.istaPUrl || 'https://aos.bmwgroup.com/ista-p',
        istaNextUrl: provider.config.istaNextUrl || 'https://aos.bmwgroup.com/ista-next',
        headless: provider.config.headless ?? true,
        downloadPath: provider.config.downloadPath || '/mnt/storagebox/providers/bmw',
        customPages: provider.config.customPages || [],
        checkInterval: provider.config.checkInterval || 360, // 6 hours default
      } as BMWConfig;
    }
  });

  const handleSave = () => {
    updateProviderConfig.mutate(
      { 
        id: provider.id, 
        config,
        name: providerName,
        description: providerDescription
      },
      {
        onSuccess: () => {
          setHasChanges(false);
        }
      }
    );
  };

  const updateConfig = (key: string, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const updateProviderName = (name: string) => {
    setProviderName(name);
    setHasChanges(true);
  };

  const updateProviderDescription = (description: string) => {
    setProviderDescription(description);
    setHasChanges(true);
  };

  const addCustomPage = () => {
    if (provider.id === 'vw-webdav') return; // VW doesn't have custom pages
    
    const newPage: CustomPage = {
      id: Date.now().toString(),
      name: '',
      url: '',
      enabled: true,
      selectors: ['a[href*="download"]'],
      checkInterval: 60, // 1 hour default
    };
    
    setConfig(prev => ({
      ...prev,
      customPages: [...((prev as BMWConfig).customPages || []), newPage]
    }));
    setHasChanges(true);
  };

  const updateCustomPage = (pageId: string, updates: Partial<CustomPage>) => {
    if (provider.id === 'vw-webdav') return; // VW doesn't have custom pages
    
    setConfig(prev => ({
      ...prev,
      customPages: ((prev as BMWConfig).customPages || []).map((page: CustomPage) =>
        page.id === pageId ? { ...page, ...updates } : page
      )
    }));
    setHasChanges(true);
  };

  const removeCustomPage = (pageId: string) => {
    if (provider.id === 'vw-webdav') return; // VW doesn't have custom pages
    
    setConfig(prev => ({
      ...prev,
      customPages: ((prev as BMWConfig).customPages || []).filter((page: CustomPage) => page.id !== pageId)
    }));
    setHasChanges(true);
  };

  const addSelector = (pageId: string) => {
    if (provider.id === 'vw-webdav') return; // VW doesn't have custom pages
    
    updateCustomPage(pageId, {
      selectors: [...(((config as BMWConfig).customPages?.find((p: CustomPage) => p.id === pageId)?.selectors || [])), '']
    });
  };

  const updateSelector = (pageId: string, selectorIndex: number, value: string) => {
    if (provider.id === 'vw-webdav') return; // VW doesn't have custom pages
    
    const page = (config as BMWConfig).customPages?.find((p: CustomPage) => p.id === pageId);
    if (page) {
      const newSelectors = [...page.selectors];
      newSelectors[selectorIndex] = value;
      updateCustomPage(pageId, { selectors: newSelectors });
    }
  };

  const removeSelector = (pageId: string, selectorIndex: number) => {
    if (provider.id === 'vw-webdav') return; // VW doesn't have custom pages
    
    const page = (config as BMWConfig).customPages?.find((p: CustomPage) => p.id === pageId);
    if (page) {
      const newSelectors = page.selectors.filter((_: string, index: number) => index !== selectorIndex);
      updateCustomPage(pageId, { selectors: newSelectors });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Settings className="w-6 h-6 text-primary-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {provider.name} Konfiguration
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                Dynamische Provider-Einstellungen anpassen
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {hasChanges && (
              <button
                onClick={handleSave}
                disabled={updateProviderConfig.isPending}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50"
              >
                {updateProviderConfig.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Speichern</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">Schließen</span>
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Provider Name and Description - Universal for all providers */}
          <div className="space-y-4">
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Grundeinstellungen</h3>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label htmlFor="providerName" className="block text-sm font-medium text-gray-700 mb-1">
                    Provider Name
                  </label>
                  <input
                    id="providerName"
                    type="text"
                    value={providerName}
                    onChange={(e) => updateProviderName(e.target.value)}
                    className="input"
                    placeholder="z.B. BMW AOS Center"
                  />
                </div>
                
                <div>
                  <label htmlFor="providerDescription" className="block text-sm font-medium text-gray-700 mb-1">
                    Beschreibung
                  </label>
                  <textarea
                    id="providerDescription"
                    value={providerDescription}
                    onChange={(e) => updateProviderDescription(e.target.value)}
                    rows={3}
                    className="input resize-none"
                    placeholder="z.B. BMW Aftermarket Online Services - ISTA-P und ISTA-Next Downloads"
                  />
                </div>
              </div>
            </div>
          </div>

          {provider.id === 'vw-webdav' ? (
            // VW Provider Configuration
            <>
              {/* VW WebDAV Einstellungen */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
                  <Globe className="w-5 h-5" />
                  <span>VW WebDAV Konfiguration</span>
                </h3>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Überwachungs-Pfad
                    </label>
                    <input
                      type="text"
                      value={(config as VWConfig).watchPath}
                      onChange={(e) => updateConfig('watchPath', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="/mnt/storagebox/providers/vw"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Pfad zum VW Provider-Ordner
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Überprüfungsintervall (Minuten)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="1440"
                      value={(config as VWConfig).checkInterval}
                      onChange={(e) => updateConfig('checkInterval', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
              </div>

              {/* VW Kategorien */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
                  <Settings className="w-5 h-5" />
                  <span>Überwachte Kategorien</span>
                </h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-900">
                        VW Ordner-Struktur
                      </h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Diese Kategorien werden automatisch in {(config as VWConfig).watchPath} überwacht. 
                        <strong>Alle Dateitypen</strong> werden erfasst (kein Filter).
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {(config as VWConfig).categories.map((category, index) => (
                    <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                      <span className="text-sm font-medium text-gray-700">{category}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : provider.id.includes('folder-check') ? (
            // Folder Check Provider Configuration
            <>
              {/* Folder Check Einstellungen */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
                  <Folder className="w-5 h-5" />
                  <span>Folder Check Konfiguration</span>
                </h3>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Überwachungs-Pfad
                    </label>
                    <input
                      type="text"
                      value={(config as FolderCheckConfig).watchPath}
                      onChange={(e) => updateConfig('watchPath', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="/mnt/storagebox/providers/local"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Pfad zum Ordner, der überwacht werden soll. Unterordner werden als Kategorien behandelt.
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Überprüfungsintervall (Minuten)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="1440"
                      value={(config as FolderCheckConfig).checkInterval}
                      onChange={(e) => updateConfig('checkInterval', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Wie oft der Ordner auf Änderungen überprüft werden soll (5-1440 Minuten)
                    </p>
                  </div>
                </div>
              </div>

              {/* Folder Check Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">
                      Folder Check Funktionsweise
                    </h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Dieser Provider überwacht den angegebenen Ordner und erkennt Unterordner automatisch als Kategorien.
                      Alle Dateitypen werden erfasst und bei Änderungen registriert.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            // BMW Provider Configuration
            <>
              {/* Authentifizierung */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
                  <Globe className="w-5 h-5" />
                  <span>BMW AOS Authentifizierung</span>
                </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Benutzername
                  </label>
                  <input
                    type="text"
                    value={(config as BMWConfig).username}
                    onChange={(e) => updateConfig('username', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="BMW AOS Benutzername"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Passwort
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={(config as BMWConfig).password}
                      onChange={(e) => updateConfig('password', e.target.value)}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="BMW AOS Passwort"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
            </div>
          </div>

          {/* Standard URLs */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
              <Link className="w-5 h-5" />
              <span>Standard URLs</span>
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Login URL
                </label>
                <input
                  type="url"
                  value={(config as BMWConfig).authUrl}
                  onChange={(e) => updateConfig('authUrl', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ISTA-P URL
                </label>
                <input
                  type="url"
                  value={(config as BMWConfig).istaPUrl}
                  onChange={(e) => updateConfig('istaPUrl', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ISTA-Next URL
                </label>
                <input
                  type="url"
                  value={(config as BMWConfig).istaNextUrl}
                  onChange={(e) => updateConfig('istaNextUrl', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Download-Pfad
                </label>
                <input
                  type="text"
                  value={(config as BMWConfig).downloadPath}
                  onChange={(e) => updateConfig('downloadPath', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="/mnt/storagebox/providers/bmw"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Pfad wo BMW-Dateien gespeichert werden sollen
                </p>
              </div>
            </div>
          </div>

          {/* Browser Einstellungen */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Browser & Timing Einstellungen</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="headless"
                  checked={(config as BMWConfig).headless}
                  onChange={(e) => updateConfig('headless', e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="headless" className="text-sm font-medium text-gray-700">
                  Headless Modus (unsichtbar)
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Überprüfungsintervall (Minuten)
                </label>
                <input
                  type="number"
                  min="30"
                  max="1440"
                  value={(config as BMWConfig).checkInterval}
                  onChange={(e) => updateConfig('checkInterval', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Custom Pages */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
                <Globe className="w-5 h-5" />
                <span>Benutzerdefinierte Seiten</span>
              </h3>
              <button
                onClick={addCustomPage}
                className="btn-secondary flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Seite hinzufügen</span>
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900">
                    Benutzerdefinierte Seiten
                  </h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Fügen Sie zusätzliche BMW AOS Seiten hinzu, die überwacht werden sollen. 
                    Geben Sie CSS-Selektoren an, um Download-Links zu identifizieren.
                  </p>
                </div>
              </div>
            </div>

            {(config as BMWConfig).customPages && (config as BMWConfig).customPages!.length > 0 && (
              <div className="space-y-4">
                {(config as BMWConfig).customPages!.map((page, pageIndex) => (
                  <div key={page.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={page.enabled}
                          onChange={(e) => updateCustomPage(page.id, { enabled: e.target.checked })}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Seite {pageIndex + 1}
                        </span>
                      </div>
                      <button
                        onClick={() => removeCustomPage(page.id)}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Name
                        </label>
                        <input
                          type="text"
                          value={page.name}
                          onChange={(e) => updateCustomPage(page.id, { name: e.target.value })}
                          placeholder="z.B. Zusätzliche BMW Tools"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          URL
                        </label>
                        <input
                          type="url"
                          value={page.url}
                          onChange={(e) => updateCustomPage(page.id, { url: e.target.value })}
                          placeholder="https://aos.bmwgroup.com/custom-page"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          CSS Selektoren für Download-Links
                        </label>
                        <button
                          onClick={() => addSelector(page.id)}
                          className="text-sm text-primary-600 hover:text-primary-800"
                        >
                          + Selector hinzufügen
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        {page.selectors.map((selector, selectorIndex) => (
                          <div key={selectorIndex} className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={selector}
                              onChange={(e) => updateSelector(page.id, selectorIndex, e.target.value)}
                              placeholder='z.B. a[href*="download"], .download-button'
                              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono"
                            />
                            {page.selectors.length > 1 && (
                              <button
                                onClick={() => removeSelector(page.id, selectorIndex)}
                                className="text-red-600 hover:text-red-800 p-1"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
              </>
            )}

          {/* Status Hinweis */}
          {provider.enabled && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-900">
                    Provider ist aktiv
                  </h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Änderungen werden beim nächsten Check-Zyklus wirksam. 
                    Der Provider wird automatisch neu gestartet.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
