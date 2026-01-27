import Colors from "@/constants/Colors";
import { appEvents, EVENTS } from "@/lib/events";
import { supabase } from "@/lib/supabase";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Link } from "expo-router";
import React, { useEffect, useState } from "react";
import { useColorScheme, View } from "react-native";
import { Hoverable } from "./Hoverable";

export default function ChatIconWithBadge() {
  const colorScheme = useColorScheme();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnreadCount();

    const unsubscribeNew = appEvents.on(EVENTS.NEW_MESSAGE, () => {
      fetchUnreadCount();
    });

    const unsubscribeRead = appEvents.on(EVENTS.MESSAGES_READ, () => {
      fetchUnreadCount();
    });

    return () => {
      unsubscribeNew();
      unsubscribeRead();
    };
  }, []);

  async function fetchUnreadCount() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const { count, error } = await supabase
      .from("direct_messages")
      .select("*", { count: "exact", head: true })
      .eq("receiver_id", session.user.id)
      .eq("is_read", false);

    if (!error) {
      setUnreadCount(count || 0);
    }
  }

  return (
    <Link href="/direct-messages" asChild>
      <Hoverable>
        {({ pressed, hovered }) => (
          <View
            style={{ marginRight: 15, opacity: pressed || hovered ? 0.6 : 1 }}
          >
            <FontAwesome
              name="comments"
              size={24}
              color={Colors[colorScheme ?? "light"].text}
            />
            {unreadCount > 0 && (
              <View
                style={{
                  position: "absolute",
                  right: -6,
                  top: -4,
                  backgroundColor: "red",
                  borderRadius: 10,
                  minWidth: 16,
                  height: 16,
                  justifyContent: "center",
                  alignItems: "center",
                  paddingHorizontal: 2,
                  borderWidth: 1.5,
                  borderColor: Colors[colorScheme ?? "light"].background,
                }}
              >
                {/* Small dot style if count is high, or just number */}
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: "white",
                  }}
                />
              </View>
            )}
          </View>
        )}
      </Hoverable>
    </Link>
  );
}
