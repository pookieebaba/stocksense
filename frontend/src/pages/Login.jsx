import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login, register } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import { TrendingUp } from 'lucide-react'

export default function Login() {
  const { saveLogin } = useAuth()
  const navigate      = useNavigate()
  const [mode, setMode]     = useState('login')  // 'login' | 'register'
  const [form, setForm]     = useState({ name: '', email: '', password: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handle = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const { data } = mode === 'login'
        ? await login(form.email, form.password)
        : await register(form.name, form.email, form.password)
      saveLogin(data.token, data.user)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong')
    } finally { setLoading(false) }
  }

  const inputStyle = {
    width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '10px 14px',
    color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 14,
    outline: 'none', transition: 'border-color 0.2s',
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 400,
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '40px 36px',
        animation: 'fadeUp 0.4s ease both',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <TrendingUp size={24} color="var(--accent)" />
          <span style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 22, color: 'var(--accent)' }}>
            StockSense
          </span>
        </div>

        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 28 }}>
          {mode === 'login' ? 'Sign in to your dashboard' : 'Start tracking stocks today'}
        </p>

        <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'register' && (
            <input
              style={inputStyle} placeholder="Full name" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          )}
          <input
            style={inputStyle} type="email" placeholder="Email" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          <input
            style={inputStyle} type="password" placeholder="Password" value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />

          {error && (
            <div style={{ color: 'var(--red)', fontSize: 13, padding: '8px 12px',
              background: 'rgba(255,77,109,0.1)', borderRadius: 'var(--radius)',
              border: '1px solid rgba(255,77,109,0.2)' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            marginTop: 6, padding: '11px', background: 'var(--accent)',
            color: '#000', border: 'none', borderRadius: 'var(--radius)',
            fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14,
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
            transition: 'opacity 0.2s',
          }}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p style={{ marginTop: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <span onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            style={{ color: 'var(--accent)', cursor: 'pointer' }}>
            {mode === 'login' ? 'Register' : 'Sign in'}
          </span>
        </p>

        <p style={{ marginTop: 32, textAlign: 'center', fontSize: 11, color: 'var(--border2)' }}>
          Made by <strong style={{ color: 'var(--muted)' }}>Shubham Sood</strong>
        </p>
      </div>
    </div>
  )
}
