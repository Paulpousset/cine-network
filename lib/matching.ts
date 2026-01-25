// Matching Algorithm for CineNetwork

/**
 * Calculates a match score between a user profile and a project role.
 * Score is between 0 and 100.
 */
export function calculateMatchScore(user: any, role: any, project: any): number {
  let score = 0;
  let maxScore = 0;

  // 1. Category Match (Crucial)
  // If category doesn't match at all, score is low unless user has versatile skills
  // For now, we assume precise match is required for high score
  if (user.role === role.category) {
    score += 50;
  } else {
    // Partial match if user has role in skills?
    // For now, strict category match or 0
  }
  maxScore += 50;

  // 2. Location Match
  if (user.ville && project.ville) {
    const userCity = user.ville.trim().toLowerCase();
    const projectCity = project.ville.trim().toLowerCase();
    if (userCity === projectCity) {
      score += 20;
    } else {
        // TODO: Distance calculation would go here
    }
  }
  maxScore += 20;

  // 3. Experience Match
  const levels = ["debutant", "intermediaire", "confirme"];
  const userLevel = levels.indexOf(user.experience_level || "debutant"); // Assume profile has experience_level or we infer
  const roleLevel = levels.indexOf(role.experience_level || "debutant");
  
  if (userLevel >= roleLevel) {
    score += 15;
  }
  maxScore += 15;

  // 4. Skills/Tags Match (Bonus)
  // Check intersection of user.skills and role.specialties or description keywords
  if (user.skills && Array.isArray(user.skills) && user.skills.length > 0) {
      // Simplified: if role title is in user skills
      const roleTitle = role.title.toLowerCase();
      const hasSkill = user.skills.some((s: string) => roleTitle.includes(s.toLowerCase()));
      if (hasSkill) score += 15;
  }
  maxScore += 15;

  // Normalize to 100
  return Math.round((score / maxScore) * 100);
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
