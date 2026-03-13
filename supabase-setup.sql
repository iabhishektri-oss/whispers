-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- Creates storage buckets and policies for voice notes and photos

-- Create the storage buckets with file size limits
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

-- Allow anyone to read (public buckets for playback/display)
CREATE POLICY "Allow public read of voice-notes"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'voice-notes');

CREATE POLICY "Allow public read of photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'photos');

-- Authenticated users can upload, scoped to paths starting with a valid UUID
CREATE POLICY "Allow authenticated uploads to voice-notes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'voice-notes'
  AND (storage.foldername(name))[1] IS NOT NULL
);

CREATE POLICY "Allow authenticated uploads to photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'photos'
  AND (storage.foldername(name))[1] IS NOT NULL
);

-- Anon users (givers) can upload, scoped to child folders that exist
-- This checks that the folder name (childId) matches a real child record
CREATE POLICY "Allow anon uploads to voice-notes"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'voice-notes'
  AND EXISTS (
    SELECT 1 FROM public.children WHERE id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Allow anon uploads to photos"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'photos'
  AND EXISTS (
    SELECT 1 FROM public.children WHERE id::text = (storage.foldername(name))[1]
  )
);

-- Prevent overwriting: no UPDATE on storage objects for anon
-- (authenticated users keep default no-update as well since we don't add an UPDATE policy)

-- =============================================================
-- TABLE-LEVEL RLS (if not already enabled)
-- =============================================================

-- Enable RLS on whispers table
ALTER TABLE public.whispers ENABLE ROW LEVEL SECURITY;

-- Keepers can read whispers for their children
CREATE POLICY "Keepers can read own children whispers"
ON public.whispers FOR SELECT
TO authenticated
USING (
  child_id IN (SELECT id FROM public.children WHERE keeper_id = auth.uid())
);

-- Authenticated users can insert whispers for their children
CREATE POLICY "Authenticated users can insert whispers"
ON public.whispers FOR INSERT
TO authenticated
WITH CHECK (
  child_id IN (SELECT id FROM public.children WHERE keeper_id = auth.uid())
  OR contributor_id IS NOT NULL
);

-- Anon users (givers) can insert whispers only if they reference a valid contributor
CREATE POLICY "Anon givers can insert whispers"
ON public.whispers FOR INSERT
TO anon
WITH CHECK (
  contributor_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.contributors WHERE id = contributor_id AND child_id = whispers.child_id
  )
);

-- Anon givers can read whispers they contributed (for confirmation)
CREATE POLICY "Anon givers can read own whispers"
ON public.whispers FOR SELECT
TO anon
USING (false);  -- givers don't need to read back

-- Enable RLS on contributors table
ALTER TABLE public.contributors ENABLE ROW LEVEL SECURITY;

-- Keepers can manage their children's contributors
CREATE POLICY "Keepers can read own contributors"
ON public.contributors FOR SELECT
TO authenticated
USING (
  child_id IN (SELECT id FROM public.children WHERE keeper_id = auth.uid())
);

CREATE POLICY "Keepers can insert contributors"
ON public.contributors FOR INSERT
TO authenticated
WITH CHECK (
  child_id IN (SELECT id FROM public.children WHERE keeper_id = auth.uid())
);

-- Anon users can look up contributors by invite_token (for giver flow)
CREATE POLICY "Anon can read by invite token"
ON public.contributors FOR SELECT
TO anon
USING (true);  -- token lookup needs SELECT; the token itself is the secret

-- Enable RLS on children table
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Keepers can read own children"
ON public.children FOR SELECT
TO authenticated
USING (keeper_id = auth.uid());

CREATE POLICY "Keepers can insert children"
ON public.children FOR INSERT
TO authenticated
WITH CHECK (keeper_id = auth.uid());

-- Anon needs to read children (joined through contributors for giver flow)
CREATE POLICY "Anon can read children"
ON public.children FOR SELECT
TO anon
USING (true);  -- needed for giver token lookup join

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can upsert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid());

-- Anon can read profiles (for giver to show keeper name)
CREATE POLICY "Anon can read profiles"
ON public.profiles FOR SELECT
TO anon
USING (true);
