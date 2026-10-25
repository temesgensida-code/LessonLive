import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiFetch } from './apiClient'
import { Check, X, AlertCircle } from 'lucide-react'

function EmailVerified() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState('verifying') // verifying, success, error
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('No verification token provided.')
      return
    }

    const verifyToken = async () => {
      try {
        const data = await apiFetch(
          `/auth/verify-email/?token=${encodeURIComponent(token)}`,
          { method: 'GET' },
          { skipAuthRefresh: true }
        )
        setStatus('success')
        setMessage(data.detail || 'Your email has been successfully verified.')
      } catch (err) {
        setStatus('error')
        setMessage(err.message || 'The verification link is invalid or has expired.')
      }
    }

    verifyToken()
  }, [token])

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
        <section className="card auth-card auth-box verification-result" aria-labelledby="verify-status-title">
          {status === 'verifying' && (
            <div className="text-center" role="status" aria-label="Verifying email">
              <div
                className="loading-spinner"
                aria-hidden="true"
                style={{ margin: '0 auto 20px', width: '40px', height: '40px' }}
              />
              <h2 id="verify-status-title">Verifying your email…</h2>
              <p className="muted">Please wait a moment while we verify your account.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center" role="status">
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
              <h2 id="verify-status-title">Email Verified!</h2>
              <p className="muted">{message}</p>
              <div style={{ marginTop: '30px' }}>
                <Link
                  to="/auth"
                  className="primary btn-full"
                  style={{ display: 'inline-block', textDecoration: 'none' }}
                >
                  Sign In to Continue →
                </Link>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center" role="alert">
              <div
                className="error-icon"
                style={{
                  fontSize: '48px',
                  marginBottom: '20px',
                  display: 'flex',
                  justifyContent: 'center',
                  color: 'var(--error)',
                }}
              >
                <AlertCircle size={48} aria-hidden="true" />
              </div>
              <h2 id="verify-status-title">Verification Failed</h2>
              <p className="error">{message}</p>
              <div style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <Link
                  to="/auth"
                  className="primary btn-full"
                  style={{ display: 'inline-block', textDecoration: 'none' }}
                >
                  Back to Sign In
                </Link>
                <Link
                  to="/auth"
                  className="link-button"
                  style={{ display: 'inline-block', textDecoration: 'none' }}
                >
                  Need a new link? Sign in to request one.
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default EmailVerified
