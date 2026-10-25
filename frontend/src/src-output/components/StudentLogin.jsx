import { useState } from 'react'
import { apiFetch } from './apiClient'
import { Mail, LockKeyhole } from 'lucide-react'

function StudentLogin({ onSuccess }) {
  const [mode, setMode] = useState('login') // 'login' | 'forgot_password'
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendStatus, setResendStatus] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    setResendStatus('Sending reset link...')
    try {
      const data = await apiFetch('/auth/forgot-password/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      }, { skipAuthRefresh: true })
      setResendStatus(data.detail || 'Reset link sent!')
    } catch (err) {
      setError(err.message || 'Failed to send reset link.')
      setResendStatus('')
    } finally {
      setLoading(false)
    }
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

  if (mode === 'forgot_password') {
    return (
      <form onSubmit={handleForgotPassword} className="form" aria-label="Student password reset">
        <div className="auth-card-header" style={{ marginBottom: '15px' }}>
          <h3>Forgot Password</h3>
          <p className="muted">Enter your email address to receive a password reset link.</p>
        </div>

        <div className="form-group">
          <label htmlFor="student-reset-email">Email address</label>
          <div className="input-icon-wrap">
            <Mail className="input-icon" aria-hidden="true" size={18} />
            <input
              id="student-reset-email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="student@school.edu"
              required
              autoComplete="email"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'reset-error' : resendStatus ? 'reset-status' : undefined}
            />
          </div>
        </div>

        {resendStatus && (
          <p id="reset-status" className="success" role="status">
            {resendStatus}
          </p>
        )}
        {error && (
          <p id="reset-error" className="error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="primary btn-full" disabled={loading}>
          {loading ? 'Sending…' : 'Send Reset Link →'}
        </button>

        <div className="form-footer-link">
          <button
            type="button"
            className="link-button"
            onClick={() => {
              setMode('login')
              setError('')
              setResendStatus('')
            }}
          >
            Back to sign in
          </button>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="form" aria-label="Student sign in">
      <div className="form-group">
        <label htmlFor="student-email">Email address</label>
        <div className="input-icon-wrap">
          <Mail className="input-icon" aria-hidden="true" size={18} />
          <input
            id="student-email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="student@school.edu"
            required
            autoComplete="email"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'student-login-error' : undefined}
          />
        </div>
      </div>

      <div className="form-group">
        <div className="label-with-action">
          <label htmlFor="student-password">Password</label>
          <button
            type="button"
            className="link-button forgot-link"
            onClick={() => {
              setMode('forgot_password')
              setError('')
              setResendStatus('')
            }}
          >
            Forgot password?
          </button>
        </div>
        <div className="input-icon-wrap">
          <LockKeyhole className="input-icon" aria-hidden="true" size={18} />
          <input
            id="student-password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="••••••••"
            required
            autoComplete="current-password"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'student-login-error' : undefined}
          />
        </div>
      </div>

      {error && (
        <p id="student-login-error" className="error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="primary btn-full" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in →'}
      </button>
    </form>
  )
}

export default StudentLogin
