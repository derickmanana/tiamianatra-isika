
-- Add trainer/recruiter roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'formateur';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'recruteur';

-- Partner profile table
CREATE TABLE IF NOT EXISTS public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_type text NOT NULL CHECK (partner_type IN ('formateur','recruteur')),
  display_name text NOT NULL,
  company text,
  bio text,
  logo_url text,
  website text,
  phone text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','suspended')),
  commission_rate numeric NOT NULL DEFAULT 20,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partners TO authenticated;
GRANT ALL ON public.partners TO service_role;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partners self read" ON public.partners FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "partners self insert" ON public.partners FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "partners self update" ON public.partners FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "partners admin delete" ON public.partners FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_partners_updated BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Extend formations: ownership + moderation status
ALTER TABLE public.formations
  ADD COLUMN IF NOT EXISTS owner_partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved' CHECK (status IN ('draft','pending','approved','rejected'));

-- Job offers (recruiter)
CREATE TABLE IF NOT EXISTS public.job_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  location text,
  contract_type text,
  salary_range text,
  requires_cv boolean NOT NULL DEFAULT true,
  requires_portfolio boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('draft','pending','approved','rejected','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_offers TO authenticated;
GRANT ALL ON public.job_offers TO service_role;
ALTER TABLE public.job_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jobs public read approved" ON public.job_offers FOR SELECT TO authenticated
  USING (status = 'approved' OR partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "jobs recruiter insert" ON public.job_offers FOR INSERT TO authenticated
  WITH CHECK (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid() AND partner_type='recruteur' AND status='approved'));
CREATE POLICY "jobs recruiter update" ON public.job_offers FOR UPDATE TO authenticated
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "jobs recruiter delete" ON public.job_offers FOR DELETE TO authenticated
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_jobs_updated BEFORE UPDATE ON public.job_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Job applications
CREATE TABLE IF NOT EXISTS public.job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.job_offers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cover_letter text,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','reviewing','interview','accepted','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_applications TO authenticated;
GRANT ALL ON public.job_applications TO service_role;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "apps read own" ON public.job_applications FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(),'admin')
    OR job_id IN (SELECT j.id FROM public.job_offers j JOIN public.partners p ON p.id = j.partner_id WHERE p.user_id = auth.uid())
  );
CREATE POLICY "apps insert self" ON public.job_applications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "apps update recruiter" ON public.job_applications FOR UPDATE TO authenticated
  USING (
    job_id IN (SELECT j.id FROM public.job_offers j JOIN public.partners p ON p.id = j.partner_id WHERE p.user_id = auth.uid())
    OR public.has_role(auth.uid(),'admin')
  );

CREATE TRIGGER trg_apps_updated BEFORE UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
