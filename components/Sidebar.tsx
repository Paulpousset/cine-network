import Colors from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { usePathname, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";

const NAVIGATION_ITEMS = [
  { name: "Mes Projets", icon: "film", href: "/my-projects" },
  { name: "Fil d'actu", icon: "newspaper-o", href: "/feed" },
  { name: "Casting & Jobs", icon: "briefcase", href: "/jobs" },

  { name: "Réseau", icon: "user", href: "/talents" },
  { name: "Messages", icon: "comments", href: "/direct-messages" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { width } = useWindowDimensions();

  // N'afficher que sur Web et sur les écrans larges (> 768px par exemple)
  if (Platform.OS !== "web" || width < 768) {
    return null;
  }

  // Détecter si on est dans un projet
  const projectMatch = pathname.match(/^\/project\/([^\/]+)/);
  const isInsideProject = !!projectMatch && !pathname.includes("/new");
  const projectId = projectMatch ? projectMatch[1] : null;

  const [isOwner, setIsOwner] = useState(false);
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    if (isInsideProject && projectId) {
      checkAccess();
    } else {
      setIsOwner(false);
      setIsMember(false);
    }
  }, [isInsideProject, projectId]);

  async function checkAccess() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;
      const userId = session.user.id;

      const { data: project } = await supabase
        .from("tournages")
        .select("owner_id")
        .eq("id", projectId)
        .maybeSingle();

      if (project && project.owner_id === userId) {
        setIsOwner(true);
        setIsMember(true);
      } else {
        const { data: membership } = await supabase
          .from("project_roles")
          .select("id")
          .eq("tournage_id", projectId)
          .eq("assigned_profile_id", userId)
          .limit(1);

        if (membership && membership.length > 0) {
          setIsMember(true);
        }
      }
    } catch (e) {
      console.log("Error checking sidebar access:", e);
    }
  }

  const PROJECT_ITEMS = [
    {
      name: "Tableau de Bord",
      icon: "dashboard",
      href: `/project/${projectId}`,
    },
    { name: "Espaces", icon: "th-large", href: `/project/${projectId}/spaces` },
    {
      name: "Calendrier",
      icon: "calendar",
      href: `/project/${projectId}/calendar`,
    },
    {
      name: "Logistique",
      icon: "truck",
      href: `/project/${projectId}/logistics`,
    },

    { name: "Équipe", icon: "users", href: `/project/${projectId}/team` },
  ];

  if (isOwner) {
    PROJECT_ITEMS.push({
      name: "Admin",
      icon: "gear",
      href: `/project/${projectId}/admin`,
    });
  }

  const currentItems = isInsideProject ? PROJECT_ITEMS : NAVIGATION_ITEMS;

  const sidebarStyle: any = {
    width: 250,
    backgroundColor: "#fff",
    borderRightWidth: 1,
    borderRightColor: "#eee",
    height: "100%",
    padding: 20,
    zIndex: 100,
    position: "fixed",
    left: 0,
    top: 0,
  };

  return (
    <View style={sidebarStyle}>
      <View style={styles.header}>
        <Text style={styles.logo}>
          {isInsideProject ? "PROJET" : "CINE NETWORK"}
        </Text>
      </View>

      <View style={styles.menu}>
        {isInsideProject && (
          <TouchableOpacity
            onPress={() => router.push("/my-projects")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 12,
              marginBottom: 10,
              gap: 12,
              borderBottomWidth: 1,
              borderBottomColor: "#eee",
            }}
          >
            <FontAwesome name="arrow-left" size={16} color="#666" />
            <Text style={{ color: "#666", fontWeight: "600" }}>
              Tous mes projets
            </Text>
          </TouchableOpacity>
        )}

        {currentItems.map((item) => {
          // Pour les projets, on vérifie l'égalité exacte ou le préfixe
          const isActive = isInsideProject
            ? pathname === item.href
            : pathname.startsWith(item.href);

          const itemStyle: any = {
            flexDirection: "row",
            alignItems: "center",
            padding: 12,
            borderRadius: 8,
            gap: 12,
            backgroundColor: isActive
              ? Colors.light.tint + "10"
              : "transparent",
          };

          const textStyle: any = {
            fontSize: 16,
            fontWeight: isActive ? "600" : "500",
            color: isActive ? Colors.light.tint : "#666",
          };

          return (
            <TouchableOpacity
              key={item.href}
              onPress={() => router.push(item.href as any)}
              style={itemStyle}
            >
              <FontAwesome
                name={item.icon as any}
                size={20}
                color={isActive ? Colors.light.tint : "#666"}
              />
              <Text style={textStyle}>{item.name}</Text>
            </TouchableOpacity>
          );
        })}

        {/* Spacer pour pousser le lien Compte en bas */}
        <View style={{ flex: 1 }} />

        {/* Mon Compte fixé en bas */}
        <TouchableOpacity
          onPress={() => router.push("/account")}
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 12,
            borderRadius: 8,
            gap: 12,
            backgroundColor: pathname.startsWith("/account")
              ? Colors.light.tint + "10"
              : "transparent",
            marginTop: 10,
            borderTopWidth: 1,
            borderTopColor: "#eee",
            paddingTop: 15,
          }}
        >
          <FontAwesome
            name="user-circle"
            size={20}
            color={pathname.startsWith("/account") ? Colors.light.tint : "#666"}
          />
          <Text
            style={{
              fontSize: 16,
              fontWeight: pathname.startsWith("/account") ? "600" : "500",
              color: pathname.startsWith("/account")
                ? Colors.light.tint
                : "#666",
            }}
          >
            Mon Compte
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2026 Cine Network</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 250,
    backgroundColor: "#fff",
    borderRightWidth: 1,
    borderRightColor: "#eee",
    height: "100%",
    padding: 20,
    zIndex: 100,
  },
  header: {
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  logo: {
    fontSize: 20,
    fontWeight: "900",
    color: Colors.light.tint,
    letterSpacing: 1,
  },
  menu: {
    flex: 1,
    gap: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  menuItemActive: {
    backgroundColor: Colors.light.tint + "10",
  },
  menuText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#666",
  },
  menuTextActive: {
    color: Colors.light.tint,
    fontWeight: "600",
  },
  footer: {
    marginTop: "auto",
    padding: 10,
  },
  footerText: {
    fontSize: 12,
    color: "#999",
  },
});
