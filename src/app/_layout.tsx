import { AuthScreen } from "@/components/auth-screen";
import { AuthProvider, useAuth } from "@/context/auth-context";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { ActivityIndicator, Text, View, useColorScheme } from "react-native";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";
import { PlanProvider } from "@/context/plan-context";

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />

      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
    </ThemeProvider>
  );
}

function AuthenticatedApp() {
  const { session, loading, error } = useAuth();
  if (loading)
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator accessibilityLabel="Restoring session" />
      </View>
    );
  if (!session)
    return (
      <>
        <AuthScreen />
        {!!error && <Text>{error}</Text>}
      </>
    );
  return (
    <PlanProvider key={session.user.id}>
      <AppTabs />
    </PlanProvider>
  );
}
