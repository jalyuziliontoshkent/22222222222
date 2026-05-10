import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  ActivityIndicator, Modal, TextInput, Image, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, X, Search, Upload, FolderPlus, Edit3, Trash2, Package } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../_layout';
import { useTheme, useCurrency } from '../../src/utils/theme';

export default function AdminInventory() {
  const c = useTheme();
  const { formatPrice } = useCurrency();
  const [categories, setCategories] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCat, setSelectedCat] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [showCatModal, setShowCatModal] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', description: '' });
  const [editingCat, setEditingCat] = useState<any>(null);
  const [showMatModal, setShowMatModal] = useState(false);
  const [matForm, setMatForm] = useState({ name: '', price_per_sqm: '', stock_quantity: '', description: '' });
  const [editingMat, setEditingMat] = useState<any>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  const fetchData = useCallback(async () => {
    try { const [cats, mats] = await Promise.all([api('/categories'), api('/materials')]); setCategories(cats); setMaterials(mats); }
    catch (e) { console.error(e); } finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { fetchData(); }, []);

  const saveCat = async () => {
    if (!catForm.name.trim()) return;
    try { if (editingCat) await api(`/categories/${editingCat.id}`, { method: 'PUT', body: JSON.stringify(catForm) }); else await api('/categories', { method: 'POST', body: JSON.stringify(catForm) });
      setShowCatModal(false); setCatForm({ name: '', description: '' }); setEditingCat(null); fetchData();
    } catch (e) { console.error(e); }
  };
  const deleteCat = async (cat: any) => { Alert.alert("O'chirish", `"${cat.name}" kategoriyasini o'chirasizmi?`, [{ text: 'Bekor', style: 'cancel' }, { text: "O'chirish", style: 'destructive', onPress: async () => { try { await api(`/categories/${cat.id}`, { method: 'DELETE' }); setSelectedCat(null); fetchData(); } catch (e: any) { Alert.alert('Xatolik', e.message); } } }]); };
  const pickImage = async () => { const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (status !== 'granted') { Alert.alert('Ruxsat kerak'); return; } const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.7 }); if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri); };
  const saveMat = async () => {
    if (!matForm.name || !matForm.price_per_sqm || !matForm.stock_quantity) return;
    setUploading(true);
    try {
      let image_url = editingMat?.image_url || '';
      if (imageUri) { const token = await AsyncStorage.getItem('token'); const formData = new FormData(); const filename = imageUri.split('/').pop() || 'photo.jpg'; const match = /\.(\w+)$/.exec(filename); const type = match ? `image/${match[1]}` : 'image/jpeg'; formData.append('file', { uri: imageUri, name: filename, type } as any); const res = await fetch(`${BACKEND_URL}/api/upload-image`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData }); if (res.ok) { const data = await res.json(); image_url = data.image_url; } }
      const body = { name: matForm.name, category: selectedCat?.name || editingMat?.category || '', category_id: selectedCat ? parseInt(selectedCat.id) : editingMat?.category_id, price_per_sqm: parseFloat(matForm.price_per_sqm), stock_quantity: parseFloat(matForm.stock_quantity), description: matForm.description, unit: 'kv.m', image_url };
      if (editingMat) {
        await api(`/materials/${editingMat.id}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await api('/materials', { method: 'POST', body: JSON.stringify(body) });
      }
      setShowMatModal(false); setMatForm({ name: '', price_per_sqm: '', stock_quantity: '', description: '' }); setImageUri(null); setEditingMat(null); fetchData();
    } catch (e: any) { Alert.alert('Xatolik', e.message); } finally { setUploading(false); }
  };
  const editMat = (mat: any) => {
    setEditingMat(mat);
    setMatForm({ name: mat.name, price_per_sqm: String(mat.price_per_sqm), stock_quantity: String(mat.stock_quantity), description: mat.description || '' });
    setImageUri(mat.image_url || null);
    setShowMatModal(true);
  };
  const deleteMat = async (mat: any) => { Alert.alert("O'chirish", `"${mat.name}" ni o'chirasizmi?`, [{ text: 'Bekor', style: 'cancel' }, { text: "O'chirish", style: 'destructive', onPress: async () => { try { await api(`/materials/${mat.id}`, { method: 'DELETE' }); fetchData(); } catch (e) { console.error(e); } } }]); };

  const filteredMats = materials.filter(m => { if (selectedCat && m.category_id !== selectedCat.id) return false; if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false; return true; });

  if (loading) return <SafeAreaView style={[s.c, { backgroundColor: c.bg }]}><ActivityIndicator size="large" color={c.accent} style={{ flex: 1 }} /></SafeAreaView>;

  return (
    <SafeAreaView style={[s.c, { backgroundColor: c.bg }]}>
      <View style={s.header}>
        <Text style={[s.title, { color: c.text }]}>Ombor</Text>
        <View style={s.headerBtns}>
          <TouchableOpacity style={[s.iconBtn, { backgroundColor: c.accentSoft, borderColor: c.accent + '30' }]} onPress={() => { setCatForm({ name: '', description: '' }); setEditingCat(null); setShowCatModal(true); }}><FolderPlus size={16} color={c.accent} /></TouchableOpacity>
          {selectedCat && <TouchableOpacity style={[s.iconBtn, { backgroundColor: c.accent }]} onPress={() => { setMatForm({ name: '', price_per_sqm: '', stock_quantity: '', description: '' }); setImageUri(null); setShowMatModal(true); }}><Plus size={16} color="#fff" /></TouchableOpacity>}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catRow} contentContainerStyle={s.catContent}>
        <TouchableOpacity style={[s.chip, { backgroundColor: c.card, borderColor: c.cardBorder }, !selectedCat && { backgroundColor: c.accentSoft, borderColor: c.accent + '40' }]} onPress={() => setSelectedCat(null)}><Text style={[{ fontSize: 13, fontWeight: '600', color: c.textSec }, !selectedCat && { color: c.accent }]}>Barchasi ({materials.length})</Text></TouchableOpacity>
        {categories.map(cat => (
          <TouchableOpacity key={cat.id} style={[s.chip, { backgroundColor: c.card, borderColor: c.cardBorder }, selectedCat?.id === cat.id && { backgroundColor: c.accentSoft, borderColor: c.accent + '40' }]} onPress={() => setSelectedCat(cat)}>
            <Text style={[{ fontSize: 13, fontWeight: '600', color: c.textSec }, selectedCat?.id === cat.id && { color: c.accent }]}>{cat.name} ({cat.material_count || 0})</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selectedCat && (
        <View style={s.catActions}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: c.textSec }}>{selectedCat.name}</Text>
          <View style={s.catActionBtns}>
            <TouchableOpacity style={[s.smallBtn, { backgroundColor: c.accentSoft, borderColor: c.accent + '30' }]} onPress={() => { setEditingCat(selectedCat); setCatForm({ name: selectedCat.name, description: selectedCat.description || '' }); setShowCatModal(true); }}><Edit3 size={14} color={c.accent} /><Text style={{ fontSize: 12, fontWeight: '600', color: c.accent }}>Tahrirlash</Text></TouchableOpacity>
            <TouchableOpacity style={[s.smallBtn, { backgroundColor: c.dangerSoft, borderColor: c.danger + '20' }]} onPress={() => deleteCat(selectedCat)}><Trash2 size={14} color={c.danger} /><Text style={{ fontSize: 12, fontWeight: '600', color: c.danger }}>O'chirish</Text></TouchableOpacity>
          </View>
        </View>
      )}

      <View style={[s.searchRow, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
        <Search size={16} color={c.textTer} />
        <TextInput style={[s.searchInput, { color: c.text }]} placeholder="Qidirish..." placeholderTextColor={c.placeholder} value={search} onChangeText={setSearch} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={c.text} />} contentContainerStyle={s.list}>
        {filteredMats.length === 0 ? (
          <View style={s.empty}><Package size={48} color={c.textTer} /><Text style={{ fontSize: 15, color: c.textTer }}>{selectedCat ? "Bu kategoriyada mahsulot yo'q" : 'Mahsulot topilmadi'}</Text></View>
        ) : filteredMats.map(mat => (
          <View key={mat.id} style={[s.matCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <View style={s.matRow}>
              {mat.image_url ? <Image source={{ uri: mat.image_url.startsWith('/') ? `${BACKEND_URL}${mat.image_url}` : mat.image_url }} style={s.matImg} /> : <View style={[s.matImg, { backgroundColor: c.inputBg, alignItems: 'center', justifyContent: 'center' }]}><Package size={20} color={c.textTer} /></View>}
              <View style={s.matInfo}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: c.text }} numberOfLines={1}>{mat.name}</Text>
                <Text style={{ fontSize: 11, color: c.textTer, marginTop: 2 }}>{mat.category_name || mat.category}</Text>
                <View style={s.matMeta}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: c.textSec }}>{formatPrice(mat.price_per_sqm)}/kv.m</Text>
                  {mat.stock_quantity < 10 ? <View style={[s.lowBadge, { backgroundColor: c.dangerSoft }]}><Text style={{ fontSize: 11, fontWeight: '700', color: c.danger }}>⚠ {mat.stock_quantity}</Text></View> : <Text style={{ fontSize: 11, color: c.textTer }}>{mat.stock_quantity} {mat.unit}</Text>}
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity style={[s.delCircle, { backgroundColor: c.accentSoft }]} onPress={() => editMat(mat)}><Edit3 size={14} color={c.accent} /></TouchableOpacity>
                <TouchableOpacity style={[s.delCircle, { backgroundColor: c.dangerSoft }]} onPress={() => deleteMat(mat)}><Trash2 size={14} color={c.danger} /></TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Category Modal */}
      <Modal visible={showCatModal} transparent animationType="slide"><View style={s.modalBg}><View style={[s.modal, { backgroundColor: c.modalBg, borderColor: c.cardBorder }]}>
        <View style={[s.modalH, { borderBottomColor: c.cardBorder }]}><Text style={{ fontSize: 18, fontWeight: '700', color: c.text }}>{editingCat ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya'}</Text><TouchableOpacity onPress={() => setShowCatModal(false)}><X size={22} color={c.textSec} /></TouchableOpacity></View>
        <View style={{ padding: 22 }}>
          <Text style={[s.label, { color: c.textSec }]}>Nomi</Text>
          <TextInput style={[s.input, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]} value={catForm.name} onChangeText={v => setCatForm({...catForm, name: v})} placeholder="Masalan: Parda" placeholderTextColor={c.placeholder} />
          <Text style={[s.label, { color: c.textSec }]}>Tavsif</Text>
          <TextInput style={[s.input, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]} value={catForm.description} onChangeText={v => setCatForm({...catForm, description: v})} placeholder="Qisqacha tavsif" placeholderTextColor={c.placeholder} />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
            <TouchableOpacity style={[s.saveBtn, { backgroundColor: c.accent }]} onPress={saveCat}><Text style={s.saveBtnText}>Saqlash</Text></TouchableOpacity>
            {editingCat && <TouchableOpacity style={[s.delCircle, { backgroundColor: c.dangerSoft, width: 52, height: 52, borderRadius: 26, marginTop: 0 }]} onPress={() => { setShowCatModal(false); deleteCat(editingCat); }}><Trash2 size={16} color={c.danger} /></TouchableOpacity>}
          </View>
        </View>
      </View></View></Modal>

      {/* Material Modal */}
      <Modal visible={showMatModal} transparent animationType="slide"><View style={s.modalBg}><View style={[s.modal, { backgroundColor: c.modalBg, borderColor: c.cardBorder }]}>
        <View style={[s.modalH, { borderBottomColor: c.cardBorder }]}><Text style={{ fontSize: 18, fontWeight: '700', color: c.text }}>{editingMat ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}</Text><TouchableOpacity onPress={() => { setShowMatModal(false); setEditingMat(null); }}><X size={22} color={c.textSec} /></TouchableOpacity></View>
        <ScrollView style={{ padding: 22 }} showsVerticalScrollIndicator={false}>
          {(selectedCat || editingMat) && <View style={[s.catTag, { backgroundColor: c.accentSoft }]}><Text style={{ fontSize: 13, fontWeight: '700', color: c.accent }}>{selectedCat?.name || editingMat?.category}</Text></View>}
          <Text style={[s.label, { color: c.textSec }]}>Rasm</Text>
          <TouchableOpacity style={[s.imgPicker, { borderColor: c.cardBorder }]} onPress={pickImage}>
            {imageUri ? <Image source={{ uri: imageUri }} style={s.imgPreview} /> : <View style={[s.imgPlaceholder, { backgroundColor: c.inputBg }]}><Upload size={24} color={c.textTer} /><Text style={{ fontSize: 13, color: c.textTer }}>Galereyadan tanlash</Text></View>}
          </TouchableOpacity>
          {[{ label: 'Nomi', key: 'name', placeholder: 'Mahsulot nomi' }, { label: 'Narxi ($/kv.m)', key: 'price_per_sqm', placeholder: '0.00', keyboard: 'decimal-pad' }, { label: "Qoldiq (kv.m)", key: 'stock_quantity', placeholder: '0', keyboard: 'decimal-pad' }, { label: 'Tavsif', key: 'description', placeholder: 'Qisqacha tavsif' }].map(f => (
            <View key={f.key}><Text style={[s.label, { color: c.textSec }]}>{f.label}</Text><TextInput style={[s.input, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]} value={(matForm as any)[f.key]} onChangeText={v => setMatForm({...matForm, [f.key]: v})} placeholder={f.placeholder} placeholderTextColor={c.placeholder} keyboardType={(f as any).keyboard || 'default'} /></View>
          ))}
          <TouchableOpacity style={[s.saveBtn, { backgroundColor: c.accent, opacity: uploading ? 0.6 : 1 }]} onPress={saveMat} disabled={uploading}>{uploading ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Saqlash</Text>}</TouchableOpacity>
          <View style={{ height: 30 }} />
        </ScrollView>
      </View></View></Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 }, headerBtns: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  catRow: { maxHeight: 48, marginTop: 14 }, catContent: { paddingHorizontal: 20, gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  catActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  catActionBtns: { flexDirection: 'row', gap: 8 },
  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginTop: 12, borderRadius: 16, paddingHorizontal: 14, borderWidth: 1 },
  searchInput: { flex: 1, height: 44, fontSize: 14 },
  list: { paddingHorizontal: 16, paddingTop: 12 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  matCard: { borderRadius: 18, borderWidth: 1, marginBottom: 8 },
  matRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  matImg: { width: 56, height: 56, borderRadius: 14 },
  matInfo: { flex: 1 },
  matMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  lowBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  delCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, maxHeight: '85%' },
  modalH: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 22, borderBottomWidth: 1 },
  label: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600', marginTop: 14, marginBottom: 6 },
  input: { height: 50, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, fontSize: 15 },
  saveBtn: { flex: 1, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  catTag: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12 },
  imgPicker: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderStyle: 'dashed' },
  imgPreview: { width: '100%', height: 160, borderRadius: 16 },
  imgPlaceholder: { height: 120, alignItems: 'center', justifyContent: 'center', gap: 8 },
});
