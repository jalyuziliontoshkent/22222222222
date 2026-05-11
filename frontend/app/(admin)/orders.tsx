import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Modal, TextInput, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Package, Check, X, Hash, Clock, User, Layers, Truck, FileSpreadsheet } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { api } from '../_layout';
import { useTheme, useCurrency, statusLabels } from '../../src/utils/theme';

const statusColorKeys: Record<string, string> = {
  kutilmoqda: 'warning', tasdiqlangan: 'accent', tayyorlanmoqda: 'blue',
  tayyor: 'success', yetkazilmoqda: 'blue', yetkazildi: 'success', rad_etilgan: 'danger',
};

export default function AdminOrders() {
  const c = useTheme();
  const { formatPrice } = useCurrency();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [filter, setFilter] = useState('all');
  const [exporting, setExporting] = useState(false);

  const fetchOrders = useCallback(async () => {
    try { setOrders(await api('/orders')); } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { fetchOrders(); }, []);

  const updateStatus = async (orderId: string, status: string, reason?: string) => {
    try { await api(`/orders/${orderId}/status`, { method: 'PUT', body: JSON.stringify({ status, rejection_reason: reason || '' }) }); fetchOrders(); setShowModal(false); setSelectedOrder(null); setRejectionReason(''); } catch (e) { console.error(e); }
  };
  const exportToExcel = async () => {
    setExporting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
      if (Platform.OS === 'web') { const res = await fetch(`${BACKEND_URL}/api/reports/export-orders`, { headers: { 'Authorization': `Bearer ${token}` } }); const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'buyurtmalar.xlsx'; a.click(); URL.revokeObjectURL(url); }
      else { const fileUri = FileSystem.documentDirectory + 'buyurtmalar.xlsx'; const res = await FileSystem.downloadAsync(`${BACKEND_URL}/api/reports/export-orders`, fileUri, { headers: { 'Authorization': `Bearer ${token}` } }); if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(res.uri); else Alert.alert('Tayyor', 'Fayl saqlandi: ' + res.uri); }
    } catch (e: any) { Alert.alert('Xatolik', e.message || 'Export xatosi'); } finally { setExporting(false); }
  };

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);
  const filters = ['all', 'kutilmoqda', 'tasdiqlangan', 'tayyorlanmoqda', 'tayyor', 'yetkazilmoqda', 'yetkazildi', 'rad_etilgan'];
  const filterLabels: Record<string, string> = { all: 'Barchasi', ...statusLabels };
  const filterCounts: Record<string, number> = { all: orders.length };
  filters.forEach(f => { if (f !== 'all') filterCounts[f] = orders.filter(o => o.status === f).length; });
  const formatDate = (d: string) => { const x = new Date(d); return `${x.getDate().toString().padStart(2,'0')}.${(x.getMonth()+1).toString().padStart(2,'0')}.${x.getFullYear()} ${x.getHours().toString().padStart(2,'0')}:${x.getMinutes().toString().padStart(2,'0')}`; };
  const sc = (status: string) => (c as any)[statusColorKeys[status] || 'textSec'];

  return (
    <SafeAreaView style={[s.c, { backgroundColor: c.bg }]}>
      <View style={s.headerRow}>
        <Text style={[s.title, { color: c.text }]}>Buyurtmalar</Text>
        <TouchableOpacity style={[s.exportBtn, { backgroundColor: c.successSoft, borderColor: c.success + '25' }]} onPress={exportToExcel} disabled={exporting}>
          {exporting ? <ActivityIndicator size="small" color={c.success} /> : <FileSpreadsheet size={18} color={c.success} />}
          <Text style={{ fontSize: 13, fontWeight: '700', color: c.success }}>Excel</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={s.filterContent}>
        {filters.map(f => (
          <TouchableOpacity key={f} style={[s.filterBtn, { backgroundColor: c.card, borderColor: c.cardBorder }, filter === f && { backgroundColor: c.accentSoft, borderColor: c.accent + '40' }]} onPress={() => setFilter(f)}>
            <Text style={[{ fontSize: 12, fontWeight: '600', color: c.textSec }, filter === f && { color: c.accent }]}>{filterLabels[f]} {filterCounts[f] > 0 ? `(${filterCounts[f]})` : ''}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? <ActivityIndicator size="large" color={c.accent} style={{ flex: 1 }} /> : (
        <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} tintColor={c.text} />} contentContainerStyle={s.scroll}>
          {filtered.length === 0 ? (
            <View style={s.empty}><Package size={48} color={c.textTer} /><Text style={{ fontSize: 16, color: c.textTer }}>Buyurtmalar topilmadi</Text></View>
          ) : filtered.map(order => (
            <TouchableOpacity key={order.id} style={[s.orderCard, { backgroundColor: c.card, borderColor: c.cardBorder }]} onPress={() => { setSelectedOrder(order); setShowModal(true); }} activeOpacity={0.75}>
              <View style={s.orderHead}>
                <View style={[s.codeBadge, { backgroundColor: c.accentSoft }]}><Hash size={12} color={c.accent} /><Text style={{ fontSize: 13, fontWeight: '800', color: c.accent, letterSpacing: 1.5 }}>{order.order_code}</Text></View>
                <View style={[s.statusBadge, { backgroundColor: sc(order.status) + '18' }]}><View style={[s.statusDot, { backgroundColor: sc(order.status) }]} /><Text style={[s.statusText, { color: sc(order.status) }]}>{statusLabels[order.status]}</Text></View>
              </View>
              <View style={s.itemsPreview}>
                {(order.items || []).slice(0, 3).map((item: any, i: number) => (
                  <View key={i} style={s.itemPreviewRow}><View style={[s.itemDot, { backgroundColor: c.textTer }]} /><Text style={{ flex: 1, fontSize: 13, color: c.textSec, fontWeight: '500' }} numberOfLines={1}>{item.material_name}</Text><Text style={{ fontSize: 12, color: c.textTer }}>{item.width}x{item.height}m</Text><Text style={{ fontSize: 13, color: c.text, fontWeight: '700', minWidth: 60, textAlign: 'right' }}>{formatPrice(item.price || 0)}</Text></View>
                ))}
                {(order.items || []).length > 3 && <Text style={{ fontSize: 11, color: c.accent, fontWeight: '600', marginTop: 2, paddingLeft: 12 }}>+{order.items.length - 3} ta yana...</Text>}
              </View>
              <View style={[s.orderFoot, { borderTopColor: c.cardBorder }]}>
                <View style={s.dealerRow}><User size={12} color={c.textTer} /><Text style={{ fontSize: 13, fontWeight: '600', color: c.textSec }}>{order.dealer_name}</Text><Text style={{ fontSize: 11, color: c.textTer, marginLeft: 4 }}>{formatDate(order.created_at)}</Text></View>
                <View style={{ alignItems: 'flex-end' }}><Text style={{ fontSize: 18, fontWeight: '800', color: c.text }}>{formatPrice(order.total_price)}</Text><Text style={{ fontSize: 11, color: c.textSec, marginTop: 1 }}>{order.total_sqm?.toFixed(1)} kv.m</Text></View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <Modal visible={showModal} transparent animationType="slide">
        <View style={s.modalBg}><View style={[s.modal, { backgroundColor: c.modalBg, borderColor: c.cardBorder }]}>
          <View style={[s.modalH, { borderBottomColor: c.cardBorder }]}><Text style={[s.modalTitle, { color: c.text }]}>Buyurtma tafsiloti</Text><TouchableOpacity onPress={() => { setShowModal(false); setSelectedOrder(null); }}><X size={22} color={c.textSec} /></TouchableOpacity></View>
          {selectedOrder && (
            <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
              <View style={[s.codeBadge, { backgroundColor: c.accentSoft, alignSelf: 'flex-start', paddingVertical: 8, marginBottom: 16 }]}><Hash size={16} color={c.accent} /><Text style={{ fontSize: 18, fontWeight: '800', color: c.accent, letterSpacing: 2 }}>{selectedOrder.order_code}</Text></View>
              <View style={s.infoGrid}>
                {[{ icon: User, label: 'Diler', val: selectedOrder.dealer_name }, { icon: Clock, label: 'Sana', val: formatDate(selectedOrder.created_at) }, { icon: Layers, label: 'Maydon', val: `${selectedOrder.total_sqm?.toFixed(2)} kv.m` }].map((item, i) => (
                  <View key={i} style={[s.infoItem, { backgroundColor: c.card }]}><item.icon size={14} color={c.textTer} /><Text style={{ fontSize: 10, color: c.textTer, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' }}>{item.label}</Text><Text style={{ fontSize: 14, color: c.text, fontWeight: '600' }}>{item.val}</Text></View>
                ))}
                <View style={[s.infoItem, { backgroundColor: c.card }]}><View style={[s.statusDot, { backgroundColor: sc(selectedOrder.status), width: 8, height: 8, borderRadius: 4 }]} /><Text style={{ fontSize: 10, color: c.textTer, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' }}>Status</Text><Text style={{ fontSize: 14, color: sc(selectedOrder.status), fontWeight: '600' }}>{statusLabels[selectedOrder.status]}</Text></View>
              </View>
              <View style={[s.totalBanner, { backgroundColor: c.accentSoft, borderColor: c.accent + '20' }]}><Text style={{ fontSize: 14, color: c.textSec, fontWeight: '600' }}>Jami narx</Text><Text style={{ fontSize: 24, fontWeight: '800', color: c.text }}>{formatPrice(selectedOrder.total_price)}</Text></View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: c.textSec, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Mahsulotlar ({selectedOrder.items?.length || 0})</Text>
              {selectedOrder.items?.map((item: any, i: number) => (
                <View key={i} style={[s.itemCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
                  <View style={s.itemCardHead}><Text style={{ fontSize: 15, fontWeight: '700', color: c.text, flex: 1 }}>{item.material_name}</Text><Text style={{ fontSize: 16, fontWeight: '800', color: c.text }}>{formatPrice(item.price || 0)}</Text></View>
                  <View style={s.itemCardMeta}>
                    {[`${item.width} x ${item.height} m`, `${item.sqm?.toFixed(2)} kv.m`, `${formatPrice(item.price_per_sqm)}/kv.m`].map((t, j) => (
                      <View key={j} style={[s.metaChip, { backgroundColor: c.inputBg }]}><Text style={{ fontSize: 11, color: c.textSec, fontWeight: '600' }}>{t}</Text></View>
                    ))}
                  </View>
                  {item.assigned_worker_name && <View style={[s.workerAssigned, { borderTopColor: c.cardBorder }]}><User size={12} color={c.accent} /><Text style={{ fontSize: 12, color: c.accent, fontWeight: '600' }}>{item.assigned_worker_name}</Text><View style={[s.statusDot, { backgroundColor: item.worker_status === 'completed' ? c.success : c.warning, marginLeft: 4 }]} /><Text style={{ fontSize: 11, fontWeight: '600', color: item.worker_status === 'completed' ? c.success : c.warning }}>{item.worker_status === 'completed' ? 'Tayyor' : 'Tayinlangan'}</Text></View>}
                  {item.notes ? <Text style={{ fontSize: 12, color: c.textTer, marginTop: 6, fontStyle: 'italic' }}>{item.notes}</Text> : null}
                </View>
              ))}
              {selectedOrder.notes ? <View style={[s.notesBox, { backgroundColor: c.warningSoft, borderColor: c.warning + '18' }]}><Text style={{ fontSize: 10, fontWeight: '700', color: c.warning, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Izoh</Text><Text style={{ fontSize: 13, color: c.textSec, lineHeight: 18 }}>{selectedOrder.notes}</Text></View> : null}
              {selectedOrder.delivery_info && <View style={[s.notesBox, { backgroundColor: c.blueSoft, borderColor: c.blue + '18' }]}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}><Truck size={14} color={c.blue} /><Text style={{ fontSize: 12, fontWeight: '700', color: c.blue, textTransform: 'uppercase', letterSpacing: 0.5 }}>Yetkazish</Text></View><Text style={{ fontSize: 13, color: c.textSec, lineHeight: 20 }}>Haydovchi: {selectedOrder.delivery_info.driver_name}{'\n'}Tel: {selectedOrder.delivery_info.driver_phone}{selectedOrder.delivery_info.plate_number ? `\nRaqam: ${selectedOrder.delivery_info.plate_number}` : ''}</Text></View>}
              {selectedOrder.status === 'kutilmoqda' && (
                <View><View style={s.actionRow}>
                  <TouchableOpacity style={[s.approveBtn, { backgroundColor: c.accent }]} onPress={() => updateStatus(selectedOrder.id, 'tasdiqlangan')}><Check size={16} color="#fff" /><Text style={s.btnText}>Tasdiqlash</Text></TouchableOpacity>
                  <TouchableOpacity style={[s.rejectBtn, { backgroundColor: c.dangerSoft, borderColor: c.danger + '30' }]} onPress={() => { if (rejectionReason.trim()) updateStatus(selectedOrder.id, 'rad_etilgan', rejectionReason); }}><X size={16} color={c.danger} /><Text style={{ fontSize: 14, fontWeight: '600', color: c.danger }}>Rad etish</Text></TouchableOpacity>
                </View><TextInput style={[s.reasonInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]} placeholder="Rad etish sababi..." placeholderTextColor={c.placeholder} value={rejectionReason} onChangeText={setRejectionReason} /></View>
              )}
              {selectedOrder.status === 'tasdiqlangan' && <TouchableOpacity style={[s.approveBtn, { backgroundColor: c.accent, marginTop: 12 }]} onPress={() => updateStatus(selectedOrder.id, 'tayyorlanmoqda')}><Text style={s.btnText}>Tayyorlashga o'tkazish</Text></TouchableOpacity>}
              <View style={{ height: 30 }} />
            </ScrollView>
          )}
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1 }, headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderWidth: 1 },
  filterRow: { maxHeight: 48, marginTop: 14 }, filterContent: { paddingHorizontal: 20, gap: 8 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  orderCard: { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 10 },
  orderHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  codeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 }, statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  itemsPreview: { marginBottom: 12 }, itemPreviewRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 8 },
  itemDot: { width: 4, height: 4, borderRadius: 2 },
  orderFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderTopWidth: 1, paddingTop: 12 },
  dealerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, maxHeight: '90%' },
  modalH: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  infoItem: { width: '47%', borderRadius: 14, padding: 12, gap: 4 },
  totalBanner: { borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderWidth: 1 },
  itemCard: { borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1 },
  itemCardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  itemCardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  workerAssigned: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingTop: 8, borderTopWidth: 1 },
  notesBox: { borderRadius: 14, padding: 14, marginTop: 8, borderWidth: 1 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  approveBtn: { flex: 1, height: 50, borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  rejectBtn: { flex: 1, height: 50, borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1 },
  btnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  reasonInput: { height: 48, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, fontSize: 14, marginTop: 12 },
});
