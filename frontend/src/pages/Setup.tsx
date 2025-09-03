import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { UserPlus, User, Mail, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SetupFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export const Setup: React.FC = () => {
  const [formData, setFormData] = useState<SetupFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<SetupFormData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<SetupFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name ist erforderlich';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-Mail ist erforderlich';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Ungültige E-Mail-Adresse';
    }

    if (!formData.password) {
      newErrors.password = 'Passwort ist erforderlich';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Passwort muss mindestens 6 Zeichen haben';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwörter stimmen nicht überein';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Setup fehlgeschlagen');
      }

      // Store auth data
      localStorage.setItem('auth_token', data.data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.data.user));

      toast.success('Setup erfolgreich! Willkommen!');
      
      // Redirect to dashboard
      window.location.href = '/';
      
    } catch (error) {
      console.error('Setup error:', error);
      toast.error(error instanceof Error ? error.message : 'Setup fehlgeschlagen');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof SetupFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            IAM File Server Setup
          </h1>
          <p className="text-gray-600">
            Erstellen Sie den ersten Administrator-Account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Field */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Vollständiger Name
            </label>
            <div className="relative">
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                              className={cn(
                "input pl-10",
                errors.name && "border-red-300 focus:border-red-500 focus:ring-red-500"
              )}
                placeholder="Ihr vollständiger Name"
                disabled={isLoading}
              />
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              E-Mail-Adresse
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                              className={cn(
                "input pl-10",
                errors.email && "border-red-300 focus:border-red-500 focus:ring-red-500"
              )}
                placeholder="ihre@email.de"
                disabled={isLoading}
              />
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Passwort
            </label>
            <div className="relative">
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                              className={cn(
                "input pl-10",
                errors.password && "border-red-300 focus:border-red-500 focus:ring-red-500"
              )}
                placeholder="Mindestens 6 Zeichen"
                disabled={isLoading}
              />
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Passwort bestätigen
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                              className={cn(
                "input pl-10",
                errors.confirmPassword && "border-red-300 focus:border-red-500 focus:ring-red-500"
              )}
                placeholder="Passwort wiederholen"
                disabled={isLoading}
              />
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              "btn-primary w-full flex justify-center items-center space-x-2",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Setup wird durchgeführt...</span>
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                <span>Administrator erstellen</span>
              </>
            )}
          </button>
        </form>

        {/* Info */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Info:</h3>
          <p className="text-sm text-blue-700">
            Dieser Account wird automatisch Administrator-Rechte erhalten und kann später weitere Benutzer verwalten.
          </p>
        </div>
      </div>
    </div>
  );
};
