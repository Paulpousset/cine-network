import { useUserModeContext } from "@/providers/UserModeProvider";
import { useUser } from "@/providers/UserProvider";

export type UserMode = "search" | "studio";

export function useUserMode() {
  const context = useUserModeContext();
  const { user } = useUser();

  const realUserId = user?.id || null;
  const effectiveUserId = context.impersonatedUser?.id || realUserId;

  return {
    ...context,
    realUserId,
    effectiveUserId,
    isImpersonating: !!context.impersonatedUser,
  };
}
