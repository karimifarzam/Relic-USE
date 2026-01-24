import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email?: string;
  user_metadata?: {
    username?: string;
    display_name?: string;
  };
}

interface Session {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: User;
}

interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  points_earned: number;
  referral_code: string;
  referred_by: string | null;
  referral_count: number;
  created_at: string;
  updated_at: string;
}

interface SignUpParams {
  email: string;
  password: string;
  username: string;
  displayName?: string;
  referralCode?: string;
}

interface AuthResponse {
  success: boolean;
  user?: User;
  session?: Session;
  error?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  signUp: (params: SignUpParams) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    checkSession();
  }, []);

  // Load user profile when user changes
  useEffect(() => {
    if (user) {
      loadUserProfile();
    } else {
      setProfile(null);
    }
  }, [user]);

  const checkSession = async () => {
    try {
      setIsLoading(true);
      const result = await window.electron.ipcRenderer.invoke('auth:get-current-session');

      if (result.success && result.session) {
        setSession(result.session);
        setUser(result.session.user);
      }
    } catch (error) {
      console.error('Failed to check session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserProfile = async () => {
    if (!user) return;

    try {
      const result = await window.electron.ipcRenderer.invoke('auth:get-profile', user.id);
      if (result.success && result.profile) {
        setProfile(result.profile);
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  };

  const refreshProfile = async () => {
    await loadUserProfile();
  };

  const signIn = async (email: string, password: string): Promise<AuthResponse> => {
    try {
      setIsLoading(true);
      const result = await window.electron.ipcRenderer.invoke('auth:sign-in', {
        email,
        password,
      });

      if (result.success && result.user && result.session) {
        setUser(result.user);
        setSession(result.session);
      }

      return result;
    } catch (error: any) {
      console.error('Sign in error:', error);
      return {
        success: false,
        error: error.message || 'Failed to sign in',
      };
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (params: SignUpParams): Promise<AuthResponse> => {
    try {
      setIsLoading(true);
      const result = await window.electron.ipcRenderer.invoke('auth:sign-up', params);

      if (result.success && result.user && result.session) {
        setUser(result.user);
        setSession(result.session);
      }

      return result;
    } catch (error: any) {
      console.error('Sign up error:', error);
      return {
        success: false,
        error: error.message || 'Failed to sign up',
      };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      await window.electron.ipcRenderer.invoke('auth:sign-out');
      setUser(null);
      setSession(null);
      setProfile(null);
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    isLoading,
    isAuthenticated: !!user && !!session,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
