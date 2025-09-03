import { useState } from 'react';
import {
  Plus,
  X,
  Folder,
  Save,
  RefreshCw,
  AlertTriangle,
  Info
} from 'lucide-react';
import { useCreateProvider } from '@/hooks/useApi';

interface CreateProviderModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface FolderCheckConfig {
  watchPath: string;
  checkInterval: number;
}

export function CreateProviderModal({ onClose, onSuccess }: CreateProviderModalProps) {
  const createProvider = useCreateProvider();
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<string>('');
  
  // Provider basic info
  const [providerId, setProviderId] = useState('');
  const [providerName, setProviderName] = useState('');
  const [providerDescription, setProviderDescription] = useState('');
  
  // Config for different provider types
  const [folderConfig, setFolderConfig] = useState<FolderCheckConfig>({
    watchPath: '/mnt/storagebox/providers/local',
    checkInterval: 30
  });

  const providerTypes = [
    {
      id: 'folder-check',
      name: 'Folder Check',
      description: 'Überwacht einen lokalen Ordner und seine Unterordner auf neue Dateien',
      icon: Folder
    }
  ];

  const handleNextStep = () => {
    if (step === 1 && selectedType) {
      setStep(2);
    } else if (step === 2 && providerId && providerName) {
      setStep(3);
    }
  };

  const handlePreviousStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const generateProviderId = (name: string) => {
    return name.toLowerCase()
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleNameChange = (name: string) => {
    setProviderName(name);
    if (!providerId || generateProviderId(providerName) === providerId) {
      setProviderId(generateProviderId(name));
    }
  };

  const handleCreate = async () => {
    try {
      let config: any = {};
      
      switch (selectedType) {
        case 'folder-check':
          config = folderConfig;
          break;
        default:
          throw new Error('Unbekannter Provider-Typ');
      }

      await createProvider.mutateAsync({
        id: providerId,
        name: providerName,
        description: providerDescription,
        type: selectedType,
        config
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating provider:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Plus className="w-6 h-6 text-primary-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Neuen Provider erstellen
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                Schritt {step} von 3
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Provider Type Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Provider-Typ auswählen
                </h3>
                <p className="text-gray-600 mb-6">
                  Wählen Sie den Typ des Providers aus, den Sie erstellen möchten.
                </p>
              </div>

              <div className="grid gap-4">
                {providerTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className={`p-4 border rounded-lg text-left transition-colors ${
                        selectedType === type.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <Icon className={`w-6 h-6 mt-0.5 ${
                          selectedType === type.id ? 'text-primary-600' : 'text-gray-400'
                        }`} />
                        <div className="flex-1">
                          <h4 className="text-base font-medium text-gray-900">
                            {type.name}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {type.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Basic Information */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Grundinformationen
                </h3>
                <p className="text-gray-600 mb-6">
                  Geben Sie die Grundinformationen für Ihren neuen Provider ein.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="providerName" className="block text-sm font-medium text-gray-700 mb-1">
                    Provider Name *
                  </label>
                  <input
                    id="providerName"
                    type="text"
                    value={providerName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="input"
                    placeholder="z.B. Mein Lokaler Provider"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="providerId" className="block text-sm font-medium text-gray-700 mb-1">
                    Provider ID *
                  </label>
                  <input
                    id="providerId"
                    type="text"
                    value={providerId}
                    onChange={(e) => setProviderId(e.target.value)}
                    className="input"
                    placeholder="z.B. mein-lokaler-provider"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Eindeutige Kennzeichnung des Providers (nur Kleinbuchstaben und Bindestriche)
                  </p>
                </div>

                <div>
                  <label htmlFor="providerDescription" className="block text-sm font-medium text-gray-700 mb-1">
                    Beschreibung
                  </label>
                  <textarea
                    id="providerDescription"
                    value={providerDescription}
                    onChange={(e) => setProviderDescription(e.target.value)}
                    rows={3}
                    className="input resize-none"
                    placeholder="z.B. Überwacht den lokalen Ordner auf neue Dateien..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Configuration */}
          {step === 3 && selectedType === 'folder-check' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Folder Check Konfiguration
                </h3>
                <p className="text-gray-600 mb-6">
                  Konfigurieren Sie die Einstellungen für Ihren Folder Check Provider.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">
                      Folder Check Funktionsweise
                    </h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Der Provider scannt den angegebenen Pfad und erkennt Unterordner automatisch als Kategorien.
                      Alle Dateitypen in den Unterordnern werden überwacht.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Überwachungs-Pfad *
                  </label>
                  <input
                    type="text"
                    value={folderConfig.watchPath}
                    onChange={(e) => setFolderConfig(prev => ({ ...prev, watchPath: e.target.value }))}
                    className="input"
                    placeholder="/mnt/storagebox/providers/local"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Pfad zum Ordner, der überwacht werden soll. Unterordner werden als Kategorien behandelt.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Überprüfungsintervall (Minuten) *
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="1440"
                    value={folderConfig.checkInterval}
                    onChange={(e) => setFolderConfig(prev => ({ ...prev, checkInterval: parseInt(e.target.value) }))}
                    className="input"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Wie oft der Ordner auf Änderungen überprüft werden soll (5-1440 Minuten)
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="flex space-x-3">
            {step > 1 && (
              <button
                onClick={handlePreviousStep}
                className="btn-secondary"
              >
                Zurück
              </button>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              Abbrechen
            </button>
            
            {step < 3 ? (
              <button
                onClick={handleNextStep}
                disabled={
                  (step === 1 && !selectedType) ||
                  (step === 2 && (!providerId || !providerName))
                }
                className="btn-primary disabled:opacity-50"
              >
                Weiter
              </button>
            ) : (
              <button
                onClick={handleCreate}
                disabled={createProvider.isPending}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50"
              >
                {createProvider.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Provider erstellen</span>
              </button>
            )}
          </div>
        </div>

        {/* Error Display */}
        {createProvider.error && (
          <div className="px-6 pb-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-red-900">
                    Fehler beim Erstellen des Providers
                  </h4>
                  <p className="text-sm text-red-700 mt-1">
                    {createProvider.error.message}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
