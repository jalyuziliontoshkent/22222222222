import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Package, Truck, Phone, Hash } from 'lucide-react-native';
import { api } from '../_layout';
import { useTheme, useCurrency, statusLabels, statusColors } from '../../src/utils/theme';

export default function DealerOrders() {
  const c = useTheme();
  const { formatPrice } = useCurrency();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    try { setOrders(await api('/orders')); }
    catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchOrders(); }, []);

  const allStatuses = ['kutilmoqda','tasdiqlangan','tayyorlanmoqda','tayyor','yetkazilmoqda','yetkazildi'];

  return (
    <SafeAreaView style={s.container}>
      <Text style={s.title}>Buyurtmalarim</Text>
      {loading ? (
        <ActivityIndicator size="large" color={c.accent} style={{ flex: 1 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} tintColor="#fff" />}
          contentContainerStyle={s.scrollContent}
        >
          {orders.length === 0 ? (
            <View style={s.emptyState}>
              <Package size={48} color="rgba(255,255,255,0.08)" />
              <Text style={s.emptyText}>Buyurtmalar yo'q</Text>
            </View>
          ) : orders.map(order => (
            <View key={order.id} style={s.orderCard} testID={`my-order-${order.id}`}>
              <View style={s.orderHeader}>
                <View style={s.codeSection}>
                  <Hash size={13} color={c.accent} />
                  <Text style={s.codeText}>{order.order_code}</Text>
                </View>
                <View style={[s.statusBadge, { backgroundColor: (statusColors[order.status] || '#fff') + '18' }]}>
                  <View style={[s.statusDot, { backgroundColor: statusColors[order.status] }]} />
                  <Text style={[s.statusText, { color: statusColors[order.status] }]}>{statusLabels[order.status] || order.status}</Text>
                </View>
              </View>
              <Text style={s.orderDate}>{new Date(order.created_at).toLocaleString('uz-UZ')}</Text>
              {/* Status tracker */}
              <View style={s.tracker}>
                {allStatuses.map((st, i) => {
                  const idx = allStatuses.indexOf(order.status);
                  const active = i <= idx && order.status !== 'rad_etilgan';
                  return (
                    <View key={st} style={s.trackerStep}>
                      <View style={[s.trackerDot, active && { backgroundColor: '#6C63FF' }]} />
                      {i < allStatuses.length - 1 && <View style={[s.trackerLine, active && { backgroundColor: '#6C63FF' + '50' }]} />}
                    </View>
                  );
                })}
              </View>
              {order.status === 'rad_etilgan' && order.rejection_reason ? (
                <View style={s.rejectBox}><Text style={s.rejectText}>Sabab: {order.rejection_reason}</Text></View>
              ) : null}
              {order.delivery_info && (
                <View style={s.deliveryCard}>
                  <Truck size={16} color={c.blue} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.deliveryTitle}>Yetkazish</Text>
                    <Text style={s.deliveryDriver}>{order.delivery_info.driver_name}</Text>
                    {order.delivery_info.plate_number ? <Text style={s.deliveryPlate}>{order.delivery_info.plate_number}</Text> : null}
                  </View>
                  <View style={s.callBtn}>
                    <Phone size={13} color="#fff" />
                    <Text style={s.callText}>{order.delivery_info.driver_phone}</Text>
                  </View>
                </View>
              )}
              {order.items?.map((item: any, i: number) => (
                <View key={i} style={s.itemRow}>
                  <Text style={s.itemName}>{item.material_name}</Text>
                  <Text style={s.itemDetail}>{item.width}m x {item.height}m = {item.sqm} kv.m</Text>
                </View>
              ))}
              <View style={s.orderFooter}>
                <Text style={s.orderTotal}>{order.total_sqm} kv.m</Text>
                <Text style={s.orderPrice}>{formatPrice(order.total_price)}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050508' },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', paddingHorizontal: 24, paddingTop: 16, letterSpacing: -0.5 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100 },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, color: 'rgba(255,255,255,0.5)' },
  orderCard: { backgroundColor: 'rgba(255,255,255,0.035)', borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', padding: 18, marginBottom: 14 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  codeSection: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(108,99,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  codeText: { fontSize: 14, fontWeight: '800', color: '#6C63FF', letterSpacing: 1.5, fontVariant: ['tabular-nums'] },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  orderDate: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 8 },
  tracker: { flexDirection: 'row', alignItems: 'center', marginVertical: 14, paddingHorizontal: 4 },
  trackerStep: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  trackerDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.08)' },
  trackerLine: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.04)', marginHorizontal: 2 },
  rejectBox: { backgroundColor: 'rgba(255,82,82,0.1)', borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,82,82,0.2)' },
  rejectText: { fontSize: 12, color: '#FF5252' },
  deliveryCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(68,138,255,0.12)', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(68,138,255,0.15)' },
  deliveryTitle: { fontSize: 10, color: 'rgba(68,138,255,0.7)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  deliveryDriver: { fontSize: 14, fontWeight: '600', color: '#fff' },
  deliveryPlate: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 1 },
  callBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  callText: { fontSize: 11, color: '#fff' },
  itemRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  itemName: { fontSize: 14, fontWeight: '600', color: '#fff' },
  itemDetail: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  orderTotal: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  orderPrice: { fontSize: 18, fontWeight: '800', color: '#fff' },
});
