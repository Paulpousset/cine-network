-- Optimisation de get_recommended_posts pour supporter la pagination
-- et réduire les ralentissements sur le feed mobile.

CREATE OR REPLACE FUNCTION get_recommended_posts(
    user_id_param UUID,
    filter_mode TEXT DEFAULT 'all',
    limit_param INTEGER DEFAULT 15,
    offset_param INTEGER DEFAULT 0
)
RETURNS TABLE (
    p_id UUID,
    p_content TEXT,
    p_image_url TEXT,
    p_created_at TIMESTAMPTZ,
    p_user_id UUID,
    author_full_name TEXT,
    author_avatar_url TEXT,
    likes_total BIGINT,
    comments_total BIGINT,
    recommendation_score FLOAT,
    score_details JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH post_stats AS (
        -- Regrouper les likes par post
        SELECT 
            post_id, 
            COUNT(*) as likes_count
        FROM post_likes
        GROUP BY post_id
    ),
    comment_stats AS (
        -- Regrouper les commentaires par post
        SELECT 
            post_id, 
            COUNT(*) as comments_count
        FROM post_comments
        GROUP BY post_id
    ),
    user_network AS (
        -- Identifier le réseau de l'utilisateur (optionnel pour filter_mode 'network')
        -- À adapter selon votre logique de "follow" ou "network"
        -- Pour l'instant on garde une structure de base
        SELECT DISTINCT following_id 
        FROM user_follows -- Suppose une table user_follows
        WHERE follower_id = user_id_param
    )
    SELECT 
        p.id as p_id,
        p.content as p_content,
        p.image_url as p_image_url,
        p.created_at as p_created_at,
        p.user_id as p_user_id,
        pr.full_name as author_full_name,
        pr.avatar_url as author_avatar_url,
        COALESCE(ls.likes_count, 0) as likes_total,
        COALESCE(cs.comments_count, 0) as comments_total,
        -- Score de recommandation basique (à affiner)
        (
            (CASE WHEN filter_mode = 'network' AND p.user_id IN (SELECT following_id FROM user_network) THEN 50 ELSE 0 END) +
            (COALESCE(ls.likes_count, 0) * 2) +
            (COALESCE(cs.comments_count, 0) * 5) +
            (CASE WHEN p.created_at > NOW() - INTERVAL '48 hours' THEN 100 ELSE 0 END)
        )::FLOAT as recommendation_score,
        jsonb_build_object(
            'age', (p.created_at > NOW() - INTERVAL '48 hours'),
            'likes', COALESCE(ls.likes_count, 0),
            'comments', COALESCE(cs.comments_count, 0)
        ) as score_details
    FROM 
        posts p
    JOIN 
        profiles pr ON p.user_id = pr.id
    LEFT JOIN 
        post_stats ls ON p.id = ls.post_id
    LEFT JOIN 
        comment_stats cs ON p.id = cs.post_id
    WHERE 
        -- Filtres (par ex: exclure les posts d'utilisateurs bloqués)
        p.user_id NOT IN (SELECT blocked_user_id FROM user_blocks WHERE blocker_id = user_id_param)
        -- Si mode network, restreindre
        AND (filter_mode = 'all' OR p.user_id IN (SELECT following_id FROM user_network))
    ORDER BY 
        recommendation_score DESC, p.created_at DESC
    LIMIT limit_param
    OFFSET offset_param;
END;
$$;
