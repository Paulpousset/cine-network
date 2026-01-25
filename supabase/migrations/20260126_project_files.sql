create table public.project_files (
  id uuid not null default gen_random_uuid (),
  project_id uuid not null references public.tournages (id) on delete cascade,
  category text not null,
  uploader_id uuid not null references public.profiles (id),
  name text not null,
  file_path text not null,
  file_type text,
  size bigint,
  created_at timestamp with time zone not null default now(),
  constraint project_files_pkey primary key (id)
);

alter table public.project_files enable row level security;

create policy "Enable read for project members"
  on public.project_files
  for select
  using (
    exists (
      select 1 from project_roles
      where project_roles.tournage_id = project_files.project_id
      and project_roles.assigned_profile_id = auth.uid()
    ) or exists (
        select 1 from tournages
        where tournages.id = project_files.project_id
        and tournages.owner_id = auth.uid()
    )
  );

create policy "Enable insert for project members"
  on public.project_files
  for insert
  with check (
    exists (
        select 1 from project_roles
        where project_roles.tournage_id = project_files.project_id
        and project_roles.assigned_profile_id = auth.uid()
    ) or exists (
        select 1 from tournages
        where tournages.id = project_files.project_id
        and tournages.owner_id = auth.uid()
    )
  );

-- Storage bucket setup
insert into storage.buckets (id, name, public)
values ('project_files', 'project_files', true)
on conflict (id) do nothing;

create policy "Give access to project files"
on storage.objects for select
using ( bucket_id = 'project_files' );

create policy "Allow uploads to project files"
on storage.objects for insert
with check ( bucket_id = 'project_files' );
