-- Fix RLS for project_custom_spaces and project_custom_space_members to include collaborators

-- 1. Project Custom Spaces: Already handled in 20260228000000 but let's ensure it's correct
-- The policy "Owners and collaborators can manage custom spaces" was created.
-- Let's double check if "Anyone who is a project member can view spaces" needs update?
-- No, that one uses project_roles or owner_id. Let's add collaborators to it too just in case.

DROP POLICY IF EXISTS "Anyone who is a project member can view spaces" ON public.project_custom_spaces;
CREATE POLICY "Anyone who is a project member can view spaces" ON public.project_custom_spaces
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tournages t
            WHERE t.id = project_id AND (
                t.owner_id = auth.uid() OR 
                (t.collaborators IS NOT NULL AND auth.uid() = ANY(t.collaborators))
            )
        ) OR
        EXISTS (
            SELECT 1 FROM public.project_roles r
            WHERE r.tournage_id = project_id AND r.assigned_profile_id = auth.uid()
        )
    );

-- 2. Project Custom Space Members:
DROP POLICY IF EXISTS "View memberships" ON public.project_custom_space_members;
CREATE POLICY "View memberships" ON public.project_custom_space_members
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.project_custom_spaces s
            WHERE s.id = space_id AND (
                EXISTS (
                    SELECT 1 FROM public.tournages t
                    WHERE t.id = s.project_id AND (
                        t.owner_id = auth.uid() OR 
                        (t.collaborators IS NOT NULL AND auth.uid() = ANY(t.collaborators))
                    )
                ) OR
                EXISTS (
                    SELECT 1 FROM public.project_roles r
                    WHERE r.tournage_id = s.project_id AND r.assigned_profile_id = auth.uid()
                )
            )
        )
    );

DROP POLICY IF EXISTS "Owners can manage memberships" ON public.project_custom_space_members;
CREATE POLICY "Owners and collaborators can manage memberships" ON public.project_custom_space_members
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.project_custom_spaces s
            JOIN public.tournages t ON t.id = s.project_id
            WHERE s.id = space_id AND (
                t.owner_id = auth.uid() OR 
                (t.collaborators IS NOT NULL AND auth.uid() = ANY(t.collaborators))
            )
        )
    );

-- 3. Project Native Space Members:
DROP POLICY IF EXISTS "Manage native space memberships" ON public.project_native_space_members;
CREATE POLICY "Manage native space memberships" ON public.project_native_space_members
    FOR ALL
    USING (
        -- Owner or collaborator
        EXISTS (
            SELECT 1 FROM public.tournages t
            WHERE t.id = project_id AND (
                t.owner_id = auth.uid() OR 
                (t.collaborators IS NOT NULL AND auth.uid() = ANY(t.collaborators))
            )
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

-- Also update SELECT for native memberships to be safe
DROP POLICY IF EXISTS "View native space memberships" ON public.project_native_space_members;
CREATE POLICY "View native space memberships" ON public.project_native_space_members
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tournages t
            WHERE t.id = project_id AND (
                t.owner_id = auth.uid() OR 
                (t.collaborators IS NOT NULL AND auth.uid() = ANY(t.collaborators)) OR
                EXISTS (
                    SELECT 1 FROM public.project_roles r 
                    WHERE r.tournage_id = t.id AND r.assigned_profile_id = auth.uid()
                )
            )
        )
    );
