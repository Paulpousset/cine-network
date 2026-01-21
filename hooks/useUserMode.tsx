import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const MODE_KEY = "user_mode";
export type UserMode = "search" | "creator";

export function useUserMode() {
  const [mode, setMode] = useState<UserMode>("search");

  useEffect(() => {
    AsyncStorage.getItem(MODE_KEY)
      .then((v) => {
        if (v === "creator" || v === "search") setMode(v);
      })
      .catch(() => {});
  }, []);

  const setUserMode = useCallback((m: UserMode) => {
    setMode(m);
    AsyncStorage.setItem(MODE_KEY, m).catch(() => {});
  }, []);

  return { mode, setUserMode };
}
