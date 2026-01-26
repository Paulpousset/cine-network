// Matching Algorithm for CineNetwork

/**
 * Calculates a match score between a user profile and a project role.
 * Score is between 0 and 100.
 */
export function calculateMatchScore(user: any, role: any, project: any): number {
  let score = 0;
  let maxScore = 120; // Increased max score for new criteria

  // 1. Category Match (Crucial)
  if (user.role && role.category && user.role.toLowerCase() === role.category.toLowerCase()) {
    score += 40;
  } else {
      // Penalty or just 0
  }

  // 2. Location Match
  if (user.ville && project.ville) {
    // Handle "Paris (75)" vs "Paris"
    const userCity = user.ville.split("(")[0].trim().toLowerCase();
    const projectCity = project.ville.split("(")[0].trim().toLowerCase();
    
    if (userCity === projectCity || userCity.includes(projectCity) || projectCity.includes(userCity)) {
      score += 20;
    }
  }

  // 3. Experience Match
  const levels = ["debutant", "intermediaire", "confirme"];
  const userLevel = levels.indexOf(user.experience_level || "debutant");
  const roleLevel = levels.indexOf(role.experience_level || "debutant");
  
  if (userLevel >= roleLevel) {
    score += 10;
  }

  // 4. Skills/Tags Match
  if (user.skills && Array.isArray(user.skills) && user.skills.length > 0) {
      const roleTitle = role.title.toLowerCase();
      const hasSkill = user.skills.some((s: string) => roleTitle.includes(s.toLowerCase()));
      if (hasSkill) score += 10;
  }

  // 5. Gender Match (Critical Filter)
  if (role.gender && role.gender.toLowerCase() !== "indifférent" && role.gender.toLowerCase() !== "indifferent") {
      if (user.gender && user.gender.toLowerCase() !== role.gender.toLowerCase()) {
          return 0; // Hard filter: Wrong gender
      }
      score += 20; // Bonus for matching specific gender requirement
  } else {
      score += 10; // Indifferent gender is good for everyone
  }

  // 6. Age Match (Critical Filter)
  if (user.age && (role.age_min || role.age_max)) {
      const min = role.age_min || 0;
      const max = role.age_max || 100;
      
      if (user.age >= min && user.age <= max) {
          score += 20;
      } else {
          return 0; // Hard filter: Wrong age
      }
  } else {
      score += 10; // No age restriction is safe
  }

  // Normalize to 100
  return Math.min(Math.round((score / maxScore) * 100), 100);
}

/**
 * Sorts roles by match score for a given user.
 */
export function getRecommendedRoles(user: any, rolesWithProjects: any[]) {
  return rolesWithProjects
    .map((item) => {
        // item is { role data ..., tournage: { ... } } or similar structure from join
        // Adjust based on actual data structure passed
        const role = item; 
        const project = item.tournages;
        
        if (!project) return { ...item, matchScore: 0 };

        const score = calculateMatchScore(user, role, project);
        return { ...item, matchScore: score };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}
