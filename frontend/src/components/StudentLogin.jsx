import { useState } from 'react'
import { apiFetch } from './apiClient'

function StudentLogin({ onSuccess }) {
  const [form, setForm] = useState({ email: '', password: '' })
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
      const data = await apiFetch('/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      }, { skipAuthRefresh: true })
      onSuccess(data?.access || '')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      <label>
        Email address
        <div className="input-icon-wrap">
          <span className="input-icon" aria-hidden="true">✉</span>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="you@school.edu"
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
            autoComplete="current-password"
          />
        </div>
      </label>

      {error && <p className="error">{error}</p>}

      <button type="submit" className="primary" disabled={loading} style={{ marginTop: 'var(--space-2)' }}>
        {loading ? 'Signing in…' : 'Sign in →'}
      </button>
    </form>
  )
}

export default StudentLogin
