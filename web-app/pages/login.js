import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'
import Headerhomepage from '../components/Headerhomepage';
import { Mail, Lock, AlertCircle, LogIn, Eye, EyeOff } from 'lucide-react';
import { useCameraSplashNavigation } from '../components/CameraSplash';
import { useAuth } from '../contexts/AuthContext';

// Palette ServiDaba
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
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const { navigateWithSplash, CameraSplashComponent } = useCameraSplashNavigation(router, 2000)
  const { activeRole, user, loading: authLoading } = useAuth()

  // Dès qu'AuthContext a chargé le profil, redirige
  useEffect(() => {
    if (!loading) return; // on n'est pas en train de se connecter
    if (authLoading) return; // AuthContext pas encore prêt
    if (!user) return;
    const targetPath = activeRole === 'prestataire' || activeRole === 'photographe' ? '/photographe/menu' : '/client/menu';
    console.log(`[Login] ✅ AuthContext prêt (role=${activeRole}) — redirection vers ${targetPath}`);
    router.push(targetPath);
  }, [user, activeRole, authLoading, loading]);

  const handleLogin = async (e) => {
    e.preventDefault()
    const t0 = performance.now()
    console.log('[Login] ▶ handleLogin — début')
    setLoading(true)
    setErrorMsg('')

    let timedOut = false

    // Timeout de sécurité (30 secondes)
    const timeout = setTimeout(() => {
      timedOut = true
      console.error('[Login] ⏰ TIMEOUT après 30s')
      setErrorMsg('La connexion prend trop de temps. Veuillez vérifier votre connexion internet.')
      setLoading(false)
    }, 30000)

    try {
      console.log('[Login] 1. signInWithPassword...')
      const t1 = performance.now()
      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      })
      console.log(`[Login] 2. signInWithPassword — ${(performance.now() - t1).toFixed(0)}ms`, error ? `ERREUR: ${error.message}` : `OK (${data?.user?.id})`)

      if (error) {
        clearTimeout(timeout)
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

      console.log(`[Login] 3. ✅ Auth OK en ${(performance.now() - t0).toFixed(0)}ms — en attente AuthContext pour la redirection...`)
      clearTimeout(timeout)
      // La redirection est gérée par le useEffect qui surveille activeRole dans AuthContext

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
            Accédez à votre espace ServiDaba
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
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                  style={{ 
                    width: '100%', 
                    padding: '12px 50px 12px 44px', 
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
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: COLORS.text + '60',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = COLORS.accent}
                  onMouseLeave={(e) => e.currentTarget.style.color = COLORS.text + '60'}
                >
                  {showPassword ? 
                    <EyeOff style={{ width: '20px', height: '20px' }} /> : 
                    <Eye style={{ width: '20px', height: '20px' }} />
                  }
                </button>
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

      {/* Animation caméra lors de la connexion */}
      {CameraSplashComponent}

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}

export default Login;
