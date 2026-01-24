import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

// Load environment variables from multiple possible locations
// Try development path first, then production paths
const possibleEnvPaths = [
  path.join(__dirname, '../../.env'), // Development
  path.join(app.getPath('userData'), '.env'), // Production (user data)
  path.join(process.resourcesPath || '', '.env'), // Production (resources)
];

// Try to load .env from the first path that exists
for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`Loaded environment variables from: ${envPath}`);
    break;
  }
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase credentials. Please check your .env file and ensure SUPABASE_URL and SUPABASE_ANON_KEY are set. ' +
    `Searched paths: ${possibleEnvPaths.join(', ')}`
  );
}

// Create Supabase client
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database types for TypeScript
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          points_earned: number;
          referral_code: string;
          referred_by: string | null;
          referral_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          points_earned?: number;
          referral_code?: string;
          referred_by?: string | null;
          referral_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string | null;
          points_earned?: number;
          referral_code?: string;
          referred_by?: string | null;
          referral_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      sessions: {
        Row: {
          id: number;
          user_id: string;
          created_at: string;
          duration: number;
          approval_state: 'draft' | 'submitted' | 'approved' | 'rejected';
          session_status: 'passive' | 'tasked';
          task_id: number | null;
          reward_id: number | null;
        };
        Insert: {
          id?: number;
          user_id: string;
          created_at?: string;
          duration?: number;
          approval_state?: 'draft' | 'submitted' | 'approved' | 'rejected';
          session_status: 'passive' | 'tasked';
          task_id?: number | null;
          reward_id?: number | null;
        };
        Update: {
          id?: number;
          user_id?: string;
          created_at?: string;
          duration?: number;
          approval_state?: 'draft' | 'submitted' | 'approved' | 'rejected';
          session_status?: 'passive' | 'tasked';
          task_id?: number | null;
          reward_id?: number | null;
        };
      };
      recordings: {
        Row: {
          id: number;
          user_id: string;
          session_id: number;
          timestamp: string;
          window_name: string;
          window_id: string;
          thumbnail_url: string;
          screenshot_url: string;
          type: 'passive' | 'tasked';
          label: string | null;
        };
        Insert: {
          id?: number;
          user_id: string;
          session_id: number;
          timestamp?: string;
          window_name: string;
          window_id: string;
          thumbnail_url: string;
          screenshot_url: string;
          type: 'passive' | 'tasked';
          label?: string | null;
        };
        Update: {
          id?: number;
          user_id?: string;
          session_id?: number;
          timestamp?: string;
          window_name?: string;
          window_id?: string;
          thumbnail_url?: string;
          screenshot_url?: string;
          type?: 'passive' | 'tasked';
          label?: string | null;
        };
      };
      comments: {
        Row: {
          id: number;
          user_id: string;
          session_id: number;
          start_time: number;
          end_time: number;
          comment: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          session_id: number;
          start_time: number;
          end_time: number;
          comment: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          session_id?: number;
          start_time?: number;
          end_time?: number;
          comment?: string;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: 'submission_approved' | 'submission_rejected' | 'points_milestone';
          title: string;
          message: string;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'submission_approved' | 'submission_rejected' | 'points_milestone';
          title: string;
          message: string;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'submission_approved' | 'submission_rejected' | 'points_milestone';
          title?: string;
          message?: string;
          read?: boolean;
          created_at?: string;
        };
      };
    };
  };
}

export default supabase;
