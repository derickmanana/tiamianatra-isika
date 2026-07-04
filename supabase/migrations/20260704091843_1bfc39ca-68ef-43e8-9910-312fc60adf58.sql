-- Auto-approve partners on signup (no admin validation)
ALTER TABLE public.partners ALTER COLUMN status SET DEFAULT 'approved';
UPDATE public.partners SET status = 'approved' WHERE status = 'pending';

-- Prevent privilege escalation: block partners from changing sensitive fields themselves
DROP POLICY IF EXISTS "partners self update" ON public.partners;
CREATE POLICY "partners self update" ON public.partners
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND status = (SELECT status FROM public.partners WHERE id = partners.id)
    AND partner_type = (SELECT partner_type FROM public.partners WHERE id = partners.id)
    AND commission_rate = (SELECT commission_rate FROM public.partners WHERE id = partners.id)
  );