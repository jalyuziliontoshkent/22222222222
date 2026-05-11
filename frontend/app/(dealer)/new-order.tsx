import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
  Image, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Send, X, Check, Upload, Trash2, ChevronLeft, StickyNote, Package, FolderOpen } from 'lucide-react-native';
import { api } from '../_layout';
import { useTheme, useCurrency } from '../../src/utils/theme';
import { calculateBillableArea, calculateItemPrice } from '../../src/utils/calculations';

type OrderItem = {
  material_id: string; material_name: string; width: string; height: string;
  quantity: number; price_per_sqm: number;
};

export default function NewOrder() {
  const c = useTheme();
  const { formatPrice } = useCurrency();
  const [categories, setCategories] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [unit, setUnit] = useState<'m' | 'cm'>('m');
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedCat, setSelectedCat] = useState<any>(null);

  useEffect(() => {
    Promise.all([api('/categories'), api('/materials')])
      .then(([cats, mats]) => { setCategories(cats); setMaterials(mats); })
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  const getItemsForMaterial = (matId: string) => items.filter(it => it.material_id === matId);
  const getTotalForMaterial = (matId: string) =>
    getItemsForMaterial(matId).reduce((sum, it) => {
      const { price } = calculateItemPrice(parseFloat(it.width), parseFloat(it.height), it.price_per_sqm, it.quantity);
      return sum + price;
    }, 0);

  const widthInM = unit === 'cm' ? (parseFloat(width) || 0) / 100 : (parseFloat(width) || 0);
  const heightInM = unit === 'cm' ? (parseFloat(height) || 0) / 100 : (parseFloat(height) || 0);
  const rawSqm = widthInM * heightInM;
  const billableSqm = calculateBillableArea(rawSqm);

  const addItem = (mat: any) => {
    if (rawSqm <= 0) return;
    setItems([...items, { material_id: mat.id, material_name: mat.name, width: widthInM.toString(), height: heightInM.toString(), quantity: 1, price_per_sqm: mat.price_per_sqm }]);
    setWidth(''); setHeight('');
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const totalSqm = items.reduce((s, it) => s + calculateBillableArea(parseFloat(it.width) * parseFloat(it.height) * it.quantity), 0);
  const totalPrice = items.reduce((s, it) => {
    const { price } = calculateItemPrice(parseFloat(it.width), parseFloat(it.height), it.price_per_sqm, it.quantity);
    return s + price;
  }, 0);

  const submitOrder = async () => {
    if (items.length === 0) return;
    setSubmitting(true);
    try {
      await api('/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: items.map(it => ({ material_id: it.material_id, material_name: it.material_name, width: parseFloat(it.width), height: parseFloat(it.height), quantity: it.quantity, price_per_sqm: it.price_per_sqm })),
          notes,
        }),
      });
      setItems([]); setNotes(''); setExpandedId(null); setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (e: any) { Alert.alert('Xatolik', e.message || 'Buyurtma yuborilmadi'); }
    finally { setSubmitting(false); }
  };

  const toggleExpand = (matId: string) => {
    if (expandedId === matId) { setExpandedId(null); setWidth(''); setHeight(''); }
    else { setExpandedId(matId); setWidth(''); setHeight(''); }
  };

  const filteredMats = selectedCat ? materials.filter(m => m.category_id === selectedCat.id) : materials;

  if (loading) return <SafeAreaView style={s.c}><ActivityIndicator size="large" color="#fff" style={{ flex: 1 }} /></SafeAreaView>;

  return (
    <SafeAreaView style={s.c}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Yangi Buyurtma</Text>
            <Text style={s.subtitle}>{selectedCat ? selectedCat.name : 'Kategoriyani tanlang'}</Text>
          </View>
          {items.length > 0 && (
            <View style={s.countBadge}><Text style={s.countText}>{items.length}</Text></View>
          )}
        </View>

        {success && (
          <View style={s.successBanner}><Check size={20} color="#00C853" /><Text style={s.successText}>Buyurtma yuborildi!</Text></View>
        )}

        {/* Category selector */}
        {!selectedCat ? (
          <ScrollView contentContainerStyle={s.catGrid}>
            {categories.map(cat => (
              <TouchableOpacity key={cat.id} style={s.catCard} onPress={() => setSelectedCat(cat)} activeOpacity={0.7}>
                <View style={s.catIconWrap}>
                  <FolderOpen size={28} color={c.accent} />
                </View>
                <Text style={s.catCardName}>{cat.name}</Text>
                <Text style={s.catCardCount}>{cat.material_count || 0} mahsulot</Text>
              </TouchableOpacity>
            ))}
            {/* Show all button */}
            <TouchableOpacity style={[s.catCard, { borderColor: 'rgba(0,230,118,0.2)', backgroundColor: 'rgba(0,230,118,0.03)' }]} onPress={() => setSelectedCat({ id: '__all__', name: 'Barchasi' })}>
              <View style={[s.catIconWrap, { backgroundColor: 'rgba(0,230,118,0.1)' }]}>
                <Package size={28} color={c.success} />
              </View>
              <Text style={s.catCardName}>Barchasi</Text>
              <Text style={s.catCardCount}>{materials.length} mahsulot</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <>
            {/* Back to categories */}
            <TouchableOpacity style={s.backBtn} onPress={() => { setSelectedCat(null); setExpandedId(null); setWidth(''); setHeight(''); }}>
              <ChevronLeft size={18} color={c.accent} />
              <Text style={s.backText}>Kategoriyalar</Text>
            </TouchableOpacity>

            {/* Materials list */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.listContent} keyboardShouldPersistTaps="handled">
              {(selectedCat.id === '__all__' ? materials : filteredMats).map(mat => {
                const isExpanded = expandedId === mat.id;
                const matItems = getItemsForMaterial(mat.id);
                const matTotal = getTotalForMaterial(mat.id);
                const currentSqm = isExpanded ? rawSqm : 0;
                const currentBillable = isExpanded ? billableSqm : 0;
                const currentPrice = isExpanded ? currentBillable * mat.price_per_sqm : 0;

                return (
                  <View key={mat.id} style={[s.matCard, isExpanded && s.matCardExpanded, matItems.length > 0 && s.matCardWithItems]}>
                    <TouchableOpacity style={s.matRow} onPress={() => toggleExpand(mat.id)} activeOpacity={0.7}>
                      {mat.image_url ? (
                        <Image source={{ uri: mat.image_url }} style={s.matImg} />
                      ) : (
                        <View style={[s.matImg, s.matImgEmpty]}><Package size={18} color="rgba(255,255,255,0.1)" /></View>
                      )}
                      <View style={s.matInfo}>
                        <Text style={s.matName} numberOfLines={1}>{mat.name}</Text>
                        <View style={s.matMeta}>
                          <Text style={s.matPrice}>{formatPrice(mat.price_per_sqm)}<Text style={s.matPriceUnit}>/kv.m</Text></Text>
                          {matItems.length > 0 && (
                            <View style={s.matBadge}><Text style={s.matBadgeText}>{matItems.length} ta</Text></View>
                          )}
                        </View>
                      </View>
                      <TouchableOpacity style={[s.expandBtn, isExpanded && s.expandBtnActive]} onPress={() => toggleExpand(mat.id)}>
                        {isExpanded ? <X size={18} color="#000" /> : <Plus size={18} color="rgba(255,255,255,0.5)" />}
                      </TouchableOpacity>
                    </TouchableOpacity>

                    {matItems.length > 0 && !isExpanded && (
                      <View style={s.chips}>
                        {matItems.map((it, idx) => (
                          <View key={idx} style={s.chip}>
                            <Text style={s.chipText}>{it.width}×{it.height}m</Text>
                            <TouchableOpacity onPress={() => removeItem(items.indexOf(it))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                              <X size={10} color="rgba(255,82,82,0.7)" />
                            </TouchableOpacity>
                          </View>
                        ))}
                        <Text style={s.chipsTotal}>{formatPrice(Math.round(matTotal * 100) / 100)}</Text>
                      </View>
                    )}

                    {isExpanded && (
                      <View style={s.expanded}>
                        {matItems.length > 0 && matItems.map((it, idx) => {
                          const itRaw = parseFloat(it.width) * parseFloat(it.height);
                          const itBillable = calculateBillableArea(itRaw);
                          const itPrice = itBillable * it.price_per_sqm;
                          return (
                            <View key={idx} style={s.existItem}>
                              <View style={{ flex: 1 }}>
                                <Text style={s.existSize}>{it.width} × {it.height} m</Text>
                                <Text style={s.existCalc}>{itRaw.toFixed(2)} → {itBillable} kv.m = {formatPrice(Math.round(itPrice * 100) / 100)}</Text>
                              </View>
                              <TouchableOpacity style={s.existDel} onPress={() => removeItem(items.indexOf(it))}>
                                <Trash2 size={14} color="#FF5252" />
                              </TouchableOpacity>
                            </View>
                          );
                        })}
                        {/* Unit toggle */}
                        <View style={s.unitToggleRow}>
                          <Text style={s.unitLabel}>O'lchov birligi:</Text>
                          <View style={s.unitToggle}>
                            <TouchableOpacity style={[s.unitBtn, unit === 'cm' && s.unitBtnActive]} onPress={() => setUnit('cm')}>
                              <Text style={[s.unitBtnText, unit === 'cm' && s.unitBtnTextActive]}>cm</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[s.unitBtn, unit === 'm' && s.unitBtnActive]} onPress={() => setUnit('m')}>
                              <Text style={[s.unitBtnText, unit === 'm' && s.unitBtnTextActive]}>m</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        <View style={s.inputRow}>
                          <View style={s.inputWrap}>
                            <Text style={s.inputLabel}>En ({unit})</Text>
                            <TextInput style={s.dimInput} value={width} onChangeText={setWidth} keyboardType="decimal-pad" placeholder={unit === 'cm' ? '150' : '1.50'} placeholderTextColor="rgba(255,255,255,0.12)" />
                          </View>
                          <Text style={s.x}>×</Text>
                          <View style={s.inputWrap}>
                            <Text style={s.inputLabel}>Bo'yi ({unit})</Text>
                            <TextInput style={s.dimInput} value={height} onChangeText={setHeight} keyboardType="decimal-pad" placeholder={unit === 'cm' ? '200' : '2.00'} placeholderTextColor="rgba(255,255,255,0.12)" />
                          </View>
                          <TouchableOpacity style={[s.addBtn, rawSqm <= 0 && s.addBtnOff]} onPress={() => addItem(mat)} disabled={rawSqm <= 0}>
                            <Plus size={18} color={rawSqm > 0 ? '#000' : 'rgba(255,255,255,0.15)'} />
                          </TouchableOpacity>
                        </View>
                        {currentSqm > 0 && (
                          <View style={s.liveCalc}><Text style={s.liveCalcText}>{currentSqm.toFixed(2)} → {currentBillable} kv.m = {formatPrice(Math.round(currentPrice * 100) / 100)}</Text></View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
              <View style={{ height: items.length > 0 ? 160 : 40 }} />
            </ScrollView>
          </>
        )}

        {/* Bottom bar */}
        {items.length > 0 && (
          <View style={s.bottom}>
            {showNotes && (
              <View style={s.notesWrap}>
                <TextInput style={s.notesInput} placeholder="Izoh yozing..." placeholderTextColor="rgba(255,255,255,0.2)" value={notes} onChangeText={setNotes} multiline />
              </View>
            )}
            <View style={s.bottomRow}>
              <View>
                <Text style={s.bottomLabel}>{items.length} mahsulot · {totalSqm.toFixed(1)} kv.m</Text>
                <Text style={s.bottomTotal}>{formatPrice(Math.round(totalPrice * 100) / 100)}</Text>
              </View>
              <View style={s.bottomBtns}>
                <TouchableOpacity style={s.noteBtn} onPress={() => setShowNotes(!showNotes)}>
                  <StickyNote size={16} color={notes ? c.accent : 'rgba(255,255,255,0.3)'} />
                </TouchableOpacity>
                <TouchableOpacity style={[s.submitBtn, submitting && { opacity: 0.6 }]} onPress={submitOrder} disabled={submitting}>
                  {submitting ? <ActivityIndicator color="#000" size="small" /> : (
                    <><Send size={14} color="#000" /><Text style={s.submitText}>Yuborish</Text></>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#050508' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 2 },
  countBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  successBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 20, marginBottom: 8, paddingVertical: 14, backgroundColor: 'rgba(0,200,83,0.08)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,200,83,0.15)' },
  successText: { color: '#00C853', fontSize: 15, fontWeight: '700' },
  // Categories grid
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  catCard: { width: '47%', flexGrow: 1, backgroundColor: 'rgba(255,255,255,0.035)', borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', gap: 8 },
  catIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(108,99,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  catCardName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  catCardCount: { fontSize: 12, color: 'rgba(255,255,255,0.35)' },
  // Back button
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 20, paddingVertical: 8 },
  backText: { fontSize: 14, color: '#6C63FF', fontWeight: '600' },
  // Materials list
  listContent: { paddingHorizontal: 16 },
  matCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 10, overflow: 'hidden' },
  matCardExpanded: { borderColor: 'rgba(108,99,255,0.3)', backgroundColor: 'rgba(108,99,255,0.04)' },
  matCardWithItems: { borderColor: 'rgba(0,230,118,0.15)' },
  matRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  matImg: { width: 50, height: 50, borderRadius: 14, backgroundColor: '#111' },
  matImgEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
  matInfo: { flex: 1 },
  matName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  matMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  matPrice: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  matPriceUnit: { fontSize: 11, color: 'rgba(255,255,255,0.3)' },
  matBadge: { backgroundColor: 'rgba(0,230,118,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  matBadgeText: { fontSize: 11, fontWeight: '700', color: '#00E676' },
  expandBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  expandBtnActive: { backgroundColor: '#fff' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 12, gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,230,118,0.08)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0,230,118,0.12)' },
  chipText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  chipsTotal: { fontSize: 13, fontWeight: '700', color: '#00E676', marginLeft: 4 },
  expanded: { paddingHorizontal: 12, paddingBottom: 14 },
  existItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 10, marginBottom: 6 },
  existSize: { fontSize: 14, fontWeight: '600', color: '#fff' },
  existCalc: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  existDel: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,82,82,0.1)', alignItems: 'center', justifyContent: 'center' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  inputWrap: { flex: 1 },
  inputLabel: { fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, fontWeight: '600' },
  dimInput: { height: 48, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 14, fontSize: 20, color: '#fff', textAlign: 'center', fontWeight: '300' },
  x: { fontSize: 18, color: 'rgba(255,255,255,0.12)', paddingBottom: 12 },
  addBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  addBtnOff: { backgroundColor: 'rgba(255,255,255,0.06)' },
  liveCalc: { marginTop: 8, alignItems: 'center' },
  liveCalcText: { fontSize: 13, color: '#6C63FF', fontWeight: '600' },
  // Unit toggle
  unitToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  unitLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
  unitToggle: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 3 },
  unitBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 10 },
  unitBtnActive: { backgroundColor: '#6C63FF' },
  unitBtnText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.4)' },
  unitBtnTextActive: { color: '#fff' },
  // Bottom
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#0a0a0f', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingBottom: Platform.OS === 'ios' ? 28 : 16 },
  notesWrap: { paddingHorizontal: 16, paddingTop: 12 },
  notesInput: { minHeight: 40, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, color: '#fff' },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 14 },
  bottomLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '500' },
  bottomTotal: { fontSize: 24, fontWeight: '800', color: '#fff', marginTop: 2 },
  bottomBtns: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  noteBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  submitBtn: { height: 48, paddingHorizontal: 24, backgroundColor: '#fff', borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  submitText: { fontSize: 15, fontWeight: '800', color: '#000' },
});
