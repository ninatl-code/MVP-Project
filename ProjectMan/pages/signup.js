import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'
import Headerhomepage from '../components/Headerhomepage';
import { Mail, Lock, AlertCircle, LogIn } from 'lucide-react';
import { useCameraSplashNavigation } from '../components/CameraSplash';

// Palette Shooty
const COLORS = {
  primary: '#E8EAF6',     // Violet
  secondary: '#5C6BC0',   // Jaune doré
  accent: '#130183',      // Orange
  background: '#F8F9FB',  // Gris clair
  text: '#1C1C1E',        // Noir
  error: '#ef4444',       // Rouge
  success: '#10b981'      // Vert
};

export default function Signup() {
  const router = useRouter()
  const { navigateWithSplash, CameraSplashComponent } = useCameraSplashNavigation(router, 2000)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('user')
  const [language, setLanguage] = useState('en')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignup = async () => {
    setLoading(true)
    setError('')

    if (!fullName || !email || !password) {
      setError("Tous les champs sont obligatoires")
      setLoading(false)
      return
    }

    try {
      // 1. Créer l'utilisateur dans auth.users
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password
      })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      if (!authData.user) {
        setError("Erreur lors de la création du compte")
        setLoading(false)
        return
      }

      // 2. Créer l'entrée dans public.users
      const { error: userError } = await supabase
        .from('users')
        .insert([{
          auth_id: authData.user.id,
          full_name: fullName,
          role: role,
          language: language
        }])

      if (userError) {
        console.error('Error creating user profile:', userError)
        setError("Erreur lors de la création du profil")
        setLoading(false)
        return
      }

      alert('Inscription réussie ! Vérifiez votre mail pour confirmer votre compte.')
      router.push('/login')
      
    } catch (err) {
      console.error('Signup error:', err)
      setError("Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
          <Headerhomepage />
          {
    <main style={{ maxWidth: 400, margin: "80px auto", padding: 24, background: "#fff", borderRadius: 16, boxShadow: "0 2px 16px rgba(0,0,0,0.06)", textAlign: "center" }}>
      <h1 style={{ 
            fontWeight: 700, 
            fontSize: 32, 
            marginBottom: 8,
            color: COLORS.text,
            background: `linear-gradient(135deg, ${COLORS.accent})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
      }}>
              Inscription </h1>
      <p style={{ 
            fontSize: 14, 
            color: COLORS.text + 'AA', 
            marginBottom: 32 
          }}>
            Créez votre espace Shooty
      </p>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={{ width: "100%", marginBottom: 14, padding: 10, borderRadius: 8, border: "1px solid #eee" }}
      /><br />

      <input
        placeholder="Nom et Prénom"
        value={fullName}
        onChange={e => setFullName(e.target.value)}
        style={{ width: "100%", marginBottom: 14, padding: 10, borderRadius: 8, border: "1px solid #eee" }}
      /><br />

      <input
        type="password"
        placeholder="Mot de passe"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={{ width: "100%", marginBottom: 14, padding: 10, borderRadius: 8, border: "1px solid #eee" }}
      /><br />

      <div style={{ marginBottom: 18, textAlign: "left" }}>
        <label style={{ fontWeight: 500, marginBottom: 6, display: "block" }}>Rôle :</label>
        <select
          value={role}
          onChange={e => setRole(e.target.value)}
          style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #eee" }}
        >
          <option value="user">Utilisateur</option>
          <option value="manager">Manager</option>
          <option value="admin">Administrateur</option>
        </select>
      </div>

      <div style={{ marginBottom: 18, textAlign: "left" }}>
        <label style={{ fontWeight: 500, marginBottom: 6, display: "block" }}>Langue :</label>
        <select
          value={language}
          onChange={e => setLanguage(e.target.value)}
          style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #eee" }}
        >
          <option value="en">English</option>
          <option value="fr">Français</option>
        </select>
      </div>

      {error && (
        <div style={{ 
          marginBottom: 14, 
          padding: 10, 
          borderRadius: 8, 
          backgroundColor: '#FEE2E2', 
          color: '#DC2626',
          fontSize: 14
        }}>
          {error}
        </div>
      )}

      <button
        onClick={handleSignup}
        style={{
          width: "100%",
          padding: '14px 24px',
          borderRadius: 12,
          background: loading ? '#9CA3AF' : `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accent})`,
          color: "#fff",
          fontWeight: 600,
          fontSize: 16,
          border: "none",
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s',
          boxShadow: loading ? 'none' : `0 4px 20px ${COLORS.primary}40`,  
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        S'inscrire
      </button>
    </main>
    }

    {/* Animation caméra lors de l'inscription */}
    {CameraSplashComponent}
    </>
  )
}
