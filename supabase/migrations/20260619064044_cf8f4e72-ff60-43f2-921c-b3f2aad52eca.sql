
-- ============ FORMATIONS extensions ============
ALTER TABLE public.formations
  ADD COLUMN IF NOT EXISTS cover_type text NOT NULL DEFAULT 'image' CHECK (cover_type IN ('image','video')),
  ADD COLUMN IF NOT EXISTS youtube_url text,
  ADD COLUMN IF NOT EXISTS price numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level text DEFAULT 'debutant' CHECK (level IN ('debutant','intermediaire','avance'));

-- ============ HERO SLIDES ============
CREATE TABLE IF NOT EXISTS public.hero_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('text','image','video')),
  title text,
  body text,
  media_url text,
  youtube_url text,
  cta_label text,
  cta_url text,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hero_slides TO authenticated, anon;
GRANT ALL ON public.hero_slides TO service_role;
ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hero_slides read all" ON public.hero_slides FOR SELECT USING (true);
CREATE POLICY "hero_slides admin write" ON public.hero_slides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_hero_slides_updated BEFORE UPDATE ON public.hero_slides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SCHOOLS ============
CREATE TABLE IF NOT EXISTS public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  description text,
  country text,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.schools TO authenticated, anon;
GRANT ALL ON public.schools TO service_role;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "schools read all" ON public.schools FOR SELECT USING (true);
CREATE POLICY "schools admin write" ON public.schools FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_schools_updated BEFORE UPDATE ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ LEARNING TRACKS ============
CREATE TABLE IF NOT EXISTS public.learning_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  price_multiplier numeric(6,2) NOT NULL DEFAULT 1.0,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.learning_tracks TO authenticated, anon;
GRANT ALL ON public.learning_tracks TO service_role;
ALTER TABLE public.learning_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tracks read all" ON public.learning_tracks FOR SELECT USING (true);
CREATE POLICY "tracks admin write" ON public.learning_tracks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_tracks_updated BEFORE UPDATE ON public.learning_tracks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.learning_tracks (code,label,description,price_multiplier,display_order) VALUES
  ('tsotra','Fianarana Tsotr''izao','Apprentissage simple sans certification',1.0,1),
  ('certificat','Avec Certificat','Certificat de complétion délivré',1.3,2),
  ('diplome_equiv','Avec Diplôme Équivalent','Diplôme équivalent reconnu',1.6,3),
  ('diplome','Avec Diplôme','Diplôme officiel d''école partenaire',2.0,4)
ON CONFLICT (code) DO NOTHING;

-- ============ COURSE DURATIONS ============
CREATE TABLE IF NOT EXISTS public.course_durations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  duration_weeks int,
  price_multiplier numeric(6,2) NOT NULL DEFAULT 1.0,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.course_durations TO authenticated, anon;
GRANT ALL ON public.course_durations TO service_role;
ALTER TABLE public.course_durations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "durations read all" ON public.course_durations FOR SELECT USING (true);
CREATE POLICY "durations admin write" ON public.course_durations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_durations_updated BEFORE UPDATE ON public.course_durations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.course_durations (name,description,duration_weeks,price_multiplier,display_order) VALUES
  ('Cours Normal','Rythme standard',12,1.0,1),
  ('Cours Accéléré','Rythme intensif',6,1.2,2),
  ('Cours en Journée','Sessions en journée',12,1.0,3),
  ('Cours du Soir','Sessions en soirée',16,0.95,4),
  ('Cours Weekend','Uniquement le weekend',20,0.9,5)
ON CONFLICT DO NOTHING;

-- ============ ENROLLMENTS ============
CREATE TABLE IF NOT EXISTS public.formation_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  formation_id uuid NOT NULL REFERENCES public.formations(id) ON DELETE CASCADE,
  school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  track_id uuid REFERENCES public.learning_tracks(id) ON DELETE SET NULL,
  duration_id uuid REFERENCES public.course_durations(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, formation_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.formation_enrollments TO authenticated;
GRANT ALL ON public.formation_enrollments TO service_role;
ALTER TABLE public.formation_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enroll own read" ON public.formation_enrollments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "enroll own write" ON public.formation_enrollments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "enroll own update" ON public.formation_enrollments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "enroll admin all" ON public.formation_enrollments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_enroll_updated BEFORE UPDATE ON public.formation_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
