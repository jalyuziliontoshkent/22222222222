import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, X, UserCheck, CheckCircle, Hash, Truck, Clock } from 'lucide-react-native';
import { api } from '../_layout';
import { useTheme, useCurrency, statusLabels } from '../../src/utils/theme';

const statusColorKeys: Record<string, string> = { kutilmoqda: 'warning', tasdiqlangan: 'accent', tayyorlanmoqda: 'blue', tayyor: 'success', yetkazilmoqda: 'blue', yetkazildi: 'success', rad_etilgan: 'danger' };
const formatTime = (iso: string) => { if (!iso) return ''; const d = new Date(iso); return `${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')}.${d.getFullYear()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`; };

export default function AdminWorkers() {
  const c = useTheme();
  const { formatPrice } = useCurrency();
  const [tab, setTab] = useState<'workers'|'orders'>('workers');
  const [workers, setWorkers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddWorker, setShowAddWorker] = useState(false);
  const [showDelivery, setShowDelivery] = useState(false);
  const [wForm, setWForm] = useState({ name: '', email: '', password: '', phone: '', specialty: '' });
  const [dForm, setDForm] = useState({ driver_name: '', driver_phone: '', plate_number: '' });
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const fetchAll = useCallback(async () => { try { const [w, o] = await Promise.all([api('/workers'), api('/orders')]); setWorkers(w); setOrders(o.filter((x: any) => ['tasdiqlangan','tayyorlanmoqda','tayyor','yetkazilmoqda'].includes(x.status))); } catch (e) { console.error(e); } finally { setLoading(false); setRefreshing(false); } }, []);
  useEffect(() => { fetchAll(); }, []);
  const addWorker = async () => { if (!wForm.name || !wForm.email || !wForm.password) return; try { await api('/workers', { method: 'POST', body: JSON.stringify(wForm) }); setShowAddWorker(false); setWForm({ name: '', email: '', password: '', phone: '', specialty: '' }); fetchAll(); } catch (e) { console.error(e); } };
  const assignItem = async (orderId: string, itemIdx: number, workerId: string) => { try { await api(`/orders/${orderId}/items/${itemIdx}/assign`, { method: 'PUT', body: JSON.stringify({ worker_id: workerId }) }); fetchAll(); } catch (e) { console.error(e); } };
  const assignDelivery = async () => { if (!selectedOrder || !dForm.driver_name) return; try { await api(`/orders/${selectedOrder.id}/delivery`, { method: 'PUT', body: JSON.stringify(dForm) }); setShowDelivery(false); setDForm({ driver_name: '', driver_phone: '', plate_number: '' }); fetchAll(); } catch (e) { console.error(e); } };
  const confirmDelivery = async (orderId: string) => { try { await api(`/orders/${orderId}/confirm-delivery`, { method: 'PUT' }); fetchAll(); } catch (e) { console.error(e); } };
  const sc = (status: string) => (c as any)[statusColorKeys[status] || 'textSec'];

  if (loading) return <SafeAreaView style={[s.c, { backgroundColor: c.bg }]}><ActivityIndicator size="large" color={c.accent} style={{ flex: 1 }} /></SafeAreaView>;

  return (
    <SafeAreaView style={[s.c, { backgroundColor: c.bg }]}>
      <Text style={[s.title, { color: c.text }]}>Boshqaruv</Text>
      <View style={s.tabs}>
        {[{ k: 'workers' as const, l: 'Ishchilar', cnt: workers.length }, { k: 'orders' as const, l: 'Buyurtmalar', cnt: orders.length }].map(t => (
          <TouchableOpacity key={t.k} style={[s.tabBtn, { backgroundColor: c.card, borderColor: c.cardBorder }, tab === t.k && { backgroundColor: c.accent }]} onPress={() => setTab(t.k)}>
            <Text style={[{ fontSize: 13, fontWeight: '600', color: c.textTer }, tab === t.k && { color: '#fff' }]}>{t.l}</Text>
            <View style={[s.tabBadge, tab === t.k && { backgroundColor: 'rgba(255,255,255,0.25)' }]}><Text style={[{ fontSize: 11, fontWeight: '700', color: c.textTer }, tab === t.k && { color: '#fff' }]}>{t.cnt}</Text></View>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor={c.text} />} contentContainerStyle={s.scroll}>
        {tab === 'workers' && (<>
          <TouchableOpacity style={[s.addBtn, { backgroundColor: c.accent }]} onPress={() => setShowAddWorker(true)}><Plus size={16} color="#fff" /><Text style={s.addBtnText}>Ishchi qo'shish</Text></TouchableOpacity>
          {workers.length === 0 ? <View style={s.empty}><Text style={{ fontSize: 15, color: c.textTer }}>Ishchilar yo'q</Text></View> : workers.map(w => (
            <View key={w.id} style={[s.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
              <View style={s.cardRow}>
                <View style={[s.avatar, { backgroundColor: c.accentSoft }]}><Text style={{ fontSize: 18, fontWeight: '700', color: c.accent }}>{w.name?.charAt(0)}</Text></View>
                <View style={{ flex: 1 }}><Text style={{ fontSize: 16, fontWeight: '600', color: c.text }}>{w.name}</Text><Text style={{ fontSize: 12, color: c.textSec, marginTop: 1 }}>{w.email}</Text>{w.specialty ? <Text style={{ fontSize: 11, color: c.warning, marginTop: 2, fontWeight: '500' }}>{w.specialty}</Text> : null}</View>
                <TouchableOpacity onPress={async () => { await api(`/workers/${w.id}`, { method: 'DELETE' }); fetchAll(); }} style={[s.delBtn, { backgroundColor: c.inputBg }]}><X size={14} color={c.textTer} /></TouchableOpacity>
              </View>
            </View>
          ))}
        </>)}
        {tab === 'orders' && (<>
          {orders.length === 0 ? <View style={s.empty}><Text style={{ fontSize: 15, color: c.textTer }}>Buyurtmalar yo'q</Text></View> : orders.map(order => (
            <View key={order.id} style={[s.card, { backgroundColor: c.card, borderColor: c.cardBorder, padding: 18 }]}>
              <View style={s.orderHead}><View style={[s.codeBadge, { backgroundColor: c.accentSoft }]}><Hash size={12} color={c.accent} /><Text style={{ fontSize: 14, fontWeight: '800', color: c.accent, letterSpacing: 1.5 }}>{order.order_code}</Text></View><View style={[s.statusBadge, { backgroundColor: sc(order.status) + '18' }]}><View style={[s.statusDot, { backgroundColor: sc(order.status) }]} /><Text style={[s.statusLabel, { color: sc(order.status) }]}>{statusLabels[order.status]}</Text></View></View>
              <Text style={{ fontSize: 15, fontWeight: '600', color: c.text, marginTop: 4 }}>{order.dealer_name}</Text>
              <View style={s.timeRow}><Clock size={12} color={c.textTer} /><Text style={{ fontSize: 12, color: c.textTer }}>{formatTime(order.created_at)}</Text></View>
              <View style={{ gap: 6 }}>
                {order.items?.map((item: any, idx: number) => (
                  <View key={idx} style={[s.itemCard, { backgroundColor: c.inputBg, borderColor: c.cardBorder }]}>
                    <View style={{ marginBottom: 8 }}><Text style={{ fontSize: 14, fontWeight: '600', color: c.text }}>{item.material_name}</Text><Text style={{ fontSize: 12, color: c.textSec, marginTop: 2 }}>{item.width}m x {item.height}m = {item.sqm} kv.m</Text></View>
                    {item.assigned_worker_name ? (
                      <View style={[s.workerBadge, { backgroundColor: item.worker_status === 'completed' ? c.successSoft : c.accentSoft }]}><UserCheck size={13} color={item.worker_status === 'completed' ? c.success : c.accent} /><Text style={{ fontSize: 13, fontWeight: '700', color: item.worker_status === 'completed' ? c.success : c.accent }}>{item.assigned_worker_name}</Text>{item.worker_status === 'completed' && <CheckCircle size={12} color={c.success} />}</View>
                    ) : <View style={s.assignRow}>{workers.map(w => <TouchableOpacity key={w.id} style={[s.assignBtn, { backgroundColor: c.accent }]} onPress={() => assignItem(order.id, idx, w.id)}><Text style={s.assignBtnText}>{w.name.split(' ')[0]}</Text></TouchableOpacity>)}{workers.length === 0 && <Text style={{ fontSize: 12, color: c.textTer, fontStyle: 'italic' }}>Ishchi qo'shing</Text>}</View>}
                  </View>
                ))}
              </View>
              <View style={[s.priceRow, { borderTopColor: c.cardBorder }]}><Text style={{ fontSize: 13, color: c.textSec }}>{order.total_sqm} kv.m</Text><Text style={{ fontSize: 18, fontWeight: '800', color: c.text }}>{formatPrice(order.total_price)}</Text></View>
              <View style={{ marginTop: 10, gap: 8 }}>
                {order.delivery_info ? <View style={[s.deliveryInfo, { backgroundColor: c.blueSoft }]}><Truck size={15} color={c.blue} /><Text style={{ fontSize: 13, color: c.blue, fontWeight: '600' }}>{order.delivery_info.driver_name}  {order.delivery_info.driver_phone}</Text></View> : (order.status === 'tayyor' || order.status === 'tayyorlanmoqda') ? <TouchableOpacity style={[s.deliveryBtn, { backgroundColor: c.blue }]} onPress={() => { setSelectedOrder(order); setShowDelivery(true); }}><Truck size={14} color="#fff" /><Text style={s.btnText}>Yetkazish biriktirish</Text></TouchableOpacity> : null}
                {order.status === 'yetkazilmoqda' && <TouchableOpacity style={[s.confirmBtn, { backgroundColor: c.success }]} onPress={() => confirmDelivery(order.id)}><CheckCircle size={16} color="#000" /><Text style={{ fontSize: 14, fontWeight: '700', color: '#000' }}>Topshirildi</Text></TouchableOpacity>}
              </View>
            </View>
          ))}
        </>)}
        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={showAddWorker} transparent animationType="slide"><View style={s.modalBg}><View style={[s.modal, { backgroundColor: c.modalBg, borderColor: c.cardBorder }]}>
        <View style={[s.modalH, { borderBottomColor: c.cardBorder }]}><Text style={{ fontSize: 20, fontWeight: '700', color: c.text }}>Yangi Ishchi</Text><TouchableOpacity onPress={() => setShowAddWorker(false)}><X size={22} color={c.textSec} /></TouchableOpacity></View>
        <ScrollView style={{ padding: 22, paddingBottom: 40 }}>
          {[{ k: 'name', l: 'Ism', p: 'Ism' }, { k: 'email', l: 'Email', p: 'email@...' }, { k: 'password', l: 'Parol', p: 'Parol' }, { k: 'phone', l: 'Telefon', p: '+998...' }, { k: 'specialty', l: 'Mutaxassislik', p: 'Jalyuzi' }].map(f => (
            <View key={f.k}><Text style={[s.label, { color: c.textSec }]}>{f.l}</Text><TextInput style={[s.modalInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]} value={(wForm as any)[f.k]} onChangeText={v => setWForm({...wForm, [f.k]: v})} placeholder={f.p} placeholderTextColor={c.placeholder} secureTextEntry={f.k === 'password'} autoCapitalize={f.k === 'email' ? 'none' : 'words'} keyboardType={f.k === 'phone' ? 'phone-pad' : f.k === 'email' ? 'email-address' : 'default'} /></View>
          ))}
          <TouchableOpacity style={[s.saveBtn, { backgroundColor: c.accent }]} onPress={addWorker}><Text style={s.saveBtnText}>Saqlash</Text></TouchableOpacity>
        </ScrollView>
      </View></View></Modal>

      <Modal visible={showDelivery} transparent animationType="slide"><View style={s.modalBg}><View style={[s.modal, { backgroundColor: c.modalBg, borderColor: c.cardBorder }]}>
        <View style={[s.modalH, { borderBottomColor: c.cardBorder }]}><Text style={{ fontSize: 20, fontWeight: '700', color: c.text }}>Yetkazish</Text><TouchableOpacity onPress={() => setShowDelivery(false)}><X size={22} color={c.textSec} /></TouchableOpacity></View>
        <ScrollView style={{ padding: 22, paddingBottom: 40 }}>
          {[{ k: 'driver_name', l: 'Haydovchi ismi', p: 'Ism' }, { k: 'driver_phone', l: 'Telefon', p: '+998...' }, { k: 'plate_number', l: 'Mashina raqami', p: '01A123BC' }].map(f => (
            <View key={f.k}><Text style={[s.label, { color: c.textSec }]}>{f.l}</Text><TextInput style={[s.modalInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]} value={(dForm as any)[f.k]} onChangeText={v => setDForm({...dForm, [f.k]: v})} placeholder={f.p} placeholderTextColor={c.placeholder} keyboardType={f.k === 'driver_phone' ? 'phone-pad' : 'default'} autoCapitalize={f.k === 'plate_number' ? 'characters' : 'words'} /></View>
          ))}
          <TouchableOpacity style={[s.saveBtn, { backgroundColor: c.accent }]} onPress={assignDelivery}><Text style={s.saveBtnText}>Biriktirish</Text></TouchableOpacity>
        </ScrollView>
      </View></View></Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1 }, title: { fontSize: 26, fontWeight: '800', paddingHorizontal: 24, paddingTop: 16, letterSpacing: -0.5 },
  tabs: { flexDirection: 'row', paddingHorizontal: 24, marginTop: 16, gap: 10 },
  tabBtn: { flex: 1, height: 44, borderRadius: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1 },
  tabBadge: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  scroll: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48, borderRadius: 24, marginBottom: 16 },
  addBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  card: { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  delBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  orderHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  codeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4, marginBottom: 12 },
  itemCard: { borderRadius: 16, padding: 14, borderWidth: 1 },
  workerBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, alignSelf: 'flex-start' },
  assignRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  assignBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  assignBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1 },
  deliveryInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  deliveryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 22 },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48, borderRadius: 24 },
  btnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, maxHeight: '80%' },
  modalH: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 22, borderBottomWidth: 1 },
  label: { fontSize: 11, marginBottom: 6, marginTop: 14, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
  modalInput: { height: 52, borderRadius: 16, borderWidth: 1, paddingHorizontal: 18, fontSize: 15 },
  saveBtn: { height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
