import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';

interface User {
  id: string;
  email?: string;
  user_metadata?: {
    username?: string;
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

const DEMO_USER: User = {
  id: 'demo-user-001',
  email: 'demo@relic.app',
  user_metadata: {
    username: 'demo_user',
  },
};

const createDemoSession = (): Session => ({
  access_token: 'demo-access-token',
  refresh_token: 'demo-refresh-token',
  expires_at: Date.now() + 86400000,
  user: DEMO_USER,
});

const createDemoProfile = (): UserProfile => ({
  id: DEMO_USER.id,
  username: DEMO_USER.user_metadata?.username || 'demo_user',
  points_earned: 1250,
  referral_code: 'DEMO2024',
  referred_by: null,
  referral_count: 3,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

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

  const applyDemoAuthState = useCallback(() => {
    const demoSession = createDemoSession();
    setUser(DEMO_USER);
    setSession(demoSession);
    setProfile(createDemoProfile());
    return { user: DEMO_USER, session: demoSession };
  }, []);

  const loadUserProfile = useCallback(async () => {
    if (!user) return;
    if (user.id === DEMO_USER.id) return;

    try {
      const result = await window.electron.ipcRenderer.invoke(
        'auth:get-profile',
        user.id,
      );
      if (result.success && result.profile) {
        setProfile(result.profile);
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  }, [user]);

  const checkSession = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await window.electron.ipcRenderer.invoke(
        'auth:get-current-session',
      );

      if (result.success && result.session) {
        setSession(result.session);
        setUser(result.session.user);
      } else {
        // DEBUG: Auto-login with demo user for testing
        applyDemoAuthState();
      }
    } catch (error) {
      console.error('Failed to check session:', error);
    } finally {
      setIsLoading(false);
    }
  }, [applyDemoAuthState]);

  const refreshProfile = useCallback(async () => {
    await loadUserProfile();
  }, [loadUserProfile]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResponse> => {
      try {
        setIsLoading(true);

        // Demo/offline login bypass
        if (email === 'demo@relic.app' && password === 'demo123') {
          const demoAuthState = applyDemoAuthState();
          return {
            success: true,
            user: demoAuthState.user,
            session: demoAuthState.session,
          };
        }

        const result = await window.electron.ipcRenderer.invoke(
          'auth:sign-in',
          {
            email,
            password,
          },
        );

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
    },
    [applyDemoAuthState],
  );

  const signUp = useCallback(
    async (params: SignUpParams): Promise<AuthResponse> => {
      try {
        setIsLoading(true);
        const result = await window.electron.ipcRenderer.invoke(
          'auth:sign-up',
          params,
        );

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
    },
    [],
  );

  const signOut = useCallback(async () => {
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
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  // Load user profile when user changes
  useEffect(() => {
    if (user) {
      void loadUserProfile();
    } else {
      setProfile(null);
    }
  }, [user, loadUserProfile]);

  const value: AuthContextType = useMemo(
    () => ({
      user,
      session,
      profile,
      isLoading,
      isAuthenticated: !!user && !!session,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }),
    [
      user,
      session,
      profile,
      isLoading,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
