import React, { useEffect, useState } from 'react';
import { User, Mail, Calendar, Shield, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';

interface ProfileUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const Profile: React.FC = () => {
  const { user: authUser, isLoading: authLoading } = useAuth();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Die neuen Passwörter stimmen nicht überein');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Das neue Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }

    setIsChangingPassword(true);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Passwort wurde erfolgreich geändert');
        setShowPasswordForm(false);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        toast.error(data.error || 'Fehler beim Ändern des Passworts');
      }
    } catch (error) {
      toast.error('Netzwerkfehler beim Ändern des Passworts');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const fetchUserData = async () => {
    if (!authUser) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.data.user);
      } else {
        console.error('Failed to fetch user data:', data.error);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [authUser]);

  if (authLoading || isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center">
        <User className="w-8 h-8 text-primary-600 mr-3" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Mein Profil
          </h1>
          <p className="text-gray-600 mt-1">
            Verwalten Sie Ihre Kontoinformationen und API-Zugang
          </p>
        </div>
      </div>

      {/* Profile Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Kontoinformationen</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <div className="flex items-center">
                <User className="w-4 h-4 text-gray-400 mr-2" />
                <span className="text-gray-900">{user.name}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-Mail-Adresse
              </label>
              <div className="flex items-center">
                <Mail className="w-4 h-4 text-gray-400 mr-2" />
                <span className="text-gray-900">{user.email}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rolle
              </label>
              <div className="flex items-center">
                <Shield className="w-4 h-4 text-gray-400 mr-2" />
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user.role === 'admin' 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {user.role === 'admin' ? 'Administrator' : 'Benutzer'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mitglied seit
              </label>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                <span className="text-gray-900">
                  {new Date(user.created_at).toLocaleDateString('de-DE', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Lock className="w-5 h-5 text-primary-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Passwort</h3>
          </div>
          <button
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            className="btn-secondary text-sm"
          >
            {showPasswordForm ? 'Abbrechen' : 'Passwort ändern'}
          </button>
        </div>

        {showPasswordForm ? (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Aktuelles Passwort *
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? "text" : "password"}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="input pr-10"
                  placeholder="Ihr aktuelles Passwort"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('current')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPasswords.current ? (
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Neues Passwort *
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="input pr-10"
                  placeholder="Neues Passwort (mind. 6 Zeichen)"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPasswords.new ? (
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Neues Passwort bestätigen *
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? "text" : "password"}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="input pr-10"
                  placeholder="Neues Passwort erneut eingeben"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPasswords.confirm ? (
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowPasswordForm(false);
                  setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                  });
                }}
                className="btn-secondary flex-1"
                disabled={isChangingPassword}
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="btn-primary flex-1"
                disabled={isChangingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
              >
                {isChangingPassword ? 'Ändere...' : 'Passwort ändern'}
              </button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-gray-600">
            Hier können Sie Ihr Passwort ändern. Klicken Sie auf "Passwort ändern" um das Formular zu öffnen.
          </p>
        )}
      </div>
    </div>
  );
};
