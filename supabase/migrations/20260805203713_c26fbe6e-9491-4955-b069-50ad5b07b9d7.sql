create or replace function public.has_formation_content_access(_formation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.has_role(auth.uid(), 'admin'::app_role)
    or exists (
      select 1 from public.formations f
      join public.partners p on p.id = f.owner_partner_id
      where f.id = _formation_id and p.user_id = auth.uid()
    )
    or exists (
      select 1 from public.unlocked_modules um
      join public.modules m on m.id = um.module_id
      where m.formation_id = _formation_id and um.user_id = auth.uid()
    )
$$;

revoke all on function public.has_formation_content_access(uuid) from public, anon;
grant execute on function public.has_formation_content_access(uuid) to authenticated, service_role;

drop policy if exists "folders read" on public.course_folders;
drop policy if exists "blocks read" on public.course_blocks;
drop policy if exists "lessons read" on public.course_lessons;

create policy "folders read with access" on public.course_folders
for select to authenticated
using (public.has_formation_content_access(formation_id));

create policy "blocks read with access" on public.course_blocks
for select to authenticated
using (exists (
  select 1 from public.course_folders d
  where d.id = course_blocks.folder_id
    and public.has_formation_content_access(d.formation_id)
));

create policy "lessons read with access" on public.course_lessons
for select to authenticated
using (exists (
  select 1 from public.course_blocks b
  join public.course_folders d on d.id = b.folder_id
  where b.id = course_lessons.block_id
    and public.has_formation_content_access(d.formation_id)
));

create or replace function public.can_read_lesson_file(_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.course_lessons l
    join public.course_blocks b on b.id = l.block_id
    join public.course_folders d on d.id = b.folder_id
    cross join lateral jsonb_array_elements(coalesce(l.files, '[]'::jsonb)) fx
    where fx->>'path' = _object_name
      and public.has_formation_content_access(d.formation_id)
  )
$$;

revoke all on function public.can_read_lesson_file(text) from public, anon;
grant execute on function public.can_read_lesson_file(text) to authenticated, service_role;

drop policy if exists "lesson files read" on storage.objects;

create policy "lesson files read" on storage.objects
for select to authenticated
using (bucket_id = 'lesson-files' and public.can_read_lesson_file(name));
