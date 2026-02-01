import { useUserModeContext } from "@/providers/UserModeProvider";

export type UserMode = "search" | "studio";

export function useUserMode() {
  return useUserModeContext();
}
