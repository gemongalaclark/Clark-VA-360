-- Create contact_messages table
CREATE TABLE contact_messages (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  subject     TEXT NOT NULL,
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Allow anyone to INSERT (submit the contact form)
CREATE POLICY "Allow public inserts"
  ON contact_messages
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Only authenticated users (you) can SELECT/read messages
CREATE POLICY "Allow authenticated reads"
  ON contact_messages
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- Google Calendar Auto Scheduler: registered Google users
-- Run this in the Supabase SQL editor if the table does not exist yet.
-- Also enable Authentication > Providers > Google and add Calendar scope:
-- https://www.googleapis.com/auth/calendar.events
-- ============================================================

CREATE TABLE IF NOT EXISTS scheduler_users (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email            TEXT,
  full_name        TEXT,
  avatar_url       TEXT,
  provider         TEXT DEFAULT 'google',
  last_sign_in_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS scheduler_users_email_idx ON scheduler_users (email);

ALTER TABLE scheduler_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Scheduler users can read own row" ON scheduler_users;
CREATE POLICY "Scheduler users can read own row"
  ON scheduler_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Scheduler users can insert own row" ON scheduler_users;
CREATE POLICY "Scheduler users can insert own row"
  ON scheduler_users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Scheduler users can update own row" ON scheduler_users;
CREATE POLICY "Scheduler users can update own row"
  ON scheduler_users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Auto-register every new auth user (Google sign-in creates auth.users)
CREATE OR REPLACE FUNCTION public.handle_new_scheduler_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.scheduler_users (id, email, full_name, avatar_url, provider)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(COALESCE(NEW.email, 'user'), '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    ),
    COALESCE(NEW.raw_app_meta_data->>'provider', 'google')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    last_sign_in_at = NOW(),
    updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_scheduler ON auth.users;
CREATE TRIGGER on_auth_user_created_scheduler
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_scheduler_user();
