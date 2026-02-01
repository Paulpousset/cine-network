import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";

const MODE_KEY = "user_mode";
const COLLAPSED_KEY = "sidebar_collapsed";
export type UserMode = "search" | "studio";

interface UserModeContextType {
  mode: UserMode;
  setUserMode: (mode: UserMode) => void;
  isSidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const UserModeContext = createContext<UserModeContextType | undefined>(
  undefined,
);

export function UserModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<UserMode>("search");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(MODE_KEY)
      .then((v) => {
        if (v === "studio" || v === "search") setMode(v);
        else if (v === "creator") {
          setMode("studio");
          AsyncStorage.setItem(MODE_KEY, "studio");
        }
      })
      .catch(() => {});

    AsyncStorage.getItem(COLLAPSED_KEY)
      .then((v) => {
        if (v === "true") setIsSidebarCollapsed(true);
      })
      .catch(() => {});
  }, []);

  const setUserMode = useCallback((m: UserMode) => {
    setMode(m);
    AsyncStorage.setItem(MODE_KEY, m).catch(() => {});
  }, []);

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
    AsyncStorage.setItem(COLLAPSED_KEY, collapsed ? "true" : "false").catch(
      () => {},
    );
  }, []);

  return (
    <UserModeContext.Provider
      value={{
        mode,
        setUserMode,
        isSidebarCollapsed,
        setSidebarCollapsed,
      }}
    >
      {children}
    </UserModeContext.Provider>
  );
}

export function useUserModeContext() {
  const context = useContext(UserModeContext);
  if (context === undefined) {
    throw new Error("useUserMode must be used within a UserModeProvider");
  }
  return context;
}
