
alter table public.scenes
add column characters text[] default '{}',
add column extras text,
add column location_type text check (location_type in ('REAL', 'STUDIO')),
add column complexity text check (complexity in ('SIMPLE', 'MEDIUM', 'COMPLEX')),
add column constraints text[] default '{}',
add column props text,
add column sound_type text[] default '{}',
add column estimated_duration integer, -- in minutes
add column priority text check (priority in ('HIGH', 'NORMAL', 'FLEXIBLE'));
