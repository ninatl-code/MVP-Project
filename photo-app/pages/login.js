import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'
import Headerhomepage from '../components/Headerhomepage';
import { Mail, Lock, AlertCircle, LogIn } from 'lucide-react';

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

function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()

  // Timeout de sécurité pour le chargement
  const timeoutRef = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    console.log('=== DÉBUT DE LA CONNEXION ===')
    console.log('Email:', form.email)
    setLoading(true)
    setErrorMsg('')

    // Timeout de sécurité (10 secondes)
    const timeout = setTimeout(() => {
      console.error('TIMEOUT: La connexion prend trop de temps')
      setErrorMsg('La connexion prend trop de temps. Veuillez vérifier votre connexion internet.')
      setLoading(false)
    }, 10000)

    try {
      // Tentative de connexion directement
      console.log('1. Tentative de connexion Supabase...')
      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      })

      console.log('2. Résultat connexion:', { data: data?.user?.id, error: error?.message })

      if (error) {
        clearTimeout(timeout)
        console.error('Erreur de connexion:', error.message)
        // Gérer les différents types d'erreurs
        if (error.message === 'Invalid login credentials') {
          setErrorMsg('Email ou mot de passe incorrect. Veuillez réessayer.')
        } else if (error.message === 'Email not confirmed') {
          setErrorMsg('Veuillez confirmer votre email avant de vous connecter.')
        } else if (error.message.includes('Too many')) {
          setErrorMsg('Trop de tentatives de connexion. Veuillez patienter quelques minutes.')
        } else {
          setErrorMsg(`Erreur: ${error.message}`)
        }
        setLoading(false)
        return
      }

      if (!data.user) {
        clearTimeout(timeout)
        setErrorMsg('Erreur de connexion. Aucun utilisateur trouvé.')
        setLoading(false)
        return
      }

      console.log('3. Utilisateur connecté, ID:', data.user.id)

      // Vérifier le rôle
      console.log('4. Récupération du profil...')
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      console.log('5. Profil récupéré:', { role: profile?.role, error: profileError?.message })
      
      if (profileError) {
        clearTimeout(timeout)
        console.error('Erreur profil:', profileError)
        setErrorMsg('Erreur lors de la récupération du profil.')
        setLoading(false)
        return
      }

      // Redirection selon le rôle
      const targetPath = profile?.role === 'prestataire' ? '/prestataires/menu' : '/particuliers/menu'
      console.log('6. Redirection vers:', targetPath)
      
      clearTimeout(timeout)
      router.push(targetPath)
      
      // Le loading sera arrêté après la redirection

    } catch (err) {
      clearTimeout(timeout)
      console.error('=== ERREUR INATTENDUE ===', err)
      setErrorMsg('Une erreur inattendue s\'est produite. Veuillez réessayer.')
      setLoading(false)
    }
  }

  return (
    <>
      <Headerhomepage />
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${COLORS.accent}15, ${COLORS.accent}15)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <main style={{
          maxWidth: 440,
          width: '100%',
          padding: '40px 32px',
          background: '#fff',
          borderRadius: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
          textAlign: 'center'
        }}>
          {/* Logo/Icône */}
          <div style={{
            width: '64px',
            height: '64px',
            margin: '0 auto 24px',
            background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accent})`,
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 8px 24px ${COLORS.primary}40`
          }}>
            <LogIn style={{ width: '32px', height: '32px', color: 'white' }} />
          </div>

          <h1 style={{ 
            fontWeight: 700, 
            fontSize: 32, 
            marginBottom: 8,
            color: COLORS.text,
            background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accent})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Connexion
          </h1>
          <p style={{ 
            fontSize: 14, 
            color: COLORS.text + 'AA', 
            marginBottom: 32 
          }}>
            Accédez à votre espace Shooty
          </p>

          {errorMsg && (
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px 16px',
              marginBottom: 24,
              background: COLORS.error + '10',
              border: `1px solid ${COLORS.error}30`,
              borderRadius: 12,
              color: COLORS.error,
              fontSize: 14,
              fontWeight: 500,
              textAlign: 'left'
            }}>
              <AlertCircle style={{ width: '20px', height: '20px', flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            {/* Email Input */}
            <div style={{ marginBottom: 20, textAlign: 'left' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: 8, 
                fontSize: 14, 
                fontWeight: 600,
                color: COLORS.text 
              }}>
                Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '20px',
                  height: '20px',
                  color: COLORS.text + '60'
                }} />
                <input
                  type="email"
                  placeholder="votre.email@exemple.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                  style={{ 
                    width: '100%', 
                    padding: '12px 16px 12px 44px', 
                    borderRadius: 12, 
                    border: '2px solid #e5e7eb',
                    fontSize: 15,
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = COLORS.primary}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
            </div>

            {/* Password Input */}
            <div style={{ marginBottom: 24, textAlign: 'left' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: 8, 
                fontSize: 14, 
                fontWeight: 600,
                color: COLORS.text 
              }}>
                Mot de passe
              </label>
              <div style={{ position: 'relative' }}>
                <Lock style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '20px',
                  height: '20px',
                  color: COLORS.text + '60'
                }} />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                  style={{ 
                    width: '100%', 
                    padding: '12px 16px 12px 44px', 
                    borderRadius: 12, 
                    border: '2px solid #e5e7eb',
                    fontSize: 15,
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = COLORS.primary}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              onClick={(e) => {
                console.log('Bouton cliqué')
                // Ne pas empêcher la propagation pour laisser le form onSubmit fonctionner
              }}
              style={{
                width: '100%',
                padding: '14px 24px',
                borderRadius: 12,
                background: loading ? '#9CA3AF' : `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accent})`,
                color: '#fff',
                fontWeight: 600,
                fontSize: 16,
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                boxShadow: loading ? 'none' : `0 4px 20px ${COLORS.primary}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = `0 6px 28px ${COLORS.primary}50`;
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = `0 4px 20px ${COLORS.primary}40`;
                }
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid white',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Connexion en cours...
                </>
              ) : (
                <>
                  <LogIn style={{ width: '20px', height: '20px' }} />
                  Se connecter
                </>
              )}
            </button>
          </form>

          {/* Lien vers inscription */}
          <div style={{ 
            marginTop: 24, 
            fontSize: 14, 
            color: COLORS.text + 'AA' 
          }}>
            Pas encore de compte ?{' '}
            <a 
              href="/signup" 
              style={{ 
                color: COLORS.accent, 
                fontWeight: 600,
                textDecoration: 'none',
                paddingBottom: '2px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.borderBottomColor = COLORS.primary;
              }}
              onMouseLeave={(e) => {
                e.target.style.borderBottomColor = COLORS.accent + '40';
              }}
            >
              Créer un compte
            </a>
          </div>
        </main>
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}

export default Login;
