import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiFetch } from './apiClient'
import { LockKeyhole, Check, Eye, EyeOff, AlertCircle } from 'lucide-react'

function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!password) {
      setError('Password is required')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    setLoading(true)
    try {
      await apiFetch(
        '/auth/reset-password/',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, password }),
        },
        { skipAuthRefresh: true }
      )
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Failed to reset password. The link may have expired or is invalid.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-left">
          <Link to="/" className="auth-back-link">
            ← Back to home
          </Link>
          <div className="auth-left-inner">
            <span className="auth-logo-mark" aria-hidden="true">
              ◆
            </span>
            <h1 className="auth-brand">LessonLive</h1>
            <p className="auth-tagline">Real-time classrooms for teachers and students.</p>
          </div>
        </div>

        <div className="auth-right">
          <section className="card auth-card auth-box" aria-labelledby="invalid-token-title">
            <div className="text-center">
              <div style={{ fontSize: '48px', marginBottom: '20px', color: 'var(--error)' }} aria-hidden="true">
                <AlertCircle size={48} />
              </div>
              <h2 id="invalid-token-title">Invalid Reset Link</h2>
              <p className="error" role="alert" style={{ marginBottom: '20px' }}>
                No password reset token was provided.
              </p>
              <div>
                <Link
                  to="/auth"
                  className="primary btn-full"
                  style={{ display: 'inline-block', textDecoration: 'none' }}
                >
                  Back to Sign In
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-left">
        <Link to="/" className="auth-back-link">
          ← Back to home
        </Link>
        <div className="auth-left-inner">
          <span className="auth-logo-mark" aria-hidden="true">
            ◆
          </span>
          <h1 className="auth-brand">LessonLive</h1>
          <p className="auth-tagline">Real-time classrooms for teachers and students.</p>
        </div>
      </div>

      <div className="auth-right">
        <section className="card auth-card auth-box" aria-labelledby="reset-title">
          {success ? (
            <div className="text-center">
              <div
                className="success-icon"
                style={{
                  fontSize: '48px',
                  marginBottom: '20px',
                  display: 'flex',
                  justifyContent: 'center',
                  color: 'var(--success)',
                }}
              >
                <Check size={48} aria-hidden="true" />
              </div>
              <h2 id="reset-title">Password Reset Successful!</h2>
              <p className="muted">
                Your password has been changed successfully. You can now sign in with your new password.
              </p>
              <div style={{ marginTop: '30px' }}>
                <Link
                  to="/auth"
                  className="primary btn-full"
                  style={{ display: 'inline-block', textDecoration: 'none' }}
                >
                  Sign In →
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="auth-card-header">
                <h2 id="reset-title">Reset Your Password</h2>
                <p className="muted">Enter your new password below.</p>
              </div>

              <form onSubmit={handleSubmit} className="form" aria-label="Password reset form">
                <div className="form-group">
                  <label htmlFor="reset-new-password">New Password</label>
                  <div className="input-icon-wrap" style={{ position: 'relative' }}>
                    <LockKeyhole className="input-icon" aria-hidden="true" size={18} />
                    <input
                      id="reset-new-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      style={{ paddingRight: '2.5rem' }}
                      aria-invalid={Boolean(error)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                      style={{
                        position: 'absolute',
                        right: '0.5rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        padding: '0.25rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        zIndex: 2,
                      }}
                    >
                      {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="reset-confirm-password">Confirm New Password</label>
                  <div className="input-icon-wrap">
                    <LockKeyhole className="input-icon" aria-hidden="true" size={18} />
                    <input
                      id="reset-confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
                      aria-invalid={Boolean(error)}
                    />
                  </div>
                </div>

                {error && (
                  <p className="error" role="alert">
                    {error}
                  </p>
                )}

                <button type="submit" className="primary btn-full" disabled={loading}>
                  {loading ? 'Resetting password…' : 'Reset Password'}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  )
}

export default ResetPassword
