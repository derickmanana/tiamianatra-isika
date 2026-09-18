-- Espace Recruteur retiré : les tables emploi restent en place (vides) mais deviennent inaccessibles à l'application
REVOKE ALL ON public.job_applications FROM anon, authenticated;
REVOKE ALL ON public.job_offers FROM anon, authenticated;

DROP POLICY IF EXISTS "apps read own" ON public.job_applications;
DROP POLICY IF EXISTS "apps insert self" ON public.job_applications;
DROP POLICY IF EXISTS "apps update recruiter" ON public.job_applications;
DROP POLICY IF EXISTS "jobs public read approved" ON public.job_offers;
DROP POLICY IF EXISTS "jobs recruiter insert" ON public.job_offers;
DROP POLICY IF EXISTS "jobs recruiter update" ON public.job_offers;
DROP POLICY IF EXISTS "jobs recruiter delete" ON public.job_offers;

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_offers ENABLE ROW LEVEL SECURITY;

-- Les partenaires ne peuvent plus être que des formateurs
ALTER TABLE public.partners DROP CONSTRAINT IF EXISTS partners_partner_type_check;
ALTER TABLE public.partners ADD CONSTRAINT partners_partner_type_check CHECK (partner_type = 'formateur');
ALTER TABLE public.partners ALTER COLUMN partner_type SET DEFAULT 'formateur';