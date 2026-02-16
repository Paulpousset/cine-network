-- Table for personalized experience descriptions on user profiles
CREATE TABLE IF NOT EXISTS profile_experience_notes (
    profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    project_id uuid REFERENCES tournages(id) ON DELETE CASCADE,
    note text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    PRIMARY KEY (profile_id, project_id)
);

-- Enable RLS
ALTER TABLE profile_experience_notes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own notes" ON profile_experience_notes
    FOR ALL USING (auth.uid() = profile_id);

CREATE POLICY "Anyone can read profile notes" ON profile_experience_notes
    FOR SELECT USING (true);
