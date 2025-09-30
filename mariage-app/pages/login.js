import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'
import Headerhomepage from '../components/Headerhomepage';

function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()

  const handleLogin = async (e) => {
    e.preventDefault()
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
    if (profile?.role === 'prestataire') router.push('/prestataires/menu')
    else router.push('/particuliers/menu')

    setLoading(false)
  }

  return (
    <>
      <Headerhomepage />
    <main style={{
      maxWidth: 400,
      margin: "80px auto",
      padding: 24,
      background: "#fff",
      borderRadius: 16,
      boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
      textAlign: "center"
    }}>
      <h1 style={{ fontWeight: 700, fontSize: 28, marginBottom: 24 }}>Connexion</h1>
      {errorMsg && (
        <div style={{ color: "#e67c73", marginBottom: 16, fontWeight: 500 }}>
          {errorMsg}
        </div>
      )}
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })}
          style={{ width: "100%", marginBottom: 14, padding: 10, borderRadius: 8, border: "1px solid #eee" }}
        /><br />
        <input
          type="password"
          placeholder="Mot de passe"
          value={form.password}
          onChange={e => setForm({ ...form, password: e.target.value })}
          style={{ width: "100%", marginBottom: 14, padding: 10, borderRadius: 8, border: "1px solid #eee" }}
        /><br />
        <button
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px 0",
            borderRadius: 10,
            background: "#D4AF37",
            color: "#fff",
            fontWeight: 600,
            fontSize: 16,
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>
    </main>
    </>
  )
}

export default Login;
