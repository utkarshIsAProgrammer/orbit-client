import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/api';
import { getCurrentUser, loginUser, signupUser, logoutUser } from '../api/auth';
import { toast } from 'sonner';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: any) => Promise<User>;
  signup: (formData: FormData) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = async () => {
    try {
      const data = await getCurrentUser();
      if (data?.success && data?.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializeCsrf = async () => {
      try {
        await api.get('/api/get-csrf-token');
      } catch (err) {
        console.error('Failed to initialize CSRF token', err);
      }
    };
    initializeCsrf();

    const timer = setTimeout(() => fetchSession(), 0);
    return () => clearTimeout(timer);
  }, []);

  const login = async (credentials: any) => {
    try {
      const data = await loginUser(credentials);
      if (data?.success && data?.user) {
        setUser(data.user);
        toast.success(data.message || 'Welcome back to Orbit!');
        return data.user;
      } else {
        throw new Error(data?.message || 'Login failed');
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || 'Verification failed';
      toast.error(errorMsg);
      throw error;
    }
  };

  const signup = async (formData: FormData) => {
    try {
      const data = await signupUser(formData);
      if (data?.success && data?.user) {
        setUser(data.user);
        toast.success('Welcome aboard to Orbit!');
        return data.user;
      } else {
        throw new Error(data?.message || 'Signup failed');
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || 'Registration failed';
      toast.error(errorMsg);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
      setUser(null);
      toast.success('Goodbye! Successfully logged out.');
    } catch {
      setUser(null); // Force clear locally anyway
    }
  };

  const refreshUser = async () => {
    try {
      const data = await getCurrentUser();
      if (data?.success && data?.user) {
        setUser(data.user);
      }
    } catch (e) {
      // ignore
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
