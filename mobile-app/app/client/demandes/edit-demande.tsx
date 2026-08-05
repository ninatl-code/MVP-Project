import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, SafeAreaView, Alert
} from 'react-native';
import { supabase } from '@/lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const COLORS = {
  primary: '#5C6BC0',
  accent: '#130183',
  background: '#FFFFFF',
  backgroundLight: '#F7F7F7',
  text: '#222222',
  textLight: '#717171',
  border: '#EBEBEB',
  error: '#EF4444',
};

export default function EditDemande() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    titre: '',
    categorie: '',
    description: '',
    date_souhaitee: '',
    ville: '',
    lieu: '',
    duree_estimee: '2',
    budget_max: '',
    instructions_speciales: '',
  });

  useEffect(() => {
    if (id) loadDemande();
  }, [id]);

  const loadDemande = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/auth/login'); return; }

    const { data, error } = await supabase
      .from('demandes_client')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      Alert.alert('Erreur', 'Demande introuvable.');
      router.back();
      return;
    }

    if (data.statut !== 'ouverte') {
      Alert.alert('Non modifiable', 'Cette demande ne peut plus être modifiée.');
      router.back();
      return;
    }

    setForm({
      titre: data.titre || '',
      categorie: data.categorie || '',
      description: data.description || '',
      date_souhaitee: data.date_souhaitee || '',
      ville: data.ville || '',
      lieu: data.lieu || '',
      duree_estimee: data.duree_estimee_heures?.toString() || '2',
      budget_max: data.budget_max?.toString() || '',
      instructions_speciales: data.instructions_speciales || '',
    });
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!form.titre.trim() || !form.description.trim()) {
      Alert.alert('Champs requis', 'Le titre et la description sont obligatoires.');
      return;
    }
    setSubmitting(true);

    const { error } = await supabase
      .from('demandes_client')
      .update({
        titre: form.titre.trim(),
        description: form.description.trim(),
        date_souhaitee: form.date_souhaitee || null,
        ville: form.ville.trim() || null,
        lieu: form.lieu.trim() || null,
        duree_estimee_heures: parseInt(form.duree_estimee, 10) || null,
        budget_max: form.budget_max ? parseFloat(form.budget_max) : null,
        instructions_speciales: form.instructions_speciales.trim() || null,
      })
      .eq('id', id);

    setSubmitting(false);

    if (error) {
      Alert.alert('Erreur', 'Impossible de modifier la demande.');
    } else {
      Alert.alert('Succès', 'Demande mise à jour.');
      router.back();
    }
  };

  const setField = (key: keyof typeof form, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[COLORS.accent, COLORS.primary]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Modifier la demande</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field label="Titre *">
          <TextInput
            style={styles.input}
            value={form.titre}
            onChangeText={v => setField('titre', v)}
            placeholder="Titre de votre demande"
            placeholderTextColor="#9CA3AF"
          />
        </Field>

        <Field label="Description *">
          <TextInput
            style={[styles.input, styles.textarea]}
            value={form.description}
            onChangeText={v => setField('description', v)}
            placeholder="Décrivez votre besoin en détail..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </Field>

        <Field label="Date souhaitée">
          <TextInput
            style={styles.input}
            value={form.date_souhaitee}
            onChangeText={v => setField('date_souhaitee', v)}
            placeholder="AAAA-MM-JJ"
            placeholderTextColor="#9CA3AF"
          />
        </Field>

        <Field label="Ville">
          <TextInput
            style={styles.input}
            value={form.ville}
            onChangeText={v => setField('ville', v)}
            placeholder="Casablanca, Rabat..."
            placeholderTextColor="#9CA3AF"
          />
        </Field>

        <Field label="Lieu précis">
          <TextInput
            style={styles.input}
            value={form.lieu}
            onChangeText={v => setField('lieu', v)}
            placeholder="Adresse, salle de réception..."
            placeholderTextColor="#9CA3AF"
          />
        </Field>

        <Field label="Durée estimée (heures)">
          <TextInput
            style={styles.input}
            value={form.duree_estimee}
            onChangeText={v => setField('duree_estimee', v)}
            placeholder="2"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
          />
        </Field>

        <Field label="Budget maximum (MAD)">
          <TextInput
            style={styles.input}
            value={form.budget_max}
            onChangeText={v => setField('budget_max', v)}
            placeholder="1000"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
          />
        </Field>

        <Field label="Instructions spéciales">
          <TextInput
            style={[styles.input, styles.textarea]}
            value={form.instructions_speciales}
            onChangeText={v => setField('instructions_speciales', v)}
            placeholder="Demandes particulières, contraintes..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </Field>

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator color="#fff" size="small" />
            : <Ionicons name="save-outline" size={18} color="#fff" />
          }
          <Text style={styles.submitBtnText}>Enregistrer les modifications</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.text,
    backgroundColor: COLORS.backgroundLight,
  },
  textarea: { minHeight: 100 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.accent, paddingVertical: 15, borderRadius: 12,
    marginTop: 8, gap: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
