-- Migration to create saved_roles table for storing bookmarked casting offers and roles

CREATE TABLE IF NOT EXISTS public.saved_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.project_roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, role_id)
);

-- Enable RLS
ALTER TABLE public.saved_roles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own saved roles"
    ON public.saved_roles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved roles"
    ON public.saved_roles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved roles"
    ON public.saved_roles FOR DELETE
    USING (auth.uid() = user_id);
