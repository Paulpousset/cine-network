ALTER TABLE project_roles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Optional: Add a trigger to automatically update updated_at on any change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS tr_project_roles_updated_at ON project_roles;
CREATE TRIGGER tr_project_roles_updated_at
    BEFORE UPDATE ON project_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
