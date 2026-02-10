import { supabase } from "@/lib/supabase";

export const TUTORIAL_PROJECT_VITRINE_TITLE = "🎬 Projet Vitrine - Démo";

export async function seedTutorialData(userId: string) {
  console.log("🌱 Seeding Tutorial Data (Showcase Mode) for user", userId);

  try {
    // 1. Get or Create Showcase Project
    const { data: projects, error: searchError } = await supabase
      .from("tournages")
      .select("id")
      .eq("title", TUTORIAL_PROJECT_VITRINE_TITLE)
      .eq("owner_id", userId)
      .limit(1);

    if (searchError) {
      console.error(
        "Error searching for existing showcase project:",
        searchError,
      );
    }

    let showcaseProject = projects?.[0];

    if (!showcaseProject) {
      console.log("Creating Showcase Project...");
      const { data: newProj, error } = await supabase
        .from("tournages")
        .insert({
          owner_id: userId,
          title: TUTORIAL_PROJECT_VITRINE_TITLE,
          description:
            "Bienvenue dans le projet vitrine ! C'est ici que vous pouvez tester toutes les fonctionnalités sans affecter vos propres projets.",
          type: "long_metrage",
          pays: "France",
          ville: "Paris",
          status: "ongoing",
          address: "Showcase / Vitrine",
          latitude: 48.8566,
          longitude: 2.3522,
          start_date: new Date().toISOString(),
          image_url:
            "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=800",
        })
        .select()
        .single();

      if (error || !newProj) {
        console.error("Error creating showcase project:", error);
        return { adminProjectId: null, participantProjectId: null };
      }
      showcaseProject = newProj;
      console.log("Created project with ID:", newProj.id);
    } else {
      console.log("Found existing project with ID:", showcaseProject.id);
    }

    // Explicit check to satisfy TypeScript narrowing
    if (!showcaseProject) {
      console.error("showcaseProject is still null after creation attempt");
      return { adminProjectId: null, participantProjectId: null };
    }

    // Always ensure roles and events exist even if project was found
    // This handles cases where project shell was created but data failed
    const { data: existingRoles } = await supabase
      .from("project_roles")
      .select("id")
      .eq("tournage_id", showcaseProject.id)
      .limit(1);

    if (!existingRoles || existingRoles.length === 0) {
      console.log("Seeding roles for showcase project...");
      // --- Add specific fake users for the project ---
      const OMAR_SY_ID = "aabf43b5-7da9-42f5-b9d8-1a3d412ebf52";
      const JEAN_DUJARDIN_ID = "201c40c4-2178-4a15-8c4b-fbdd8b3917d5";

      // Ensure they exist
      await supabase.from("profiles").upsert(
        [
          { id: OMAR_SY_ID, full_name: "Omar Sy" },
          { id: JEAN_DUJARDIN_ID, full_name: "Jean Dujardin" },
        ],
        { onConflict: "id" },
      );

      // --- Add default roles and participants to the showcase ---
      const rolesToInsert = [
        {
          tournage_id: showcaseProject.id,
          title: "Réalisateur",
          category: "realisateur",
          status: "assigned",
          assigned_profile_id: OMAR_SY_ID,
        },
        {
          tournage_id: showcaseProject.id,
          title: "Chef Opérateur",
          category: "image",
          status: "published",
        },
        {
          tournage_id: showcaseProject.id,
          title: "Ingénieur du Son",
          category: "son",
          status: "assigned",
          assigned_profile_id: JEAN_DUJARDIN_ID,
        },
        {
          tournage_id: showcaseProject.id,
          title: "Régisseur Général",
          category: "production",
          status: "published",
        },
        {
          tournage_id: showcaseProject.id,
          title: "HMC",
          category: "hmc",
          status: "draft",
        },
      ];

      await supabase.from("project_roles").insert(rolesToInsert).throwOnError();
    }

    const { data: existingEvents } = await supabase
      .from("project_events" as any)
      .select("id")
      .eq("tournage_id", showcaseProject.id)
      .limit(1);

    if (!existingEvents || existingEvents.length === 0) {
      console.log("Seeding events for showcase project...");
      // --- Add some planning events ---
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const dayAfter = new Date(today);
      dayAfter.setDate(today.getDate() + 2);

      await supabase
        .from("project_events" as any)
        .insert([
          {
            tournage_id: showcaseProject.id,
            title: "Repérages techniques",
            description:
              "Vérification des accès et de l'alimentation électrique.",
            start_time: tomorrow.toISOString(),
            event_type: "general",
          },
          {
            tournage_id: showcaseProject.id,
            title: "Tournage Séquence 12",
            description: "Scène du café - Intérieur Jour.",
            start_time: dayAfter.toISOString(),
            event_type: "general",
          },
        ])
        .throwOnError();
    }

    // --- Add some mock posts to the feed ---
    const { data: existingPosts } = await supabase
      .from("posts")
      .select("id")
      .eq("project_id", showcaseProject.id)
      .limit(1);

    if (!existingPosts || existingPosts.length === 0) {
      console.log("Seeding mock posts for showcase project...");
      await supabase
        .from("posts")
        .insert([
          {
            user_id: userId,
            content:
              "Trop hâte de commencer ce nouveau projet ! Le scénario est dingue. ✨🎬",
            project_id: showcaseProject.id,
            visibility: "public",
          },
          {
            user_id: userId,
            content:
              "On cherche encore un ou deux profils pour compléter l'équipe, n'hésitez pas à postuler !",
            project_id: showcaseProject.id,
            visibility: "public",
          },
        ])
        .throwOnError();
    }

    // 2. Assign current user to a role in the showcase project
    // Check if already assigned first
    const { data: myRole } = await supabase
      .from("project_roles")
      .select("id")
      .eq("tournage_id", showcaseProject.id)
      .eq("assigned_profile_id", userId)
      .limit(1);

    if (!myRole || myRole.length === 0) {
      await supabase
        .from("project_roles")
        .insert({
          tournage_id: showcaseProject.id,
          title: "Directeur de Production (Tuto)",
          category: "production",
          assigned_profile_id: userId,
          status: "assigned",
        })
        .throwOnError();
    }

    return {
      adminProjectId: showcaseProject.id,
      participantProjectId: showcaseProject.id,
    };
  } catch (e) {
    console.error("Tutorial Seed Error:", e);
    return { adminProjectId: null, participantProjectId: null };
  }
}

