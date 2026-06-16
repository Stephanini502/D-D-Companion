import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    setLoading(true)
    setError('')
    if (isRegister) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#0f0f13', padding: 24
    }}>
      <div style={{
        width: '100%', maxWidth: 380,
        background: '#16161f', border: '1px solid #2a2a3a',
        borderRadius: 16, padding: 40
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>⚔️</div>
          <h1 style={{ color: '#c9a84c', fontSize: 24, fontWeight: 700, letterSpacing: 1 }}>
            D&D Companion
          </h1>
          <p style={{ color: '#666', fontSize: 13, marginTop: 4 }}>
            {isRegister ? 'Crea il tuo account' : 'Accedi al tuo account'}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ width: '100%' }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            style={{ width: '100%' }}
          />
        </div>

        {error && (
          <p style={{ color: '#e05555', fontSize: 13, marginTop: 12 }}>{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', marginTop: 20, padding: '12px 0',
            background: loading ? '#3a3a4a' : 'linear-gradient(135deg, #c9a84c, #a07830)',
            color: loading ? '#888' : '#0f0f13',
            border: 'none', borderRadius: 8,
            fontWeight: 700, fontSize: 15, letterSpacing: 0.5
          }}
        >
          {loading ? '...' : isRegister ? 'Registrati' : 'Accedi'}
        </button>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#666' }}>
          {isRegister ? 'Hai già un account?' : 'Non hai un account?'}{' '}
          <span
            onClick={() => setIsRegister(!isRegister)}
            style={{ color: '#c9a84c', cursor: 'pointer' }}
          >
            {isRegister ? 'Accedi' : 'Registrati'}
          </span>
        </p>
      </div>
    </div>
  )
}