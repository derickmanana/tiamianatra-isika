
-- ============ user_discounts ============
CREATE TABLE public.user_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  percent numeric NOT NULL DEFAULT 0 CHECK (percent >= 0 AND percent <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_discounts TO authenticated;
GRANT ALL ON public.user_discounts TO service_role;
ALTER TABLE public.user_discounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own discount" ON public.user_discounts FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manage discounts" ON public.user_discounts FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_user_discounts_updated BEFORE UPDATE ON public.user_discounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ certificates ============
CREATE TABLE public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  formation_id uuid NOT NULL REFERENCES public.formations(id) ON DELETE CASCADE,
  pdf_url text,
  signature_url text,
  issued_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, formation_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own certs" ON public.certificates FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "users insert own certs" ON public.certificates FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manage certs" ON public.certificates FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ affiliate_codes ============
CREATE TABLE public.affiliate_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  uses_count integer NOT NULL DEFAULT 0,
  total_uses_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_codes TO authenticated;
GRANT ALL ON public.affiliate_codes TO service_role;
ALTER TABLE public.affiliate_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own code" ON public.affiliate_codes FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "users insert own code" ON public.affiliate_codes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "admin manage codes" ON public.affiliate_codes FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ affiliate_uses ============
CREATE TABLE public.affiliate_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES public.affiliate_codes(id) ON DELETE CASCADE,
  used_by uuid NOT NULL,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.affiliate_uses TO authenticated;
GRANT ALL ON public.affiliate_uses TO service_role;
ALTER TABLE public.affiliate_uses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read related uses" ON public.affiliate_uses FOR SELECT TO authenticated USING (used_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR EXISTS(SELECT 1 FROM public.affiliate_codes c WHERE c.id = code_id AND c.user_id = auth.uid()));
CREATE POLICY "users insert use" ON public.affiliate_uses FOR INSERT TO authenticated WITH CHECK (used_by = auth.uid());

-- ============ profiles extra ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS affiliate_bonus_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_modules_credit integer NOT NULL DEFAULT 0;

-- ============ module pricing seed ============
UPDATE public.modules SET price_ariary = 52500 WHERE display_order = 1 AND price_ariary = 52500;
UPDATE public.modules SET price_ariary = 75000 WHERE display_order = 2;
UPDATE public.modules SET price_ariary = 100000 WHERE display_order = 3;

-- ============ badge function ============
CREATE OR REPLACE FUNCTION public.get_user_badge(_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH done AS (
    SELECT f.id FROM public.formations f
    WHERE NOT EXISTS (
      SELECT 1 FROM public.modules m
      WHERE m.formation_id = f.id
      AND NOT EXISTS (SELECT 1 FROM public.unlocked_modules u WHERE u.module_id = m.id AND u.user_id = _user_id)
    )
    AND EXISTS (SELECT 1 FROM public.modules m WHERE m.formation_id = f.id)
  )
  SELECT CASE
    WHEN (SELECT count(*) FROM done) >= 6 THEN 'platine'
    WHEN (SELECT count(*) FROM done) >= 4 THEN 'or'
    WHEN (SELECT count(*) FROM done) >= 2 THEN 'argent'
    WHEN (SELECT count(*) FROM done) >= 1 THEN 'bronze'
    ELSE 'debutant'
  END
$$;
