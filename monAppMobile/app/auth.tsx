import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  TextInput,
  Pressable,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { ThemedText } from '@/components/themed-text';
import ShootyLogo from '@/components/ShootyLogo';

const COLORS = {
  primary: '#5C6BC0',
  secondary: '#130183',
  surface: '#E8EAF6',
  background: '#F8F9FB',
  text: '#2C3E50',
  textSecondary: '#7F8C8D',
  white: '#FFFFFF',
  error: '#E74C3C',
  inputBorder: '#DDD',
  inputFocus: '#5C6BC0',
};

export default function AuthScreen() {
  const { signIn, signUp, loading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    // Validation email
    if (!formData.email) {
      newErrors.email = 'Email requis';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }

    // Validation password
    if (!formData.password) {
      newErrors.password = 'Mot de passe requis';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Minimum 6 caractères';
    }

    // Validation pour l'inscription
    if (isSignUp) {
      if (!formData.fullName) {
        newErrors.fullName = 'Nom complet requis';
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await signUp(formData.email, formData.password, {
          full_name: formData.fullName,
        });

        if (error) throw error;

        Alert.alert(
          'Compte créé!',
          'Vérifiez votre email pour confirmer votre compte.',
          [{ text: 'OK', onPress: () => setIsSignUp(false) }]
        );
      } else {
        const { data, error } = await signIn(formData.email, formData.password);
        
        if (error) throw error;
        // La navigation sera gérée automatiquement par le AuthContext
      }
    } catch (error: any) {
      Alert.alert(
        'Erreur',
        error.message || 'Une erreur est survenue'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header avec logo */}
          <View style={styles.header}>
            <ShootyLogo />
            <ThemedText style={styles.welcomeText}>
              {isSignUp ? 'Créer votre compte' : 'Bon retour parmi nous'}
            </ThemedText>
            <ThemedText style={styles.subtitleText}>
              {isSignUp 
                ? 'Rejoignez la communauté Shooty'
                : 'Connectez-vous pour continuer'
              }
            </ThemedText>
          </View>

          {/* Formulaire */}
          <View style={styles.form}>
            {isSignUp && (
              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>Nom complet</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    errors.fullName && styles.inputError
                  ]}
                  placeholder="Votre nom complet"
                  value={formData.fullName}
                  onChangeText={(text) => updateFormData('fullName', text)}
                  autoCapitalize="words"
                />
                {errors.fullName && (
                  <ThemedText style={styles.errorText}>{errors.fullName}</ThemedText>
                )}
              </View>
            )}

            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Email</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  errors.email && styles.inputError
                ]}
                placeholder="votre@email.com"
                value={formData.email}
                onChangeText={(text) => updateFormData('email', text)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {errors.email && (
                <ThemedText style={styles.errorText}>{errors.email}</ThemedText>
              )}
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Mot de passe</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  errors.password && styles.inputError
                ]}
                placeholder="Votre mot de passe"
                value={formData.password}
                onChangeText={(text) => updateFormData('password', text)}
                secureTextEntry
                autoCapitalize="none"
              />
              {errors.password && (
                <ThemedText style={styles.errorText}>{errors.password}</ThemedText>
              )}
            </View>

            {isSignUp && (
              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>Confirmer le mot de passe</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    errors.confirmPassword && styles.inputError
                  ]}
                  placeholder="Confirmez votre mot de passe"
                  value={formData.confirmPassword}
                  onChangeText={(text) => updateFormData('confirmPassword', text)}
                  secureTextEntry
                  autoCapitalize="none"
                />
                {errors.confirmPassword && (
                  <ThemedText style={styles.errorText}>{errors.confirmPassword}</ThemedText>
                )}
              </View>
            )}

            {/* Bouton principal */}
            <Pressable
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              <ThemedText style={styles.submitButtonText}>
                {isLoading 
                  ? 'Chargement...'
                  : isSignUp 
                    ? 'Créer mon compte' 
                    : 'Se connecter'
                }
              </ThemedText>
            </Pressable>

            {/* Toggle Sign Up / Sign In */}
            <View style={styles.toggleContainer}>
              <ThemedText style={styles.toggleText}>
                {isSignUp 
                  ? 'Vous avez déjà un compte ?' 
                  : 'Vous n\'avez pas de compte ?'
                }
              </ThemedText>
              <Pressable onPress={() => setIsSignUp(!isSignUp)}>
                <ThemedText style={styles.toggleLink}>
                  {isSignUp ? 'Se connecter' : 'S\'inscrire'}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold' as any,
    color: COLORS.text,
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  form: {
    paddingHorizontal: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600' as any,
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: COLORS.white,
    color: COLORS.text,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.inputBorder,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600' as any,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  toggleText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  toggleLink: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600' as any,
  },
});