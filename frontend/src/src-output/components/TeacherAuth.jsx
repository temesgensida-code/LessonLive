import { useState } from 'react'
import { apiFetch } from './apiClient'
import { Mail, LockKeyhole } from 'lucide-react'

function TeacherAuth({ onSuccess }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', first_name: '', last_name: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [pendingVerification, setPendingVerification] = useState(false)
  const [resendStatus, setResendStatus] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleResend = async () => {
    setResendStatus('Sending...')
    try {
      await apiFetch('/auth/resend-verification/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      }, { skipAuthRefresh: true })
      setResendStatus('Email sent!')
    } catch (err) {
      setResendStatus(err.message || 'Failed to send')
    }
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
      let data
      if (mode === 'signup') {
        data = await apiFetch('/auth/teacher-signup/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        }, { skipAuthRefresh: true })
        if (data.email_verified === false) {
          setPendingVerification(true)
          return
        }
      } else {
        data = await apiFetch('/auth/login/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email, password: form.password }),
        }, { skipAuthRefresh: true })
      }
      onSuccess(data?.access || '')
    } catch (err) {
      if (err.data?.email_verified === false) {
        setPendingVerification(true)
        return
      }
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

  if (pendingVerification) {
    return (
      <div className="verification-pending text-center" role="region" aria-label="Verification pending">
        <div style={{ fontSize: '48px', marginBottom: '15px' }}>
          <Mail size={48} aria-hidden="true" />
        </div>
        <h3>Check your email</h3>
        <p>We've sent a verification link to <strong>{form.email}</strong>.</p>
        <p className="muted" style={{ fontSize: '14px', marginBottom: '25px' }}>
          Please click the link to activate your teacher account.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            type="button"
            className="primary btn-full"
            onClick={handleResend}
            disabled={resendStatus === 'Sending...' || resendStatus === 'Email sent!'}
          >
            {resendStatus || 'Resend verification email'}
          </button>

          <button
            type="button"
            className="link-button"
            onClick={() => {
              setPendingVerification(false)
              setResendStatus('')
              setMode('login')
            }}
          >
            Back to sign in
          </button>
        </div>
      </div>
    )
  }

  if (mode === 'forgot_password') {
    return (
      <form onSubmit={handleForgotPassword} className="form" aria-label="Teacher password reset">
        <div className="auth-card-header" style={{ marginBottom: '15px' }}>
          <h3>Forgot Password</h3>
          <p className="muted">Enter your email address to receive a password reset link.</p>
        </div>

        <div className="form-group">
          <label htmlFor="teacher-reset-email">Email address</label>
          <div className="input-icon-wrap">
            <Mail className="input-icon" aria-hidden="true" size={18} />
            <input
              id="teacher-reset-email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="teacher@school.edu"
              required
              autoComplete="email"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'teacher-reset-error' : resendStatus ? 'teacher-reset-status' : undefined}
            />
          </div>
        </div>

        {resendStatus && (
          <p id="teacher-reset-status" className="success" role="status">
            {resendStatus}
          </p>
        )}
        {error && (
          <p id="teacher-reset-error" className="error" role="alert">
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
    <form onSubmit={handleSubmit} className="form" aria-label={mode === 'signup' ? 'Teacher sign up' : 'Teacher sign in'}>
      {mode === 'signup' && (
        <div className="form-name-row">
          <div className="form-group">
            <label htmlFor="teacher-first-name">First name</label>
            <input
              id="teacher-first-name"
              name="first_name"
              value={form.first_name}
              onChange={handleChange}
              placeholder="Jane"
              required
              autoComplete="given-name"
            />
          </div>
          <div className="form-group">
            <label htmlFor="teacher-last-name">Last name</label>
            <input
              id="teacher-last-name"
              name="last_name"
              value={form.last_name}
              onChange={handleChange}
              placeholder="Smith"
              required
              autoComplete="family-name"
            />
          </div>
        </div>
      )}

      <div className="form-group">
        <label htmlFor="teacher-email">Email address</label>
        <div className="input-icon-wrap">
          <Mail className="input-icon" aria-hidden="true" size={18} />
          <input
            id="teacher-email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="teacher@school.edu"
            required
            autoComplete="email"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'teacher-auth-error' : undefined}
          />
        </div>
      </div>

      <div className="form-group">
        <div className="label-with-action">
          <label htmlFor="teacher-password">Password</label>
          {mode === 'login' && (
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
          )}
        </div>
        <div className="input-icon-wrap">
          <LockKeyhole className="input-icon" aria-hidden="true" size={18} />
          <input
            id="teacher-password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="••••••••"
            required
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'teacher-auth-error' : undefined}
          />
        </div>
      </div>

      {error && (
        <p id="teacher-auth-error" className="error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="primary btn-full" disabled={loading}>
        {loading ? 'Please wait…' : mode === 'signup' ? 'Create account →' : 'Sign in →'}
      </button>

      <div className="form-footer-link">
        {mode === 'login' ? (
          <button type="button" className="link-button" onClick={() => setMode('signup')}>
            No account yet? Register as teacher
          </button>
        ) : (
          <button type="button" className="link-button" onClick={() => setMode('login')}>
            Already registered? Sign in
          </button>
        )}
      </div>
    </form>
  )
}

export default TeacherAuth
