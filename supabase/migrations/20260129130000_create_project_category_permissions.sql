create table public.project_category_permissions (
  id uuid not null default gen_random_uuid (),
  project_id uuid not null references public.tournages (id) on delete cascade,
  category public.user_role not null,
  allowed_tools text[] not null default '{}',
  created_at timestamp with time zone not null default now(),
  constraint project_category_permissions_pkey primary key (id),
  constraint project_category_permissions_uniq unique (project_id, category)
);

alter table public.project_category_permissions enable row level security;

create policy "Tout le monde peut voir les permissions"
  on public.project_category_permissions for select
  using (true);

create policy "Seul le propriétaire peut modifier les permissions"
  on public.project_category_permissions for all
  using (
    exists (
      select 1 from tournages
      where tournages.id = project_category_permissions.project_id
      and tournages.owner_id = auth.uid()
    )
  );
