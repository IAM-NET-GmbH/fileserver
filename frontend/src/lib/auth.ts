// Auth utilities and context
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

class AuthManager {
  private static TOKEN_KEY = 'auth_token';
  private static USER_KEY = 'auth_user';

  // Check if initial setup is required
  async checkSetupRequired(): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/setup-required');
      const data = await response.json();
      return data.success ? data.data.setupRequired : false;
    } catch (error) {
      console.error('Failed to check setup status:', error);
      return false;
    }
  }

  // Get stored token
  getToken(): string | null {
    try {
      return localStorage.getItem(AuthManager.TOKEN_KEY);
    } catch {
      return null;
    }
  }

  // Set token
  setToken(token: string): void {
    try {
      localStorage.setItem(AuthManager.TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to store token:', error);
    }
  }

  // Remove token
  removeToken(): void {
    try {
      localStorage.removeItem(AuthManager.TOKEN_KEY);
      localStorage.removeItem(AuthManager.USER_KEY);
    } catch (error) {
      console.error('Failed to remove token:', error);
    }
  }

  // Get stored user
  getUser(): User | null {
    try {
      const userString = localStorage.getItem(AuthManager.USER_KEY);
      return userString ? JSON.parse(userString) : null;
    } catch {
      return null;
    }
  }

  // Set user
  setUser(user: User): void {
    try {
      localStorage.setItem(AuthManager.USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to store user:', error);
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!(this.getToken() && this.getUser());
  }

  // Get auth header
  getAuthHeader(): { Authorization: string } | {} {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Login
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Login failed');
    }

    const { user, token } = data.data;
    this.setToken(token);
    this.setUser(user);

    return { user, token };
  }

  // Logout
  async logout(): Promise<void> {
    const token = this.getToken();
    
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.error('Logout API call failed:', error);
      }
    }

    this.removeToken();
  }

  // Verify token
  async verifyToken(): Promise<User | null> {
    const token = this.getToken();
    
    if (!token) {
      return null;
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!data.success) {
        this.removeToken();
        return null;
      }

      const user = data.data.user;
      this.setUser(user);
      return user;
    } catch (error) {
      console.error('Token verification failed:', error);
      this.removeToken();
      return null;
    }
  }
}

export const authManager = new AuthManager();