export async function cleanupTutorialData(userId: string) {
  console.log("🧹 Cleaning up tutorial data for user", userId);
  try {
    // Find projects with the vitrine title or owned by user that matches tutorial titles
    const { data: tournageIds } = await supabase
      .from("tournages")
      .select("id")
      .eq("owner_id", userId)
      .or(
        `title.eq."${TUTORIAL_PROJECT_VITRINE_TITLE}",title.eq."🎬 Mon Premier Long-Métrage (Admin)",title.eq."🎬 Mon Premier Long-Métrage (Exemple)",title.eq."🎬 Projet Vitrine - Démo"`,
      );

    if (tournageIds && tournageIds.length > 0) {
      const ids = tournageIds.map((t) => t.id);
      console.log("Found tutorial projects to cleanup:", ids);

      // Delete related data in bulk for better performance
      await Promise.allSettled([
        supabase.from("project_roles").delete().in("tournage_id", ids),
        supabase
          .from("project_events" as any)
          .delete()
          .in("tournage_id", ids),
        supabase.from("posts").delete().in("project_id", ids),
      ]);

      // Finally delete the projects
      const { error: delError } = await supabase
        .from("tournages")
        .delete()
        .in("id", ids);

      if (delError) console.error("Error deleting projects:", delError);
    }

    // Also remove roles where the user is a participant but not owner
    await supabase
      .from("project_roles")
      .delete()
      .eq("assigned_profile_id", userId)
      .eq("status", "assigned")
      .filter("title", "ilike", "%(Tuto)%");
  } catch (e) {
    console.error("Tutorial Cleanup Error", e);
  }
}
