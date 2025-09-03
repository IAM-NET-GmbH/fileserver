import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Shield, 
  Mail, 
  User as UserIcon,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { User } from '@/lib/auth';

interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
}

interface UpdateUserData {
  name?: string;
  email?: string;
  role?: 'user' | 'admin';
  is_active?: boolean;
  password?: string;
}

// API functions
const fetchUsers = async (): Promise<User[]> => {
  const token = localStorage.getItem('auth_token');
  const response = await fetch('/api/users', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data.data.users;
};

const createUser = async (userData: CreateUserData): Promise<User> => {
  const token = localStorage.getItem('auth_token');
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(userData),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data.data.user;
};

const updateUser = async ({ id, userData }: { id: string; userData: UpdateUserData }): Promise<User> => {
  const token = localStorage.getItem('auth_token');
  const response = await fetch(`/api/users/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(userData),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data.data.user;
};

const deleteUser = async (id: string): Promise<void> => {
  const token = localStorage.getItem('auth_token');
  const response = await fetch(`/api/users/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
};

// Modal Components
interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User | null;
  onSave: (userData: CreateUserData | UpdateUserData) => void;
  isLoading: boolean;
}

const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, user, onSave, isLoading }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' as 'user' | 'admin',
    is_active: true
  });

  // Update form data when user prop changes
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
        is_active: user.is_active
      });
    } else {
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'user',
        is_active: true
      });
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const userData: any = {
      name: formData.name,
      email: formData.email,
      role: formData.role,
    };

    if (user) {
      // Update
      userData.is_active = formData.is_active;
      if (formData.password) {
        userData.password = formData.password;
      }
    } else {
      // Create
      userData.password = formData.password;
    }

    onSave(userData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {user ? 'Benutzer bearbeiten' : 'Neuen Benutzer erstellen'}
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
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              E-Mail
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {user ? 'Neues Passwort (leer lassen für keine Änderung)' : 'Passwort'}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className="input"
              required={!user}
              placeholder={user ? 'Optional' : 'Erforderlich'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rolle
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as 'user' | 'admin' }))}
              className="input"
            >
              <option value="user">Benutzer</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          {user && (
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
              disabled={isLoading}
            >
              {isLoading ? 'Speichere...' : (user ? 'Aktualisieren' : 'Erstellen')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const UserManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Queries
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
      toast.success('Benutzer wurde erfolgreich erstellt');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
      setEditingUser(null);
      toast.success('Benutzer wurde erfolgreich aktualisiert');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Benutzer wurde erfolgreich gelöscht');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Filter users
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateUser = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    if (window.confirm(`Sind Sie sicher, dass Sie ${user.name} löschen möchten?`)) {
      deleteMutation.mutate(user.id);
    }
  };

  const handleSaveUser = (userData: CreateUserData | UpdateUserData) => {
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, userData });
    } else {
      createMutation.mutate(userData as CreateUserData);
    }
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
        <p className="text-red-800">Fehler beim Laden der Benutzer: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Users className="w-8 h-8 text-primary-600 mr-3" />
            Benutzerverwaltung
          </h1>
          <p className="text-gray-600 mt-1">
            Verwalten Sie Benutzerkonten und Berechtigungen
          </p>
        </div>

        <button
          onClick={handleCreateUser}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Neuer Benutzer</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-50">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Gesamt Benutzer</p>
              <p className="text-2xl font-semibold text-gray-900">{users.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-50">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Administratoren</p>
              <p className="text-2xl font-semibold text-gray-900">
                {users.filter(u => u.role === 'admin').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-gray-50">
              <UserIcon className="w-6 h-6 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Aktive Benutzer</p>
              <p className="text-2xl font-semibold text-gray-900">
                {users.filter(u => u.is_active).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Benutzer suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        {/* User List */}
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Benutzer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rolle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Erstellt
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-10 h-10">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <UserIcon className="w-6 h-6 text-gray-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Mail className="w-4 h-4 mr-1" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                      user.role === 'admin' 
                        ? "bg-purple-100 text-purple-800"
                        : "bg-blue-100 text-blue-800"
                    )}>
                      {user.role === 'admin' ? (
                        <>
                          <Shield className="w-3 h-3 mr-1" />
                          Administrator
                        </>
                      ) : (
                        <>
                          <UserIcon className="w-3 h-3 mr-1" />
                          Benutzer
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                      user.is_active 
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    )}>
                      {user.is_active ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString('de-DE')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-primary-600 hover:text-primary-900"
                        title="Bearbeiten"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user)}
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

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm ? 'Keine Benutzer gefunden' : 'Noch keine Benutzer vorhanden'}
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      <UserModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingUser(null);
        }}
        user={editingUser}
        onSave={handleSaveUser}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
};
