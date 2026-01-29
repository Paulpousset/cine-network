create table public.project_characters (
  id uuid not null default gen_random_uuid (),
  project_id uuid not null references public.tournages (id) on delete cascade,
  name text not null,
  description text null,
  assigned_actor_id uuid null references public.profiles (id) on delete set null,
  created_at timestamp with time zone not null default now(),
  constraint project_characters_pkey primary key (id)
);

alter table public.project_characters enable row level security;

create policy "Tout le monde peut voir les personnages"
  on public.project_characters for select
  using (true);

create policy "Les membres du projet peuvent créer des personnages"
  on public.project_characters for insert
  with check (
    exists (
      select 1 from project_roles
      where project_roles.tournage_id = project_characters.project_id
      and project_roles.assigned_profile_id = auth.uid()
    )
    or
    exists (
      select 1 from tournages
      where tournages.id = project_characters.project_id
      and tournages.owner_id = auth.uid()
    )
  );

create policy "Les membres du projet peuvent modifier les personnages"
  on public.project_characters for update
  using (
     exists (
      select 1 from project_roles
      where project_roles.tournage_id = project_characters.project_id
      and project_roles.assigned_profile_id = auth.uid()
    )
    or
    exists (
      select 1 from tournages
      where tournages.id = project_characters.project_id
      and tournages.owner_id = auth.uid()
    )
  );

create policy "Les membres du projet peuvent supprimer les personnages"
  on public.project_characters for delete
  using (
     exists (
      select 1 from project_roles
      where project_roles.tournage_id = project_characters.project_id
      and project_roles.assigned_profile_id = auth.uid()
    )
    or
    exists (
      select 1 from tournages
      where tournages.id = project_characters.project_id
      and tournages.owner_id = auth.uid()
    )
  );
