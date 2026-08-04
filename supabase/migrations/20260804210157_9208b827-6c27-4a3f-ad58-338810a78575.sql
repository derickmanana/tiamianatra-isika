-- 1. FOLDERS
CREATE TABLE public.course_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formation_id uuid NOT NULL REFERENCES public.formations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  display_order integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_folders TO authenticated;
GRANT SELECT ON public.course_folders TO anon;
GRANT ALL ON public.course_folders TO service_role;
ALTER TABLE public.course_folders ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.course_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES public.course_folders(id) ON DELETE CASCADE,
  title text NOT NULL,
  display_order integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_blocks TO authenticated;
GRANT SELECT ON public.course_blocks TO anon;
GRANT ALL ON public.course_blocks TO service_role;
ALTER TABLE public.course_blocks ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.course_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id uuid NOT NULL REFERENCES public.course_blocks(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  external_url text,
  files jsonb NOT NULL DEFAULT '[]'::jsonb,
  display_order integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_lessons TO authenticated;
GRANT SELECT ON public.course_lessons TO anon;
GRANT ALL ON public.course_lessons TO service_role;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_course_folders_formation ON public.course_folders(formation_id);
CREATE INDEX idx_course_blocks_folder ON public.course_blocks(folder_id);
CREATE INDEX idx_course_lessons_block ON public.course_lessons(block_id);

-- helper: is the current user the owning formateur of a formation?
CREATE OR REPLACE FUNCTION public.owns_formation(_formation_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.formations f
    JOIN public.partners p ON p.id = f.owner_partner_id
    WHERE f.id = _formation_id AND p.user_id = auth.uid()
  )
$$;

CREATE POLICY "folders read" ON public.course_folders FOR SELECT USING (true);
CREATE POLICY "folders manage" ON public.course_folders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.owns_formation(formation_id))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.owns_formation(formation_id));

CREATE POLICY "blocks read" ON public.course_blocks FOR SELECT USING (true);
CREATE POLICY "blocks manage" ON public.course_blocks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.course_folders d WHERE d.id = folder_id AND public.owns_formation(d.formation_id)))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.course_folders d WHERE d.id = folder_id AND public.owns_formation(d.formation_id)));

CREATE POLICY "lessons read" ON public.course_lessons FOR SELECT USING (true);
CREATE POLICY "lessons manage" ON public.course_lessons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (
    SELECT 1 FROM public.course_blocks b JOIN public.course_folders d ON d.id = b.folder_id
    WHERE b.id = block_id AND public.owns_formation(d.formation_id)))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR EXISTS (
    SELECT 1 FROM public.course_blocks b JOIN public.course_folders d ON d.id = b.folder_id
    WHERE b.id = block_id AND public.owns_formation(d.formation_id)));

CREATE TRIGGER trg_folders_upd BEFORE UPDATE ON public.course_folders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_blocks_upd BEFORE UPDATE ON public.course_blocks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_lessons_upd BEFORE UPDATE ON public.course_lessons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. ACCESS CODES
CREATE TABLE public.access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  label text,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  max_uses integer,
  uses_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.access_codes TO authenticated;
GRANT ALL ON public.access_codes TO service_role;
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "access_codes admin all" ON public.access_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_access_codes_upd BEFORE UPDATE ON public.access_codes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.access_code_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES public.access_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code_id, user_id)
);
GRANT SELECT ON public.access_code_uses TO authenticated;
GRANT ALL ON public.access_code_uses TO service_role;
ALTER TABLE public.access_code_uses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "code uses self read" ON public.access_code_uses FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- 3. SECURITY: prevent non-admin owners from changing moderation status
DROP POLICY IF EXISTS "formations owner update" ON public.formations;
CREATE POLICY "formations owner update" ON public.formations FOR UPDATE TO authenticated
  USING (owner_partner_id IN (SELECT partners.id FROM public.partners WHERE partners.user_id = auth.uid()))
  WITH CHECK (
    owner_partner_id IN (SELECT partners.id FROM public.partners WHERE partners.user_id = auth.uid())
    AND (
      public.has_role(auth.uid(),'admin')
      OR status = (SELECT f2.status FROM public.formations f2 WHERE f2.id = formations.id)
    )
  );

DROP POLICY IF EXISTS "schools owner update" ON public.schools;
CREATE POLICY "schools owner update" ON public.schools FOR UPDATE TO authenticated
  USING (owner_partner_id IN (SELECT partners.id FROM public.partners WHERE partners.user_id = auth.uid()))
  WITH CHECK (
    owner_partner_id IN (SELECT partners.id FROM public.partners WHERE partners.user_id = auth.uid())
    AND (
      public.has_role(auth.uid(),'admin')
      OR status = (SELECT s2.status FROM public.schools s2 WHERE s2.id = schools.id)
    )
  );