-- Force drop and recreate management policy for custom spaces to ensure collaborators are included
DROP POLICY IF EXISTS "Owners and collaborators can manage custom spaces" ON public.project_custom_spaces;
DROP POLICY IF EXISTS "Owners can manage spaces" ON public.project_custom_spaces;

CREATE POLICY "Owners and collaborators can manage custom spaces" ON public.project_custom_spaces
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.tournages t
            WHERE t.id = project_id AND (
                t.owner_id = auth.uid() OR 
                (t.collaborators IS NOT NULL AND auth.uid() = ANY(t.collaborators))
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tournages t
            WHERE t.id = project_id AND (
                t.owner_id = auth.uid() OR 
                (t.collaborators IS NOT NULL AND auth.uid() = ANY(t.collaborators))
            )
        )
    );

-- Same for members
DROP POLICY IF EXISTS "Owners and collaborators can manage memberships" ON public.project_custom_space_members;
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
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.project_custom_spaces s
            JOIN public.tournages t ON t.id = s.project_id
            WHERE s.id = space_id AND (
                t.owner_id = auth.uid() OR 
                (t.collaborators IS NOT NULL AND auth.uid() = ANY(t.collaborators))
            )
        )
    );
