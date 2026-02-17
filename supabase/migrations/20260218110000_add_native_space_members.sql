-- Add table for manual membership in native category spaces
CREATE TABLE IF NOT EXISTS public.project_native_space_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.tournages(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(project_id, category, profile_id)
);

-- RLS
ALTER TABLE public.project_native_space_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View native space memberships" ON public.project_native_space_members
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tournages t
            WHERE t.id = project_id AND (
                t.owner_id = auth.uid() OR 
                EXISTS (
                    SELECT 1 FROM public.project_roles r 
                    WHERE r.tournage_id = t.id AND r.assigned_profile_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Manage native space memberships" ON public.project_native_space_members
    FOR ALL
    USING (
        -- Owner of the project
        EXISTS (
            SELECT 1 FROM public.tournages t
            WHERE t.id = project_id AND t.owner_id = auth.uid()
        ) OR
        -- Admin of the specific category
        EXISTS (
            SELECT 1 FROM public.project_roles r
            WHERE r.tournage_id = project_id 
              AND r.category = category 
              AND r.assigned_profile_id = auth.uid()
              AND r.is_category_admin = true
        )
    );
