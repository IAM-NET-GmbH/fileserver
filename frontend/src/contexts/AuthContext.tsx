import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, AuthState, authManager } from '@/lib/auth';
import toast from 'react-hot-toast';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setupRequired: boolean;
  checkSetupRequired: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });
  const [setupRequired, setSetupRequired] = useState(false);

  const updateAuthState = (user: User | null) => {
    setAuthState({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    });
  };

  const login = async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      const { user } = await authManager.login(email, password);
      updateAuthState(user);
      toast.success(`Willkommen, ${user.email}!`);
    } catch (error) {
      updateAuthState(null);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authManager.logout();
      updateAuthState(null);
      toast.success('Erfolgreich abgemeldet');
    } catch (error) {
      console.error('Logout error:', error);
      updateAuthState(null);
    }
  };

  const checkSetupRequired = async () => {
    try {
      const isSetupRequired = await authManager.checkSetupRequired();
      setSetupRequired(isSetupRequired);
    } catch (error) {
      console.error('Setup check error:', error);
      setSetupRequired(false);
    }
  };

  const checkAuth = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      // First check if setup is required
      await checkSetupRequired();
      
      // Check if we have stored credentials
      const storedUser = authManager.getUser();
      if (!storedUser || !authManager.getToken()) {
        updateAuthState(null);
        return;
      }

      // Verify token with server
      const user = await authManager.verifyToken();
      updateAuthState(user);
    } catch (error) {
      console.error('Auth check error:', error);
      updateAuthState(null);
    }
  };

  // Check auth status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const value: AuthContextType = {
    ...authState,
    login,
    logout,
    checkAuth,
    setupRequired,
    checkSetupRequired,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
