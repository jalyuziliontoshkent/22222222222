import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send } from 'lucide-react-native';
import { api } from '../_layout';
import { useTheme } from '../../src/utils/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DealerChat() {
  const c = useTheme();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [adminId, setAdminId] = useState('');
  const [adminName, setAdminName] = useState('Admin');
  const scrollRef = useRef<ScrollView>(null);
  const intervalRef = useRef<any>(null);

  const init = useCallback(async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) setUserId(JSON.parse(userStr).id);
      const partners = await api('/chat/partners');
      if (partners.length > 0) {
        setAdminId(partners[0].id);
        setAdminName(partners[0].name || 'Admin');
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!adminId) return;
    try {
      const data = await api(`/messages/${adminId}`);
      setMessages(data);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
    } catch (e) { console.error(e); }
  }, [adminId]);

  useEffect(() => { init(); }, []);

  useEffect(() => {
    if (adminId) {
      fetchMessages();
      intervalRef.current = setInterval(fetchMessages, 10000);
      return () => clearInterval(intervalRef.current);
    }
  }, [adminId]);

  const sendMessage = async () => {
    if (!text.trim() || !adminId) return;
    try {
      await api('/messages', {
        method: 'POST',
        body: JSON.stringify({ receiver_id: adminId, text: text.trim() }),
      });
      setText('');
      fetchMessages();
    } catch (e) { console.error(e); }
  };

  if (loading) {
    return <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}><ActivityIndicator size="large" color={c.accent} style={{ flex: 1 }} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      <View style={[styles.chatHeader, { borderBottomColor: c.cardBorder }]}>
        <View style={[styles.chatAvatar, { backgroundColor: c.accentSoft }]}>
          <Text style={[styles.chatAvatarText, { color: c.accent }]}>{adminName.charAt(0).toUpperCase()}</Text>
        </View>
        <View>
          <Text style={[styles.chatHeaderName, { color: c.text }]}>{adminName}</Text>
          <Text style={[styles.chatHeaderSub, { color: c.textSec }]}>Administrator</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          style={styles.messagesArea}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyChat}>
              <Text style={[styles.emptyChatText, { color: c.textSec }]}>Admin bilan suhbatni boshlang</Text>
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
            testID="dealer-chat-input"
            style={[styles.chatInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
            placeholder="Xabar yozing..."
            placeholderTextColor={c.placeholder}
            value={text}
            onChangeText={setText}
            multiline
          />
          <TouchableOpacity testID="dealer-chat-send-btn" style={[styles.sendBtn, { backgroundColor: c.accent }]} onPress={sendMessage}>
            <Send size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050508' },
  chatHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', gap: 14,
  },
  chatAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  chatAvatarText: { fontSize: 18, fontWeight: '600', color: '#fff' },
  chatHeaderName: { fontSize: 16, fontWeight: '500', color: '#fff' },
  chatHeaderSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  messagesArea: { flex: 1 },
  messagesContent: { padding: 16, gap: 8 },
  emptyChat: { alignItems: 'center', paddingTop: 80 },
  emptyChatText: { fontSize: 16, color: 'rgba(255,255,255,0.3)' },
  bubble: { maxWidth: '80%', borderRadius: 20, padding: 12, paddingBottom: 6 },
  bubbleSent: { alignSelf: 'flex-end', backgroundColor: '#fff', borderBottomRightRadius: 4 },
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
