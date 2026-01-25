-- Add comprehensive fields to shoot_days
alter table public.shoot_days
add column wrap_time time,
add column day_type text check (day_type in ('SHOOT', 'SCOUT', 'PREP', 'OFF', 'TRAVEL')),
add column estimated_duration integer,
add column shooting_order_mode text default 'MANUAL', -- AUTO or MANUAL

-- Logistics
add column address_street text,
add column address_city text,
add column address_gps text,
add column parking_info text,
add column is_base_camp_separate boolean default false,
add column base_camp_location text,
add column access_constraints text[] default '{}',

-- Call times details
add column general_call_time time, 
add column cast_call_time time,
add column extras_call_time time,

-- Meals
add column lunch_time time,
add column lunch_on_site boolean default true,
add column catering_info text,

-- Safety
add column weather_summary text,
add column risks text[] default '{}';

-- Create table to link scenes to shoot days for scheduling
create table public.shoot_day_scenes (
    id uuid default gen_random_uuid() primary key,
    shoot_day_id uuid references public.shoot_days(id) on delete cascade not null,
    scene_id uuid references public.scenes(id) on delete cascade not null,
    order_index integer default 0,
    created_at timestamptz default now(),
    unique(shoot_day_id, scene_id)
);

-- RLS for shoot_day_scenes
alter table public.shoot_day_scenes enable row level security;

create policy "Enable read for project members (scenes)"
  on public.shoot_day_scenes
  for select
  using (
    exists (
      select 1 from shoot_days
      join tournages on tournages.id = shoot_days.tournage_id
      left join project_roles on project_roles.tournage_id = tournages.id
      where shoot_day_scenes.shoot_day_id = shoot_days.id
      and (
        tournages.owner_id = auth.uid()
        or 
        project_roles.assigned_profile_id = auth.uid()
      )
    )
  );

create policy "Enable write for project members (scenes)"
  on public.shoot_day_scenes
  for insert
  with check (
    exists (
      select 1 from shoot_days
      join tournages on tournages.id = shoot_days.tournage_id
      left join project_roles on project_roles.tournage_id = tournages.id
      where shoot_day_scenes.shoot_day_id = shoot_days.id
      and (
        tournages.owner_id = auth.uid()
        or 
        project_roles.assigned_profile_id = auth.uid()
      )
    )
  );

create policy "Enable update for project members (scenes)"
  on public.shoot_day_scenes
  for update
  using (
    exists (
      select 1 from shoot_days
      join tournages on tournages.id = shoot_days.tournage_id
      left join project_roles on project_roles.tournage_id = tournages.id
      where shoot_day_scenes.shoot_day_id = shoot_days.id
      and (
        tournages.owner_id = auth.uid()
        or 
        project_roles.assigned_profile_id = auth.uid()
      )
    )
  );

create policy "Enable delete for project members (scenes)"
  on public.shoot_day_scenes
  for delete
  using (
    exists (
      select 1 from shoot_days
      join tournages on tournages.id = shoot_days.tournage_id
      left join project_roles on project_roles.tournage_id = tournages.id
      where shoot_day_scenes.shoot_day_id = shoot_days.id
      and (
        tournages.owner_id = auth.uid()
        or 
        project_roles.assigned_profile_id = auth.uid()
      )
    )
  );
