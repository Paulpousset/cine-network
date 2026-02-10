import { appEvents, EVENTS } from "@/lib/events";
import { supabase } from "@/lib/supabase";
import { cleanupTutorialData, seedTutorialData } from "@/utils/tutorialSeed";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePathname, useRouter } from "expo-router";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";

const TUTORIAL_COMPLETED_KEY = "tutorial_completed_v11"; // Increment version to force reset for users

export interface TutorialStep {
  id: string;
  route: string;
  title: string;
  content: string;
  target?: string;
  action?: () => void;
}

interface TutorialContextType {
  isTutorialActive: boolean;
  currentStepIndex: number;
  currentStep: TutorialStep | null;
  startTutorial: () => void;
  nextStep: () => void;
  skipTutorial: () => void;
  hasCompletedTutorial: boolean;
  isLoading: boolean;
}

const TutorialContext = createContext<TutorialContextType | undefined>(
  undefined,
);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [hasCompletedTutorial, setHasCompletedTutorial] =
    useState<boolean>(false);
  const [isTutorialActive, setIsTutorialActive] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [tutorialData, setTutorialData] = useState<{
    adminProjectId: string | null;
    participantProjectId: string | null;
  }>({ adminProjectId: null, participantProjectId: null });

  const pathname = usePathname();
  const router = useRouter();

  // Define steps dynamically based on available data
  const steps = React.useMemo((): TutorialStep[] => {
    const baseSteps: TutorialStep[] = [
      {
        id: "intro",
        route: "/feed",
        title: "Bienvenue sur Tita !",
        content:
          "Bienvenue sur votre fil d'actualité. C'est ici que vous suivrez l'activité de votre réseau et partagerez vos moments de tournage.",
      },
      {
        id: "talents",
        route: "/talents",
        title: "Le Réseau",
        content:
          "Explorez l'annuaire des talents pour trouver les techniciens et comédiens parfaits pour vos projets.",
      },
      {
        id: "jobs",
        route: "/jobs",
        title: "Annonces",
        content:
          "Postulez à des castings ou des offres techniques, ou publiez vos propres recherches.",
      },
      {
        id: "hall-of-fame",
        route: "/hall-of-fame",
        title: "Hall of Fame",
        content:
          "Découvrez les plus beaux projets de la communauté et inspirez-vous des meilleures productions.",
      },
      {
        id: "notifications",
        route: "/notifications",
        title: "Notifications",
        content:
          "Gardez un œil sur ce qui se passe : candidatures reçues, nouveaux messages, actus de vos projets.",
      },
      {
        id: "direct-messages",
        route: "/direct-messages",
        title: "Messagerie",
        content:
          "Discutez en direct avec vos collaborateurs ou de nouveaux talents pour vos futurs projets.",
      },
      {
        id: "my-profile",
        route: "/account",
        title: "Votre Profil",
        content:
          "C'est votre vitrine ! Complétez votre CV, vos expériences et liez vos réseaux sociaux.",
      },
      {
        id: "projects-list",
        route: "/my-projects",
        title: "Vos Projets",
        content:
          "Retrouvez ici tous les projets auxquels vous participez. Nous en avons créé un spécialement pour cet exemple.",
      },
    ];

    if (tutorialData.adminProjectId) {
      console.log(
        "[Tutorial] Adding project steps for ID:",
        tutorialData.adminProjectId,
      );
      baseSteps.push({
        id: "admin-project-overview",
        route: `/project/${tutorialData.adminProjectId}`,
        title: "Tableau de Bord Admin",
        content:
          "En tant que créateur, vous avez accès à l'onglet Admin pour gérer votre production de A à Z.",
      });
      baseSteps.push({
        id: "admin-project-access",
        route: `/project/${tutorialData.adminProjectId}/manage_team`,
        title: "Droits d'Accès",
        content:
          "C'est ici que vous décidez qui peut gérer quoi. Vous pouvez activer le mode Admin pour certains membres ou choisir précisément quels outils (Dépouillement, Casting, etc.) sont visibles pour chaque catégorie métier.",
      });
      baseSteps.push({
        id: "admin-project-calendar",
        route: `/project/${tutorialData.adminProjectId}/calendar`,
        title: "Le Planning",
        content:
          "Gérez les dates de tournage, les répétitions et les rendez-vous. Tout le monde reçoit des notifications instantanées.",
      });
      baseSteps.push({
        id: "admin-project-spaces",
        route: `/project/${tutorialData.adminProjectId}/spaces`,
        title: "Espaces de Discussion",
        content:
          "Communiquez de manière ciblée : un groupe pour la Régie, un pour l'HMC, un pour la Prod.",
      });
      baseSteps.push({
        id: "admin-project-space-all-tools",
        route: `/project/${tutorialData.adminProjectId}/spaces/production?tab=tools`,
        title: "Outils Collaboratifs",
        content:
          "Dans chaque espace, retrouvez les outils dédiés : Personnages pour le HMC, Décors pour la Régie, ou ici en Production, l'accès complet au Plan de Travail et au Dépouillement.",
      });
    } else {
      console.log("[Tutorial] No adminProjectId, skipping project steps");
    }

    if (tutorialData.participantProjectId) {
      baseSteps.push({
        id: "participant-project",
        route: `/project/${tutorialData.participantProjectId}`,
        title: "En tant que membre",
        content:
          "Sur d'autres projets, vous serez simple membre. Vous aurez accès au planning et aux documents partagés par la production.",
      });
    }

    baseSteps.push({
      id: "finish",
      route: "/feed",
      title: "C'est parti !",
      content:
        "Vous êtes prêt ! N'hésitez pas à modifier le projet test ou à créer le vôtre dès maintenant.",
    });

    return baseSteps;
  }, [tutorialData]);

  const currentStep = isTutorialActive ? steps[currentStepIndex] : null;

  useEffect(() => {
    checkTutorialStatus();
  }, []);

  const checkTutorialStatus = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      // Check DB first for persistence
      const { data: profile } = await supabase
        .from("profiles")
        .select("has_completed_tutorial")
        .eq("id", session.user.id)
        .single();

      const localVal = await AsyncStorage.getItem(TUTORIAL_COMPLETED_KEY);
      const isCompleted =
        profile?.has_completed_tutorial || localVal === "true";

      if (isCompleted) {
        setHasCompletedTutorial(true);
        if (localVal !== "true") {
          await AsyncStorage.setItem(TUTORIAL_COMPLETED_KEY, "true");
        }
        // Safety cleanup on mount if we are done
        cleanupTutorialData(session.user.id).catch(console.warn);
      } else {
        // Only auto-start if we are logged in
        setTimeout(() => {
          if (!isTutorialActive) startTutorial();
        }, 1500);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  // Auto-navigation effect
  useEffect(() => {
    if (isTutorialActive && currentStep) {
      const currentPath = pathname.endsWith("/")
        ? pathname.slice(0, -1)
        : pathname;
      const targetPath = currentStep.route.endsWith("/")
        ? currentStep.route.slice(0, -1)
        : currentStep.route;

      // Special case for project spaces which might redirect to a category
      const isMatching =
        currentPath === targetPath ||
        (targetPath !== "/feed" && currentPath.startsWith(targetPath));

      if (!isMatching) {
        console.log(`[Tutorial] Forced Nav: ${currentPath} -> ${targetPath}`);
        const timer = setTimeout(() => {
          // Use replace to avoid stacking up history during tutorial
          router.replace(targetPath as any);
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [currentStepIndex, isTutorialActive, currentStep, pathname]);

  const startTutorial = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        // Force cleanup of old data to ensure we start fresh with the new showcase
        console.log("[Tutorial] Cleaning up old data...");
        await cleanupTutorialData(session.user.id);

        console.log("[Tutorial] Seeding new data...");
        const data = await seedTutorialData(session.user.id);
        console.log("[Tutorial] Seeded data:", data);

        if (data.adminProjectId) {
          setTutorialData(data);
          setCurrentStepIndex(0);
          setIsTutorialActive(true);
          router.replace("/feed");
        } else {
          console.error(
            "[Tutorial] Seeding partially failed, adminProjectId is null",
          );
          // Fallback: try to find any project to at least show something
          const { data: anyProj } = await supabase
            .from("tournages")
            .select("id")
            .eq("owner_id", session.user.id)
            .limit(1);

          if (anyProj && anyProj.length > 0) {
            console.log(
              "[Tutorial] Fallback: using existing project",
              anyProj[0].id,
            );
            setTutorialData({
              adminProjectId: anyProj[0].id,
              participantProjectId: null,
            });
            setCurrentStepIndex(0); // Reset index for fallback
            setIsTutorialActive(true);
            router.replace("/feed");
          } else {
            console.error(
              "[Tutorial] Fallback failed: no project found for user",
            );
            alert(
              "Désolé, impossible de démarrer le tutoriel sans projet. Veuillez réessayer.",
            );
          }
        }
      }
    } catch (e) {
      console.error("Failed to start tutorial", e);
      alert("Une erreur est survenue lors du démarrage du tutoriel.");
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      const nextS = steps[nextIndex];

      console.log(
        `[Tutorial] Moving to step ${nextIndex}: ${nextS.id} (${nextS.route})`,
      );

      setCurrentStepIndex(nextIndex);

      // Explicit navigation push
      if (nextS && nextS.route) {
        router.push(nextS.route as any);
      }
    } else {
      completeTutorial();
    }
  };

  const skipTutorial = () => {
    completeTutorial();
  };

  const completeTutorial = async () => {
    setIsTutorialActive(false);
    setHasCompletedTutorial(true);
    await AsyncStorage.setItem(TUTORIAL_COMPLETED_KEY, "true");

    // Cleanup data and update DB
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      await supabase
        .from("profiles")
        .update({ has_completed_tutorial: true })
        .eq("id", session.user.id);

      await cleanupTutorialData(session.user.id);
    }

    // Emit event for all hooks to refresh
    appEvents.emit(EVENTS.TUTORIAL_COMPLETED);

    // Hard refresh on web to ensure a totally clean state
    if (Platform.OS === "web") {
      window.location.reload();
    } else {
      // Force navigation to the home/feed which will trigger a re-fetch thanks to useFocusEffect
      router.replace("/feed");
    }
  };

  return (
    <TutorialContext.Provider
      value={{
        isTutorialActive,
        currentStepIndex,
        currentStep,
        startTutorial,
        nextStep,
        skipTutorial,
        hasCompletedTutorial,
        isLoading,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error("useTutorial must be used within a TutorialProvider");
  }
  return context;
}
