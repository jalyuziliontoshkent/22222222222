import { useEffect, useState, useCallback } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from '../src/utils/store';

export type UserType = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'dealer' | 'worker';
  phone?: string;
  address?: string;
  credit_limit?: number;
  debt?: number;
};

export type AuthState = {
  user: UserType | null;
  token: string | null;
  loading: boolean;
};

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export const api = async (path: string, options: any = {}) => {
  const token = await AsyncStorage.getItem('token');
  const headers: any = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BACKEND_URL}/api${path}`, { ...options, headers });
  if (res.status === 401) {
    // Token expired or invalid - auto logout
    await AsyncStorage.multiRemove(['token', 'user']);
    throw new Error('Sessiya tugadi. Qayta kiring.');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Xatolik yuz berdi' }));
    throw new Error(typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail));
  }
  return res.json();
};

export default function RootLayout() {
  const [auth, setAuth] = useState<AuthState>({ user: null, token: null, loading: true });
  const segments = useSegments();
  const router = useRouter();

  const checkAuth = useCallback(async () => {
    try {
      // Load theme & currency settings
      await useAppStore.getState().loadSettings();
      // Fetch exchange rate (no auth needed)
      try {
        const rateData = await fetch(`${BACKEND_URL}/api/exchange-rate`).then(r => r.json());
        if (rateData?.rate) useAppStore.getState().setExchangeRate(rateData.rate);
      } catch {}
      const token = await AsyncStorage.getItem('token');
      const userStr = await AsyncStorage.getItem('user');
      if (token && userStr) {
        // Verify token is still valid
        try {
          const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setAuth({ user: data.user, token, loading: false });
            await AsyncStorage.setItem('user', JSON.stringify(data.user));
          } else {
            // Token invalid - clear and go to login
            await AsyncStorage.multiRemove(['token', 'user']);
            setAuth({ user: null, token: null, loading: false });
          }
        } catch {
          // Network error - use cached user
          const user = JSON.parse(userStr);
          setAuth({ user, token, loading: false });
        }
      } else {
        setAuth({ user: null, token: null, loading: false });
      }
    } catch {
      setAuth({ user: null, token: null, loading: false });
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (auth.loading) return;
    const inAuthGroup = segments[0] === '(admin)' || segments[0] === '(dealer)' || segments[0] === '(worker)';
    if (!auth.user && inAuthGroup) {
      router.replace('/');
    } else if (auth.user) {
      if (auth.user.role === 'admin' && segments[0] !== '(admin)') {
        router.replace('/(admin)/dashboard');
      } else if (auth.user.role === 'dealer' && segments[0] !== '(dealer)') {
        router.replace('/(dealer)/dashboard');
      } else if (auth.user.role === 'worker' && segments[0] !== '(worker)') {
        router.replace('/(worker)/tasks');
      }
    }
  }, [auth.user, auth.loading]);

  if (auth.loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#fff" />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#050505' }, animation: 'fade' }} />
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#050505',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
