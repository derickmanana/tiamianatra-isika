CREATE POLICY "cv own read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'student-cv' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "cv own insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'student-cv' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "cv own update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'student-cv' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'student-cv' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "cv own delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'student-cv' AND (storage.foldername(name))[1] = auth.uid()::text);