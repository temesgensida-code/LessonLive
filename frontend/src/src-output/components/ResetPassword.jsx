import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiFetch } from './apiClient'
import { LockKeyhole, Check, Eye, EyeOff } from 'lucide-react'

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
      await apiFetch('/auth/reset-password/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      }, { skipAuthRefresh: true })
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
          <Link to="/" className="auth-back-link">← Back to home</Link>
          <div className="auth-left-inner">
            <span className="auth-logo-mark">⬡</span>
            <h1 className="auth-brand">LessonLive</h1>
            <p className="auth-tagline">
              Real-time classrooms for teachers and students.
            </p>
          </div>
        </div>

        <div className="auth-right">
          <section className="card auth-card auth-box">
            <div className="text-center">
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
              <h2>Invalid Reset Link</h2>
              <p className="error" style={{ marginBottom: '20px' }}>No password reset token was provided.</p>
              <div>
                <Link to="/auth" className="primary btn-full" style={{ display: 'inline-block', textDecoration: 'none' }}>
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
        <Link to="/" className="auth-back-link">← Back to home</Link>
        <div className="auth-left-inner">
          <span className="auth-logo-mark">⬡</span>
          <h1 className="auth-brand">LessonLive</h1>
          <p className="auth-tagline">
            Real-time classrooms for teachers and students.
          </p>
        </div>
      </div>

      <div className="auth-right">
        <section className="card auth-card auth-box">
          {success ? (
            <div className="text-center">
              <div className="success-icon" style={{ fontSize: '48px', marginBottom: '20px', display: 'flex', justifyContent: 'center' }}><Check /></div>
              <h2>Password Reset Successful!</h2>
              <p className="muted">Your password has been changed successfully. You can now sign in with your new password.</p>
              <div style={{ marginTop: '30px' }}>
                <Link to="/auth" className="primary btn-full" style={{ display: 'inline-block', textDecoration: 'none' }}>
                  Sign In →
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="auth-card-header">
                <h2>Reset Your Password</h2>
                <p className="muted">Enter your new password below.</p>
              </div>

              <form onSubmit={handleSubmit} className="form">
                <label>
                  New Password
                  <div className="input-icon-wrap" style={{ display: 'flex', alignItems: 'center' }}>
                    <LockKeyhole className="input-icon" aria-hidden="true" size={18} />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '0.5rem',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        padding: '0.25rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        zIndex: 10
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>

                <label>
                  Confirm New Password
                  <div className="input-icon-wrap">
                    <LockKeyhole className="input-icon" aria-hidden="true" size={18} />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
                    />
                  </div>
                </label>

                {error && <p className="error">{error}</p>}

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
