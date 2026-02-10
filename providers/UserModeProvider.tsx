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
const IMPERSONATED_ID_KEY = "impersonated_user_id";

export type UserMode = "search" | "studio";

interface UserModeContextType {
  mode: UserMode;
  setUserMode: (mode: UserMode) => void;
  isSidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  impersonatedUser: any | null;
  setImpersonatedUser: (user: any | null) => void;
}

const UserModeContext = createContext<UserModeContextType | undefined>(
  undefined,
);

export function UserModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<UserMode>("search");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [impersonatedUser, setImpersonatedUserRaw] = useState<any | null>(null);

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

    AsyncStorage.getItem(IMPERSONATED_ID_KEY)
      .then((v) => {
        if (v) {
          try {
            setImpersonatedUserRaw(JSON.parse(v));
          } catch (e) {
            AsyncStorage.removeItem(IMPERSONATED_ID_KEY);
          }
        }
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

  const setImpersonatedUser = useCallback((user: any | null) => {
    setImpersonatedUserRaw(user);
    if (user) {
      AsyncStorage.setItem(IMPERSONATED_ID_KEY, JSON.stringify(user)).catch(
        () => {},
      );
    } else {
      AsyncStorage.removeItem(IMPERSONATED_ID_KEY).catch(() => {});
    }
  }, []);

  return (
    <UserModeContext.Provider
      value={{
        mode,
        setUserMode,
        isSidebarCollapsed,
        setSidebarCollapsed,
        impersonatedUser,
        setImpersonatedUser,
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
