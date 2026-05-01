import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { LogOut, Clock, Zap, Truck, CreditCard, Hash } from 'lucide-react-native';
import { api } from '../_layout';
import { useTheme, useCurrency, statusColors, statusLabels } from '../../src/utils/theme';

export default function DealerDashboard() {
  const c = useTheme();
  const { formatPrice } = useCurrency();
  const [orders, setOrders] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      const [ordersData, userData] = await Promise.all([api('/orders'), AsyncStorage.getItem('user')]);
      setOrders(ordersData);
      if (userData) setUser(JSON.parse(userData));
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, []);

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['token', 'user']);
    router.replace('/');
  };

  if (loading) return <SafeAreaView style={s.c}><ActivityIndicator size="large" color={c.accent} style={{ flex: 1 }} /></SafeAreaView>;

  const pending = orders.filter(o => o.status === 'kutilmoqda').length;
  const preparing = orders.filter(o => ['tayyorlanmoqda','tayyor'].includes(o.status)).length;
  const delivered = orders.filter(o => o.status === 'yetkazildi').length;

  return (
    <SafeAreaView style={s.c}>
      <View style={s.header}>
        <View>
          <Text style={s.hi}>Xush kelibsiz</Text>
          <Text style={s.name}>{user?.name || 'Diler'}</Text>
        </View>
        <TouchableOpacity testID="dealer-logout-btn" onPress={handleLogout} style={s.logoutBtn}>
          <LogOut size={20} color="rgba(255,255,255,0.4)" />
        </TouchableOpacity>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#fff" />} contentContainerStyle={s.scroll}>
        {/* Credit Card */}
        <View style={s.creditWrap}>
          <LinearGradient colors={['#1a1a2e', '#16213e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.credit}>
            <View style={s.creditTop}>
              <CreditCard size={18} color="rgba(255,255,255,0.4)" />
              <Text style={s.creditTopLabel}>Hisobim</Text>
            </View>
            <View style={s.creditRow}>
              <View style={s.creditItem}>
                <Text style={s.creditLabel}>Kredit limit</Text>
                <Text style={s.creditVal}>{formatPrice(user?.credit_limit || 0)}</Text>
              </View>
              <View style={s.creditDiv} />
              <View style={s.creditItem}>
                <Text style={s.creditLabel}>Qarz</Text>
                <Text style={[s.creditVal, (user?.debt || 0) > 0 && { color: '#FF5252' }]}>{formatPrice(user?.debt || 0)}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>
        {/* Status */}
        <View style={s.statusRow}>
          {[
            { icon: Clock, val: pending, label: 'Kutilmoqda', color: '#FFB300' },
            { icon: Zap, val: preparing, label: 'Jarayonda', color: c.blue },
            { icon: Truck, val: delivered, label: 'Yetkazildi', color: '#00E676' },
          ].map((c, i) => (
            <View key={i} style={s.statusCard}>
              <View style={[s.statusIcon, { backgroundColor: c.color + '18' }]}>
                <c.icon size={16} color={c.color} />
              </View>
              <Text style={s.statusVal}>{c.val}</Text>
              <Text style={s.statusLabel}>{c.label}</Text>
            </View>
          ))}
        </View>
        {/* Recent Orders */}
        {orders.length > 0 && (
          <>
            <Text style={s.section}>So'nggi buyurtmalar</Text>
            {orders.slice(0, 5).map(order => (
              <View key={order.id} style={s.orderCard} testID={`dealer-order-${order.id}`}>
                <View style={s.orderHead}>
                  <View style={s.codeBadge}><Hash size={11} color={c.accent} /><Text style={s.codeText}>{order.order_code}</Text></View>
                  <View style={[s.sBadge, { backgroundColor: (statusColors[order.status] || '#fff') + '18' }]}>
                    <View style={[s.sDot, { backgroundColor: statusColors[order.status] }]} />
                    <Text style={[s.sText, { color: statusColors[order.status] }]}>{statusLabels[order.status]}</Text>
                  </View>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.itemsPreview}>
                  {order.items?.map((item: any, i: number) => (
                    <View key={i} style={s.itemThumb}>
                      <Text style={s.itemThumbName} numberOfLines={1}>{item.material_name}</Text>
                      <Text style={s.itemThumbSize}>{item.width}x{item.height}m</Text>
                    </View>
                  ))}
                </ScrollView>
                <View style={s.orderFoot}>
                  <Text style={s.orderSqm}>{order.total_sqm} kv.m</Text>
                  <Text style={s.orderPrice}>{formatPrice(order.total_price)}</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#050508' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16 },
  hi: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  name: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  logoutBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.035)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  scroll: { paddingHorizontal: 24, paddingBottom: 100 },
  creditWrap: { marginBottom: 16, borderRadius: 24, overflow: 'hidden' },
  credit: { padding: 24, borderRadius: 24 },
  creditTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  creditTopLabel: { fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
  creditRow: { flexDirection: 'row', alignItems: 'center' },
  creditItem: { flex: 1, alignItems: 'center' },
  creditDiv: { width: 1, height: 44, backgroundColor: 'rgba(255,255,255,0.08)' },
  creditLabel: { fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, fontWeight: '600' },
  creditVal: { fontSize: 24, fontWeight: '800', color: '#fff' },
  statusRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statusCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.035)', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', gap: 6 },
  statusIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statusVal: { fontSize: 24, fontWeight: '800', color: '#fff' },
  statusLabel: { fontSize: 9, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  section: { fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12, fontWeight: '700' },
  orderCard: { backgroundColor: 'rgba(255,255,255,0.035)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', padding: 16, marginBottom: 10 },
  orderHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  codeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(108,99,255,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  codeText: { fontSize: 12, fontWeight: '800', color: '#6C63FF', letterSpacing: 1, fontVariant: ['tabular-nums'] },
  sBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, gap: 4 },
  sDot: { width: 5, height: 5, borderRadius: 2.5 },
  sText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  itemsPreview: { marginTop: 12 },
  itemThumb: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  itemThumbName: { fontSize: 12, fontWeight: '600', color: '#fff' },
  itemThumbSize: { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 1 },
  orderFoot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
  orderSqm: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  orderPrice: { fontSize: 17, fontWeight: '800', color: '#fff' },
});
