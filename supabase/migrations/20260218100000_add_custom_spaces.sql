-- Create project_custom_spaces table
CREATE TABLE IF NOT EXISTS public.project_custom_spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.tournages(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    allowed_tools TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create project_custom_space_members table
CREATE TABLE IF NOT EXISTS public.project_custom_space_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES public.project_custom_spaces(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(space_id, profile_id)
);

-- RLS Policies
ALTER TABLE public.project_custom_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_custom_space_members ENABLE ROW LEVEL SECURITY;

-- project_custom_spaces: All project members can read (?) Or only those in it?
-- Let's say: anyone who is a member of the project (owner or has a role)
CREATE POLICY "Anyone who is a project member can view spaces" ON public.project_custom_spaces
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tournages t
            WHERE t.id = project_id AND t.owner_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.project_roles r
            WHERE r.tournage_id = project_id AND r.assigned_profile_id = auth.uid()
        )
    );

CREATE POLICY "Owners can manage spaces" ON public.project_custom_spaces
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.tournages t
            WHERE t.id = project_id AND t.owner_id = auth.uid()
        )
    );

-- project_custom_space_members:
CREATE POLICY "View memberships" ON public.project_custom_space_members
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.project_custom_spaces s
            WHERE s.id = space_id AND (
                EXISTS (
                    SELECT 1 FROM public.tournages t
                    WHERE t.id = s.project_id AND t.owner_id = auth.uid()
                ) OR
                EXISTS (
                    SELECT 1 FROM public.project_roles r
                    WHERE r.tournage_id = s.project_id AND r.assigned_profile_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Owners can manage memberships" ON public.project_custom_space_members
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.project_custom_spaces s
            JOIN public.tournages t ON t.id = s.project_id
            WHERE s.id = space_id AND t.owner_id = auth.uid()
        )
    );
