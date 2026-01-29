export const ALL_TOOLS = {
  breakdown: {
    id: "breakdown",
    title: "Dépouillement",
    desc: "Gérez les séquences et le scénario",
    icon: "list" as const,
    color: "#2196F3",
    bg: "#e3f2fd",
    route: "breakdown",
  },
  production: {
    id: "production",
    title: "Plan de Travail",
    desc: "Planning et feuilles de service",
    icon: "videocam" as const,
    color: "#4CAF50",
    bg: "#e8f5e9",
    route: "production",
  },
  casting: {
    id: "casting",
    title: "Casting & Personnages",
    desc: "Gérer les personnages et l'attribution des rôles",
    icon: "people" as const,
    color: "#f08c00",
    bg: "#fff3bf",
    route: "casting",
  },
  sets: {
    id: "sets",
    title: "Décors & Lieux",
    desc: "Gérer les lieux, adresses et photos",
    icon: "location-outline" as const,
    color: "#FF9800",
    bg: "#fff5e6",
    route: "sets",
  },
};

export type ToolId = keyof typeof ALL_TOOLS;

// Helper to get defaults if nothing in DB
export function getDefaultTools(category: string) {
  const c = category.toLowerCase();

  // Production / Réalisation / Admin by default have multiple
  if (["production", "realisateur", "admin"].includes(c)) {
    return ["breakdown", "production", "casting", "sets"];
  }
  // Déco
  if (["deco"].includes(c)) {
    return ["breakdown", "sets"];
  }
  // Technique
  if (["image", "son", "post_prod", "technicien"].includes(c)) {
    return ["production", "sets", "breakdown"];
  }
  // HMC
  if (["hmc"].includes(c)) {
    return ["production", "casting"];
  }
  return [];
}
