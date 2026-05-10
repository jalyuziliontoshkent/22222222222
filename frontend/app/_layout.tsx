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
  
  let res: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    res = await fetch(`${BACKEND_URL}/api${path}`, { ...options, headers, signal: controller.signal });
    clearTimeout(timeout);
  } catch (e: any) {
    if (e.name === 'AbortError') {
      throw new Error('Server javob bermayapti. Internetni tekshiring.');
    }
    throw new Error('Internet aloqasi yo\'q. Qayta urinib ko\'ring.');
  }

  if (res.status === 401 && !path.includes('/auth/login')) {
    // Token expired - auto logout (but NOT on login endpoint)
    await AsyncStorage.multiRemove(['token', 'user']);
    throw new Error('Sessiya tugadi. Qayta kiring.');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    if (err?.detail) {
      throw new Error(typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail));
    }
    if (res.status === 401) throw new Error('Email yoki parol noto\'g\'ri');
    throw new Error('Server xatoligi. Qayta urinib ko\'ring.');
  }
  return res.json();
};

export default function RootLayout() {
  const [auth, setAuth] = useState<AuthState>({ user: null, token: null, loading: true });
  const segments = useSegments();
  const router = useRouter();

  const checkAuth = useCallback(async () => {
    try {
      // Load theme & currency settings (fast - from AsyncStorage)
      await useAppStore.getState().loadSettings();
      
      const token = await AsyncStorage.getItem('token');
      const userStr = await AsyncStorage.getItem('user');
      
      if (token && userStr) {
        // INSTANT: Trust cached user data, show app immediately
        const user = JSON.parse(userStr);
        setAuth({ user, token, loading: false });
        
        // BACKGROUND: Verify token + fetch exchange rate (don't block UI)
        setTimeout(async () => {
          try {
            const [meRes, rateRes] = await Promise.all([
              fetch(`${BACKEND_URL}/api/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } }),
              fetch(`${BACKEND_URL}/api/exchange-rate`),
            ]);
            if (meRes.ok) {
              const meData = await meRes.json();
              setAuth(prev => ({ ...prev, user: meData.user }));
              await AsyncStorage.setItem('user', JSON.stringify(meData.user));
            } else {
              // Token invalid - logout
              await AsyncStorage.multiRemove(['token', 'user']);
              setAuth({ user: null, token: null, loading: false });
            }
            if (rateRes.ok) {
              const rateData = await rateRes.json();
              if (rateData?.rate) useAppStore.getState().setExchangeRate(rateData.rate);
            }
          } catch {}
        }, 100);
      } else {
        // No cached user - show login immediately
        setAuth({ user: null, token: null, loading: false });
        // Fetch exchange rate in background
        try {
          const rateData = await fetch(`${BACKEND_URL}/api/exchange-rate`).then(r => r.json());
          if (rateData?.rate) useAppStore.getState().setExchangeRate(rateData.rate);
        } catch {}
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
