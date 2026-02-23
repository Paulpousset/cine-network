import ErrorBoundary from "@/app/components/ErrorBoundary";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { TutorialProvider } from "@/providers/TutorialProvider";
import { UserModeProvider } from "@/providers/UserModeProvider";
import { UserProvider } from "@/providers/UserProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
    },
  },
});

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <ThemeProvider>
            <UserProvider>
              <UserModeProvider>
                <TutorialProvider>
                  {children}
                </TutorialProvider>
              </UserModeProvider>
            </UserProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
