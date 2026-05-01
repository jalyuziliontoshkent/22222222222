import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { LogOut, Hash, CheckCircle, Ruler, Package } from 'lucide-react-native';
import { api } from '../_layout';
import { useTheme } from '../../src/utils/theme';

export default function WorkerTasks() {
  const c = useTheme();
  const { formatPrice } = useCurrency();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('');
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());
  const router = useRouter();

  const fetchTasks = useCallback(async () => {
    try {
      const data = await api('/worker/tasks');
      setTasks(data.filter((t: any) => t.worker_status !== 'completed'));
      const u = await AsyncStorage.getItem('user');
      if (u) setUserName(JSON.parse(u).name || 'Ishchi');
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchTasks(); }, []);

  const completeTask = async (orderId: string, itemIdx: number) => {
    const key = `${orderId}-${itemIdx}`;
    if (completingIds.has(key)) return;
    setCompletingIds(prev => new Set(prev).add(key));
    try {
      await api(`/worker/tasks/${orderId}/${itemIdx}/complete`, { method: 'PUT' });
      Alert.alert('Bajarildi!', 'Vazifa muvaffaqiyatli tugallandi');
      fetchTasks();
    } catch (e) { console.error(e); }
    finally {
      setCompletingIds(prev => { const next = new Set(prev); next.delete(key); return next; });
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['token', 'user']);
    router.replace('/');
  };

  if (loading) return <SafeAreaView style={s.c}><ActivityIndicator size="large" color={c.accent} style={{ flex: 1 }} /></SafeAreaView>;

  return (
    <SafeAreaView style={s.c}>
      <View style={s.header}>
        <View>
          <Text style={s.hi}>Salom</Text>
          <Text style={s.name}>{userName}</Text>
        </View>
        <TouchableOpacity testID="worker-logout-btn" onPress={handleLogout} style={s.logoutBtn}>
          <LogOut size={20} color="rgba(255,255,255,0.4)" />
        </TouchableOpacity>
      </View>
      <View style={s.countRow}>
        <View style={s.countCard}>
          <Text style={s.countVal}>{tasks.length}</Text>
          <Text style={s.countLabel}>Faol vazifalar</Text>
        </View>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTasks(); }} tintColor="#fff" />} contentContainerStyle={s.scroll}>
        {tasks.length === 0 ? (
          <View style={s.empty}>
            <Package size={48} color="rgba(255,255,255,0.08)" />
            <Text style={s.emptyText}>Hozircha vazifalar yo'q</Text>
          </View>
        ) : tasks.map((task, i) => (
          <View key={`${task.order_id}-${task.item_index}`} style={s.taskCard} testID={`task-${i}`}>
            <View style={s.taskHead}>
              <View style={s.codeBadge}><Hash size={11} color={c.accent} /><Text style={s.codeText}>{task.order_code}</Text></View>
              <Text style={s.taskDealer}>{task.dealer_name}</Text>
            </View>
            <Text style={s.materialName}>{task.material_name}</Text>
            <View style={s.sizeRow}>
              <Ruler size={14} color={c.textSec} />
              <Text style={s.sizeText}>{task.width}m x {task.height}m = {task.sqm} kv.m</Text>
            </View>
            {task.notes ? <Text style={s.notes}>{task.notes}</Text> : null}
            <TouchableOpacity testID={`complete-${i}`} style={s.completeBtn} onPress={() => completeTask(task.order_id, task.item_index)}>
              <CheckCircle size={18} color="#000" />
              <Text style={s.completeBtnText}>Bajarildi</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#050508' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16 },
  hi: { fontSize: 13, color: '#FFFFFF'Sec, fontWeight: '500' },
  name: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  logoutBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.035)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  countRow: { paddingHorizontal: 24, marginBottom: 8 },
  countCard: { backgroundColor: 'rgba(108,99,255,0.15)', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: 'rgba(108,99,255,0.15)' },
  countVal: { fontSize: 32, fontWeight: '800', color: '#6C63FF' },
  countLabel: { fontSize: 12, color: '#FFFFFF'Sec, fontWeight: '600', marginTop: 2 },
  scroll: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: '#FFFFFF'Ter },
  taskCard: { backgroundColor: 'rgba(255,255,255,0.035)', borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', padding: 18, marginBottom: 14 },
  taskHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  codeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(108,99,255,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  codeText: { fontSize: 12, fontWeight: '800', color: '#6C63FF', letterSpacing: 1, fontVariant: ['tabular-nums'] },
  taskDealer: { fontSize: 12, color: '#FFFFFF'Sec },
  materialName: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 8 },
  sizeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sizeText: { fontSize: 14, color: '#FFFFFF'Sec },
  notes: { fontSize: 13, color: '#FFFFFF'Ter, marginTop: 8, fontStyle: 'italic' },
  completeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, backgroundColor: '#00E676', borderRadius: 26, marginTop: 16 },
  completeBtnText: { fontSize: 15, fontWeight: '700', color: '#000' },
});
