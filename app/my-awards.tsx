import HallOfFameScreen from "@/app/hall-of-fame";
import { supabase } from "@/lib/supabase";
import React, { useEffect, useState } from "react";

export default function MyAwardsScreen() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user.id || null);
    });
  }, []);

  return (
    <>
      <HallOfFameScreen forceOnlyMine={true} />
    </>
  );
}
