import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, StatusBar } from 'react-native'
import { supabase } from '@/lib/supabaseClient'
import { useRouter, Link } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Picker } from '@react-native-picker/picker'

const COLORS = {
  primary: '#E8EAF6',
  accent: '#130183',
  background: '#F8F9FB',
  text: '#1C1C1E',
  error: '#ef4444',
  success: '#10b981'
}

export default function Signup() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nom, setNom] = useState('')
  const [role, setRole] = useState('')
  const [telephone, setTelephone] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSignup = async () => {
    setErrorMsg('')
    
    if (!telephone) {
      setErrorMsg('Le numéro de téléphone est obligatoire')
      return
    }

    if (!role) {
      setErrorMsg('Veuillez sélectionner votre rôle')
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nom,
            role,
            telephone
          }
        }
      })

      if (error) {
        setErrorMsg(error.message)
      } else {
        alert('Inscription réussie ! Vérifiez votre mail pour confirmer votre compte.')
        router.push('/auth/login')
      }
    } catch (err) {
      setErrorMsg('Une erreur inattendue s\'est produite')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FB" translucent={false} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.main}>
          {/* Logo/Icône */}
          <View style={styles.iconContainer}>
            <Ionicons name="person-add-outline" size={32} color="white" />
          </View>

          <Text style={styles.title}>Inscription</Text>
          <Text style={styles.subtitle}>Créez votre espace Shooty</Text>

          {errorMsg && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={20} color={COLORS.error} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                placeholder="votre.email@exemple.com"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          {/* Nom Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom et Prénom</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                placeholder="Jean Dupont"
                value={nom}
                onChangeText={setNom}
                style={styles.input}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mot de passe</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                secureTextEntry={!showPassword}
                placeholderTextColor="#9CA3AF"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Telephone Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Téléphone</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="call-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                placeholder="06 12 34 56 78"
                value={telephone}
                onChangeText={setTelephone}
                style={styles.input}
                keyboardType="phone-pad"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          {/* Role Picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Je suis :</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={role}
                onValueChange={setRole}
                style={styles.picker}
              >
                <Picker.Item label="Sélectionner..." value="" />
                <Picker.Item label="Photographe" value="prestataire" />
                <Picker.Item label="Client" value="particulier" />
              </Picker>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            disabled={loading}
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignup}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Ionicons name="checkmark-circle-outline" size={20} color="white" style={{ marginRight: 8 }} />
            )}
            <Text style={styles.buttonText}>
              {loading ? 'Inscription en cours...' : 'S\'inscrire'}
            </Text>
          </TouchableOpacity>

          {/* Lien vers login */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Déjà un compte ? </Text>
            <Link href="/auth/login" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Se connecter</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20
  },
  main: {
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
    padding: 32,
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.08,
    shadowRadius: 60,
    elevation: 8
  },
  iconContainer: {
    width: 64,
    height: 64,
    alignSelf: 'center',
    marginBottom: 24,
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 5
  },
  title: {
    fontWeight: '700',
    fontSize: 32,
    marginBottom: 8,
    textAlign: 'center',
    color: COLORS.accent
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.text + 'AA',
    marginBottom: 32,
    textAlign: 'center'
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginBottom: 24,
    backgroundColor: COLORS.error + '10',
    borderWidth: 1,
    borderColor: COLORS.error + '30',
    borderRadius: 12
  },
  errorText: {
    flex: 1,
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '500'
  },
  inputGroup: {
    marginBottom: 20
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text
  },
  inputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center'
  },
  inputIcon: {
    position: 'absolute',
    left: 14,
    zIndex: 1
  },
  eyeIcon: {
    position: 'absolute',
    right: 14,
    zIndex: 1,
    padding: 4
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 44,
    paddingRight: 44,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    fontSize: 15,
    color: COLORS.text
  },
  pickerWrapper: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    overflow: 'hidden'
  },
  picker: {
    height: 50
  },
  button: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    marginTop: 4,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 4
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24
  },
  footerText: {
    fontSize: 14,
    color: COLORS.text + 'AA'
  },
  footerLink: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '600'
  }
});