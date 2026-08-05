import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, FlatList, KeyboardAvoidingView, Platform, Modal
} from 'react-native';
import { supabase } from '@/lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';

const COLORS = {
  primary: '#5C6BC0',
  accent: '#130183',
  background: '#FFFFFF',
  backgroundLight: '#F7F7F7',
  text: '#222222',
  textLight: '#717171',
  border: '#EBEBEB',
  success: '#10B981',
  error: '#EF4444',
};

const CATEGORIES = [
  { value: 'general', label: 'Question générale' },
  { value: 'paiement', label: 'Paiement' },
  { value: 'reservation', label: 'Réservation' },
  { value: 'compte', label: 'Compte' },
  { value: 'litige', label: 'Litige' },
  { value: 'technique', label: 'Problème technique' },
  { value: 'autre', label: 'Autre' },
];

const STATUT_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  ouvert:   { label: 'Ouvert',   color: '#1E40AF', bg: '#DBEAFE' },
  en_cours: { label: 'En cours', color: '#92400E', bg: '#FEF3C7' },
  resolu:   { label: 'Résolu',   color: '#065F46', bg: '#D1FAE5' },
  ferme:    { label: 'Fermé',    color: '#4B5563', bg: '#F3F4F6' },
};

export default function SupportScreen() {
  const router = useRouter();
  const { profileId, activeRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [newSujet, setNewSujet] = useState('');
  const [newCategorie, setNewCategorie] = useState('general');
  const [newFirstMessage, setNewFirstMessage] = useState('');
  const [creating, setCreating] = useState(false);
  const channelRef = useRef<any>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (profileId) fetchTickets();
  }, [profileId]);

  useEffect(() => {
    if (!selectedTicket) return;
    loadMessages();

    const channel = supabase
      .channel(`ticket-${selectedTicket.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${selectedTicket.id}` },
        (payload) => {
          setMessages(prev => prev.some(m => m.id === payload.new.id) ? prev : [...prev, payload.new]);
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
      )
      .subscribe();
    channelRef.current = channel;

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [selectedTicket]);

  const fetchTickets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', profileId)
      .order('created_at', { ascending: false });

    setTickets(error ? [] : data || []);
    setLoading(false);
  };

  const loadMessages = async () => {
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', selectedTicket.id)
      .order('created_at', { ascending: true });
    setMessages(data || []);
  };

  const handleCreateTicket = async () => {
    if (!newSujet.trim() || !newFirstMessage.trim() || creating) return;
    setCreating(true);

    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .insert({
        user_id: profileId,
        role: activeRole === 'photographe' ? 'photographe' : 'client',
        sujet: newSujet.trim(),
        categorie: newCategorie,
        statut: 'ouvert',
      })
      .select()
      .single();

    if (ticketError || !ticket) {
      setCreating(false);
      return;
    }

    await supabase.from('support_messages').insert({
      ticket_id: ticket.id,
      sender_id: profileId,
      is_admin: false,
      contenu: newFirstMessage.trim(),
    });

    setCreating(false);
    setShowNewTicketModal(false);
    setNewSujet('');
    setNewFirstMessage('');
    setNewCategorie('general');
    await fetchTickets();
    setSelectedTicket(ticket);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedTicket || sending) return;
    setSending(true);
    await supabase.from('support_messages').insert({
      ticket_id: selectedTicket.id,
      sender_id: profileId,
      is_admin: false,
      contenu: newMessage.trim(),
    });
    setNewMessage('');
    setSending(false);
  };

  const isClosed = (ticket: any) => ['ferme', 'resolu'].includes(ticket?.statut);

  // === Ticket Detail View ===
  if (selectedTicket) {
    const statusInfo = STATUT_STYLES[selectedTicket.statut] || STATUT_STYLES.ouvert;
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={[COLORS.accent, COLORS.primary]} style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedTicket(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, paddingHorizontal: 12 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{selectedTicket.sujet}</Text>
            <View style={[styles.statusBadgeSmall, { backgroundColor: statusInfo.bg }]}>
              <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
            </View>
          </View>
        </LinearGradient>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => {
              const isMe = !item.is_admin;
              return (
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleAdmin]}>
                  <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.contenu}</Text>
                  <Text style={styles.bubbleTime}>
                    {new Date(item.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              );
            }}
          />
          {!isClosed(selectedTicket) && (
            <View style={styles.inputBar}>
              <TextInput
                style={styles.msgInput}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Votre message..."
                placeholderTextColor="#9CA3AF"
                multiline
                maxLength={1000}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!newMessage.trim() || sending) && styles.sendBtnDisabled]}
                onPress={handleSend}
                disabled={!newMessage.trim() || sending}
              >
                {sending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Ionicons name="send" size={18} color="#fff" />
                }
              </TouchableOpacity>
            </View>
          )}
          {isClosed(selectedTicket) && (
            <View style={styles.closedBanner}>
              <Text style={styles.closedBannerText}>Ce ticket est {selectedTicket.statut === 'resolu' ? 'résolu' : 'fermé'}.</Text>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // === Tickets List ===
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[COLORS.accent, COLORS.primary]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Support</Text>
        <TouchableOpacity onPress={() => setShowNewTicketModal(true)} style={styles.newBtn}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : tickets.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="help-buoy-outline" size={56} color={COLORS.border} />
          <Text style={styles.emptyTitle}>Aucun ticket</Text>
          <Text style={styles.emptyText}>Créez un ticket pour contacter le support.</Text>
          <TouchableOpacity style={styles.createBtn} onPress={() => setShowNewTicketModal(true)}>
            <Text style={styles.createBtnText}>Nouveau ticket</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => {
            const statusInfo = STATUT_STYLES[item.statut] || STATUT_STYLES.ouvert;
            return (
              <TouchableOpacity style={styles.ticketCard} onPress={() => setSelectedTicket(item)}>
                <View style={styles.ticketTop}>
                  <Text style={styles.ticketSujet} numberOfLines={1}>{item.sujet}</Text>
                  <View style={[styles.statusBadgeSmall, { backgroundColor: statusInfo.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                  </View>
                </View>
                <View style={styles.ticketMeta}>
                  <Text style={styles.ticketCat}>{CATEGORIES.find(c => c.value === item.categorie)?.label || item.categorie}</Text>
                  <Text style={styles.ticketDate}>
                    {new Date(item.created_at).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} style={{ position: 'absolute', right: 14, top: '50%' }} />
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* New Ticket Modal */}
      <Modal visible={showNewTicketModal} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Nouveau ticket</Text>
                <TouchableOpacity onPress={() => setShowNewTicketModal(false)}>
                  <Ionicons name="close" size={22} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalLabel}>Sujet *</Text>
              <TextInput
                style={styles.modalInput}
                value={newSujet}
                onChangeText={setNewSujet}
                placeholder="Résumez votre problème"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.modalLabel}>Catégorie</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[styles.catChip, newCategorie === cat.value && styles.catChipActive]}
                    onPress={() => setNewCategorie(cat.value)}
                  >
                    <Text style={[styles.catChipText, newCategorie === cat.value && styles.catChipTextActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.modalLabel}>Message *</Text>
              <TextInput
                style={[styles.modalInput, { height: 100, textAlignVertical: 'top' }]}
                value={newFirstMessage}
                onChangeText={setNewFirstMessage}
                placeholder="Décrivez votre problème en détail..."
                placeholderTextColor="#9CA3AF"
                multiline
              />

              <TouchableOpacity
                style={[styles.createBtn, creating && { opacity: 0.6 }]}
                onPress={handleCreateTicket}
                disabled={creating}
              >
                {creating
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.createBtnText}>Envoyer</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: { padding: 4 },
  newBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: '#fff', textAlign: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: 12 },
  emptyText: { fontSize: 14, color: COLORS.textLight, marginTop: 6, textAlign: 'center' },
  ticketCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  ticketTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, paddingRight: 24 },
  ticketSujet: { fontSize: 15, fontWeight: '600', color: COLORS.text, flex: 1, marginRight: 8 },
  ticketMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ticketCat: { fontSize: 12, color: COLORS.textLight },
  ticketDate: { fontSize: 12, color: COLORS.textLight },
  statusBadgeSmall: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
  bubble: { maxWidth: '80%', borderRadius: 16, padding: 10, marginBottom: 8 },
  bubbleMe: { alignSelf: 'flex-end', backgroundColor: COLORS.accent },
  bubbleAdmin: { alignSelf: 'flex-start', backgroundColor: COLORS.backgroundLight },
  bubbleText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  bubbleTextMe: { color: '#fff' },
  bubbleTime: { fontSize: 10, color: 'rgba(0,0,0,0.3)', marginTop: 4, alignSelf: 'flex-end' },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 8,
    borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: '#fff',
  },
  msgInput: {
    flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, color: COLORS.text,
    maxHeight: 120, backgroundColor: COLORS.backgroundLight,
  },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  closedBanner: { padding: 14, backgroundColor: '#F3F4F6', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border },
  closedBannerText: { fontSize: 14, color: COLORS.textLight },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  modalLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  modalInput: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.text,
    backgroundColor: COLORS.backgroundLight, marginBottom: 14,
  },
  catChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: COLORS.backgroundLight, marginRight: 8, borderWidth: 1, borderColor: COLORS.border,
  },
  catChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  catChipText: { fontSize: 12, color: COLORS.text, fontWeight: '500' },
  catChipTextActive: { color: '#fff' },
  createBtn: {
    backgroundColor: COLORS.accent, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 4,
  },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
