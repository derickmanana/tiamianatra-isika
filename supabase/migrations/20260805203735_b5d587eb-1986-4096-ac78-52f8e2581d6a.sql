create or replace function public.module_preview_stats(_formation_id uuid)
returns table(module_id uuid, videos_count integer, total_seconds integer)
language sql
stable
security definer
set search_path = public
as $$
  select m.id,
         count(v.id)::int,
         coalesce(sum(v.duration_seconds), 0)::int
  from public.modules m
  left join public.videos v on v.module_id = m.id
  where m.formation_id = _formation_id
  group by m.id
$$;

revoke all on function public.module_preview_stats(uuid) from public;
grant execute on function public.module_preview_stats(uuid) to anon, authenticated, service_role;
