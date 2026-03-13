-- ============================================================
-- WHISPERS SECURITY LOCKDOWN
-- Run this INSTEAD of the previous supabase-setup.sql
-- ============================================================
-- STEP 1: Drop all existing policies to start clean
-- (ignore errors if some don't exist)
DO $$ BEGIN
  -- Storage policies
  DROP POLICY IF EXISTS "Allow public read of voice-notes" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public read of photos" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated uploads to voice-notes" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated uploads to photos" ON storage.objects;
  DROP POLICY IF EXISTS "Allow anon uploads to voice-notes" ON storage.objects;
  DROP POLICY IF EXISTS "Allow anon uploads to photos" ON storage.objects;
  -- Table policies (from earlier sessions)
  DROP POLICY IF EXISTS "Public read children by id" ON public.children;
  DROP POLICY IF EXISTS "Public read profiles name" ON public.profiles;
  DROP POLICY IF EXISTS "Anyone can insert whispers with contributor" ON public.whispers;
  DROP POLICY IF EXISTS "Givers read by token" ON public.contributors;
  DROP POLICY IF EXISTS "Keepers manage own children" ON public.children;
  DROP POLICY IF EXISTS "Keepers manage contributors" ON public.contributors;
  DROP POLICY IF EXISTS "Keepers manage whispers" ON public.whispers;
  -- Table policies (from Claude Code)
  DROP POLICY IF EXISTS "Keepers can read own children whispers" ON public.whispers;
  DROP POLICY IF EXISTS "Authenticated users can insert whispers" ON public.whispers;
  DROP POLICY IF EXISTS "Anon givers can insert whispers" ON public.whispers;
  DROP POLICY IF EXISTS "Anon givers can read own whispers" ON public.whispers;
  DROP POLICY IF EXISTS "Keepers can read own contributors" ON public.contributors;
  DROP POLICY IF EXISTS "Keepers can insert contributors" ON public.contributors;
  DROP POLICY IF EXISTS "Anon can read by invite token" ON public.contributors;
  DROP POLICY IF EXISTS "Keepers can read own children" ON public.children;
  DROP POLICY IF EXISTS "Keepers can insert children" ON public.children;
  DROP POLICY IF EXISTS "Anon can read children" ON public.children;
  DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can upsert own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Anon can read profiles" ON public.profiles;
  DROP POLICY IF EXISTS "Anon can read profiles name only" ON public.profiles;
  -- Policies created by this script (safe to re-run)
  DROP POLICY IF EXISTS "Public read voice-notes" ON storage.objects;
  DROP POLICY IF EXISTS "Public read photos" ON storage.objects;
  DROP POLICY IF EXISTS "Auth upload voice-notes" ON storage.objects;
  DROP POLICY IF EXISTS "Auth upload photos" ON storage.objects;
  DROP POLICY IF EXISTS "Anon upload voice-notes" ON storage.objects;
  DROP POLICY IF EXISTS "Anon upload photos" ON storage.objects;
  DROP POLICY IF EXISTS "Keepers read own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Keepers insert own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Keepers update own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Keepers read own children" ON public.children;
  DROP POLICY IF EXISTS "Keepers insert own children" ON public.children;
  DROP POLICY IF EXISTS "Keepers read own contributors" ON public.contributors;
  DROP POLICY IF EXISTS "Keepers insert contributors" ON public.contributors;
  DROP POLICY IF EXISTS "Keepers read own whispers" ON public.whispers;
  DROP POLICY IF EXISTS "Keepers insert whispers" ON public.whispers;
  DROP POLICY IF EXISTS "Givers insert whispers" ON public.whispers;
  DROP POLICY IF EXISTS "Givers cannot read whispers" ON public.whispers;
END $$;
-- ============================================================
-- STEP 2: Storage buckets
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('voice-notes', 'voice-notes', true, 10485760, ARRAY['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg'];
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('photos', 'photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];
-- ============================================================
-- STEP 3: Storage policies
-- ============================================================
-- Public read (needed for playback/display of voice notes and photos)
CREATE POLICY "Public read voice-notes"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'voice-notes');
CREATE POLICY "Public read photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'photos');
-- Authenticated uploads (keepers)
CREATE POLICY "Auth upload voice-notes"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'voice-notes'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.children WHERE keeper_id = auth.uid()
  )
);
CREATE POLICY "Auth upload photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'photos'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.children WHERE keeper_id = auth.uid()
  )
);
-- Anon uploads (givers) scoped to child folders with valid children
-- Uses SECURITY DEFINER function because anon has no SELECT on children
CREATE POLICY "Anon upload voice-notes"
ON storage.objects FOR INSERT TO anon
WITH CHECK (
  bucket_id = 'voice-notes'
  AND public.check_child_exists((storage.foldername(name))[1])
);
CREATE POLICY "Anon upload photos"
ON storage.objects FOR INSERT TO anon
WITH CHECK (
  bucket_id = 'photos'
  AND public.check_child_exists((storage.foldername(name))[1])
);
-- ============================================================
-- STEP 3b: SECURITY DEFINER helper functions
-- These allow RLS policy subqueries to check tables that
-- anon cannot SELECT directly. Without these, anon INSERT
-- policies that reference children/contributors will always
-- fail because the EXISTS subquery returns 0 rows under anon.
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_child_exists(p_child_id_text text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.children WHERE id::text = p_child_id_text
  );
