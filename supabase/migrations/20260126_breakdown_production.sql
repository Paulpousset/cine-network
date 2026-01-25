create table public.shoot_days (
  id uuid default gen_random_uuid() primary key,
  tournage_id uuid references public.tournages(id) on delete cascade not null,
  date date not null,
  call_time time,
  created_at timestamptz default now()
);

create table public.scenes (
  id uuid default gen_random_uuid() primary key,
  tournage_id uuid references public.tournages(id) on delete cascade not null,
  shoot_day_id uuid references public.shoot_days(id) on delete set null,
  scene_number text not null,
  slugline text,
  int_ext text check (int_ext in ('INT', 'EXT', 'INT/EXT')),
  day_night text check (day_night in ('DAY', 'NIGHT', 'DAWN', 'DUSK')),
  description text,
  script_pages numeric,
  created_at timestamptz default now()
);

-- RLS Policies (Assuming standard RLS setup)
alter table public.shoot_days enable row level security;
alter table public.scenes enable row level security;

-- Policies need to be crafted based on your specific auth setup (e.g. referencing project_roles)
-- For now, allowing all authenticated for demo/MVP if they are part of the project.
