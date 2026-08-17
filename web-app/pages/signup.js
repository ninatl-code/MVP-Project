import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'
import Headerhomepage from '../components/Headerhomepage';
import { Mail, Lock, AlertCircle, LogIn } from 'lucide-react';
import { useCameraSplashNavigation } from '../components/CameraSplash';
import * as photographerService from  '../lib/photographerService';

// Bricool palette
const COLORS = {
  primary: '#E8EAF6',
  secondary: '#5C6BC0',
  accent: '#130183',
  background: '#F8F9FB',
  text: '#1C1C1E',
  error: '#ef4444',
  success: '#10b981'
};

export default function Signup() {
  const router = useRouter()
  const { navigateWithSplash, CameraSplashComponent } = useCameraSplashNavigation(router, 2000)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nom, setNom] = useState('')
  const [role, setRole] = useState('')
  const [telephone, setTelephone] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async () => {
    if (!telephone) {
      alert("Phone number is required")
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
      if (error.message?.toLowerCase().includes('email rate') || error.status === 429) {
        alert("Too many signup attempts. Please try again in a few minutes.")
      } else {
        alert(error.message)
      }
      return
    }

    if (data?.user) {
      const finalRole = role || 'particulier'

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email,
          nom,
          telephone,
          role: finalRole,
        })

      if (profileError) {
        console.error('Error creating profile:', profileError)
      }

      // Créer le profil photographe étendu si nécessaire
      if (finalRole === 'photographe') {
        const { error: photoProfileError } = await photographerService.upsertPhotographerProfile(data.user.id, {});

        if (photoProfileError) {
        console.error('Error creating provider profile:', photoProfileError)
        }
      }
    }

    alert('Registration successful! Check your email to confirm your account.')
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
              Sign Up </h1>
      <p style={{ 
            fontSize: 14, 
            color: COLORS.text + 'AA', 
            marginBottom: 32 
          }}>
            Create your Bricool account
      </p>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSignup() }}
        style={{ width: "100%", marginBottom: 14, padding: 10, borderRadius: 8, border: "1px solid #eee" }}
      /><br />

      <input
        placeholder="Full Name"
        value={nom}
        onChange={e => setNom(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSignup() }}
        style={{ width: "100%", marginBottom: 14, padding: 10, borderRadius: 8, border: "1px solid #eee" }}
      /><br />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSignup() }}
        style={{ width: "100%", marginBottom: 14, padding: 10, borderRadius: 8, border: "1px solid #eee" }}
      /><br />

      <input
        type="text"
        placeholder="Phone"
        value={telephone}
        onChange={e => setTelephone(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSignup() }}
        style={{ width: "100%", marginBottom: 14, padding: 10, borderRadius: 8, border: "1px solid #eee" }}
        required
      /><br />

      <div style={{ marginBottom: 18, textAlign: "left" }}>
        <label style={{ fontWeight: 500, marginBottom: 6, display: "block" }}>I am:</label>
        <select
          value={role}
          onChange={e => setRole(e.target.value)}
          style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #eee" }}
          required
        >
          <option value="">Select...</option>
          <option value="photographe">Provider</option>
          <option value="particulier">Client</option>
        </select>
      </div>

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
        Sign Up
      </button>
    </main>
    }

    {/* Animation caméra lors de l'inscription */}
    {CameraSplashComponent}
    </>
  )
}
