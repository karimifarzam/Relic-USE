-- Supabase Database Schema for Relic Application
-- Run this SQL in your Supabase SQL Editor: https://app.supabase.com/project/_/sql

-- =====================================================
-- 1. PROFILES TABLE
-- =====================================================
-- This extends the built-in auth.users table with custom user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  points_earned INTEGER NOT NULL DEFAULT 0,
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES public.profiles(id),
  referral_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
-- Create index on referral_code for faster referral lookups
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow users to look up referral codes during signup (read-only for referral_code)
CREATE POLICY "Anyone can view referral codes for validation"
  ON public.profiles FOR SELECT
  USING (referral_code IS NOT NULL);

-- =====================================================
-- 2. SESSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration INTEGER NOT NULL DEFAULT 0,
  approval_state TEXT NOT NULL DEFAULT 'draft' CHECK (approval_state IN ('draft', 'submitted', 'approved', 'rejected')),
  session_status TEXT NOT NULL CHECK (session_status IN ('passive', 'tasked')),
  task_id INTEGER,
  reward_id INTEGER
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_approval_state ON public.sessions(approval_state);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON public.sessions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sessions
CREATE POLICY "Users can view their own sessions"
  ON public.sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions"
  ON public.sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON public.sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON public.sessions FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 3. RECORDINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.recordings (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id BIGINT NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  window_name TEXT NOT NULL,
  window_id TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  screenshot_url TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('passive', 'tasked')),
  label TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_recordings_user_id ON public.recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_recordings_session_id ON public.recordings(session_id);
CREATE INDEX IF NOT EXISTS idx_recordings_timestamp ON public.recordings(timestamp DESC);

-- Enable Row Level Security
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recordings
CREATE POLICY "Users can view their own recordings"
  ON public.recordings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recordings"
  ON public.recordings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recordings"
  ON public.recordings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recordings"
  ON public.recordings FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 4. COMMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.comments (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id BIGINT NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  start_time INTEGER NOT NULL,
  end_time INTEGER NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_session_id ON public.comments(session_id);

-- Enable Row Level Security
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for comments
CREATE POLICY "Users can view their own comments"
  ON public.comments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own comments"
  ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON public.comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.comments FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 5. NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('submission_approved', 'submission_rejected', 'points_milestone')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- 6. FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to generate unique 6-character referral codes
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 6-character alphanumeric code (uppercase)
    code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));

    -- Check if code already exists
    SELECT EXISTS(
      SELECT 1 FROM public.profiles WHERE referral_code = code
    ) INTO code_exists;

    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;

  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_referral_code TEXT;
  referrer_id UUID;
  input_referral_code TEXT;
BEGIN
  -- Generate unique referral code for the new user
  new_referral_code := public.generate_referral_code();

  -- Extract referral code from user metadata (if provided during signup)
  input_referral_code := NEW.raw_user_meta_data->>'referral_code';

  -- Validate and find the referrer if a referral code was provided
  IF input_referral_code IS NOT NULL AND input_referral_code != '' THEN
    SELECT id INTO referrer_id
    FROM public.profiles
    WHERE referral_code = upper(input_referral_code);

    -- If valid referrer found, increment their referral count
    IF referrer_id IS NOT NULL THEN
      UPDATE public.profiles
      SET referral_count = referral_count + 1
      WHERE id = referrer_id;
    END IF;
  END IF;

  -- Create the new user's profile with referral data
  INSERT INTO public.profiles (id, username, display_name, referral_code, referred_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    new_referral_code,
    referrer_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on profiles
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to handle session approval and award points
CREATE OR REPLACE FUNCTION public.handle_session_approval()
RETURNS TRIGGER AS $$
DECLARE
  points_to_add INTEGER;
BEGIN
  -- Only proceed if approval_state changed to 'approved'
  IF NEW.approval_state = 'approved' AND OLD.approval_state != 'approved' THEN
    -- Calculate points based on duration (e.g., 1 point per minute)
    points_to_add := FLOOR(NEW.duration / 60);

    -- Update user's points
    UPDATE public.profiles
    SET points_earned = points_earned + points_to_add
    WHERE id = NEW.user_id;

    -- Create approval notification
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
      NEW.user_id,
      'submission_approved',
      'Session Approved!',
      'Your session has been approved and you earned ' || points_to_add || ' points!'
    );

    -- Check for milestone achievements (e.g., 100, 500, 1000 points)
    DECLARE
      current_points INTEGER;
      milestone INTEGER;
    BEGIN
      SELECT points_earned INTO current_points
      FROM public.profiles
      WHERE id = NEW.user_id;

      -- Check if user just crossed a milestone
      IF current_points >= 1000 AND (current_points - points_to_add) < 1000 THEN
        milestone := 1000;
      ELSIF current_points >= 500 AND (current_points - points_to_add) < 500 THEN
        milestone := 500;
      ELSIF current_points >= 100 AND (current_points - points_to_add) < 100 THEN
        milestone := 100;
      END IF;

      -- Create milestone notification if applicable
      IF milestone IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, message)
        VALUES (
          NEW.user_id,
          'points_milestone',
          'Milestone Reached!',
          'Congratulations! You''ve earned ' || milestone || ' points!'
        );
      END IF;
    END;
  END IF;

  -- Create rejection notification if rejected
  IF NEW.approval_state = 'rejected' AND OLD.approval_state != 'rejected' THEN
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
      NEW.user_id,
      'submission_rejected',
      'Session Rejected',
      'Your session submission was not approved. Please review and try again.'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for session approval
DROP TRIGGER IF EXISTS on_session_approval ON public.sessions;
CREATE TRIGGER on_session_approval
  AFTER UPDATE ON public.sessions
  FOR EACH ROW
  WHEN (OLD.approval_state IS DISTINCT FROM NEW.approval_state)
  EXECUTE FUNCTION public.handle_session_approval();

-- =====================================================
-- 7. STORAGE BUCKETS (for images)
-- =====================================================
-- Note: Run this separately or create buckets via Supabase UI

-- Create storage bucket for recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('recordings', 'recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for recordings bucket
CREATE POLICY "Users can upload their own recordings"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'recordings' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own recordings"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'recordings' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own recordings"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'recordings' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- =====================================================
-- SETUP COMPLETE
-- =====================================================
-- Next steps:
-- 1. Enable Realtime for the notifications table in Supabase Dashboard
-- 2. Update your .env file with your Supabase URL and anon key
-- 3. Test the authentication flow in your application
