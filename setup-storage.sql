-- Setup Supabase Storage for Photo Receipts
-- Run this in your Supabase SQL Editor

-- Create storage bucket for receipts
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
);

-- Set up storage policies for receipts bucket
CREATE POLICY "Users can upload their own receipts" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'receipts' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own receipts" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'receipts' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own receipts" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'receipts' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own receipts" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'receipts' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Admin can view all receipts
CREATE POLICY "Admins can view all receipts" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'receipts' AND 
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
