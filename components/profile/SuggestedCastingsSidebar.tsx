import { calculateMatchScore } from '@/lib/matching';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export const SuggestedCastingsSidebar = () => {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const { user, profile } = useUser();
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.id && profile) {
            fetchSuggestions();
        }
    }, [user?.id, profile]);

    async function fetchSuggestions() {
        try {
            setLoading(true);
            const uid = user!.id;

            // 1. Fetch published roles with project details
            const { data: roles, error } = await supabase
                .from("project_roles")
                .select(`*, tournages!inner (*)`)
                .eq("status", "published")
                .is("assigned_profile_id", null)
                .neq("tournages.status", "completed")
                .limit(50);

            if (error) throw error;
            if (!roles) return;

            // 2. Fetch my applications to exclude them
            const { data: myApps } = await supabase
                .from("applications" as any)
                .select("role_id")
                .eq("candidate_id", uid);
            
            const appliedRoleIds = new Set(myApps?.map((a: any) => a.role_id) || []);

            // 3. Score them using matching algorithm
            const scored = roles
                .filter(r => !appliedRoleIds.has(r.id))
                .map(r => ({
                    ...r,
                    score: calculateMatchScore(profile, r, r.tournages)
                }))
                .filter(r => r.score > 20) // Only show relevant ones
                .sort((a, b) => b.score - a.score)
                .slice(0, 3);

            setSuggestions(scored);
        } catch (e) {
            console.error("Error fetching casting suggestions:", e);
        } finally {
            setLoading(false);
        }
    }

    if (suggestions.length === 0 && !loading) return null;

    return (
        <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>Castings pour vous</Text>
            <View style={styles.list}>
                {suggestions.map((role, index) => (
                    <View 
                        key={role.id} 
                        style={[
                            styles.item, 
                            index < suggestions.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }
                        ]}
                    >
                        <TouchableOpacity 
                            onPress={() => router.push(`/project/role/${role.id}`)}
                        >
                            {role.tournages?.image_url ? (
                                <Image source={{ uri: role.tournages.image_url }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatar, styles.placeholder, { backgroundColor: colors.secondary }]}>
                                    <Text style={styles.placeholderText}>{(role.tournages?.title || "?").charAt(0)}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        <View style={styles.info}>
                            <TouchableOpacity onPress={() => router.push(`/project/role/${role.id}`)}>
                                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                                    {role.title}
                                </Text>
                            </TouchableOpacity>
                            <Text style={[styles.job, { color: colors.textSecondary }]} numberOfLines={1}>
                                {role.tournages?.title}
                            </Text>
                            <Text style={[styles.common, { color: colors.success }]}>
                                {role.score}% match
                            </Text>
                        </View>
                        <TouchableOpacity 
                            style={[styles.clapBtn, { backgroundColor: colors.primary }]}
                            onPress={() => router.push(`/project/role/${role.id}`)}
                        >
                            <Text style={styles.clapBtnText}>Voir</Text>
                        </TouchableOpacity>
                    </View>
                ))}
            </View>
            <TouchableOpacity 
                style={[styles.moreBtn, { borderTopColor: colors.border }]}
                onPress={() => router.push("/jobs")}
            >
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>Plus d'offres</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 280,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginLeft: 20,
        alignSelf: 'flex-start',
        marginTop: 20,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    list: {
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 10, // Slightly more square for projects
    },
    placeholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 18,
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: 14,
        fontWeight: '600',
    },
    job: {
        fontSize: 12,
        marginTop: 2,
    },
    common: {
        fontSize: 10,
        fontWeight: '700',
        marginTop: 4,
    },
    clapBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    clapBtnText: {
        color: 'white',
        fontSize: 11,
        fontWeight: 'bold',
    },
    moreBtn: {
        marginTop: 20,
        paddingTop: 12,
        borderTopWidth: 1,
        alignItems: 'center',
    }
});
