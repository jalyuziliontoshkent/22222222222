import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, Hash, Ruler, Package } from 'lucide-react-native';
import { api } from '../_layout';
import { useTheme, useCurrency } from '../../src/utils/theme';

export default function WorkerCompleted() {
  const c = useTheme();
  const { formatPrice } = useCurrency();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const data = await api('/worker/tasks');
      setTasks(data.filter((t: any) => t.worker_status === 'completed'));
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchTasks(); }, []);

  if (loading) return <SafeAreaView style={s.c}><ActivityIndicator size="large" color={c.accent} style={{ flex: 1 }} /></SafeAreaView>;

  return (
    <SafeAreaView style={s.c}>
      <Text style={s.title}>Bajarilgan</Text>
      <View style={s.countRow}>
        <View style={s.countCard}>
          <Text style={s.countVal}>{tasks.length}</Text>
          <Text style={s.countLabel}>Bajarilgan vazifalar</Text>
        </View>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTasks(); }} tintColor="#fff" />} contentContainerStyle={s.scroll}>
        {tasks.length === 0 ? (
          <View style={s.empty}>
            <Package size={48} color="rgba(255,255,255,0.08)" />
            <Text style={s.emptyText}>Hali bajarilgan vazifalar yo'q</Text>
          </View>
        ) : tasks.map((task, i) => (
          <View key={`${task.order_id}-${task.item_index}`} style={s.card} testID={`completed-${i}`}>
            <View style={s.cardHead}>
              <View style={s.codeBadge}><Hash size={11} color={c.success} /><Text style={s.codeText}>{task.order_code}</Text></View>
              <View style={s.doneBadge}><CheckCircle size={12} color={c.success} /><Text style={s.doneText}>Bajarildi</Text></View>
            </View>
            <Text style={s.material}>{task.material_name}</Text>
            <View style={s.sizeRow}>
              <Ruler size={14} color={c.textSec} />
              <Text style={s.size}>{task.width}m x {task.height}m = {task.sqm} kv.m</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#050508' },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', paddingHorizontal: 24, paddingTop: 16, letterSpacing: -0.5 },
  countRow: { paddingHorizontal: 24, marginTop: 12 },
  countCard: { backgroundColor: 'rgba(0,230,118,0.12)', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: 'rgba(0,230,118,0.15)' },
  countVal: { fontSize: 32, fontWeight: '800', color: '#00E676' },
  countLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginTop: 2 },
  scroll: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: 'rgba(255,255,255,0.4)' },
  card: { backgroundColor: 'rgba(255,255,255,0.035)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', padding: 18, marginBottom: 12 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  codeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,230,118,0.12)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  codeText: { fontSize: 12, fontWeight: '800', color: '#00E676', letterSpacing: 1, fontVariant: ['tabular-nums'] },
  doneBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  doneText: { fontSize: 11, fontWeight: '700', color: '#00E676' },
  material: { fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 8 },
  sizeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  size: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
});
