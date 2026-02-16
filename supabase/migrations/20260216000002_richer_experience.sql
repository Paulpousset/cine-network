-- Add image_url and custom_title to profile_experience_notes for richer portfolio display
ALTER TABLE profile_experience_notes 
ADD COLUMN IF NOT EXISTS image_url text,
ADD COLUMN IF NOT EXISTS custom_title text;
