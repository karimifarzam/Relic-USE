-- =====================================================
-- REFERRAL SYSTEM MIGRATION
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Step 1: Add new columns to profiles table (if they don't exist)
DO $$
BEGIN
  -- Drop display_name column if it exists (no longer used)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'display_name'
  ) THEN
    ALTER TABLE public.profiles DROP COLUMN display_name;
    RAISE NOTICE 'Dropped display_name column';
  END IF;

  -- Add referral_code column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'referral_code'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN referral_code TEXT UNIQUE;
    RAISE NOTICE 'Added referral_code column';
  END IF;

  -- Add referred_by column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'referred_by'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN referred_by UUID REFERENCES public.profiles(id);
    RAISE NOTICE 'Added referred_by column';
  END IF;

  -- Add referral_count column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'referral_count'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN referral_count INTEGER NOT NULL DEFAULT 0;
    RAISE NOTICE 'Added referral_count column';
  END IF;
END $$;

-- Step 2: Create index on referral_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);

-- Step 3: Add RLS policy for referral code lookups
DROP POLICY IF EXISTS "Anyone can view referral codes for validation" ON public.profiles;
CREATE POLICY "Anyone can view referral codes for validation"
  ON public.profiles FOR SELECT
  USING (referral_code IS NOT NULL);

-- Step 4: Create referral code generation function
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

-- Step 5: Update the handle_new_user trigger function
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
  INSERT INTO public.profiles (id, username, referral_code, referred_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    new_referral_code,
    referrer_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Recreate the trigger (in case it needs updating)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 7: Generate referral codes for existing users
UPDATE public.profiles
SET referral_code = public.generate_referral_code()
WHERE referral_code IS NULL;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Verify the migration:
-- SELECT username, referral_code, referral_count, referred_by FROM public.profiles LIMIT 5;
