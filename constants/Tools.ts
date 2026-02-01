export const ALL_TOOLS = {
  breakdown: {
    id: "breakdown",
    title: "Dépouillement",
    desc: "Gérez les séquences et le scénario",
    icon: "list-outline" as const,
    color: "#2196F3",
    bg: "#e3f2fd",
    route: "breakdown",
    restricted: true,
  },
  production: {
    id: "production",
    title: "Plan de Travail",
    desc: "Planning et feuilles de service",
    icon: "videocam-outline" as const,
    color: "#4CAF50",
    bg: "#e8f5e9",
    route: "production",
    restricted: true,
  },
  casting: {
    id: "casting",
    title: "Casting & Personnages",
    desc: "Gérer les personnages et l'attribution des rôles",
    icon: "person-add-outline" as const,
    color: "#f08c00",
    bg: "#fff3bf",
    route: "casting",
    restricted: true,
  },
  sets: {
    id: "sets",
    title: "Décors & Lieux",
    desc: "Gérer les lieux, adresses et photos",
    icon: "location-outline" as const,
    color: "#FF9800",
    bg: "#fff5e6",
    route: "sets",
    restricted: true,
  },
  logistics: {
    id: "logistics",
    title: "Logistique",
    desc: "Feuilles de route et organisation",
    icon: "bus-outline" as const,
    color: "#2196F3",
    bg: "#e3f2fd",
    route: "logistics",
  },
};

export type ToolId = keyof typeof ALL_TOOLS;

export function getStudioTools(
  projectId: string,
  isOwner: boolean,
  userRole: string | null,
  userCategory: string | null,
) {
  const hasProAccess =
    isOwner ||
    userCategory === "production" ||
    (userCategory === "realisateur" &&
      ["Réalisateur", "1er Ass. Réal.", "Scripte"].includes(userRole || ""));

  const tools = [
    {
      label: "Général",
      icon: "apps-outline",
      href: `/project/${projectId}`,
      shortcut: "G",
    },
    {
      label: "Planning",
      icon: "calendar-outline",
      href: `/project/${projectId}/calendar`,
      shortcut: "P",
    },
    {
      label: "Espaces",
      icon: "file-tray-full-outline",
      href: `/project/${projectId}/spaces`,
      shortcut: "E",
    },
    {
      label: "Équipe",
      icon: "people-outline",
      href: `/project/${projectId}/team`,
      shortcut: "T",
    },
    {
      label: "Breakdown",
      icon: "list-outline",
      href: `/project/${projectId}/breakdown`,
      restricted: true,
      shortcut: "B",
    },
    {
      label: "Plan de Travail",
      icon: "videocam-outline",
      href: `/project/${projectId}/production`,
      restricted: true,
      shortcut: "W",
    },
    {
      label: "Lieux",
      icon: "location-outline",
      href: `/project/${projectId}/sets`,
      restricted: true,
      shortcut: "L",
    },
    {
      label: "Casting",
      icon: "person-add-outline",
      href: `/project/${projectId}/casting`,
      restricted: true,
      shortcut: "C",
    },
    {
      label: "Logistique",
      icon: "bus-outline",
      href: `/project/${projectId}/logistics`,
      restricted: true,
      shortcut: "O",
    },
    {
      label: "Admin",
      icon: "shield-checkmark-outline",
      href: `/project/${projectId}/admin`,
      ownerOnly: true,
      shortcut: "A",
    },
  ];

  return tools.filter((tool) => {
    if (tool.ownerOnly) return isOwner;
    if (tool.restricted) return hasProAccess;
    return true;
  });
}

// Helper to get defaults if nothing in DB
export function getDefaultTools(category: string) {
  const c = category.toLowerCase();

  // Production / Réalisation / Admin by default have multiple
  if (["production", "realisateur", "admin"].includes(c)) {
    return ["breakdown", "production", "casting", "sets", "logistics"];
  }
  // Déco
  if (["deco"].includes(c)) {
    return ["breakdown", "sets", "logistics"];
  }
  // Technique
  if (["image", "son", "post_prod", "technicien"].includes(c)) {
    return ["production", "sets", "breakdown", "logistics"];
  }
  // HMC
  if (["hmc"].includes(c)) {
    return ["production", "casting", "logistics"];
  }
  return [];
}
