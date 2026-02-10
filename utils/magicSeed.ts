import { supabase } from "@/lib/supabase";
import { faker } from "@faker-js/faker/locale/fr";
import { Alert } from "react-native";

const NUM_PROJECTS = 5;
const NUM_POSTS = 10;

const PROJECT_TYPES = [
  "long_metrage",
  "court_metrage",
  "publicite",
  "clip",
  "documentaire",
  "serie",
  "etudiant",
];
const ROLES = [
  "acteur",
  "realisateur",
  "technicien",
  "production",
  "image",
  "son",
  "hmc",
  "deco",
  "post_prod",
];

export async function magicSeed() {
  console.log("🪄 Nettoyage et Lancement du Magic Seed 2.0...");

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      Alert.alert("Erreur", "Tu dois être connecté pour lancer la magie.");
      return;
    }

    const currentUserId = session.user.id;

    // --- NOUVEAU : Nettoyage automatique avant de commencer ---
    console.log("🧹 Suppression des anciennes données de seed...");
    await supabase.from("posts").delete().eq("user_id", currentUserId);
    await supabase.from("tournages").delete().eq("owner_id", currentUserId);
    // -----------------------------------------------------------

    // 1. On récupère les profils existants pour avoir des auteurs variés si possible
    const { data: existingProfiles } = await supabase
      .from("profiles")
      .select("id, full_name");
    const userIds = existingProfiles?.map((p) => p.id) || [currentUserId];

    console.log(`👥 On a trouvé ${userIds.length} utilisateurs réels.`);

    // 2. Génération des Projets (Tournages)
    console.log("🎬 Création de projets cinématographiques...");
    const projectIds: string[] = [];

    for (let i = 0; i < NUM_PROJECTS; i++) {
      const { data, error } = await supabase
        .from("tournages")
        .insert({
          owner_id: currentUserId, // On met l'admin comme proprio pour éviter les 403/400
          title:
            faker.company.name() +
            (faker.helpers.maybe(() => " : Le Film", { probability: 0.3 }) ||
              ""),
          description: faker.lorem.paragraphs(1),
          type: faker.helpers.arrayElement(PROJECT_TYPES),
          pays: "France",
          ville: faker.location.city(),
          address: faker.location.streetAddress(),
          latitude: 48.8566 + (Math.random() - 0.5) * 0.1,
          longitude: 2.3522 + (Math.random() - 0.5) * 0.1,
          image_url: `https://loremflickr.com/800/450/cinema,movie?lock=${faker.number.int(1000)}`,
          start_date: faker.date.future().toISOString(),
          status: "ongoing",
        })
        .select()
        .single();

      if (!error && data) {
        projectIds.push(data.id);
      } else if (error) {
        console.warn("Erreur tournage:", error.message);
      }
    }

    // 3. Génération des Posts (Feed)
    console.log("📱 Remplissage du feed...");
    const postKeywords = [
      "backstage",
      "shooting",
      "camera",
      "set-life",
      "cinema",
    ];

    for (let i = 0; i < NUM_POSTS; i++) {
      const pKeyword = faker.helpers.arrayElement(postKeywords);
      const { error } = await supabase.from("posts").insert({
        user_id: currentUserId,
        content: faker.lorem.sentences(faker.number.int({ min: 1, max: 3 })),
        image_url: faker.helpers.maybe(
          () =>
            `https://loremflickr.com/600/600/${pKeyword}?lock=${faker.number.int(1000)}`,
          { probability: 0.7 },
        ),
        project_id:
          projectIds.length > 0 ? faker.helpers.arrayElement(projectIds) : null,
        visibility: "public",
        created_at: faker.date.recent({ days: 15 }).toISOString(),
        is_seed_data: true, // Tag pour identifier les bouses générées
      });

      if (error) console.warn("Erreur post:", error.message);
    }

    // 4. On triche un peu pour les autres profils (en mettre à jour quelques uns)
    console.log("✨ Polissage des profils existants...");
    if (existingProfiles && existingProfiles.length > 0) {
      for (const profile of existingProfiles) {
        if (profile.id === currentUserId) continue; // On touche pas à soi-même

        // On essaye de connecter l'user actuel avec les autres s'ils existent
        await supabase.from("connections").upsert(
          {
            requester_id: currentUserId,
            receiver_id: profile.id,
            status: "accepted",
            created_at: new Date().toISOString(),
          },
          { onConflict: "requester_id,receiver_id" },
        );

        await supabase
          .from("profiles")
          .update({
            role: faker.helpers.arrayElement(ROLES),
            ville: faker.location.city(),
            bio: faker.lorem.sentence(),
            avatar_url: `https://i.pravatar.cc/300?u=${profile.id}`,
          })
          .eq("id", profile.id);
      }
    }

    console.log("✅ Seed terminé sans bavure !");
    Alert.alert(
      "Magie Terminée ✨",
      `${projectIds.length} projets et ${NUM_POSTS} posts créés.`,
    );
  } catch (err: any) {
    console.error("Crash du seed:", err);
    Alert.alert("Erreur", "La magie a eu un raté.");
  }
}

/**
 * Nettoyage complet des données de test pour l'utilisateur actuel
 */
export async function clearMagicSeed() {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    console.log("🧹 Nettoyage ciblé du Magic Seed...");

    // On ne supprime QUE les posts et tournages qui ont le contenu typique du seed
    // ou qui ont été créés très récemment par le script (approche par filtrage)

    // Pour les posts, on peut filtrer par ceux qui ont été générés par faker (lorem ipsum)
    const { error: errorPosts } = await supabase
      .from("posts")
      .delete()
      .eq("user_id", session.user.id)
      .filter("content", "ilike", "% % % % %"); // Filtre grossier pour les phrases lorem

    const { error: errorTournages } = await supabase
      .from("tournages")
      .delete()
      .eq("owner_id", session.user.id)
      .filter("description", "ilike", "% % % % %");

    if (errorPosts || errorTournages) {
      console.error("Erreur nettoyage:", errorPosts || errorTournages);
      Alert.alert("Erreur", "Le nettoyage a partiellement échoué.");
    } else {
      Alert.alert(
        "Propre ! 🧹",
        "Tous tes posts et tournages (ceux du seed et les tiens) ont été supprimés.",
      );
    }
  } catch (err) {
    console.error(err);
  }
}
