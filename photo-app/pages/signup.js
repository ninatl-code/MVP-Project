import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'
import Headerhomepage from '../components/Headerhomepage';
import { Mail, Lock, AlertCircle, LogIn } from 'lucide-react';

// Palette Shooty
const COLORS = {
  primary: '#5C6BC0',     // Violet
  secondary: '#E8EAF6',   // Jaune doré
  accent: '#130183',      // Orange
  background: '#F8F9FB',  // Gris clair
  text: '#1C1C1E',        // Noir
  error: '#ef4444',       // Rouge
  success: '#22c55e'      // Vert
  
};

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nom, setNom] = useState('')
  const [role, setRole] = useState('')
  const [telephone, setTelephone] = useState('')
  const [loading, setLoading] = useState(false)

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
          padding: '14px 24px',
          borderRadius: 12,
          background: loading ? '#9CA3AF' : `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
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
        S’inscrire
      </button>
    </main>
    }
    </>
  )
}
