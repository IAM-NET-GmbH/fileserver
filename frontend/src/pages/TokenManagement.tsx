import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { 
  Key, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Copy, 
  Calendar,
  User as UserIcon,
  Activity,
  X,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ApiToken {
  id: string;
  name: string;
  token: string;
  description?: string;
  created_by: string;
  is_active: boolean;
  last_used_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
}

interface CreateTokenData {
  name: string;
  description?: string;
  expires_at?: string;
}

interface UpdateTokenData {
  name?: string;
  description?: string;
  is_active?: boolean;
  expires_at?: string;
}

// API functions
const fetchTokens = async (): Promise<ApiToken[]> => {
  const token = localStorage.getItem('auth_token');
  const response = await fetch('/api/api-tokens', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data.data.tokens;
};

const fetchTokenStats = async () => {
  const token = localStorage.getItem('auth_token');
  const response = await fetch('/api/api-tokens/stats', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
};

const fetchTokenById = async (id: string): Promise<ApiToken> => {
  const token = localStorage.getItem('auth_token');
  const response = await fetch(`/api/api-tokens/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data.data.token;
};

const createToken = async (tokenData: CreateTokenData): Promise<ApiToken> => {
  const token = localStorage.getItem('auth_token');
  const response = await fetch('/api/api-tokens', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(tokenData),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data.data.token;
};

const updateToken = async ({ id, tokenData }: { id: string; tokenData: UpdateTokenData }): Promise<ApiToken> => {
  const token = localStorage.getItem('auth_token');
  const response = await fetch(`/api/api-tokens/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(tokenData),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data.data.token;
};

const deleteToken = async (id: string): Promise<void> => {
  const token = localStorage.getItem('auth_token');
  const response = await fetch(`/api/api-tokens/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
};

// Token Modal Component
interface TokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  token?: ApiToken | null;
  onSave: (tokenData: CreateTokenData | UpdateTokenData) => void;
  isLoading: boolean;
}

const TokenModal: React.FC<TokenModalProps> = ({ isOpen, onClose, token, onSave, isLoading }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    expires_at: '',
    is_active: true
  });

  React.useEffect(() => {
    if (token) {
      setFormData({
        name: token.name,
        description: token.description || '',
        expires_at: token.expires_at ? token.expires_at.split('T')[0] : '',
        is_active: token.is_active
      });
    } else {
      setFormData({
        name: '',
        description: '',
        expires_at: '',
        is_active: true
      });
    }
  }, [token]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tokenData: any = {
      name: formData.name,
      description: formData.description || undefined,
      expires_at: formData.expires_at || undefined,
    };

    if (token) {
      tokenData.is_active = formData.is_active;
    }

    onSave(tokenData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {token ? 'Token bearbeiten' : 'Neuen Token erstellen'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Token Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="input"
              placeholder="z.B. Kunde XYZ, Script ABC"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Beschreibung
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="input"
              rows={3}
              placeholder="Optionale Beschreibung für diesen Token"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ablaufdatum (optional)
            </label>
            <input
              type="date"
              value={formData.expires_at}
              onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
              className="input"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {token && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="mr-2"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                Aktiv
              </label>
            </div>
          )}

          <div className="flex space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={isLoading}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={isLoading || !formData.name.trim()}
            >
              {isLoading ? 'Speichere...' : (token ? 'Aktualisieren' : 'Erstellen')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Token Detail Modal
interface TokenDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenId: string | null;
}

const TokenDetailModal: React.FC<TokenDetailModalProps> = ({ isOpen, onClose, tokenId }) => {
  const [showFullToken, setShowFullToken] = useState(false);

  const { data: token, isLoading } = useQuery({
    queryKey: ['token-detail', tokenId],
    queryFn: () => fetchTokenById(tokenId!),
    enabled: isOpen && !!tokenId,
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Token in Zwischenablage kopiert!');
    } catch (error) {
      toast.error('Kopieren fehlgeschlagen');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Token Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : token ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Token
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={showFullToken ? token.token : `${token.token.substring(0, 12)}...${token.token.substring(token.token.length - 4)}`}
                  className="input flex-1 font-mono text-sm bg-gray-50"
                />
                <button
                  onClick={() => setShowFullToken(!showFullToken)}
                  className="btn-secondary p-2"
                  title={showFullToken ? "Verbergen" : "Anzeigen"}
                >
                  {showFullToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => copyToClipboard(token.token)}
                  className="btn-secondary p-2"
                  title="Kopieren"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Usage Examples */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="font-medium text-gray-900 mb-2">Verwendungsbeispiele:</h5>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-gray-600 mb-1">cURL:</p>
                  <code className="block bg-white p-2 rounded border text-xs break-all">
                    curl -H "Authorization: Bearer {token.token}" "{window.location.origin}/api/direct/download/DOWNLOAD_ID"
                  </code>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">wget:</p>
                  <code className="block bg-white p-2 rounded border text-xs break-all">
                    wget --header="Authorization: Bearer {token.token}" "{window.location.origin}/api/direct/download/DOWNLOAD_ID"
                  </code>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const TokenManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingToken, setEditingToken] = useState<ApiToken | null>(null);
  const [detailTokenId, setDetailTokenId] = useState<string | null>(null);

  // Queries
  const { data: tokens = [], isLoading, error } = useQuery({
    queryKey: ['api-tokens'],
    queryFn: fetchTokens,
  });

  const { data: stats } = useQuery({
    queryKey: ['api-token-stats'],
    queryFn: fetchTokenStats,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createToken,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-tokens'] });
      queryClient.invalidateQueries({ queryKey: ['api-token-stats'] });
      setIsModalOpen(false);
      toast.success('Token wurde erfolgreich erstellt');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateToken,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-tokens'] });
      setIsModalOpen(false);
      setEditingToken(null);
      toast.success('Token wurde erfolgreich aktualisiert');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteToken,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-tokens'] });
      queryClient.invalidateQueries({ queryKey: ['api-token-stats'] });
      toast.success('Token wurde erfolgreich gelöscht');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Filter tokens
  const filteredTokens = tokens.filter(token =>
    token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (token.description && token.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCreateToken = () => {
    setEditingToken(null);
    setIsModalOpen(true);
  };

  const handleEditToken = (token: ApiToken) => {
    setEditingToken(token);
    setIsModalOpen(true);
  };

  const handleDeleteToken = (token: ApiToken) => {
    if (window.confirm(`Sind Sie sicher, dass Sie den Token "${token.name}" löschen möchten?`)) {
      deleteMutation.mutate(token.id);
    }
  };

  const handleSaveToken = (tokenData: CreateTokenData | UpdateTokenData) => {
    if (editingToken) {
      updateMutation.mutate({ id: editingToken.id, tokenData });
    } else {
      createMutation.mutate(tokenData as CreateTokenData);
    }
  };

  const handleShowDetails = (tokenId: string) => {
    setDetailTokenId(tokenId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Fehler beim Laden der Token: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Key className="w-8 h-8 text-primary-600 mr-3" />
            API Token Management
          </h1>
          <p className="text-gray-600 mt-1">
            Zentrale Verwaltung aller API-Tokens für Direktdownloads
          </p>
        </div>

        <button
          onClick={handleCreateToken}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Neuer Token</span>
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-50">
                <Key className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Gesamt Token</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-50">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Aktive Token</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.active}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-gray-50">
                <AlertTriangle className="w-6 h-6 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Inaktive Token</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.inactive}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Token List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Token suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Token
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ersteller
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Letzte Nutzung
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTokens.map((token) => (
                <tr key={token.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{token.name}</div>
                      <div className="text-sm text-gray-500 font-mono">
                        {token.token}
                      </div>
                      {token.description && (
                        <div className="text-sm text-gray-500 mt-1">{token.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <UserIcon className="w-4 h-4 text-gray-400 mr-2" />
                      <div className="text-sm text-gray-900">
                        {token.creator?.name || 'Unbekannt'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                      token.is_active 
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    )}>
                      {token.is_active ? 'Aktiv' : 'Inaktiv'}
                    </span>
                    {token.expires_at && (
                      <div className="text-xs text-gray-500 mt-1 flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        Läuft ab: {new Date(token.expires_at).toLocaleDateString('de-DE')}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {token.last_used_at 
                      ? new Date(token.last_used_at).toLocaleDateString('de-DE')
                      : 'Noch nie'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleShowDetails(token.id)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Details anzeigen"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditToken(token)}
                        className="text-primary-600 hover:text-primary-900"
                        title="Bearbeiten"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteToken(token)}
                        className="text-red-600 hover:text-red-900"
                        title="Löschen"
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTokens.length === 0 && (
          <div className="text-center py-12">
            <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm ? 'Keine Token gefunden' : 'Noch keine API-Token vorhanden'}
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      <TokenModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingToken(null);
        }}
        token={editingToken}
        onSave={handleSaveToken}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <TokenDetailModal
        isOpen={!!detailTokenId}
        onClose={() => setDetailTokenId(null)}
        tokenId={detailTokenId}
      />
    </div>
  );
};
