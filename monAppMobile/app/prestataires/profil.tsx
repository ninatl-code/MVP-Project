import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNavigation } from 'expo-router';
import Header from '../../components/HeaderPresta';

interface Profile {
  nom: string;
  email: string;
  telephone: string;
  bio: string;
  ville_id: string;
  photos?: any;
}

export default function ProfilPrestataire() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    telephone: '',
    bio: ''
  });
  const navigation = useNavigation();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!error && data) {
      setProfile(data);
      setFormData({
        nom: data.nom || '',
        email: data.email || '',
        telephone: data.telephone || '',
        bio: data.bio || ''
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update(formData)
      .eq('id', user.id);

    if (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder les modifications');
    } else {
      Alert.alert('Succès', 'Profil mis à jour avec succès');
      setEditMode(false);
      fetchProfile();
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#5C6BC0" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Mon Profil</Text>
          {!editMode ? (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setEditMode(true)}
            >
              <Text style={styles.editButtonText}>✏️ Modifier</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setEditMode(false);
                  setFormData({
                    nom: profile?.nom || '',
                    email: profile?.email || '',
                    telephone: profile?.telephone || '',
                    bio: profile?.bio || ''
                  });
                }}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>💾 Sauvegarder</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Nom</Text>
            {editMode ? (
              <TextInput
                style={styles.input}
                value={formData.nom}
                onChangeText={(text) => setFormData({ ...formData, nom: text })}
                placeholder="Votre nom"
              />
            ) : (
              <Text style={styles.value}>{profile?.nom || 'Non renseigné'}</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            {editMode ? (
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                placeholder="email@example.com"
                keyboardType="email-address"
              />
            ) : (
              <Text style={styles.value}>{profile?.email || 'Non renseigné'}</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Téléphone</Text>
            {editMode ? (
              <TextInput
                style={styles.input}
                value={formData.telephone}
                onChangeText={(text) => setFormData({ ...formData, telephone: text })}
                placeholder="0612345678"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.value}>{profile?.telephone || 'Non renseigné'}</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Biographie</Text>
            {editMode ? (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.bio}
                onChangeText={(text) => setFormData({ ...formData, bio: text })}
                placeholder="Parlez de vous et de vos services..."
                multiline
                numberOfLines={4}
              />
            ) : (
              <Text style={styles.value}>{profile?.bio || 'Non renseignée'}</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB'
  },
  scrollView: {
    flex: 1
  },
  content: {
    padding: 24
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1C1C1E'
  },
  editButton: {
    backgroundColor: '#5C6BC0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12
  },
  cancelButton: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600'
  },
  saveButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  formGroup: {
    marginBottom: 24
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8
  },
  value: {
    fontSize: 16,
    color: '#1F2937'
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937'
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top'
  }
});
