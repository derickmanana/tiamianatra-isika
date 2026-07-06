DROP POLICY IF EXISTS "partners self update" ON public.partners;

CREATE POLICY "partners self update"
ON public.partners
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND status = (SELECT p2.status FROM public.partners p2 WHERE p2.id = partners.id)
  AND partner_type = (SELECT p2.partner_type FROM public.partners p2 WHERE p2.id = partners.id)
  AND commission_rate = (SELECT p2.commission_rate FROM public.partners p2 WHERE p2.id = partners.id)
);