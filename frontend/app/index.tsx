import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight } from 'lucide-react-native';
import { api } from './_layout';
import { useTheme } from '../src/utils/theme';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_dealer-dashboard-21/artifacts/g266jqxu_image.png';

export default function Login() {
  const c = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) { setError('Email va parolni kiriting'); return; }
    setLoading(true); setError('');
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      if (data.user.role === 'admin') router.replace('/(admin)/dashboard');
      else if (data.user.role === 'worker') router.replace('/(worker)/tasks');
      else router.replace('/(dealer)/dashboard');
    } catch (e: any) { setError(e.message || 'Xatolik'); }
    finally { setLoading(false); }
  };

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'center' }}>
          <View style={s.content}>
            <Image source={{ uri: LOGO_URL }} style={s.logo} resizeMode="contain" />
            <View style={s.form}>
              {error ? <Text style={s.error}>{error}</Text> : null}
              <TextInput
                testID="login-email-input"
                style={s.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor="rgba(255,255,255,0.25)"
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TextInput
                testID="login-password-input"
                style={s.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Parol"
                placeholderTextColor="rgba(255,255,255,0.25)"
                secureTextEntry
              />
              <TouchableOpacity testID="login-submit-button" style={s.btn} onPress={handleLogin} disabled={loading} activeOpacity={0.8}>
                <LinearGradient colors={['#6C63FF', '#5A52E0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btnGrad}>
                  {loading ? <ActivityIndicator color="#fff" /> : (
                    <><Text style={s.btnText}>Kirish</Text><ArrowRight size={18} color="#fff" /></>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050508' },
  safe: { flex: 1 },
  content: { alignItems: 'center', paddingHorizontal: 32 },
  logo: { width: 200, height: 100, marginBottom: 48 },
  form: { width: '100%', gap: 12 },
  error: { color: '#FF5252', fontSize: 13, textAlign: 'center', marginBottom: 4 },
  input: { height: 56, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 20, fontSize: 16, color: '#fff' },
  btn: { borderRadius: 18, overflow: 'hidden', marginTop: 8 },
  btnGrad: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
