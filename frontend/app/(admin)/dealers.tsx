import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Modal, TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Users, Plus, Trash2, X, Phone, Mail, CreditCard, DollarSign, History, ChevronDown,
} from 'lucide-react-native';
import { api } from '../_layout';
import { useTheme, useCurrency } from '../../src/utils/theme';

export default function DealersScreen() {
  const c = useTheme();
  const { formatPrice, exchangeRate } = useCurrency();
  const [dealers, setDealers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedDealer, setSelectedDealer] = useState<any>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentCurrency, setPaymentCurrency] = useState<'USD' | 'UZS'>('USD');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', credit_limit: '' });
  const [formLoading, setFormLoading] = useState(false);

  const fetchDealers = useCallback(async () => {
    try { const data = await api('/dealers'); setDealers(data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchDealers(); }, []);

  const addDealer = async () => {
    if (!form.name || !form.email || !form.password) return;
    setFormLoading(true);
    try {
      await api('/dealers', { method: 'POST', body: JSON.stringify({ ...form, credit_limit: parseFloat(form.credit_limit) || 0 }) });
      setShowAdd(false); setForm({ name: '', email: '', password: '', phone: '', credit_limit: '' }); fetchDealers();
    } catch (e: any) { Alert.alert('Xatolik', e.message); }
    finally { setFormLoading(false); }
  };

  const deleteDealer = (id: string, name: string) => {
    Alert.alert('O\'chirish', `${name} ni o'chirishni xohlaysizmi?`, [
      { text: 'Bekor', style: 'cancel' },
      { text: 'O\'chirish', style: 'destructive', onPress: async () => { try { await api(`/dealers/${id}`, { method: 'DELETE' }); fetchDealers(); } catch (e: any) { Alert.alert('Xatolik', e.message); } } },
    ]);
  };

  const openPayment = (dealer: any) => {
    setSelectedDealer(dealer);
    setPaymentAmount('');
    setPaymentNote('');
    setShowPayment(true);
  };

  const submitPayment = async () => {
    const rawAmount = parseFloat(paymentAmount);
    if (!rawAmount || rawAmount <= 0) { Alert.alert('Xatolik', 'Summa kiriting'); return; }
    // Convert UZS to USD if needed
    const amountUSD = paymentCurrency === 'UZS' ? rawAmount / exchangeRate : rawAmount;
    setPaymentLoading(true);
    try {
      await api(`/dealers/${selectedDealer.id}/payment`, { method: 'POST', body: JSON.stringify({ amount: Math.round(amountUSD * 100) / 100, note: paymentNote }) });
      Alert.alert('Muvaffaqiyatli', `${paymentCurrency === 'UZS' ? rawAmount.toLocaleString() + " so'm" : '$' + rawAmount.toFixed(2)} to'lov qabul qilindi!`);
      setShowPayment(false); setPaymentAmount(''); setPaymentNote(''); fetchDealers();
    } catch (e: any) { Alert.alert('Xatolik', e.message); }
    finally { setPaymentLoading(false); }
  };

  const openHistory = async (dealer: any) => {
    setSelectedDealer(dealer);
    setShowHistory(true);
    try {
      const data = await api(`/dealers/${dealer.id}/payments`);
      setPaymentHistory(data);
    } catch { setPaymentHistory([]); }
  };

  if (loading) return <SafeAreaView style={[s.c, { backgroundColor: c.bg }]}><ActivityIndicator size="large" color={c.accent} style={{ flex: 1 }} /></SafeAreaView>;

  return (
    <SafeAreaView style={[s.c, { backgroundColor: c.bg }]}>
      <View style={s.header}>
        <View>
          <Text style={[s.title, { color: c.text }]}>Dilerlar</Text>
          <Text style={[s.subtitle, { color: c.textTer }]}>{dealers.length} ta diler</Text>
        </View>
        <TouchableOpacity style={[s.addBtn, { backgroundColor: c.accent }]} onPress={() => setShowAdd(true)}>
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDealers(); }} tintColor={c.text} />} contentContainerStyle={s.scroll}>
        {dealers.map((d) => (
          <View key={d.id} style={[s.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            {/* Dealer Info */}
            <View style={s.cardTop}>
              <View style={[s.avatar, { backgroundColor: c.accentSoft }]}>
                <Text style={[s.avatarText, { color: c.accent }]}>{d.name?.charAt(0)?.toUpperCase()}</Text>
              </View>
              <View style={s.info}>
                <Text style={[s.dName, { color: c.text }]}>{d.name}</Text>
                <View style={s.row}><Mail size={12} color={c.textTer} /><Text style={[s.dEmail, { color: c.textSec }]}>{d.email}</Text></View>
                {d.phone ? <View style={s.row}><Phone size={12} color={c.textTer} /><Text style={[s.dPhone, { color: c.textSec }]}>{d.phone}</Text></View> : null}
              </View>
              <TouchableOpacity onPress={() => deleteDealer(d.id, d.name)} style={s.delBtn}><Trash2 size={16} color={c.danger} /></TouchableOpacity>
            </View>

            {/* Financial Info */}
            <View style={[s.finRow, { borderTopColor: c.cardBorder }]}>
              <View style={s.finItem}>
                <Text style={[s.finLabel, { color: c.textTer }]}>Kredit limiti</Text>
                <Text style={[s.finVal, { color: c.text }]}>{formatPrice(d.credit_limit || 0)}</Text>
              </View>
              <View style={[s.finDivider, { backgroundColor: c.cardBorder }]} />
              <View style={s.finItem}>
                <Text style={[s.finLabel, { color: c.textTer }]}>Qarz</Text>
                <Text style={[s.finVal, { color: (d.debt || 0) > 0 ? c.danger : c.success }]}>{formatPrice(d.debt || 0)}</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={s.actions}>
              <TouchableOpacity style={[s.payBtn, { backgroundColor: c.successSoft, borderColor: c.success + '30' }]} onPress={() => openPayment(d)}>
                <DollarSign size={15} color={c.success} />
                <Text style={[s.payBtnText, { color: c.success }]}>To'lov qabul qilish</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.histBtn, { backgroundColor: c.card, borderColor: c.cardBorder }]} onPress={() => openHistory(d)}>
                <History size={15} color={c.textSec} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Dealer Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <KeyboardAvoidingView style={s.modalBg} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[s.modal, { backgroundColor: c.modalBg, borderColor: c.cardBorder }]}>
            <View style={[s.modalH, { borderBottomColor: c.cardBorder }]}>
              <Text style={[s.modalTitle, { color: c.text }]}>Yangi diler</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)}><X size={22} color={c.textSec} /></TouchableOpacity>
            </View>
            <ScrollView style={s.modalBody}>
              {[
                { label: 'Ism', key: 'name', placeholder: 'Diler ismi' },
                { label: 'Email', key: 'email', placeholder: 'email@...', keyboard: 'email-address' },
                { label: 'Parol', key: 'password', placeholder: '********', secure: true },
                { label: 'Telefon', key: 'phone', placeholder: '+998 ...' },
                { label: 'Kredit limiti ($)', key: 'credit_limit', placeholder: '1000', keyboard: 'numeric' },
              ].map((f) => (
                <View key={f.key}>
                  <Text style={[s.label, { color: c.textSec }]}>{f.label}</Text>
                  <TextInput
                    style={[s.input, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
                    value={(form as any)[f.key]}
                    onChangeText={(v) => setForm({ ...form, [f.key]: v })}
                    placeholder={f.placeholder}
                    placeholderTextColor={c.placeholder}
                    autoCapitalize="none"
                    keyboardType={(f as any).keyboard || 'default'}
                    secureTextEntry={(f as any).secure}
                  />
                </View>
              ))}
              <TouchableOpacity style={[s.saveBtn, { backgroundColor: c.accent }]} onPress={addDealer} disabled={formLoading}>
                {formLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Qo'shish</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Payment Modal */}
      <Modal visible={showPayment} transparent animationType="slide">
        <KeyboardAvoidingView style={s.modalBg} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[s.modal, { backgroundColor: c.modalBg, borderColor: c.cardBorder }]}>
            <View style={[s.modalH, { borderBottomColor: c.cardBorder }]}>
              <Text style={[s.modalTitle, { color: c.text }]}>To'lov qabul qilish</Text>
              <TouchableOpacity onPress={() => setShowPayment(false)}><X size={22} color={c.textSec} /></TouchableOpacity>
            </View>
            <View style={s.modalBody}>
              {selectedDealer && (
                <View style={[s.payInfo, { backgroundColor: c.accentSoft, borderColor: c.cardBorder }]}>
                  <Text style={[s.payDealerName, { color: c.text }]}>{selectedDealer.name}</Text>
                  <Text style={[s.payDebt, { color: c.danger }]}>Qarz: {formatPrice(selectedDealer.debt || 0)}</Text>
                </View>
              )}
              {/* USD/UZS Toggle */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16, gap: 4 }}>
                <TouchableOpacity
                  style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: paymentCurrency === 'USD' ? c.accent : c.inputBg }}
                  onPress={() => setPaymentCurrency('USD')}
                >
                  <Text style={{ fontSize: 15, fontWeight: '700', color: paymentCurrency === 'USD' ? '#fff' : c.textSec }}>$ USD</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: paymentCurrency === 'UZS' ? c.accent : c.inputBg }}
                  onPress={() => setPaymentCurrency('UZS')}
                >
                  <Text style={{ fontSize: 15, fontWeight: '700', color: paymentCurrency === 'UZS' ? '#fff' : c.textSec }}>UZS so'm</Text>
                </TouchableOpacity>
              </View>
              <Text style={[s.label, { color: c.textSec }]}>To'lov summasi ({paymentCurrency === 'USD' ? '$' : "so'm"})</Text>
              <TextInput
                style={[s.input, s.bigInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                placeholder={paymentCurrency === 'USD' ? '0.00' : '100000'}
                placeholderTextColor={c.placeholder}
                keyboardType="numeric"
              />
              {paymentAmount && parseFloat(paymentAmount) > 0 && (
                <Text style={{ color: c.textSec, fontSize: 13, marginTop: 4, textAlign: 'center' }}>
                  {paymentCurrency === 'USD'
                    ? `≈ ${(parseFloat(paymentAmount) * exchangeRate).toLocaleString()} so'm`
                    : `≈ $${(parseFloat(paymentAmount) / exchangeRate).toFixed(2)}`
                  }
                </Text>
              )}
              <Text style={[s.label, { color: c.textSec, marginTop: 12 }]}>Izoh (ixtiyoriy)</Text>
              <TextInput
                style={[s.input, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
                value={paymentNote}
                onChangeText={setPaymentNote}
                placeholder="Masalan: Naqd to'lov"
                placeholderTextColor={c.placeholder}
              />
              <TouchableOpacity style={[s.saveBtn, { backgroundColor: c.success }]} onPress={submitPayment} disabled={paymentLoading}>
                {paymentLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>To'lovni tasdiqlash</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Payment History Modal */}
      <Modal visible={showHistory} transparent animationType="slide">
        <View style={s.modalBg}>
          <View style={[s.modal, { backgroundColor: c.modalBg, borderColor: c.cardBorder, maxHeight: '70%' }]}>
            <View style={[s.modalH, { borderBottomColor: c.cardBorder }]}>
              <Text style={[s.modalTitle, { color: c.text }]}>To'lov tarixi</Text>
              <TouchableOpacity onPress={() => setShowHistory(false)}><X size={22} color={c.textSec} /></TouchableOpacity>
            </View>
            <ScrollView style={s.modalBody}>
              {selectedDealer && (
                <View style={[s.payInfo, { backgroundColor: c.accentSoft, borderColor: c.cardBorder, marginBottom: 16 }]}>
                  <Text style={[s.payDealerName, { color: c.text }]}>{selectedDealer.name}</Text>
                  <Text style={[s.payDebt, { color: c.danger }]}>Joriy qarz: {formatPrice(selectedDealer.debt || 0)}</Text>
                </View>
              )}
              {paymentHistory.length === 0 ? (
                <Text style={{ color: c.textTer, textAlign: 'center', paddingVertical: 30 }}>To'lov tarixi bo'sh</Text>
              ) : paymentHistory.map((p, i) => (
                <View key={p.id || i} style={[s.histItem, { borderBottomColor: c.cardBorder }]}>
                  <View style={[s.histIcon, { backgroundColor: c.successSoft }]}>
                    <DollarSign size={14} color={c.success} />
                  </View>
                  <View style={s.histInfo}>
                    <Text style={[s.histAmount, { color: c.success }]}>+{formatPrice(p.amount)}</Text>
                    {p.note ? <Text style={[s.histNote, { color: c.textTer }]}>{p.note}</Text> : null}
                    <Text style={[s.histDate, { color: c.textTer }]}>{new Date(p.created_at).toLocaleDateString('uz-UZ')}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 12, marginTop: 2 },
  addBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },

  card: { borderRadius: 20, marginBottom: 12, borderWidth: 1, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '800' },
  info: { flex: 1, gap: 3 },
  dName: { fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dEmail: { fontSize: 12 },
  dPhone: { fontSize: 12 },
  delBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  finRow: { flexDirection: 'row', borderTopWidth: 1, paddingVertical: 12, marginHorizontal: 16 },
  finItem: { flex: 1, alignItems: 'center', gap: 4 },
  finDivider: { width: 1, height: '100%' },
  finLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  finVal: { fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },

  actions: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  payBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 14, borderWidth: 1 },
  payBtnText: { fontSize: 13, fontWeight: '700' },
  histBtn: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, maxHeight: '85%' },
  modalH: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 22, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalBody: { padding: 22, paddingBottom: 40 },
  label: { fontSize: 10, marginBottom: 6, marginTop: 14, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
  input: { height: 50, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, fontSize: 15 },
  bigInput: { height: 60, fontSize: 24, fontWeight: '800', textAlign: 'center' },
  saveBtn: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  payInfo: { borderRadius: 16, padding: 16, borderWidth: 1, alignItems: 'center', gap: 4 },
  payDealerName: { fontSize: 18, fontWeight: '700' },
  payDebt: { fontSize: 14, fontWeight: '600' },

  histItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  histIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  histInfo: { flex: 1, gap: 2 },
  histAmount: { fontSize: 16, fontWeight: '800' },
  histNote: { fontSize: 12 },
  histDate: { fontSize: 11 },
});
