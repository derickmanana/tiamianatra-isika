
-- 1) SCHOOLS: enrich + ownership
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS owner_partner_id uuid REFERENCES public.partners(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'schools_status_check'
  ) THEN
    ALTER TABLE public.schools
      ADD CONSTRAINT schools_status_check
      CHECK (status IN ('pending','approved','suspended','rejected'));
  END IF;
END $$;

-- 2) FORMATIONS: multi-certificats + durée libre
ALTER TABLE public.formations
  ADD COLUMN IF NOT EXISTS certificate_types text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS duration_text text;

-- 3) SCHOOLS policies
DROP POLICY IF EXISTS "schools read all" ON public.schools;
DROP POLICY IF EXISTS "schools admin write" ON public.schools;
DROP POLICY IF EXISTS "schools public read approved" ON public.schools;
DROP POLICY IF EXISTS "schools owner read" ON public.schools;
DROP POLICY IF EXISTS "schools owner insert" ON public.schools;
DROP POLICY IF EXISTS "schools owner update" ON public.schools;
DROP POLICY IF EXISTS "schools admin all" ON public.schools;

CREATE POLICY "schools public read approved" ON public.schools
  FOR SELECT USING (status = 'approved' OR is_active = true);

CREATE POLICY "schools owner read" ON public.schools
  FOR SELECT TO authenticated
  USING (
    owner_partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "schools owner insert" ON public.schools
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_partner_id IN (
      SELECT id FROM public.partners
      WHERE user_id = auth.uid()
        AND status = 'approved'
        AND partner_type = 'formateur'
    )
  );

CREATE POLICY "schools owner update" ON public.schools
  FOR UPDATE TO authenticated
  USING (owner_partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()))
  WITH CHECK (owner_partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

CREATE POLICY "schools admin all" ON public.schools
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4) FORMATIONS policies: allow formateur owner to CRUD
DROP POLICY IF EXISTS "formations admin write" ON public.formations;
DROP POLICY IF EXISTS "formations admin update" ON public.formations;
DROP POLICY IF EXISTS "formations admin delete" ON public.formations;
DROP POLICY IF EXISTS "formations owner insert" ON public.formations;
DROP POLICY IF EXISTS "formations owner update" ON public.formations;
DROP POLICY IF EXISTS "formations owner delete" ON public.formations;
DROP POLICY IF EXISTS "formations admin all" ON public.formations;

CREATE POLICY "formations owner insert" ON public.formations
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_partner_id IN (
      SELECT id FROM public.partners
      WHERE user_id = auth.uid()
        AND status = 'approved'
        AND partner_type = 'formateur'
    )
  );

CREATE POLICY "formations owner update" ON public.formations
  FOR UPDATE TO authenticated
  USING (owner_partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()))
  WITH CHECK (owner_partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

CREATE POLICY "formations owner delete" ON public.formations
  FOR DELETE TO authenticated
  USING (owner_partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

CREATE POLICY "formations admin all" ON public.formations
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5) PARTNERS self insert: allow approved (auto-approval)
DROP POLICY IF EXISTS "partners self insert" ON public.partners;
CREATE POLICY "partners self insert" ON public.partners
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status IN ('pending','approved'));
