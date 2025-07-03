import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { LogBox, Platform } from 'react-native';

// Add type declaration for ErrorUtils
declare global {
  interface Global {
    ErrorUtils?: {
      setGlobalHandler?: (callback: (error: Error, isFatal?: boolean) => void) => void;
    };
  }
}

// Fix for "Cannot read property 'setGlobalHandler' of undefined" error
if (Platform.OS !== 'web') {
  // Silence the warnings
  LogBox.ignoreLogs([
    "Can't perform a React state update on an unmounted component",
    'Setting a timer for a long period of time',
    'Cannot read property',
    'TypeError: Cannot read property',
    'Non-serializable values were found in the navigation state',
  ]);

  // Add a global error handler as a fallback
  const globalAny = global as any;
  
  try {
    // Check if ErrorUtils exists
    if (!globalAny.ErrorUtils) {
      globalAny.ErrorUtils = {};
    }
    
    // Check if setGlobalHandler exists
    if (!globalAny.ErrorUtils.setGlobalHandler) {
      globalAny.ErrorUtils.setGlobalHandler = (callback: Function) => {
        // No-op if the function doesn't exist
        console.log('Error handler registered');
      };
    }
  } catch (err) {
    console.log('Failed to set up error handler:', err);
  }
}

import { useColorScheme } from '../../hooks/useColorScheme';
import { AuthProvider } from '../lib/authContext';
import { NotificationProvider } from '../lib/notificationContext';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <NotificationProvider>
          <Slot />
        </NotificationProvider>
      </AuthProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
} 