create table public.project_sets (
  id uuid not null default gen_random_uuid (),
  project_id uuid not null references public.tournages (id) on delete cascade,
  name text not null,
  address text null,
  description text null,
  photos text[] null,
  created_at timestamp with time zone not null default now(),
  constraint project_sets_pkey primary key (id)
);

alter table public.project_sets enable row level security;

create policy "Tout le monde peut voir les décors"
  on public.project_sets for select
  using (true);

create policy "Les membres autorisés peuvent créer des décors"
  on public.project_sets for insert
  with check (
    exists (
      select 1 from project_roles
      where project_roles.tournage_id = project_sets.project_id
      and project_roles.assigned_profile_id = auth.uid()
      and project_roles.title in ('Régisseur Général', 'Directeur de production', 'Réalisateur', 'Chef Décorateur', 'Accessoiriste')
    )
    or
    exists (
      select 1 from tournages
      where tournages.id = project_sets.project_id
      and tournages.owner_id = auth.uid()
    )
  );

create policy "Les membres autorisés peuvent modifier les décors"
  on public.project_sets for update
  using (
    exists (
      select 1 from project_roles
      where project_roles.tournage_id = project_sets.project_id
      and project_roles.assigned_profile_id = auth.uid()
      and project_roles.title in ('Régisseur Général', 'Directeur de production', 'Réalisateur', 'Chef Décorateur', 'Accessoiriste')
    )
    or
    exists (
      select 1 from tournages
      where tournages.id = project_sets.project_id
      and tournages.owner_id = auth.uid()
    )
  );

create policy "Les membres autorisés peuvent supprimer les décors"
  on public.project_sets for delete
  using (
    exists (
      select 1 from project_roles
      where project_roles.tournage_id = project_sets.project_id
      and project_roles.assigned_profile_id = auth.uid()
      and project_roles.title in ('Régisseur Général', 'Directeur de production', 'Réalisateur', 'Chef Décorateur', 'Accessoiriste')
    )
    or
    exists (
      select 1 from tournages
      where tournages.id = project_sets.project_id
      and tournages.owner_id = auth.uid()
    )
  );
