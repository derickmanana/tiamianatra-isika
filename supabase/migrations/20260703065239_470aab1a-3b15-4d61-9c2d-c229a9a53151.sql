
-- 1. New columns on formations
ALTER TABLE public.formations
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS specialization text,
  ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS learning_track_id uuid REFERENCES public.learning_tracks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS duration_id uuid REFERENCES public.course_durations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS certificate_type text;

-- 2. Mark free intro module
ALTER TABLE public.modules
  ADD COLUMN IF NOT EXISTS is_free_intro boolean NOT NULL DEFAULT false;

-- 3. Auto-create Module 1 on formation insert
CREATE OR REPLACE FUNCTION public.create_free_intro_module()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.modules (formation_id, title, description, display_order, price_ariary, is_available, is_free_intro)
  VALUES (NEW.id, 'Module 1 — Présentation', 'Présentation, objectifs et introduction (gratuit)', 1, 0, true, true);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_free_intro_module ON public.formations;
CREATE TRIGGER trg_create_free_intro_module
AFTER INSERT ON public.formations
FOR EACH ROW EXECUTE FUNCTION public.create_free_intro_module();

-- 4. Protect Module 1: cannot delete, cannot become paid, cannot change order
CREATE OR REPLACE FUNCTION public.protect_free_intro_module()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_free_intro OR OLD.display_order = 1 THEN
      RAISE EXCEPTION 'Le Module 1 gratuit ne peut pas être supprimé.';
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_free_intro OR OLD.display_order = 1 THEN
      IF NEW.price_ariary IS DISTINCT FROM 0 THEN
        RAISE EXCEPTION 'Le Module 1 doit rester gratuit (prix = 0).';
      END IF;
      IF NEW.display_order <> 1 THEN
        RAISE EXCEPTION 'L''ordre du Module 1 ne peut pas être modifié.';
      END IF;
      IF NEW.is_free_intro = false THEN
        RAISE EXCEPTION 'Le Module 1 doit rester marqué comme gratuit.';
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_free_intro_module_del ON public.modules;
CREATE TRIGGER trg_protect_free_intro_module_del
BEFORE DELETE ON public.modules
FOR EACH ROW EXECUTE FUNCTION public.protect_free_intro_module();

DROP TRIGGER IF EXISTS trg_protect_free_intro_module_upd ON public.modules;
CREATE TRIGGER trg_protect_free_intro_module_upd
BEFORE UPDATE ON public.modules
FOR EACH ROW EXECUTE FUNCTION public.protect_free_intro_module();

-- 5. RLS: allow formateurs to manage modules of their own formations
DROP POLICY IF EXISTS "Formateurs manage own formation modules" ON public.modules;
CREATE POLICY "Formateurs manage own formation modules"
ON public.modules
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.formations f
    JOIN public.partners p ON p.id = f.owner_partner_id
    WHERE f.id = modules.formation_id
      AND p.user_id = auth.uid()
      AND p.partner_type = 'formateur'
      AND p.status = 'approved'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.formations f
    JOIN public.partners p ON p.id = f.owner_partner_id
    WHERE f.id = modules.formation_id
      AND p.user_id = auth.uid()
      AND p.partner_type = 'formateur'
      AND p.status = 'approved'
  )
);

-- 6. RLS: allow formateurs to insert videos linked to their modules
DROP POLICY IF EXISTS "Formateurs manage own videos" ON public.videos;
CREATE POLICY "Formateurs manage own videos"
ON public.videos
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.modules m
    JOIN public.formations f ON f.id = m.formation_id
    JOIN public.partners p ON p.id = f.owner_partner_id
    WHERE m.id = videos.module_id
      AND p.user_id = auth.uid()
      AND p.partner_type = 'formateur'
      AND p.status = 'approved'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.modules m
    JOIN public.formations f ON f.id = m.formation_id
    JOIN public.partners p ON p.id = f.owner_partner_id
    WHERE m.id = videos.module_id
      AND p.user_id = auth.uid()
      AND p.partner_type = 'formateur'
      AND p.status = 'approved'
  )
);
