
-- Auto-approve formations & schools going forward
ALTER TABLE public.formations ALTER COLUMN status SET DEFAULT 'approved';
ALTER TABLE public.schools ALTER COLUMN status SET DEFAULT 'approved';

-- Approve existing pending records
UPDATE public.formations SET status = 'approved' WHERE status = 'pending';
UPDATE public.schools SET status = 'approved' WHERE status = 'pending' OR status IS NULL;
