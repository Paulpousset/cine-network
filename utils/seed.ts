import { supabase } from "@/lib/supabase";
import { Alert } from "react-native";

// Helper to generate a random UUID (v4 format)
function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const MOCK_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=2000&auto=format&fit=crop",
];

const MOCK_USERS_DATA = [
  {
    full_name: "Alice Martin",
    role: "acteur",
    city: "Paris",
    bio: "Comédienne passionnée, 5 ans d'expérience théâtre.",
  },
  {
    full_name: "Bob Dupont",
    role: "son",
    city: "Lyon",
    bio: "Ingénieur son freelance, équipé Zoom F8.",
  },
  {
    full_name: "Charlie Vane",
    role: "image",
    city: "Marseille",
    bio: "Chef Opérateur, amoureux du 35mm.",
  },
  {
    full_name: "David Chen",
    role: "realisateur",
    city: "Paris",
    bio: "Réalisateur de clips et courts-métrages.",
  },
  {
    full_name: "Eva Green",
    role: "hmc",
    city: "Bordeaux",
    bio: "Maquilleuse FX pro.",
  },
  {
    full_name: "Frank Castle",
    role: "technicien",
    city: "Lille",
    bio: "Electro / Machino, dispo toute la France.",
  },
];

export async function seedDatabase() {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      Alert.alert("Erreur", "Vous devez être connecté.");
      return;
    }

    const currentUserId = session.user.id;
    console.log("Seeding extended data for user:", currentUserId);

    // ---------------------------------------------------------
    // 1. CREATE FAKE PROFILES
    // ---------------------------------------------------------
    // Note: Inserting into profiles usually requires a matching auth.users entry
    // depending on FK constraints. If this fails, we can't simulate other users easily.

    const createdFakeUserIds: string[] = [];

    for (let i = 0; i < MOCK_USERS_DATA.length; i++) {
      const u = MOCK_USERS_DATA[i];
      const fakeId = uuidv4(); // Generate a random UUID

      const { error } = await supabase.from("profiles").insert({
        id: fakeId,
        full_name: u.full_name,
        username: u.full_name.toLowerCase().replace(" ", "_"),
        avatar_url: MOCK_AVATARS[i % MOCK_AVATARS.length],
        role: u.role,
        ville: u.city,
        bio: u.bio,
        email_public: `${u.full_name.split(" ")[0].toLowerCase()}@test.com`,
        updated_at: new Date().toISOString(),
      } as any);

      if (!error) {
        createdFakeUserIds.push(fakeId);
      } else {
        console.log(
          `Could not create fake profile (likely auth FK constraint): ${error.message}`,
        );
        // If we can't create fake profiles, we can't create applications/connections from them.
        // We will continue but skip parts that require them.
      }
    }

    console.log(`Created ${createdFakeUserIds.length} fake profiles.`);

    // ---------------------------------------------------------
    // 2. CREATE PROJECTS (If not already plenty)
    // ---------------------------------------------------------
    // We reuse the previous logic but ensure we have projects to attach data to

    const { data: existingProjects } = await supabase
      .from("tournages")
      .select("id, title")
      .eq("owner_id", currentUserId);

    let projectIds = existingProjects?.map((p) => p.id) || [];

    if (projectIds.length < 3) {
      // Create a couple more if needed
      const newProject = await supabase
        .from("tournages")
        .insert({
          title: "Projet Seed " + Date.now(),
          type: "court_metrage",
          description: "Projet généré automatiquement pour test.",
          owner_id: currentUserId,
          created_at: new Date().toISOString(),
        } as any)
        .select()
        .single();
      if (newProject.data) projectIds.push(newProject.data.id);
    }

    // ---------------------------------------------------------
    // 2b. CREATE HALL OF FAME PROJECTS (Completed)
    // ---------------------------------------------------------
    console.log("Creating Hall of Fame projects...");
    const hallOfFameProjects = [
      {
        title: "L'Éveil du Printemps",
        description:
          "Un court-métrage poétique sur le renouveau et la découverte de soi dans les Alpes françaises. Un voyage visuel unique.",
        type: "court_metrage",
        status: "completed",
        final_result_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        image_url:
          "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=2000&auto=format&fit=crop",
        ville: "Annecy",
        is_paid: true,
      },
      {
        title: "Neon Shadows",
        description:
          "Clip musical cyberpunk tourné de nuit dans les rues de Paris. Une esthétique néon et une énergie électrique.",
        type: "clip",
        status: "completed",
        final_result_url: "https://vimeo.com/22439234",
        image_url:
          "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=2000&auto=format&fit=crop",
        ville: "Paris",
        is_paid: true,
      },
      {
        title: "Le Dernier Souffle",
        description:
          "Documentaire poignant sur les derniers artisans souffleurs de verre de Biot. Un hommage à un savoir-faire qui s'éteint.",
        type: "documentaire",
        status: "completed",
        final_result_url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
        image_url:
          "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=2000&auto=format&fit=crop",
        ville: "Biot",
        is_paid: false,
      },
    ];

    for (const projectData of hallOfFameProjects) {
      const { data: project } = await supabase
        .from("tournages")
        .insert({
          ...projectData,
          owner_id: currentUserId,
          created_at: new Date().toISOString(),
        } as any)
        .select()
        .single();

      if (project && createdFakeUserIds.length > 0) {
        // Add some likes from fake users to make it look active
        const likesToInsert = createdFakeUserIds.slice(0, 3).map((userId) => ({
          project_id: project.id,
          user_id: userId,
        }));
        await supabase.from("project_likes").insert(likesToInsert);
      }
    }

    // ---------------------------------------------------------
    // 3. CREATE CONNECTIONS
    // ---------------------------------------------------------
    if (createdFakeUserIds.length > 0) {
      // Some pending requests TO me
      await supabase.from("connections").insert({
        requester_id: createdFakeUserIds[0],
        receiver_id: currentUserId,
        status: "pending",
      } as any);

      // Some accepted connections
      await supabase.from("connections").insert({
        requester_id: createdFakeUserIds[1],
        receiver_id: currentUserId,
        status: "accepted",
      } as any);

      // Some pending requests FROM me
      await supabase.from("connections").insert({
        requester_id: currentUserId,
        receiver_id: createdFakeUserIds[2],
        status: "pending",
      } as any);
    }

    // ---------------------------------------------------------
    // 4. CREATE ROLES & APPLICATIONS
    // ---------------------------------------------------------

    for (const pid of projectIds) {
      // Ensure roles exist
      const { data: roles } = await supabase
        .from("project_roles")
        .select("id, category")
        .eq("tournage_id", pid);

      let roleIds = roles?.map((r) => r.id) || [];

      // If no roles, create some
      if (roleIds.length === 0) {
        const r1 = await supabase
          .from("project_roles")
          .insert({
            tournage_id: pid,
            title: "Rôle Acteur Principal",
            category: "acteur",
            status: "open",
            is_paid: true,
            remuneration_amount: "250€/jour",
          } as any)
          .select()
          .single();
        if (r1.data) roleIds.push(r1.data.id);

        const r2 = await supabase
          .from("project_roles")
          .insert({
            tournage_id: pid,
            title: "Rôle Ingénieur Son",
            category: "son",
            status: "open",
            is_paid: false,
          } as any)
          .select()
          .single();
        if (r2.data) roleIds.push(r2.data.id);
      }

      // Create Applications from fake users
      if (createdFakeUserIds.length > 0 && roleIds.length > 0) {
        // User 0 applies to Role 0
        await supabase.from("applications").insert({
          role_id: roleIds[0],
          candidate_id: createdFakeUserIds[0],
          status: "pending",
          message: "Bonjour, je suis très intéressé par ce rôle !",
        } as any);

        // User 1 applies to Role 0 (rejected)
        await supabase.from("applications").insert({
          role_id: roleIds[0],
          candidate_id: createdFakeUserIds[1],
          status: "rejected",
          message: "Dispo !",
        } as any);

        // User 2 applies to Role 1 (accepted -> should assign?)
        // For accepted, usually we update the role to assigned, but let's just leave app as accepted
        await supabase.from("applications").insert({
          role_id: roleIds[1],
          candidate_id: createdFakeUserIds[2],
          status: "accepted",
          message: "J'ai le matos.",
        } as any);
      }

      // ---------------------------------------------------------
      // 5. CALENDAR EVENTS
      // ---------------------------------------------------------
      const now = new Date();
      // Event 1: Tomorrow
      const d1 = new Date(now);
      d1.setDate(d1.getDate() + 1);
      d1.setHours(10, 0, 0);
      // Event 2: In 3 days
      const d2 = new Date(now);
      d2.setDate(d2.getDate() + 3);
      d2.setHours(14, 30, 0);

      await supabase.from("project_events" as any).insert([
        {
          tournage_id: pid,
          title: "Repérages",
          description: "Visite des lieux avec la déco.",
          start_time: d1.toISOString(),
          event_type: "general",
        },
        {
          tournage_id: pid,
          title: "Essayages Costumes",
          description: "Au studio.",
          start_time: d2.toISOString(),
          event_type: "category_specific",
          target_categories: ["acteur", "hmc"],
        },
      ]);

      // ---------------------------------------------------------
      // 6. CHAT MESSAGES
      // ---------------------------------------------------------
      // General chat
      if (createdFakeUserIds.length > 0) {
        await supabase.from("project_messages" as any).insert([
          {
            project_id: pid,
            category: "general",
            sender_id: createdFakeUserIds[0],
            content: "Salut tout le monde ! Dispo pour les dates.",
          },
          {
            project_id: pid,
            category: "general",
            sender_id: createdFakeUserIds[1],
            content: "Hello ! Pareil pour moi.",
          },
          {
            project_id: pid,
            category: "general",
            sender_id: currentUserId,
            content: "Super, on finalise le planning demain.",
          },
        ]);

        // Team chat (e.g. 'acteur' if we have one)
        await supabase.from("project_messages" as any).insert({
          project_id: pid,
          category: "acteur",
          sender_id: createdFakeUserIds[0], // Assuming he is an actor
          content: "On a reçu les textes ?",
        });
      }
    }

    Alert.alert(
      "Succès",
      `Données générées !\n- ${createdFakeUserIds.length} Profils Fake\n- 3 Projets Hall of Fame\n- Connexions & Candidatures\n- Événements & Messages`,
    );
  } catch (e) {
    console.error(e);
    Alert.alert(
      "Erreur",
      "Une erreur est survenue (voir console). Possible contrainte Auth.",
    );
  }
}
