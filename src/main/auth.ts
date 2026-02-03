import { supabase } from './supabase';
import { AuthError, User, Session } from '@supabase/supabase-js';

export interface SignUpParams {
  email: string;
  password: string;
  username: string;
  referralCode?: string;
}

export interface SignInParams {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  session?: Session;
  error?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  points_earned: number;
  referral_code: string;
  referred_by: string | null;
  referral_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Sign up a new user with email and password
 * Creates both auth user and profile entry
 */
export async function signUp({
  email,
  password,
  username,
  referralCode,
}: SignUpParams): Promise<AuthResponse> {
  try {
    // Sign up user with Supabase Auth
    // The database trigger will automatically create the profile
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          referral_code: referralCode || null,
        },
      },
    });

    if (authError) {
      return {
        success: false,
        error: authError.message,
      };
    }

    if (!authData.user) {
      return {
        success: false,
        error: 'Failed to create user',
      };
    }

    // The database trigger automatically creates the profile
    // using the metadata we passed in options.data above
    // Wait a moment to ensure the trigger has completed
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      success: true,
      user: authData.user,
      session: authData.session || undefined,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}

/**
 * Sign in an existing user with email and password
 */
export async function signIn({
  email,
  password,
}: SignInParams): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      user: data.user,
      session: data.session,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<AuthResponse> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}

/**
 * Get the current authenticated user
 */
export async function getCurrentUser(): Promise<{
  success: boolean;
  user?: User;
  error?: string;
}> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (!user) {
      return {
        success: false,
        error: 'No user logged in',
      };
    }

    return {
      success: true,
      user,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}

/**
 * Get the current user's session
 */
export async function getCurrentSession(): Promise<{
  success: boolean;
  session?: Session;
  error?: string;
}> {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (!session) {
      return {
        success: false,
        error: 'No active session',
      };
    }

    return {
      success: true,
      session,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}

/**
 * Send a password reset email
 */
export async function resetPassword(email: string): Promise<AuthResponse> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'relic://reset-password',
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}

/**
 * Update user password
 */
export async function updatePassword(
  newPassword: string
): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      user: data.user,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}

/**
 * Get user profile
 */
export async function getUserProfile(
  userId: string
): Promise<{
  success: boolean;
  profile?: UserProfile;
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      profile: data,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: {
    username?: string;
  }
): Promise<{
  success: boolean;
  profile?: UserProfile;
  error?: string;
}> {
  try {
    // If updating username, check if it's already taken
    if (updates.username) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', updates.username)
        .neq('id', userId)
        .single();

      if (existingProfile) {
        return {
          success: false,
          error: 'Username already taken',
        };
      }
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      profile: data,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}

/**
 * Update user points
 */
export async function updateUserPoints(
  userId: string,
  pointsToAdd: number
): Promise<{
  success: boolean;
  newTotal?: number;
  error?: string;
}> {
  try {
    // Get current points
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('points_earned')
      .eq('id', userId)
      .single();

    if (fetchError || !profile) {
      return {
        success: false,
        error: 'Failed to fetch user profile',
      };
    }

    const newTotal = profile.points_earned + pointsToAdd;

    // Update points
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        points_earned: newTotal,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      return {
        success: false,
        error: updateError.message,
      };
    }

    return {
      success: true,
      newTotal,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}
