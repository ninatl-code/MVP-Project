import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, StatusBar, Modal } from 'react-native'
import { supabase } from '@/lib/supabaseClient'
import { useRouter, Link } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

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
  const [roles, setRoles] = useState<string[]>([])
  const [telephone, setTelephone] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  const toggleRole = (roleValue: string) => {
    setRoles(prevRoles => {
      if (prevRoles.includes(roleValue)) {
        return prevRoles.filter(r => r !== roleValue)
      } else {
        return [...prevRoles, roleValue]
      }
    })
  }

  const handleSignup = async () => {
    setErrorMsg('')
    
    if (!telephone) {
      setErrorMsg('Le numéro de téléphone est obligatoire')
      return
    }

    if (roles.length === 0) {
      setErrorMsg('Veuillez sélectionner au moins un profil')
      return
    }

    setLoading(true)

    try {
      // 1. Créer le compte utilisateur avec le rôle principal
      const primaryRole = roles.includes('particulier') ? 'particulier' : roles[0]
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nom,
            telephone
          }
        }
      })

      if (authError) {
        setErrorMsg(authError.message)
        return
      }

      // 2. Si l'utilisateur a choisi les 2 rôles, créer 2 profils
      if (authData.user && roles.length === 2) {
        const userId = authData.user.id

        // Créer le profil photographe (UUID auto-généré par Supabase)
        const { error: prestaError } = await supabase
          .from('profiles')
          .insert({
            auth_user_id: userId,
            nom,
            email,
            telephone,
            role: 'photographe'
          })

        if (prestaError) {
          console.error('Erreur création profil photographe:', prestaError)
        }

        // Créer le profil client (UUID auto-généré par Supabase)
        const { error: clientError } = await supabase
          .from('profiles')
          .insert({
            auth_user_id: userId,
            nom,
            email,
            telephone,
            role: 'particulier'
          })

        if (clientError) {
          console.error('Erreur création profil client:', clientError)
        }
      } else if (authData.user) {
        // 3. Si un seul rôle, créer un seul profil (avec id = auth_user_id pour compatibilité)
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            auth_user_id: authData.user.id,
            nom,
            email,
            telephone,
            role: primaryRole
          })

        if (profileError) {
          console.error('Erreur création profil:', profileError)
        }
      }

      // Afficher le modal de succès
      setShowSuccessModal(true)

    } catch (err) {
      setErrorMsg('Une erreur inattendue s\'est produite')
      console.error('Erreur signup:', err)
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

          {/* Role Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Je suis : (vous pouvez sélectionner les deux)</Text>
            <View style={styles.roleSelector}>
              <TouchableOpacity
                style={[styles.roleButton, roles.includes('photographe') && styles.roleButtonActive]}
                onPress={() => toggleRole('photographe')}
              >
                <View style={[styles.roleIconContainer, roles.includes('photographe') && styles.roleIconContainerActive]}>
                  <Ionicons 
                    name="camera-outline" 
                    size={24} 
                    color={roles.includes('photographe') ? '#fff' : COLORS.accent} 
                  />
                </View>
                <Text style={[styles.roleButtonText, roles.includes('photographe') && styles.roleButtonTextActive]}>
                  Photographe
                </Text>
                {roles.includes('photographe') && (
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.accent} style={styles.roleCheckIcon} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roleButton, roles.includes('particulier') && styles.roleButtonActive]}
                onPress={() => toggleRole('particulier')}
              >
                <View style={[styles.roleIconContainer, roles.includes('particulier') && styles.roleIconContainerActive]}>
                  <Ionicons 
                    name="person-outline" 
                    size={24} 
                    color={roles.includes('particulier') ? '#fff' : COLORS.accent} 
                  />
                </View>
                <Text style={[styles.roleButtonText, roles.includes('particulier') && styles.roleButtonTextActive]}>
                  Client
                </Text>
                {roles.includes('particulier') && (
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.accent} style={styles.roleCheckIcon} />
                )}
              </TouchableOpacity>
            </View>
            {roles.length === 2 && (
              <View style={styles.bothRolesInfo}>
                <Ionicons name="information-circle-outline" size={16} color={COLORS.success} />
                <Text style={styles.bothRolesText}>Vous pourrez basculer entre vos deux profils dans l'app</Text>
              </View>
            )}
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

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false)
          router.push('/auth/login')
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <Ionicons name="checkmark-circle" size={64} color={COLORS.success} />
            <Text style={styles.successTitle}>Inscription réussie !</Text>
            <Text style={styles.successMessage}>
              Vérifiez votre mail pour confirmer votre compte.
            </Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => {
                setShowSuccessModal(false)
                router.push('/auth/login')
              }}
            >
              <Text style={styles.successButtonText}>Continuer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  roleSelector: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between'
  },
  roleButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    alignItems: 'center',
    position: 'relative'
  },
  roleButtonActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.primary
  },
  roleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  roleIconContainerActive: {
    backgroundColor: COLORS.accent
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 4
  },
  roleButtonTextActive: {
    color: COLORS.accent
  },
  roleCheckIcon: {
    position: 'absolute',
    top: 8,
    right: 8
  },
  bothRolesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: COLORS.success + '15',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.success + '30'
  },
  bothRolesText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '500'
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  successModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center'
  },
  successMessage: {
    fontSize: 15,
    color: COLORS.text + 'CC',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24
  },
  successButton: {
    width: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3
  },
  successButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});