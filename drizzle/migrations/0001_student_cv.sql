-- CV Étudiant : champs de présentation sur le profil
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS headline text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cv_bio text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cv_document_url text;

-- Expériences professionnelles
CREATE TABLE IF NOT EXISTS public.student_experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  company text,
  location text,
  start_date text,
  end_date text,
  is_current boolean NOT NULL DEFAULT false,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_experiences TO authenticated;
GRANT ALL ON public.student_experiences TO service_role;
ALTER TABLE public.student_experiences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exp own all" ON public.student_experiences FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "exp admin read" ON public.student_experiences FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_student_exp_upd BEFORE UPDATE ON public.student_experiences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Formations / diplômes
CREATE TABLE IF NOT EXISTS public.student_education (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school text NOT NULL,
  degree text,
  field text,
  start_date text,
  end_date text,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_education TO authenticated;
GRANT ALL ON public.student_education TO service_role;
ALTER TABLE public.student_education ENABLE ROW LEVEL SECURITY;
CREATE POLICY "edu own all" ON public.student_education FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "edu admin read" ON public.student_education FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_student_edu_upd BEFORE UPDATE ON public.student_education
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Compétences
CREATE TABLE IF NOT EXISTS public.student_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  level integer NOT NULL DEFAULT 3 CHECK (level BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_skills TO authenticated;
GRANT ALL ON public.student_skills TO service_role;
ALTER TABLE public.student_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "skills own all" ON public.student_skills FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "skills admin read" ON public.student_skills FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));