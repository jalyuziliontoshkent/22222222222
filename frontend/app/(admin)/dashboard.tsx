import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Modal, TextInput, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import {
  LogOut, TrendingUp, Clock, CheckCircle, Truck, XCircle, Zap, Users, Boxes, Wrench,
  Settings, X, AlertTriangle, Medal, Calendar, DollarSign, ShoppingCart, ArrowUpRight,
  BarChart3, Package, ChevronRight, Award, Activity, Moon, Sun, RefreshCw,
} from 'lucide-react-native';
import { api } from '../_layout';
import { useTheme, useCurrency } from '../../src/utils/theme';
import { useAppStore } from '../../src/utils/store';

export default function AdminDashboard() {
  const c = useTheme();
  const { formatPrice, currency, toggleCurrency, exchangeRate } = useCurrency();
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const theme = useAppStore((s) => s.theme);

  const [stats, setStats] = useState<any>(null);
  const [reports, setReports] = useState<any>(null);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ email: '', current_password: '', password: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      // Load user name immediately from cache
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) { const u = JSON.parse(userStr); setUserName(u.name || 'Admin'); setUserEmail(u.email || ''); }
      setLoading(false); // Show UI immediately!
      // Fetch data in background
      const [statsData, reportsData, lowStockData] = await Promise.all([
        api('/statistics'), api('/reports'), api('/alerts/low-stock'),
      ]);
      setStats(statsData); setReports(reportsData); setLowStock(lowStockData || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, []);

  const handleLogout = async () => { await AsyncStorage.multiRemove(['token', 'user']); router.replace('/'); };
  const openProfile = () => { setProfileForm({ email: userEmail, current_password: '', password: '' }); setProfileMsg(''); setProfileErr(''); setShowProfile(true); };
  const saveProfile = async () => {
    if (!profileForm.current_password) { setProfileErr('Joriy parolni kiriting'); return; }
    setProfileLoading(true); setProfileErr(''); setProfileMsg('');
    try {
      const res = await api('/auth/profile', { method: 'PUT', body: JSON.stringify(profileForm) });
      await AsyncStorage.setItem('token', res.token); await AsyncStorage.setItem('user', JSON.stringify(res.user));
      setUserName(res.user.name || 'Admin'); setUserEmail(res.user.email || '');
      setProfileMsg('Profil yangilandi!'); setProfileForm({ ...profileForm, current_password: '', password: '' });
    } catch (e: any) { setProfileErr(e.message || 'Xatolik'); }
    finally { setProfileLoading(false); }
  };

  const fmtNum = (n: number) => n.toLocaleString('en-US');
  const fmtMoney = (n: number) => formatPrice(n);

  if (loading) return <SafeAreaView style={[s.c, { backgroundColor: c.bg }]}><ActivityIndicator size="large" color={c.accent} style={{ flex: 1 }} /></SafeAreaView>;

  const maxRevenue = reports?.daily ? Math.max(...reports.daily.map((d: any) => d.revenue), 1) : 1;
  const topMatMax = reports?.top_materials?.[0]?.total_price || 1;

  return (
    <SafeAreaView style={[s.c, { backgroundColor: c.bg }]}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={[s.greeting, { color: c.textTer }]}>Assalomu alaykum</Text>
          <Text style={[s.name, { color: c.text }]}>{userName}</Text>
        </View>
        <View style={s.hBtns}>
          {/* Currency Toggle */}
          <TouchableOpacity onPress={toggleCurrency} style={[s.hBtn, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: currency === 'USD' ? '#FFB300' : c.accent }}>{currency === 'USD' ? '$' : "so'm"}</Text>
          </TouchableOpacity>
          {/* Theme Toggle */}
          <TouchableOpacity onPress={toggleTheme} style={[s.hBtn, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            {theme === 'dark' ? <Sun size={16} color="#FFB300" /> : <Moon size={16} color={c.accent} />}
          </TouchableOpacity>
          <TouchableOpacity onPress={openProfile} style={[s.hBtn, { backgroundColor: c.card, borderColor: c.cardBorder }]}><Settings size={18} color={c.textSec} /></TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={[s.hBtn, { backgroundColor: c.card, borderColor: c.cardBorder }]}><LogOut size={18} color={c.textSec} /></TouchableOpacity>
        </View>
      </View>

      {/* Exchange Rate Info */}
      {currency === 'UZS' && (
        <View style={[s.rateBar, { backgroundColor: c.accentSoft, borderColor: c.cardBorder }]}>
          <RefreshCw size={12} color={c.accent} />
          <Text style={{ fontSize: 11, color: c.textSec, fontWeight: '600' }}>1 USD = {exchangeRate.toLocaleString()} so'm (CBU.uz)</Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={c.text} />} contentContainerStyle={s.scroll}>

        {/* Low Stock Alert */}
        {lowStock.length > 0 && (
          <View style={[s.alert, { backgroundColor: c.dangerSoft, borderColor: c.danger + '20' }]}>
            <View style={s.alertH}><AlertTriangle size={14} color={c.danger} /><Text style={[s.alertTitle, { color: c.danger }]}>Material kam qoldi!</Text></View>
            {lowStock.map((m, i) => (
              <View key={i} style={s.alertRow}>
                <Text style={[s.alertName, { color: c.textSec }]}>{m.name}</Text>
                <Text style={[s.alertQty, { color: c.warning }, m.stock_quantity < 3 && { color: c.danger }]}>{m.stock_quantity} {m.unit}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Hero Revenue Card */}
        <LinearGradient colors={theme === 'dark' ? ['#1a1a2e', '#16213e'] : ['#E8EAF6', '#C5CAE9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
          <View style={s.heroTop}>
            <View style={[s.heroIconWrap, { backgroundColor: c.accentSoft }]}><DollarSign size={18} color={c.accent} /></View>
            <Text style={[s.heroLabel, { color: c.textSec }]}>Umumiy daromad</Text>
          </View>
          <Text style={[s.heroValue, { color: c.text }]}>{fmtMoney(reports?.total_revenue || 0)}</Text>
          <Text style={[s.heroSub, { color: c.textTer }]}>{fmtNum(reports?.total_orders || 0)} ta buyurtma</Text>
          <View style={[s.heroRow, { backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.6)' }]}>
            <View style={s.heroPill}>
              <Calendar size={12} color={c.accent} />
              <Text style={[s.heroPillLabel, { color: c.textTer }]}>Haftalik</Text>
              <Text style={[s.heroPillVal, { color: c.text }]}>{fmtMoney(reports?.weekly_revenue || 0)}</Text>
            </View>
            <View style={[s.heroDivider, { backgroundColor: c.cardBorder }]} />
            <View style={s.heroPill}>
              <TrendingUp size={12} color={c.success} />
              <Text style={[s.heroPillLabel, { color: c.textTer }]}>Oylik</Text>
              <Text style={[s.heroPillVal, { color: c.text }]}>{fmtMoney(reports?.monthly_revenue || 0)}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Order Pipeline */}
        <View style={[s.section, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <View style={s.sH}><Activity size={15} color={c.accent} /><Text style={[s.sTitle, { color: c.textSec }]}>Buyurtma holatlari</Text></View>
          <View style={s.pipeline}>
            {[
              { key: 'pending_orders', label: 'Kutilmoqda', icon: Clock, color: c.warning },
              { key: 'approved_orders', label: 'Tasdiqlangan', icon: CheckCircle, color: c.accent },
              { key: 'preparing_orders', label: 'Tayyorlanmoqda', icon: Zap, color: c.blue },
              { key: 'ready_orders', label: 'Tayyor', icon: Package, color: c.success },
              { key: 'delivering_orders', label: 'Yetkazilmoqda', icon: Truck, color: '#29B6F6' },
              { key: 'delivered_orders', label: 'Yetkazildi', icon: CheckCircle, color: '#00C853' },
            ].map((item, i) => {
              const val = stats?.[item.key] || 0;
              return (
                <View key={i} style={[s.pipeItem, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }]}>
                  <View style={[s.pipeIcon, { backgroundColor: item.color + '15' }]}>
                    <item.icon size={16} color={item.color} />
                  </View>
                  <Text style={[s.pipeVal, { color: c.textTer }, val > 0 && { color: c.text }]}>{val}</Text>
                  <Text style={[s.pipeLabel, { color: c.textTer }]} numberOfLines={1}>{item.label}</Text>
                </View>
              );
            })}
          </View>
          {(stats?.rejected_orders || 0) > 0 && (
            <View style={[s.rejectedRow, { borderTopColor: c.cardBorder }]}>
              <XCircle size={14} color={c.danger} />
              <Text style={{ fontSize: 12, color: c.danger }}>Rad etilgan: <Text style={{ fontWeight: '800' }}>{stats.rejected_orders}</Text></Text>
            </View>
          )}
        </View>

        {/* 7-Day Chart */}
        {reports?.daily && (
          <View style={[s.section, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <View style={s.sH}><BarChart3 size={15} color={c.accent} /><Text style={[s.sTitle, { color: c.textSec }]}>Oxirgi 7 kun</Text></View>
            <View style={s.chart}>
              {reports.daily.map((d: any, i: number) => {
                const barH = Math.max((d.revenue / maxRevenue) * 100, 4);
                const hasData = d.revenue > 0;
                return (
                  <View key={i} style={s.chartCol}>
                    {hasData && <Text style={[s.chartMoney, { color: c.accent + 'CC' }]}>{fmtMoney(d.revenue)}</Text>}
                    <Text style={[s.chartCount, { color: c.textTer }]}>{d.orders}</Text>
                    <View style={[s.chartBarBg, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.04)' }]}>
                      <LinearGradient
                        colors={hasData ? ['#6C63FF', '#4A43CC'] : [theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)']}
                        style={[s.chartBar, { height: barH }]}
                      />
                    </View>
                    <Text style={[s.chartDay, { color: c.textTer }, hasData && { color: c.textSec }]}>{d.day}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Top Materials */}
        {reports?.top_materials?.length > 0 && (
          <View style={[s.section, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <View style={s.sH}><Award size={15} color="#FFB300" /><Text style={[s.sTitle, { color: c.textSec }]}>Eng ko'p sotilgan materiallar</Text></View>
            {reports.top_materials.map((m: any, i: number) => {
              const pct = (m.total_price / topMatMax) * 100;
              const rankColors = ['#FFB300', '#C0C0C0', '#CD7F32', c.textTer, c.textTer];
              return (
                <View key={i} style={[s.topItem, { borderBottomColor: c.cardBorder }]}>
                  <View style={s.topLeft}>
                    <View style={[s.topRank, { backgroundColor: c.card }, i < 3 && { borderColor: rankColors[i], borderWidth: 1.5 }]}>
                      <Text style={[s.topRankNum, { color: c.textTer }, i < 3 && { color: rankColors[i] }]}>{i + 1}</Text>
                    </View>
                    <View style={s.topInfo}>
                      <Text style={[s.topName, { color: c.text }]} numberOfLines={1}>{m.name}</Text>
                      <Text style={[s.topMeta, { color: c.textTer }]}>{m.count} dona · {m.total_sqm.toFixed(1)} kv.m</Text>
                    </View>
                  </View>
                  <View style={s.topRight}>
                    <Text style={[s.topPrice, { color: c.text }]}>{fmtMoney(Math.round(m.total_price * 100) / 100)}</Text>
                    <View style={[s.topBarBg, { backgroundColor: c.cardBorder }]}>
                      <View style={[s.topBar, { width: `${pct}%`, backgroundColor: c.accent }]} />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Top Dealers */}
        {reports?.top_dealers?.length > 0 && (
          <View style={[s.section, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <View style={s.sH}><Users size={15} color={c.accent} /><Text style={[s.sTitle, { color: c.textSec }]}>Top dilerlar</Text></View>
            {reports.top_dealers.map((d: any, i: number) => (
              <View key={i} style={[s.dealerItem, { borderBottomColor: c.cardBorder }]}>
                <View style={[s.dealerAvatar, { backgroundColor: c.accentSoft }]}><Text style={[s.dealerAvatarText, { color: c.accent }]}>{d.name.charAt(0).toUpperCase()}</Text></View>
                <View style={s.dealerInfo}>
                  <Text style={[s.dealerName, { color: c.text }]}>{d.name}</Text>
                  <Text style={[s.dealerOrders, { color: c.textTer }]}>{d.orders} ta buyurtma</Text>
                </View>
                <Text style={[s.dealerRev, { color: c.text }]}>{fmtMoney(d.revenue)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Quick Stats Grid */}
        <View style={s.qGrid}>
          {[
            { icon: ShoppingCart, val: fmtNum(stats?.total_orders || 0), label: 'Jami buyurtma', clr: c.accent },
            { icon: Users, val: fmtNum(stats?.total_dealers || 0), label: 'Dilerlar', clr: '#29B6F6' },
            { icon: Wrench, val: fmtNum(stats?.total_workers || 0), label: 'Ishchilar', clr: '#FFB300' },
            { icon: Boxes, val: fmtNum(stats?.total_materials || 0), label: 'Materiallar', clr: '#00E676' },
          ].map((item, i) => (
            <View key={i} style={[s.qCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
              <View style={[s.qIcon, { backgroundColor: item.clr + '12' }]}><item.icon size={18} color={item.clr} /></View>
              <Text style={[s.qVal, { color: c.text }]}>{item.val}</Text>
              <Text style={[s.qLabel, { color: c.textTer }]}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Profile Modal */}
      <Modal visible={showProfile} transparent animationType="slide">
        <View style={s.modalBg}><View style={[s.modal, { backgroundColor: c.modalBg, borderColor: c.cardBorder }]}>
          <View style={[s.modalH, { borderBottomColor: c.cardBorder }]}><Text style={[s.modalTitle, { color: c.text }]}>Profil sozlamalari</Text><TouchableOpacity onPress={() => setShowProfile(false)}><X size={22} color={c.textSec} /></TouchableOpacity></View>
          <ScrollView style={s.modalBody}>
            {profileMsg ? <View style={[s.okBox, { backgroundColor: c.successSoft, borderColor: c.success + '25' }]}><Text style={[s.okText, { color: c.success }]}>{profileMsg}</Text></View> : null}
            {profileErr ? <View style={[s.errBox, { backgroundColor: c.dangerSoft, borderColor: c.danger + '25' }]}><Text style={[s.errText, { color: c.danger }]}>{profileErr}</Text></View> : null}
            <Text style={[s.label, { color: c.textSec }]}>Yangi Email</Text>
            <TextInput style={[s.input, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]} value={profileForm.email} onChangeText={v => setProfileForm({...profileForm, email: v})} placeholder="email@..." placeholderTextColor={c.placeholder} autoCapitalize="none" keyboardType="email-address" />
            <Text style={[s.label, { color: c.textSec }]}>Yangi Parol</Text>
            <TextInput style={[s.input, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]} value={profileForm.password} onChangeText={v => setProfileForm({...profileForm, password: v})} placeholder="Yangi parol" placeholderTextColor={c.placeholder} secureTextEntry />
            <Text style={[s.label, { marginTop: 24, color: c.warning }]}>Joriy Parol (majburiy)</Text>
            <TextInput style={[s.input, { backgroundColor: c.inputBg, borderColor: c.warning + '30', color: c.text }]} value={profileForm.current_password} onChangeText={v => setProfileForm({...profileForm, current_password: v})} placeholder="Joriy parol" placeholderTextColor={c.placeholder} secureTextEntry />
            <TouchableOpacity style={[s.saveBtn, { backgroundColor: c.accent }]} onPress={saveProfile} disabled={profileLoading}>
              {profileLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Saqlash</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 },
  greeting: { fontSize: 12, fontWeight: '500', letterSpacing: 0.5 },
  name: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, marginTop: 1 },
  hBtns: { flexDirection: 'row', gap: 6 },
  hBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  rateBar: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 16, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, marginBottom: 4 },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },
  alert: { borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 1 },
  alertH: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  alertTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  alertRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  alertName: { fontSize: 13 },
  alertQty: { fontSize: 13, fontWeight: '700' },
  hero: { borderRadius: 24, padding: 22, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(108,99,255,0.1)' },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  heroIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  heroLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  heroValue: { fontSize: 34, fontWeight: '800', letterSpacing: -1, marginBottom: 2 },
  heroSub: { fontSize: 13, marginBottom: 16 },
  heroRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14 },
  heroPill: { flex: 1, flexDirection: 'column', alignItems: 'center', gap: 4 },
  heroPillLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  heroPillVal: { fontSize: 15, fontWeight: '800' },
  heroDivider: { width: 1, height: 30 },
  section: { borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 1 },
  sH: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  pipeline: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pipeItem: { width: '31%', flexGrow: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14, gap: 6 },
  pipeIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  pipeVal: { fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  pipeLabel: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  rejectedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  chart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 160, gap: 4 },
  chartCol: { flex: 1, alignItems: 'center', gap: 3 },
  chartMoney: { fontSize: 8, fontWeight: '700', fontVariant: ['tabular-nums'] },
  chartCount: { fontSize: 10, fontWeight: '700', fontVariant: ['tabular-nums'] },
  chartBarBg: { width: '100%', maxWidth: 28, height: 100, justifyContent: 'flex-end', borderRadius: 14, overflow: 'hidden' },
  chartBar: { width: '100%', borderRadius: 14, minHeight: 4 },
  chartDay: { fontSize: 9, fontWeight: '600', fontVariant: ['tabular-nums'], marginTop: 2 },
  topItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  topRank: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  topRankNum: { fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] },
  topInfo: { flex: 1 },
  topName: { fontSize: 14, fontWeight: '600' },
  topMeta: { fontSize: 11, marginTop: 2, fontVariant: ['tabular-nums'] },
  topRight: { alignItems: 'flex-end', minWidth: 90 },
  topPrice: { fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  topBarBg: { width: 80, height: 3, borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  topBar: { height: '100%', borderRadius: 2 },
  dealerItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
  dealerAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  dealerAvatarText: { fontSize: 16, fontWeight: '800' },
  dealerInfo: { flex: 1 },
  dealerName: { fontSize: 14, fontWeight: '600' },
  dealerOrders: { fontSize: 11, marginTop: 2, fontVariant: ['tabular-nums'] },
  dealerRev: { fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  qGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  qCard: { width: '48%', flexGrow: 1, borderRadius: 18, padding: 16, gap: 8, borderWidth: 1 },
  qIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  qVal: { fontSize: 28, fontWeight: '800', fontVariant: ['tabular-nums'] },
  qLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, maxHeight: '80%' },
  modalH: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 22, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalBody: { padding: 22, paddingBottom: 40 },
  label: { fontSize: 10, marginBottom: 6, marginTop: 14, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
  input: { height: 50, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, fontSize: 15 },
  saveBtn: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  okBox: { borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1 },
  okText: { fontSize: 13, textAlign: 'center', fontWeight: '600' },
  errBox: { borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1 },
  errText: { fontSize: 13, textAlign: 'center' },
});
