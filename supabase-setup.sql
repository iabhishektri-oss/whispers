-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- Creates storage buckets and policies for voice notes and photos

-- Create the storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-notes', 'voice-notes', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to voice-notes
CREATE POLICY "Allow authenticated uploads to voice-notes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'voice-notes');

-- Allow anyone to read voice-notes (public bucket)
CREATE POLICY "Allow public read of voice-notes"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'voice-notes');

-- Allow authenticated users to upload to photos
CREATE POLICY "Allow authenticated uploads to photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'photos');

-- Allow anyone to read photos (public bucket)
CREATE POLICY "Allow public read of photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'photos');

-- Allow anon users to upload (for givers who aren't logged in)
CREATE POLICY "Allow anon uploads to voice-notes"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'voice-notes');

CREATE POLICY "Allow anon uploads to photos"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'photos');
