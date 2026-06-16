CREATE TABLE public.api_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_settings TO authenticated;
GRANT ALL ON public.api_settings TO service_role;
ALTER TABLE public.api_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "api_settings admin read" ON public.api_settings FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "api_settings admin write" ON public.api_settings FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "api_settings admin update" ON public.api_settings FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
INSERT INTO public.api_settings (key, value) VALUES ('youtube_api_key', '') ON CONFLICT DO NOTHING;