
-- avatars
CREATE POLICY "avatars read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'avatars');
CREATE POLICY "avatars insert own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars update own" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars delete own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- formation-covers (admin only write, all read)
CREATE POLICY "covers read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'formation-covers');
CREATE POLICY "covers admin write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'formation-covers' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "covers admin update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'formation-covers' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "covers admin delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'formation-covers' AND public.has_role(auth.uid(),'admin'));

-- certificates (user reads own folder, admin all)
CREATE POLICY "certs read own" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'certificates' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "certs insert own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'certificates' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "certs admin update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'certificates' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "certs admin delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'certificates' AND public.has_role(auth.uid(),'admin'));
