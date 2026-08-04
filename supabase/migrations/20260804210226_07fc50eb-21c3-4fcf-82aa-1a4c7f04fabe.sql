REVOKE EXECUTE ON FUNCTION public.owns_formation(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.owns_formation(uuid) TO authenticated;

CREATE POLICY "lesson files read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'lesson-files');
CREATE POLICY "lesson files insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lesson-files' AND (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.partners p WHERE p.user_id = auth.uid() AND p.partner_type = 'formateur')));
CREATE POLICY "lesson files update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'lesson-files' AND (public.has_role(auth.uid(),'admin') OR owner = auth.uid()));
CREATE POLICY "lesson files delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'lesson-files' AND (public.has_role(auth.uid(),'admin') OR owner = auth.uid()));