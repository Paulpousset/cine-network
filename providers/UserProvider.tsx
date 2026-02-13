import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";

interface UserContextType {
  session: Session | null;
  user: User | null;
  profile: any | null;
  isProfileComplete: boolean | null;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isProfileComplete, setIsProfileComplete] = useState<boolean | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const profileRef = useRef<any>(null);
  const isFetchingRef = useRef<boolean>(false);

  const fetchProfile = async (userId: string) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    console.log("UserProvider: Fetching profile for", userId);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("UserProvider: Error fetching profile:", error);
        setProfile(null);
        profileRef.current = null;
        setIsProfileComplete(false);
      } else {
        console.log("UserProvider: Profile fetched successfully");
        setProfile(data);
        profileRef.current = data;
        setIsProfileComplete(!!(data?.username && data?.role));
      }
    } catch (e) {
      console.error("UserProvider: Exception fetching profile:", e);
      setProfile(null);
      profileRef.current = null;
      setIsProfileComplete(false);
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (session?.user?.id) {
      await fetchProfile(session.user.id);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!isMounted) return;
      
      setSession(initialSession);
      if (initialSession) {
        fetchProfile(initialSession.user.id).finally(() => {
          if (isMounted) setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!isMounted) return;

      console.log("UserProvider: Auth event", event, "Session exists:", !!newSession);
      
      // Update session first
      setSession(newSession);
      
      if (newSession) {
        // Use profileRef.current to avoid stale closure
        const shouldFetch = !profileRef.current || 
                           event === "SIGNED_IN" || 
                           event === "INITIAL_SESSION" || 
                           event === "USER_UPDATED";

        if (shouldFetch) {
          // Don't await here to avoid blocking the auth flow
          fetchProfile(newSession.user.id);
        } else {
          setIsLoading(false);
        }
      } else {
        setProfile(null);
        profileRef.current = null;
        setIsProfileComplete(null);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <UserContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        isProfileComplete,
        isLoading,
        refreshProfile,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
