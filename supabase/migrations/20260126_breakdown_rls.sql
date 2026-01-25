-- Policies for shoot_days

create policy "Enable read for project members"
  on public.shoot_days
  for select
  using (
    exists (
      select 1 from project_roles
      where project_roles.tournage_id = shoot_days.tournage_id
      and project_roles.assigned_profile_id = auth.uid()
    ) or exists (
        select 1 from tournages
        where tournages.id = shoot_days.tournage_id
        and tournages.owner_id = auth.uid()
    )
  );

create policy "Enable insert for project members"
  on public.shoot_days
  for insert
  with check (
    exists (
      select 1 from project_roles
      where project_roles.tournage_id = shoot_days.tournage_id
      and project_roles.assigned_profile_id = auth.uid()
    ) or exists (
        select 1 from tournages
        where tournages.id = shoot_days.tournage_id
        and tournages.owner_id = auth.uid()
    )
  );

create policy "Enable update for project members"
  on public.shoot_days
  for update
  using (
    exists (
      select 1 from project_roles
      where project_roles.tournage_id = shoot_days.tournage_id
      and project_roles.assigned_profile_id = auth.uid()
    ) or exists (
        select 1 from tournages
        where tournages.id = shoot_days.tournage_id
        and tournages.owner_id = auth.uid()
    )
  );

create policy "Enable delete for project members"
  on public.shoot_days
  for delete
  using (
    exists (
      select 1 from project_roles
      where project_roles.tournage_id = shoot_days.tournage_id
      and project_roles.assigned_profile_id = auth.uid()
    ) or exists (
        select 1 from tournages
        where tournages.id = shoot_days.tournage_id
        and tournages.owner_id = auth.uid()
    )
  );

-- Policies for scenes

create policy "Enable read for project members"
  on public.scenes
  for select
  using (
    exists (
      select 1 from project_roles
      where project_roles.tournage_id = scenes.tournage_id
      and project_roles.assigned_profile_id = auth.uid()
    ) or exists (
        select 1 from tournages
        where tournages.id = scenes.tournage_id
        and tournages.owner_id = auth.uid()
    )
  );

create policy "Enable insert for project members"
  on public.scenes
  for insert
  with check (
    exists (
      select 1 from project_roles
      where project_roles.tournage_id = scenes.tournage_id
      and project_roles.assigned_profile_id = auth.uid()
    ) or exists (
        select 1 from tournages
        where tournages.id = scenes.tournage_id
        and tournages.owner_id = auth.uid()
    )
  );

create policy "Enable update for project members"
  on public.scenes
  for update
  using (
    exists (
      select 1 from project_roles
      where project_roles.tournage_id = scenes.tournage_id
      and project_roles.assigned_profile_id = auth.uid()
    ) or exists (
        select 1 from tournages
        where tournages.id = scenes.tournage_id
        and tournages.owner_id = auth.uid()
    )
  );

create policy "Enable delete for project members"
  on public.scenes
  for delete
  using (
    exists (
      select 1 from project_roles
      where project_roles.tournage_id = scenes.tournage_id
      and project_roles.assigned_profile_id = auth.uid()
    ) or exists (
        select 1 from tournages
        where tournages.id = scenes.tournage_id
        and tournages.owner_id = auth.uid()
    )
  );
