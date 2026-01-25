
alter table public.shoot_days
add column location text,
add column notes text;

create table public.day_calls (
  id uuid default gen_random_uuid() primary key,
  shoot_day_id uuid references public.shoot_days(id) on delete cascade not null,
  role_id uuid references public.project_roles(id) on delete cascade not null,
  call_time time,
  created_at timestamptz default now()
);

alter table public.day_calls enable row level security;

create policy "Enable read for project members"
  on public.day_calls
  for select
  using (
    exists (
      select 1 from shoot_days
      join tournages on tournages.id = shoot_days.tournage_id
      left join project_roles on project_roles.tournage_id = tournages.id
      where day_calls.shoot_day_id = shoot_days.id
      and (
        tournages.owner_id = auth.uid()
        or 
        project_roles.assigned_profile_id = auth.uid()
      )
    )
  );

create policy "Enable write for project members"
  on public.day_calls
  for insert
  with check (
    exists (
      select 1 from shoot_days
      join tournages on tournages.id = shoot_days.tournage_id
      left join project_roles on project_roles.tournage_id = tournages.id
      where day_calls.shoot_day_id = shoot_days.id
      and (
        tournages.owner_id = auth.uid()
        or 
        project_roles.assigned_profile_id = auth.uid()
      )
    )
  );
