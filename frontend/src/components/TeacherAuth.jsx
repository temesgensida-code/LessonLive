import { useState } from 'react'
import { apiFetch } from './apiClient'

function TeacherAuth({ onSuccess }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', first_name: '', last_name: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let data
      if (mode === 'signup') {
        data = await apiFetch('/auth/teacher-signup/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        }, { skipAuthRefresh: true })
      } else {
        data = await apiFetch('/auth/login/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email, password: form.password }),
        }, { skipAuthRefresh: true })
      }
      onSuccess(data?.access || '')
    } catch (err) {
      if (mode === 'signup' && /already exists/i.test(err.message || '')) {
        setMode('login')
        setError('Account already exists. Please log in.')
        return
      }
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      {mode === 'signup' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <label>
            First name
            <input name="first_name" value={form.first_name} onChange={handleChange} placeholder="Jane" />
          </label>
          <label>
            Last name
            <input name="last_name" value={form.last_name} onChange={handleChange} placeholder="Smith" />
          </label>
        </div>
      )}

      <label>
        Email address
        <div className="input-icon-wrap">
          <span className="input-icon" aria-hidden="true">✉</span>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="teacher@school.edu"
            required
            autoComplete="email"
          />
        </div>
      </label>

      <label>
        Password
        <div className="input-icon-wrap">
          <span className="input-icon" aria-hidden="true">🔒</span>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="••••••••"
            required
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />
        </div>
      </label>

      {error && <p className="error">{error}</p>}

      <button type="submit" className="primary" disabled={loading} style={{ marginTop: 'var(--space-2)' }}>
        {loading ? 'Please wait…' : mode === 'signup' ? 'Create account →' : 'Sign in →'}
      </button>

      {mode === 'login' ? (
        <button type="button" className="link-button" onClick={() => setMode('signup')} style={{ textAlign: 'center' }}>
          No account yet? Register as teacher
        </button>
      ) : (
        <button type="button" className="link-button" onClick={() => setMode('login')} style={{ textAlign: 'center' }}>
          Already registered? Sign in
        </button>
      )}
    </form>
  )
}

export default TeacherAuth
