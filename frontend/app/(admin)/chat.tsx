import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, FlatList,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send } from 'lucide-react-native';
import { api } from '../_layout';
import { useTheme } from '../../src/utils/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AdminChat() {
  const c = useTheme();
  const [partners, setPartners] = useState<any[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const intervalRef = useRef<any>(null);

  const fetchPartners = useCallback(async () => {
    try {
      const data = await api('/chat/partners');
      setPartners(data);
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) setUserId(JSON.parse(userStr).id);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const fetchMessages = useCallback(async (partnerId: string) => {
    try {
      const data = await api(`/messages/${partnerId}`);
      setMessages(data);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchPartners(); }, []);

  useEffect(() => {
    if (selectedPartner) {
      fetchMessages(selectedPartner.id);
      intervalRef.current = setInterval(() => fetchMessages(selectedPartner.id), 10000);
      return () => clearInterval(intervalRef.current);
    }
  }, [selectedPartner]);

  const sendMessage = async () => {
    if (!text.trim() || !selectedPartner) return;
    try {
      await api('/messages', {
        method: 'POST',
        body: JSON.stringify({ receiver_id: selectedPartner.id, text: text.trim() }),
      });
      setText('');
      fetchMessages(selectedPartner.id);
    } catch (e) { console.error(e); }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color="#fff" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  if (selectedPartner) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
        <View style={[styles.chatHeader, { borderBottomColor: c.cardBorder }]}>
          <TouchableOpacity testID="chat-back-btn" onPress={() => { setSelectedPartner(null); clearInterval(intervalRef.current); fetchPartners(); }} style={styles.backBtn}>
            <ArrowLeft size={22} color={c.text} />
          </TouchableOpacity>
          <View style={[styles.chatAvatar, { backgroundColor: c.accentSoft }]}>
            <Text style={[styles.chatAvatarText, { color: c.accent }]}>{selectedPartner.name?.charAt(0)?.toUpperCase()}</Text>
          </View>
          <View style={styles.chatHeaderInfo}>
            <Text style={[styles.chatHeaderName, { color: c.text }]}>{selectedPartner.name}</Text>
            <Text style={[styles.chatHeaderSub, { color: c.textSec }]}>Diler</Text>
          </View>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
          <ScrollView
            ref={scrollRef}
            style={styles.messagesArea}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {messages.length === 0 ? (
              <View style={styles.emptyChat}>
                <Text style={[styles.emptyChatText, { color: c.textSec }]}>Hali xabarlar yo'q</Text>
                <Text style={[styles.emptyChatSub, { color: c.textTer }]}>Birinchi xabarni yozing!</Text>
              </View>
            ) : messages.map(msg => (
              <View
                key={msg.id}
                style={[styles.bubble, msg.sender_id === userId ? { alignSelf: 'flex-end', backgroundColor: c.accent, borderBottomRightRadius: 4 } : { alignSelf: 'flex-start', backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, borderBottomLeftRadius: 4 }]}
              >
                <Text style={[styles.bubbleText, { color: msg.sender_id === userId ? '#fff' : c.text }]}>
                  {msg.text}
                </Text>
                <Text style={[styles.bubbleTime, { color: msg.sender_id === userId ? 'rgba(255,255,255,0.6)' : c.textTer }]}>
                  {new Date(msg.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            ))}
          </ScrollView>

          <View style={[styles.inputArea, { backgroundColor: c.bg, borderTopColor: c.cardBorder }]}>
            <TextInput
              testID="chat-message-input"
              style={[styles.chatInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
              placeholder="Xabar yozing..."
              placeholderTextColor={c.placeholder}
              value={text}
              onChangeText={setText}
              multiline
            />
            <TouchableOpacity testID="chat-send-btn" style={[styles.sendBtn, { backgroundColor: c.accent }]} onPress={sendMessage}>
              <Send size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <Text style={[styles.title, { color: c.text }]}>Chat</Text>
      <ScrollView contentContainerStyle={styles.partnerList}>
        {partners.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: c.textSec }]}>Dilerlar topilmadi</Text>
          </View>
        ) : partners.map(p => (
          <TouchableOpacity
            key={p.id} testID={`chat-partner-${p.id}`}
            style={[styles.partnerCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}
            onPress={() => setSelectedPartner(p)}
            activeOpacity={0.7}
          >
            <View style={[styles.partnerAvatar, { backgroundColor: c.accentSoft }]}>
              <Text style={[styles.partnerAvatarText, { color: c.accent }]}>{p.name?.charAt(0)?.toUpperCase()}</Text>
            </View>
            <View style={styles.partnerInfo}>
              <Text style={[styles.partnerName, { color: c.text }]}>{p.name}</Text>
              <Text style={[styles.partnerLastMsg, { color: c.textSec }]} numberOfLines={1}>
                {p.last_message || 'Xabar yo\'q'}
              </Text>
            </View>
            <View style={styles.partnerMeta}>
              {p.last_message_time ? (
                <Text style={[styles.partnerTime, { color: c.textTer }]}>
                  {new Date(p.last_message_time).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              ) : null}
              {p.unread_count > 0 ? (
                <View style={[styles.unreadBadge, { backgroundColor: c.accent }]}>
                  <Text style={styles.unreadText}>{p.unread_count}</Text>
                </View>
              ) : null}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050508' },
  title: { fontSize: 24, fontWeight: '300', color: '#fff', paddingHorizontal: 24, paddingTop: 16, letterSpacing: -0.5 },
  partnerList: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100 },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16, color: 'rgba(255,255,255,0.3)' },
  partnerCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)', marginBottom: 8, gap: 14,
  },
  partnerAvatar: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  partnerAvatarText: { fontSize: 20, fontWeight: '600', color: '#fff' },
  partnerInfo: { flex: 1 },
  partnerName: { fontSize: 16, fontWeight: '500', color: '#fff' },
  partnerLastMsg: { fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 2 },
  partnerMeta: { alignItems: 'flex-end', gap: 6 },
  partnerTime: { fontSize: 11, color: 'rgba(255,255,255,0.3)' },
  unreadBadge: {
    minWidth: 22, height: 22, borderRadius: 11, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  unreadText: { fontSize: 12, fontWeight: '700', color: '#000' },
  chatHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', gap: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  chatAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  chatAvatarText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  chatHeaderInfo: {},
  chatHeaderName: { fontSize: 16, fontWeight: '500', color: '#fff' },
  chatHeaderSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  messagesArea: { flex: 1 },
  messagesContent: { padding: 16, gap: 8 },
  emptyChat: { alignItems: 'center', paddingTop: 80 },
  emptyChatText: { fontSize: 16, color: 'rgba(255,255,255,0.3)' },
  emptyChatSub: { fontSize: 13, color: 'rgba(255,255,255,0.2)', marginTop: 4 },
  bubble: { maxWidth: '80%', borderRadius: 20, padding: 12, paddingBottom: 6 },
  bubbleSent: {
    alignSelf: 'flex-end', backgroundColor: '#fff', borderBottomRightRadius: 4,
  },
  bubbleReceived: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  bubbleTextSent: { color: '#000' },
  bubbleTextReceived: { color: '#fff' },
  bubbleTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  bubbleTimeSent: { color: 'rgba(0,0,0,0.4)' },
  bubbleTimeReceived: { color: 'rgba(255,255,255,0.3)' },
  inputArea: {
    flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', gap: 10,
    backgroundColor: 'rgba(5,5,5,0.9)',
  },
  chatInput: {
    flex: 1, minHeight: 44, maxHeight: 100, backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 18, paddingVertical: 10, fontSize: 15, color: '#fff',
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
});
