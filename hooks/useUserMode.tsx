import { supabase } from "@/lib/supabase";
import { useUserModeContext } from "@/providers/UserModeProvider";
import { useEffect, useState } from "react";

export type UserMode = "search" | "studio";

export function useUserMode() {
  const context = useUserModeContext();
  const [realUserId, setRealUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setRealUserId(session?.user?.id || null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setRealUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const effectiveUserId = context.impersonatedUser?.id || realUserId;

  return {
    ...context,
    realUserId,
    effectiveUserId,
    isImpersonating: !!context.impersonatedUser,
  };
}
