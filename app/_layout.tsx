import '~/global.css';
import { Theme, ThemeProvider, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { Slot, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { Platform, ScrollView } from 'react-native';
import { NAV_THEME } from '../lib/constants';
import { useColorScheme } from '../lib/useColorScheme';
import LogoNegative from '~/assets/images/postalhubnegativelogo.svg';
import { useWindowDimensions, View, Text } from 'react-native';
import Datetime from './(components)/Datetime';
import Toast from 'react-native-toast-message';
import { SafeAreaProvider, SafeAreaView, Edge } from 'react-native-safe-area-context';

const LIGHT_THEME: Theme = {
  ...DefaultTheme,
  colors: NAV_THEME.light,
};
const DARK_THEME: Theme = {
  ...DarkTheme,
  colors: NAV_THEME.dark,
};

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export default function RootLayout() {
  const hasMounted = React.useRef(false);
  const { colorScheme, isDarkColorScheme } = useColorScheme();
  const [isColorSchemeLoaded, setIsColorSchemeLoaded] = React.useState(false);

  useIsomorphicLayoutEffect(() => {
    if (hasMounted.current) {
      return;
    }

    if (Platform.OS === 'web') {
      // Adds the background color to the html element to prevent white background on overscroll.
      document.documentElement.classList.add('bg-background');
    }
    setIsColorSchemeLoaded(true);
    hasMounted.current = true;
  }, []);

  if (!isColorSchemeLoaded) {
    return null;
  }

  return (
    <ThemeProvider value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}>
      <SafeAreaProvider>
        <SafeAreaView className="flex-1 bg-[#ea092b]">
          <StatusBar style={isDarkColorScheme ? 'light' : 'dark'} />

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled">
            <Datetime />
            <View className="w-full flex-1 px-4">
              <Slot />
            </View>
          </ScrollView>

          <Toast position="top" topOffset={60} />
        </SafeAreaView>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

const useIsomorphicLayoutEffect =
  Platform.OS === 'web' && typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;
