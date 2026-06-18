
-- Storage policies for formation-covers (private bucket)
CREATE POLICY "Anyone authenticated can read formation covers"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'formation-covers');

CREATE POLICY "Admins can upload formation covers"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'formation-covers' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update formation covers"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'formation-covers' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete formation covers"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'formation-covers' AND public.has_role(auth.uid(), 'admin'));
