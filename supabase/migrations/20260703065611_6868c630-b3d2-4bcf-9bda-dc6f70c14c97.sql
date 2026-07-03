
-- Cascade delete modules when a formation is removed
ALTER TABLE public.modules DROP CONSTRAINT IF EXISTS modules_formation_id_fkey;
ALTER TABLE public.modules
  ADD CONSTRAINT modules_formation_id_fkey
  FOREIGN KEY (formation_id) REFERENCES public.formations(id) ON DELETE CASCADE;

-- When a formation is deleted, the modules cascade; skip the protection trigger in that case
CREATE OR REPLACE FUNCTION public.protect_free_intro_module()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  parent_exists boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_free_intro OR OLD.display_order = 1 THEN
      SELECT EXISTS(SELECT 1 FROM public.formations WHERE id = OLD.formation_id) INTO parent_exists;
      IF parent_exists THEN
        RAISE EXCEPTION 'Le Module 1 gratuit ne peut pas être supprimé.';
      END IF;
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

REVOKE EXECUTE ON FUNCTION public.protect_free_intro_module() FROM PUBLIC, anon, authenticated;
