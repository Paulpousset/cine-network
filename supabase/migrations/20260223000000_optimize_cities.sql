-- Create a function to fetch unique cities efficiently
CREATE OR REPLACE FUNCTION get_unique_cities()
RETURNS TABLE (ville text) AS $$
BEGIN
    RETURN QUERY 
    SELECT DISTINCT profiles.ville 
    FROM profiles 
    WHERE profiles.ville IS NOT NULL 
    AND profiles.ville != ''
    ORDER BY profiles.ville;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_recommended_posts to support pagination
CREATE OR REPLACE FUNCTION get_recommended_posts(
    user_id_param uuid, 
    filter_mode text DEFAULT 'all',
    limit_param int DEFAULT 20,
    offset_param int DEFAULT 0
)
RETURNS TABLE (
    p_id uuid,
    p_content text,
    p_image_url text,
    p_user_id uuid,
    p_created_at timestamptz,
    p_visibility text,
    p_project_id uuid,
    author_full_name text,
    author_avatar_url text,
    likes_total bigint,
    comments_total bigint,
    recommendation_score float,
    score_details text
) AS $$
DECLARE
    u_profile profiles%ROWTYPE;
BEGIN
    SELECT * INTO u_profile FROM profiles WHERE profiles.id = user_id_param;

    RETURN QUERY
    WITH user_connections AS (
        SELECT requester_id AS friend_id FROM connections WHERE receiver_id = user_id_param AND status = 'accepted'
        UNION
        SELECT receiver_id AS friend_id FROM connections WHERE requester_id = user_id_param AND status = 'accepted'
    ),
    post_stats AS (
        SELECT 
            ps_p.id as st_post_id,
            count(DISTINCT pl.user_id) as l_count,
            count(DISTINCT CASE WHEN uc_l.friend_id IS NOT NULL THEN pl.user_id END) as net_l_count,
            count(DISTINCT pc.id) as c_count,
            count(DISTINCT CASE WHEN uc_c.friend_id IS NOT NULL THEN pc.user_id END) as net_c_count
        FROM posts ps_p
        LEFT JOIN post_likes pl ON pl.post_id = ps_p.id
        LEFT JOIN user_connections uc_l ON uc_l.friend_id = pl.user_id
        LEFT JOIN post_comments pc ON pc.post_id = ps_p.id
        LEFT JOIN user_connections uc_c ON uc_c.friend_id = pc.user_id
        GROUP BY ps_p.id
    )
    SELECT 
        p.id,
        p.content,
        p.image_url,
        p.user_id,
        p.created_at,
        p.visibility,
        p.project_id,
        auth_prof.full_name as author_full_name,
        auth_prof.avatar_url as author_avatar_url,
        COALESCE(ps.l_count, 0) as likes_total,
        COALESCE(ps.c_count, 0) as comments_total,
        (
            (
                50 + -- Base Score for visibility
                (COALESCE(ps.l_count, 0) * 10) + 
                (COALESCE(ps.net_l_count, 0) * 15) + -- Friend like bonus (10 + 15 = 25, so 2.5x total)
                (COALESCE(ps.c_count, 0) * 20) +
                (COALESCE(ps.net_c_count, 0) * 30) + -- Friend comment bonus (20 + 30 = 50, so 2.5x total)
                (CASE WHEN auth_prof.job_title = u_profile.job_title THEN 50 ELSE 0 END) +
                (CASE WHEN auth_prof.role = u_profile.role THEN 30 ELSE 0 END) +
                (array_intersect_count(auth_prof.skills, u_profile.skills) * 15)
            ) / POWER(LEAST(720, EXTRACT(EPOCH FROM (now() - p.created_at)) / 3600) + 2, 1.8)
        )::float as rec_score,
        format('Base(50) + Likes(%s)*10 + NetLikes(%s)*15 + Comm(%s)*20 + NetComm(%s)*30 + Job(%s) + Role(%s) + Skills(%s) / AgeDecay(%s)', 
            COALESCE(ps.l_count, 0), 
            COALESCE(ps.net_l_count, 0),
            COALESCE(ps.c_count, 0),
            COALESCE(ps.net_c_count, 0),
            CASE WHEN auth_prof.job_title = u_profile.job_title THEN 50 ELSE 0 END,
            CASE WHEN auth_prof.role = u_profile.role THEN 30 ELSE 0 END,
            (array_intersect_count(auth_prof.skills, u_profile.skills) * 15),
            round(POWER(LEAST(720, EXTRACT(EPOCH FROM (now() - p.created_at)) / 3600) + 2, 1.8)::numeric, 2)
        ) as score_details
    FROM posts p
    JOIN profiles auth_prof ON p.user_id = auth_prof.id
    LEFT JOIN post_stats ps ON ps.st_post_id = p.id
    WHERE 
        -- Exclude own posts
        p.user_id != user_id_param
        AND
        -- Block filter (exclude both directions)
        NOT EXISTS (
            SELECT 1 FROM user_blocks 
            WHERE (blocker_id = user_id_param AND blocked_id = p.user_id)
               OR (blocker_id = p.user_id AND blocked_id = user_id_param)
        )
        AND
        -- Filter by Mode
        (
            (filter_mode = 'network' AND (
                p.user_id = user_id_param OR EXISTS (
                    SELECT 1 FROM connections WHERE 
                        ((requester_id = user_id_param AND receiver_id = p.user_id) OR (requester_id = p.user_id AND receiver_id = user_id_param))
                        AND connections.status = 'accepted'
                )
            ))
            OR
            (filter_mode = 'all' AND p.visibility = 'public')
        )
    ORDER BY rec_score DESC
    LIMIT limit_param OFFSET offset_param;
END;
$$ LANGUAGE plpgsql STABLE;

