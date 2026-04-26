import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'
import Headerhomepage from '../components/Headerhomepage';
import { Mail, Lock, AlertCircle, LogIn, Eye, EyeOff } from 'lucide-react';
import { useCameraSplashNavigation } from '../components/CameraSplash';
import { useAuth } from '../contexts/AuthContext';

// Palette Bricool
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
  const [shouldRedirect, setShouldRedirect] = useState(false)
  const router = useRouter()
  const { navigateWithSplash, CameraSplashComponent } = useCameraSplashNavigation(router, 2000)
  const { activeRole, user, loading: authLoading } = useAuth()

  // Dès qu'AuthContext a chargé le profil, redirige (fallback si la redirection directe échoue)
  useEffect(() => {
    if (!shouldRedirect) return;
    if (authLoading) return;
    if (!user) return;
    const checkAndRedirect = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();
      if (profile?.is_admin) {
        router.push('/admin');
      } else {
        const targetPath = activeRole === 'prestataire' || activeRole === 'photographe' ? '/photographe/menu' : '/client/menu';
        router.push(targetPath);
      }
    };
    checkAndRedirect();
  }, [user, activeRole, authLoading, shouldRedirect]);

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    // AbortController pour annuler la requête si timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      controller.abort()
    }, 15000)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      })

      clearTimeout(timeout)

      if (error) {
        if (error.name === 'AbortError' || error.message?.includes('aborted')) {
          setErrorMsg('La connexion est trop lente. Vérifiez votre connexion et réessayez.')
        } else if (error.message === 'Invalid login credentials') {
          setErrorMsg('Email ou mot de passe incorrect. Veuillez réessayer.')
        } else if (error.message === 'Email not confirmed') {
          setErrorMsg('Veuillez confirmer votre email avant de vous connecter.')
        } else if (error.message.includes('Too many')) {
          setErrorMsg('Trop de tentatives. Veuillez patienter quelques minutes.')
        } else {
          setErrorMsg(`Erreur: ${error.message}`)
        }
        setLoading(false)
        return
      }

      if (!data?.user) {
        setErrorMsg('Erreur de connexion. Veuillez réessayer.')
        setLoading(false)
        return
      }

      // Vérifier is_admin en base avant de rediriger
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', data.user.id)
        .single();

      setShouldRedirect(true)
      if (profile?.is_admin) {
        router.push('/admin')
      } else {
        const role = data.user.user_metadata?.role
        const targetPath = role === 'prestataire' || role === 'photographe' ? '/photographe/menu' : '/client/menu'
        router.push(targetPath)
      }

    } catch (err) {
      clearTimeout(timeout)
      if (err.name === 'AbortError') {
        setErrorMsg('La connexion est trop lente. Vérifiez votre connexion et réessayez.')
      } else {
        console.error('Erreur login:', err)
        setErrorMsg('Une erreur inattendue s\'est produite. Veuillez réessayer.')
      }
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
            Accédez à votre espace Bricool
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
                  onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(e) }}
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
                  onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(e) }}
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
