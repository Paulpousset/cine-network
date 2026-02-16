-- Migration to add show_in_team to project_roles
ALTER TABLE project_roles ADD COLUMN IF NOT EXISTS show_in_team BOOLEAN DEFAULT true;
