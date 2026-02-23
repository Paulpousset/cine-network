
/**
 * Calculates a recommendation score for a post.
 * Score is based on:
 * 1. Recency (Decay over time)
 * 2. Engagement (Likes/Comments)
 * 3. Affinity (User role/skills similarity)
 */
export function calculatePostRecommendationScore(
    post: any, // Using any for now to handle joined data
    userProfile: any | null,
    now: Date = new Date()
): number {
    let score = 0;

    // 1. Engagement (Base points)
    // Assuming post has joined counts or direct fields
    const likes = post.likes_count || 0;
    const comments = post.comments_count || 0;
    
    score += likes * 10;
    score += comments * 20;

    // 2. Affinity (if user profile is provided)
    if (userProfile && post.profiles) {
        const postAuthor = post.profiles;
        
        // Same job title?
        if (userProfile.job_title && postAuthor.job_title === userProfile.job_title) {
            score += 50;
        }

        // Same skills/interests?
        if (userProfile.skills && postAuthor.skills) {
            const commonSkills = (userProfile.skills as string[]).filter(s => 
                (postAuthor.skills as string[]).includes(s)
            );
            score += commonSkills.length * 15;
        }

        // If it's a project post, check project affinity
        if (post.projects) {
            const project = post.projects;
            if (project.type && userProfile.role === project.type) {
                score += 30;
            }
        }
    }

    // 3. Recency Decay
    // Gravity factor (similar to Hacker News)
    const createdAt = new Date(post.created_at);
    const hoursSinceCreation = Math.max(1, (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));
    
    // S = (G * Affinity) / (t + 2)^1.8
    // We'll use a simpler version for start
    const gravity = 1.8;
    const finalScore = score / Math.pow(hoursSinceCreation + 2, gravity);

    return finalScore;
}

/**
 * Calculates a recommendation score for a Hall of Fame entry (completed tournage).
 */
export function calculateTournageRecommendationScore(
    tournage: any,
    userProfile: any | null
): number {
    let score = 0;

    // 1. Popularity
    const likes = tournage.likes_count || 0;
    score += likes * 50;

    // 2. Relevance to user
    if (userProfile) {
        // Boost if project matches user's field
        if (tournage.type && userProfile.role === tournage.type) {
            score += 100;
        }

        // Boost if location is same
        if (tournage.ville && userProfile.ville && tournage.ville === userProfile.ville) {
            score += 50;
        }
    }

    // 3. Freshness (Hall of Fame items are more static, but new ones are still interesting)
    const createdAt = new Date(tournage.created_at);
    const monthsSinceCompletion = (new Date().getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30);
    
    // Slower decay for HoF
    const recencyFactor = Math.max(0.1, 1 - (monthsSinceCompletion / 24)); // Decay over 2 years
    
    return score * recencyFactor;
}
