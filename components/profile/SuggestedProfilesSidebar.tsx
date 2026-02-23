import { supabase } from '@/lib/supabase';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { NotificationService } from '@/services/NotificationService';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export const SuggestedProfilesSidebar = () => {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const { user, profile: currentUserProfile } = useUser();
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.id) {
            fetchSuggestions();
        }
    }, [user?.id]);

    const sendConnectionRequest = async (targetId: string) => {
        try {
            if (!user?.id) return;

            const { error } = await supabase.from("connections").insert({
                requester_id: user.id,
                receiver_id: targetId,
                status: "pending",
            });

            if (error) throw error;

            // Send Push Notification
            NotificationService.sendConnectionRequestNotification({
                receiverId: targetId,
                requesterName:
                    currentUserProfile?.full_name ||
                    currentUserProfile?.username ||
                    "Quelqu'un",
            });

            Alert.alert("Succès", "Demande de connexion envoyée !");
            setSuggestions((prev) => prev.filter((p) => p.id !== targetId));
        } catch (e: any) {
            Alert.alert("Erreur", e.message || "Impossible d’envoyer la demande");
        }
    };

    async function fetchSuggestions() {
        try {
            setLoading(true);
            const uid = user!.id;

            // 1. Get my projects
            const { data: myOwned } = await supabase
                .from("tournages")
                .select("id")
                .eq("owner_id", uid);

            const { data: myParticipations } = await supabase
                .from("project_roles")
                .select("tournage_id")
                .eq("assigned_profile_id", uid);

            const myTournageIds = [
                ...(myOwned?.map((t) => t.id) || []),
                ...(myParticipations?.map((p) => p.tournage_id) || []),
            ].filter((id) => id);

            // 2. Get colleagues not yet connected
            let colleagues: any[] = [];
            const commonProjectsMap = new Map<string, number>();

            if (myTournageIds.length > 0) {
                const { data } = await supabase
                    .from("project_roles")
                    .select(`tournage_id, assigned_profile_id, assigned_profile:profiles (*)`)
                    .in("tournage_id", myTournageIds)
                    .not("assigned_profile_id", "is", null)
                    .neq("assigned_profile_id", uid);
                
                if (data) {
                    const uniqueProjectUser = new Set<string>();
                    data.forEach((row: any) => {
                        const combo = `${row.assigned_profile_id}-${row.tournage_id}`;
                        if (!uniqueProjectUser.has(combo)) {
                            uniqueProjectUser.add(combo);
                            commonProjectsMap.set(row.assigned_profile_id, (commonProjectsMap.get(row.assigned_profile_id) || 0) + 1);
                        }
                    });
                    colleagues = data;
                }
            }

            // 3. Get connections to exclude
            const { data: myConnections } = await supabase
                .from("connections")
                .select("receiver_id, requester_id")
                .or(`receiver_id.eq.${uid},requester_id.eq.${uid}`);

            const connectedIds = new Set(
                myConnections?.flatMap((c) => [c.receiver_id, c.requester_id]) || [],
            );
            connectedIds.add(uid);

            const uniqueSuggestions = new Map();
            
            // Add colleagues first
            colleagues.forEach((c: any) => {
                const profileId = c.assigned_profile_id;
                if (c.assigned_profile && !connectedIds.has(profileId) && !uniqueSuggestions.has(profileId)) {
                    uniqueSuggestions.set(profileId, {
                        ...c.assigned_profile,
                        commonProjects: commonProjectsMap.get(profileId) || 0
                    });
                }
            });

            // If not enough, get some featured/active profiles
            if (uniqueSuggestions.size < 3) {
                const { data: others } = await supabase
                    .from('profiles')
                    .select('*')
                    .neq('id', uid)
                    .limit(10);
                
                others?.forEach(p => {
                    if (uniqueSuggestions.size < 5 && !connectedIds.has(p.id) && !uniqueSuggestions.has(p.id)) {
                        uniqueSuggestions.set(p.id, {
                            ...p,
                            commonProjects: 0
                        });
                    }
                });
            }

            setSuggestions(Array.from(uniqueSuggestions.values()).slice(0, 3));
        } catch (e) {
            console.error("Error fetching suggestions for feed:", e);
        } finally {
            setLoading(false);
        }
    }

    if (suggestions.length === 0 && !loading) return null;

    return (
        <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>Suggestions</Text>
            <View style={styles.list}>
                {suggestions.map((profile, index) => (
                    <View 
                        key={profile.id} 
                        style={[
                            styles.item, 
                            index < suggestions.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }
                        ]}
                    >
                        <TouchableOpacity 
                            onPress={() => router.push({ pathname: "/profile/[id]", params: { id: profile.id } })}
                        >
                            {profile.avatar_url ? (
                                <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatar, styles.placeholder, { backgroundColor: colors.primary }]}>
                                    <Text style={styles.placeholderText}>{(profile.full_name || "?").charAt(0)}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        <View style={styles.info}>
                            <TouchableOpacity onPress={() => router.push({ pathname: "/profile/[id]", params: { id: profile.id } })}>
                                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                                    {profile.full_name}
                                </Text>
                            </TouchableOpacity>
                            <Text style={[styles.job, { color: colors.textSecondary }]} numberOfLines={1}>
                                {profile.job_title 
                                    ? profile.job_title.split(',')[0].trim().replace('_', ' ') 
                                    : (profile.role ? profile.role.trim().replace('_', ' ') : "Découvrir")}
                            </Text>
                            {profile.commonProjects > 0 && (
                                <Text style={[styles.common, { color: colors.primary }]}>
                                    {profile.commonProjects} projet{profile.commonProjects > 1 ? 's' : ''} en commun
                                </Text>
                            )}
                        </View>
                        <TouchableOpacity 
                            style={[styles.clapBtn, { backgroundColor: colors.primary }]}
                            onPress={() => sendConnectionRequest(profile.id)}
                        >
                            <Text style={styles.clapBtnText}>Clap</Text>
                        </TouchableOpacity>
                    </View>
                ))}
            </View>
            <TouchableOpacity 
                style={[styles.moreBtn, { borderTopColor: colors.border }]}
                onPress={() => router.push("/talents")}
            >
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>Voir plus</Text>
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
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    list: {
        // No gap needed with borders
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
        borderRadius: 22,
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
        marginTop: 2,
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
