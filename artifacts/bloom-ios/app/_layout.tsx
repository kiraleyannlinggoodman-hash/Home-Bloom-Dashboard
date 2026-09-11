import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, useFonts } from '@expo-google-fonts/poppins';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { setBaseUrl } from '@workspace/api-client-react';
import * as Notifications from 'expo-notifications';
import { NotificationPreferencesProvider } from '@/context/NotificationPreferences';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();
setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN ?? ''}`);
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Back' }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

type BloomReminderRoute = '/planner' | '/focus';

function getBloomReminderRoute(response: Notifications.NotificationResponse): BloomReminderRoute | null {
  const route = response.notification.request.content.data?.route;
  return route === '/planner' || route === '/focus' ? route : null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold });
  const router = useRouter();
  const handledResponseId = useRef<string | null>(null);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if ((!fontsLoaded && !fontError) || Platform.OS === 'web') return;

    const openBloomReminder = (response: Notifications.NotificationResponse) => {
      const route = getBloomReminderRoute(response);
      if (!route || handledResponseId.current === response.notification.request.identifier) return;

      handledResponseId.current = response.notification.request.identifier;
      router.navigate(route);
    };

    const response = Notifications.addNotificationResponseReceivedListener(openBloomReminder);
    void Notifications.getLastNotificationResponseAsync().then((lastResponse) => {
      if (lastResponse) openBloomReminder(lastResponse);
    });

    return () => response.remove();
  }, [fontError, fontsLoaded, router]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView>
            <KeyboardProvider>
              <NotificationPreferencesProvider><RootLayoutNav /></NotificationPreferencesProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