$$;

CREATE OR REPLACE FUNCTION public.check_contributor_child(p_contributor_id uuid, p_child_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contributors
    WHERE id = p_contributor_id AND child_id = p_child_id
  );
$$;

-- ============================================================
-- STEP 4: Enable RLS on all tables
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whispers ENABLE ROW LEVEL SECURITY;
-- ============================================================
-- STEP 5: profiles (LOCKED DOWN - no anon access)
-- ============================================================
CREATE POLICY "Keepers read own profile"
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid());
CREATE POLICY "Keepers insert own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());
CREATE POLICY "Keepers update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid());
-- NO anon read. Edge Function uses service role key.
-- ============================================================
-- STEP 6: children (LOCKED DOWN - no anon access)
-- ============================================================
CREATE POLICY "Keepers read own children"
ON public.children FOR SELECT TO authenticated
USING (keeper_id = auth.uid());
CREATE POLICY "Keepers insert own children"
ON public.children FOR INSERT TO authenticated
WITH CHECK (keeper_id = auth.uid());
-- NO anon read. Edge Function uses service role key.
-- ============================================================
-- STEP 7: contributors (LOCKED DOWN - no anon read)
-- ============================================================
CREATE POLICY "Keepers read own contributors"
ON public.contributors FOR SELECT TO authenticated
USING (
  child_id IN (SELECT id FROM public.children WHERE keeper_id = auth.uid())
);
CREATE POLICY "Keepers insert contributors"
ON public.contributors FOR INSERT TO authenticated
WITH CHECK (
  child_id IN (SELECT id FROM public.children WHERE keeper_id = auth.uid())
);
-- NO anon read. Edge Function uses service role key.
-- ============================================================
-- STEP 8: whispers
-- ============================================================
-- Keepers see whispers for their children
CREATE POLICY "Keepers read own whispers"
ON public.whispers FOR SELECT TO authenticated
USING (
  child_id IN (SELECT id FROM public.children WHERE keeper_id = auth.uid())
);
-- Keepers insert whispers for their children
CREATE POLICY "Keepers insert whispers"
ON public.whispers FOR INSERT TO authenticated
WITH CHECK (
  child_id IN (SELECT id FROM public.children WHERE keeper_id = auth.uid())
);
-- Givers (anon) insert whispers with valid contributor + child pair
-- Uses SECURITY DEFINER function because anon has no SELECT on contributors
CREATE POLICY "Givers insert whispers"
ON public.whispers FOR INSERT TO anon
WITH CHECK (
  contributor_id IS NOT NULL
  AND public.check_contributor_child(contributor_id, child_id)
);
-- Givers cannot read any whispers
CREATE POLICY "Givers cannot read whispers"
ON public.whispers FOR SELECT TO anon
USING (false);
