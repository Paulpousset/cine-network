-- Mise à jour des politiques RLS pour permettre aux collaborateurs d'avoir les mêmes droits que le propriétaire

-- 1. Table tournages (le projet lui-même)
DROP POLICY IF EXISTS "Owners can update their own projects" ON public.tournages;
CREATE POLICY "Owners and collaborators can update projects" ON public.tournages
  FOR UPDATE USING (
    auth.uid() = owner_id OR 
    (collaborators IS NOT NULL AND auth.uid() = ANY(collaborators))
  );

-- 2. Table project_roles (les postes/équipes)
DROP POLICY IF EXISTS "Owners can manage project roles" ON public.project_roles;
CREATE POLICY "Owners and collaborators can manage roles" ON public.project_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tournages 
      WHERE tournages.id = project_roles.tournage_id 
      AND (tournages.owner_id = auth.uid() OR (tournages.collaborators IS NOT NULL AND auth.uid() = ANY(tournages.collaborators)))
    )
  );

-- 3. Table applications (les candidatures)
DROP POLICY IF EXISTS "Owners can manage applications" ON public.applications;
CREATE POLICY "Owners and collaborators can manage applications" ON public.applications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.project_roles
      JOIN public.tournages ON tournages.id = project_roles.tournage_id
      WHERE project_roles.id = applications.role_id
      AND (tournages.owner_id = auth.uid() OR (tournages.collaborators IS NOT NULL AND auth.uid() = ANY(tournages.collaborators)))
    )
  );

-- 4. Table project_characters (le casting)
DROP POLICY IF EXISTS "Owners can manage characters" ON public.project_characters;
CREATE POLICY "Owners and collaborators can manage characters" ON public.project_characters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tournages 
      WHERE tournages.id = project_characters.project_id 
      AND (tournages.owner_id = auth.uid() OR (tournages.collaborators IS NOT NULL AND auth.uid() = ANY(tournages.collaborators)))
    )
  );

-- 5. Table project_category_permissions (permissions d'équipe)
DROP POLICY IF EXISTS "Owners can manage category permissions" ON public.project_category_permissions;
CREATE POLICY "Owners and collaborators can manage category permissions" ON public.project_category_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tournages 
      WHERE tournages.id = project_category_permissions.project_id 
      AND (tournages.owner_id = auth.uid() OR (tournages.collaborators IS NOT NULL AND auth.uid() = ANY(tournages.collaborators)))
    )
  );

-- 6. Table project_events (Calendrier)
DROP POLICY IF EXISTS "Owners can manage project events" ON public.project_events;
CREATE POLICY "Owners and collaborators can manage events" ON public.project_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tournages 
      WHERE tournages.id = project_events.tournage_id 
      AND (tournages.owner_id = auth.uid() OR (tournages.collaborators IS NOT NULL AND auth.uid() = ANY(tournages.collaborators)))
    )
  );

-- 7. Table project_messages (Espaces - Discussion)
DROP POLICY IF EXISTS "Owners can delete any message" ON public.project_messages;
CREATE POLICY "Owners and collaborators can manage messages" ON public.project_messages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.tournages 
      WHERE tournages.id = project_messages.project_id 
      AND (tournages.owner_id = auth.uid() OR (tournages.collaborators IS NOT NULL AND auth.uid() = ANY(tournages.collaborators)))
    )
  );

-- 8. Table project_files (Espaces - Fichiers)
DROP POLICY IF EXISTS "Owners can delete any file" ON public.project_files;
CREATE POLICY "Owners and collaborators can manage files" ON public.project_files
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.tournages 
      WHERE tournages.id = project_files.project_id 
      AND (tournages.owner_id = auth.uid() OR (tournages.collaborators IS NOT NULL AND auth.uid() = ANY(tournages.collaborators)))
    )
  );

-- 9. Table project_custom_spaces (Espaces personnalisés)
DROP POLICY IF EXISTS "Owners can manage custom spaces" ON public.project_custom_spaces;
CREATE POLICY "Owners and collaborators can manage custom spaces" ON public.project_custom_spaces
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tournages 
      WHERE tournages.id = project_custom_spaces.project_id 
      AND (tournages.owner_id = auth.uid() OR (tournages.collaborators IS NOT NULL AND auth.uid() = ANY(tournages.collaborators)))
    )
  );

