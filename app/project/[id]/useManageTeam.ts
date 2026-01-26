import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { supabase } from "../../../lib/supabase";

export function useManageTeam() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<any[]>([]);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    checkOwnerAndFetch();
  }, [id]);

  async function checkOwnerAndFetch() {
    if (!id || id === "undefined") return;
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const { data: proj } = await supabase
        .from("tournages")
        .select("owner_id")
        .eq("id", id)
        .single();

      if (proj?.owner_id !== session.user.id) {
        Alert.alert(
          "Accès refusé",
          "Seul le propriétaire peut gérer l'équipe.",
        );
        router.back();
        return;
      }
      setIsOwner(true);

      const { data: roles, error } = await supabase
        .from("project_roles")
        .select(
          `
          id,
          title,
          category,
          is_category_admin,
          assigned_profile:profiles!project_roles_assigned_profile_id_fkey (
             id,
             full_name,
             username,
             avatar_url
          )
        `,
        )
        .eq("tournage_id", id)
        .not("assigned_profile_id", "is", null);

      if (error) throw error;

      const grouped = (roles || []).reduce((acc: any, curr: any) => {
        const cat = curr.category || "Autre";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(curr);
        return acc;
      }, {});

      const sectionData = Object.keys(grouped).map((key) => ({
        title: key,
        data: grouped[key],
      }));

      setSections(sectionData);
    } catch (e) {
      Alert.alert("Erreur", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleAdmin(roleId: string, currentValue: boolean) {
    try {
      const { error } = await supabase
        .from("project_roles")
        .update({ is_category_admin: !currentValue })
        .eq("id", roleId);

      if (error) throw error;
      setSections((prev) =>
        prev.map((section) => ({
          ...section,
          data: section.data.map((r: any) =>
            r.id === roleId ? { ...r, is_category_admin: !currentValue } : r,
          ),
        })),
      );
    } catch (e) {
      Alert.alert("Erreur", "Impossible de modifier les droits");
    }
  }

  return {
    id,
    loading,
    sections,
    isOwner,
    toggleAdmin,
    router,
  };
}
