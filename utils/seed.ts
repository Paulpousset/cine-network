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
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop", // Female
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200&auto=format&fit=crop", // Male
  "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=200&auto=format&fit=crop", // Female
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop", // Male
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop", // Female
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop", // Male
  "https://images.unsplash.com/photo-1554151228-14d9def656ec?q=80&w=200&auto=format&fit=crop", // Female
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop", // Female
  "https://images.unsplash.com/photo-1504257432379-500302a4512c?q=80&w=200&auto=format&fit=crop", // Male
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format&fit=crop", // Male
];

const MOCK_USERS_DATA = [
  {
    full_name: "Jean Dujardin",
    role: "acteur",
    city: "Paris",
    bio: "Acteur oscarisé, spécialisé dans les rôles de charme et de comédie.",
  },
  {
    full_name: "Marion Cotillard",
    role: "acteur",
    city: "Los Angeles / Paris",
    bio: "Actrice internationale, passionnée par le cinéma d'auteur et les grands blockbusters.",
  },
  {
    full_name: "Romain Duris",
    role: "acteur",
    city: "Paris",
    bio: "Acteur de théâtre et de cinéma, fidèle colaborateur de Cédric Klapisch.",
  },
  {
    full_name: "Zendaya",
    role: "acteur",
    city: "Oakland",
    bio: "Actrice et icône de mode intergénérationnelle.",
  },
  {
    full_name: "Timothée Chalamet",
    role: "acteur",
    city: "New York",
    bio: "Le nouveau visage du cinéma mondial, de Dune à Wonka.",
  },
  {
    full_name: "Omar Sy",
    role: "acteur",
    city: "Paris / Los Angeles",
    bio: "Lupin, Intouchables... Un sourire communicatif et un talent brut.",
  },
  {
    full_name: "Eva Green",
    role: "acteur",
    city: "Londres",
    bio: "Une prestance mystérieuse, égérie de James Bond et de Tim Burton.",
  },
  {
    full_name: "Vincent Cassel",
    role: "acteur",
    city: "Rio / Paris",
    bio: "L'intensité à l'état pur, de La Haine à Mesrine.",
  },
  {
    full_name: "Léa Seydoux",
    role: "acteur",
    city: "Paris",
    bio: "La James Bond girl à la française, Palme d'Or pour La Vie d'Adèle.",
  },
  {
    full_name: "Adèle Exarchopoulos",
    role: "acteur",
    city: "Paris",
    bio: "Une énergie débordante et une justesse rare à l'écran.",
  },
];

export async function seedDatabase() {
  console.log("--- DÉBUT SEED DATABASE ---");
  Alert.alert("Debug", "Démarrage du script de test...");

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    console.log("Session récupérée :", session ? "Connecté" : "Déconnecté");

    if (!session) {
      console.error("ERREUR : Aucune session utilisateur trouvée.");
      Alert.alert("Erreur", "Vous devez être connecté.");
      return;
    }

    const createdFakeUserIds: string[] = [];
    console.log(
      `Préparation de la création de ${MOCK_USERS_DATA.length} profils...`,
    );

    for (let i = 0; i < MOCK_USERS_DATA.length; i++) {
      const u = MOCK_USERS_DATA[i];
      const fakeId = uuidv4();

      console.log(
        `[${i + 1}/${MOCK_USERS_DATA.length}] Insertion de : ${u.full_name}...`,
      );

      const { data, error } = await supabase
        .from("profiles")
        .insert({
          id: fakeId,
          full_name: u.full_name,
          username:
            u.full_name.toLowerCase().replace(/ /g, "_") +
            "_" +
            Math.floor(Math.random() * 1000),
          avatar_url: MOCK_AVATARS[i % MOCK_AVATARS.length],
          role: u.role,
          ville: u.city,
          bio: u.bio,
          email_public: `${u.full_name.split(" ")[0].toLowerCase()}@test.com`,
          updated_at: new Date().toISOString(),
        })
        .select();

      if (error) {
        console.error(`!!! ERREUR pour ${u.full_name} :`, error.message);
        if (error.code === "42501") {
          console.error(
            "ERREUR DE SÉCURITÉ (RLS) : La table 'profiles' n'autorise pas l'insertion de profils tiers.",
          );
          console.log(
            "Copi-collez ceci dans l'Editeur SQL de Supabase pour débloquer :",
          );
          console.log(
            'CREATE POLICY "Allow dev seeds" ON profiles FOR INSERT WITH CHECK (true);',
          );
        }
      } else {
        console.log(`SUCCÈS : Profil ${u.full_name} créé (ID: ${fakeId})`);
        createdFakeUserIds.push(fakeId);
      }
    }

    console.log("--- FIN SEED DATABASE ---");
    Alert.alert(
      "Succès",
      `Profils générés : ${createdFakeUserIds.length}/${MOCK_USERS_DATA.length} acteurs.`,
    );
  } catch (e) {
    console.error("EXCEPTION FATALE lors du seed :", e);
    Alert.alert("Erreur", "Une exception est survenue. Vérifiez la console.");
  }
}
