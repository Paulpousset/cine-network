import HallOfFameScreen from "@/app/hall-of-fame";
import { useUser } from "@/providers/UserProvider";
import React from "react";

export default function MyAwardsScreen() {
  const { user } = useUser();

  return (
    <>
      <HallOfFameScreen forceOnlyMine={true} />
    </>
  );
}
