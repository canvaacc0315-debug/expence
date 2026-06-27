import React, { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { View, ActivityIndicator, Platform } from 'react-native';

const InitialLayout = () => {
  const { isActivated, balance, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'web') {
      document.body.style.backgroundColor = '#0a0a0f';
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inSetup = segments[0] === 'setup';
    const inAdmin = segments[0] === 'admin';

    if (!isActivated && !inAdmin) {
      // Not activated -> go to activation screen (unless going to admin)
      router.replace('/(auth)/activation');
    } else if (isActivated && balance === null) {
      // Activated but no balance set -> go to setup
      if (!inSetup) {
        router.replace('/setup');
      }
    } else if (isActivated && balance !== null) {
      // Fully set up but stuck in auth or setup -> go home
      if (inAuthGroup || inSetup) {
        router.replace('/');
      }
    }
  }, [isActivated, balance, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return <Slot />;
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <InitialLayout />
    </AuthProvider>
  );
}
