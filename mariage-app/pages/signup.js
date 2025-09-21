import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Headerhomepage from '../components/Headerhomepage';

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nom, setNom] = useState('')
  const [role, setRole] = useState('')
  const [telephone, setTelephone] = useState('')

  const handleSignup = async () => {
    if (!telephone) {
      alert("Le numéro de téléphone est obligatoire")
      return
    }

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
      alert(error.message)
    } else {
      alert('Inscription réussie ! Vérifiez votre mail pour confirmer votre compte.')
    }
  }

  return (
    <>
          <Headerhomepage />
          {
    <main style={{ maxWidth: 400, margin: "80px auto", padding: 24, background: "#fff", borderRadius: 16, boxShadow: "0 2px 16px rgba(0,0,0,0.06)", textAlign: "center" }}>
      <h1 style={{ fontWeight: 700, fontSize: 28, marginBottom: 24 }}>Inscription</h1>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={{ width: "100%", marginBottom: 14, padding: 10, borderRadius: 8, border: "1px solid #eee" }}
      /><br />

      <input
        placeholder="Nom et Prénom"
        value={nom}
        onChange={e => setNom(e.target.value)}
        style={{ width: "100%", marginBottom: 14, padding: 10, borderRadius: 8, border: "1px solid #eee" }}
      /><br />

      <input
        type="password"
        placeholder="Mot de passe"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={{ width: "100%", marginBottom: 14, padding: 10, borderRadius: 8, border: "1px solid #eee" }}
      /><br />

      <input
        type="text"
        placeholder="Téléphone"
        value={telephone}
        onChange={e => setTelephone(e.target.value)}
        style={{ width: "100%", marginBottom: 14, padding: 10, borderRadius: 8, border: "1px solid #eee" }}
        required
      /><br />

      <div style={{ marginBottom: 18, textAlign: "left" }}>
        <label style={{ fontWeight: 500, marginBottom: 6, display: "block" }}>Je suis :</label>
        <select
          value={role}
          onChange={e => setRole(e.target.value)}
          style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #eee" }}
          required
        >
          <option value="">Sélectionner...</option>
          <option value="prestataire">Prestataire</option>
          <option value="particulier">Particulier</option>
        </select>
      </div>

      <button
        onClick={handleSignup}
        style={{
          width: "100%",
          padding: "12px 0",
          borderRadius: 10,
          background: "#D4AF37",
          color: "#fff",
          fontWeight: 600,
          fontSize: 16,
          border: "none",
          cursor: "pointer"
        }}
      >
        S’inscrire
      </button>
    </main>
    }
    </>
  )
}
