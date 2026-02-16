-- Add secondary_role and job titles to profiles
ALTER TABLE profiles ADD COLUMN secondary_role text;
ALTER TABLE profiles ADD COLUMN job_title text;
ALTER TABLE profiles ADD COLUMN secondary_job_title text;
