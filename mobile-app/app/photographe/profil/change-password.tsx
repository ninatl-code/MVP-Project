import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/Colors';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const validatePassword = (password: string): boolean => {
    if (password.length < 8) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 8 caractères');
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins une majuscule');
      return false;
    }
    if (!/[a-z]/.test(password)) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins une minuscule');
      return false;
    }
    if (!/[0-9]/.test(password)) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins un chiffre');
      return false;
    }
    return true;
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    if (!validatePassword(newPassword)) {
      return;
    }

    try {
      setLoading(true);

      // Update password in Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      Alert.alert(
        'Succès',
        'Votre mot de passe a été modifié avec succès',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error changing password:', error);
      Alert.alert(
        'Erreur',
        error.message || 'Impossible de modifier le mot de passe'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Changer le mot de passe</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Password Requirements */}
        <View style={styles.requirementsCard}>
          <Text style={styles.requirementsTitle}>
            Le mot de passe doit contenir :
          </Text>
          <View style={styles.requirementRow}>
            <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.textLight} />
            <Text style={styles.requirementText}>Au moins 8 caractères</Text>
          </View>
          <View style={styles.requirementRow}>
            <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.textLight} />
            <Text style={styles.requirementText}>Une majuscule</Text>
          </View>
          <View style={styles.requirementRow}>
            <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.textLight} />
            <Text style={styles.requirementText}>Une minuscule</Text>
          </View>
          <View style={styles.requirementRow}>
            <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.textLight} />
            <Text style={styles.requirementText}>Un chiffre</Text>
          </View>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* New Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nouveau mot de passe</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Entrez votre nouveau mot de passe"
                secureTextEntry={!showNew}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowNew(!showNew)}
              >
                <Ionicons
                  name={showNew ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={COLORS.textLight}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirmer le mot de passe</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirmez votre mot de passe"
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirm(!showConfirm)}
              >
                <Ionicons
                  name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={COLORS.textLight}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleChangePassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="lock-closed" size={20} color="white" />
                <Text style={styles.submitButtonText}>Modifier le mot de passe</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  requirementsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 13,
    color: COLORS.textLight,
    marginLeft: 8,
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  eyeButton: {
    padding: 12,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
