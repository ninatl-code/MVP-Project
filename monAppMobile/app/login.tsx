import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { supabase } from '../lib/supabaseClient'
import { useNavigation } from '@react-navigation/native'
import Headerhomepage from '../components/Headerhomepage'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const navigation = useNavigation()

  const handleLogin = async () => {
    setLoading(true)
    setErrorMsg('')

    // Vérifier d'abord si l'email existe
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', form.email)
      .single()

    if (!existingUser) {
      setErrorMsg('Cette adresse email n\'est pas enregistrée. Veuillez créer un compte ou vérifier votre email.')
      setLoading(false)
      return
    }

    // Tentative de connexion
    const { data, error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    })

    if (error) {
      // Gérer les différents types d'erreurs
      if (error.message === 'Invalid login credentials') {
        setErrorMsg('Mot de passe incorrect. Veuillez réessayer.')
      } else if (error.message === 'Email not confirmed') {
        setErrorMsg('Veuillez confirmer votre email avant de vous connecter.')
      } else if (error.message === 'Too many requests') {
        setErrorMsg('Trop de tentatives de connexion. Veuillez patienter quelques minutes.')
      } else {
        setErrorMsg('Erreur de connexion. Veuillez réessayer plus tard.')
      }
      setLoading(false)
      return
    }

    // Vérifier le rôle
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
    if (profile?.role === 'prestataire') (navigation as any).navigate('prestataires/menu')
    else (navigation as any).navigate('particuliers/menu')

    setLoading(false)
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Headerhomepage />
        <View style={styles.main}>
          <Text style={styles.title}>Connexion</Text>
          {errorMsg && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}
          <View style={styles.form}>
            <TextInput
              placeholder="Email"
              value={form.email}
              onChangeText={(text) => setForm({ ...form, email: text })}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              placeholder="Mot de passe"
              value={form.password}
              onChangeText={(text) => setForm({ ...form, password: text })}
              style={styles.input}
              secureTextEntry
            />
            <TouchableOpacity
              disabled={loading}
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Connexion...' : 'Se connecter'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  scrollContent: {
    flexGrow: 1
  },
  main: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
    marginTop: 80,
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3
  },
  title: {
    fontWeight: '700',
    fontSize: 28,
    marginBottom: 24,
    textAlign: 'center'
  },
  errorBox: {
    marginBottom: 16
  },
  errorText: {
    color: '#e67c73',
    fontWeight: '500',
    textAlign: 'center'
  },
  form: {
    width: '100%'
  },
  input: {
    width: '100%',
    marginBottom: 14,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    fontSize: 16
  },
  button: {
    width: '100%',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#D4AF37',
    alignItems: 'center'
  },
  buttonDisabled: {
    opacity: 0.7
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16
  }
});
