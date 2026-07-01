import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiFetch, setSessionHint } from './apiClient'
import { LockKeyhole } from 'lucide-react'

function InvitePage({ accessToken, setAccessToken }) {
  const { token } = useParams()
  const [status, setStatus] = useState(null)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({
    password: '',
    first_name: '',
    last_name: '',
  })
  const navigate = useNavigate()

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const data = await apiFetch(
          `/classrooms/invitations/${token}/`,
          {},
          { accessToken, setAccessToken }
        )
        setStatus(data)
        if (data.requires_registration) {
          setMode('register')
        } else {
          setMode('login')
        }
      } catch (err) {
        setError(err.message)
      }
    }
    loadStatus()
  }, [token])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const data = await apiFetch('/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: status.email,
          password: form.password,
          invite_token: token,
        }),
      }, { skipAuthRefresh: true })

      setAccessToken(data?.access || '')
      setSessionHint(Boolean(data?.access))

      const classId = data.invite_result?.class_id || status.class_id
      navigate(`/classrooms/${classId}`)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleRegister = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const data = await apiFetch('/auth/register-from-invite/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password: form.password,
          first_name: form.first_name,
          last_name: form.last_name,
        }),
      }, { skipAuthRefresh: true })

      setAccessToken(data?.access || '')
      setSessionHint(Boolean(data?.access))
      navigate(`/classrooms/${data.class_id}`)
    } catch (err) {
      setError(err.message)
    }
  }

  if (error && !status) {
    return (
      <div className="stack" style={{ maxWidth: 480, margin: '0 auto', paddingTop: 'var(--space-8)' }}>
        <section className="card">
          <div className="card-header">
            <span className="card-icon">🔗</span>
            <div>
              <h2>Invitation</h2>
              <p className="muted card-sub">Something went wrong</p>
            </div>
          </div>
          <p className="error">{error}</p>
          <Link to="/" className="ghost" style={{ marginTop: 'var(--space-4)', display: 'inline-flex' }}>
            ← Back to home
          </Link>
        </section>
      </div>
    )
  }

  if (!status) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" aria-label="Loading invitation" />
      </div>
    )
  }

  if (status.auto_enrolled) {
    return (
      <div className="stack" style={{ maxWidth: 480, margin: '0 auto', paddingTop: 'var(--space-8)' }}>
        <section className="card">
          <div className="card-header">
            <span className="card-icon">🎉</span>
            <div>
              <h2>Welcome to {status.classroom_name}</h2>
            </div>
          </div>
          <p className="success" style={{ marginBottom: 'var(--space-4)' }}>
            You have been enrolled automatically.
          </p>
          <Link className="primary btn-full" to={`/classrooms/${status.class_id}`}>
            Go to classroom →
          </Link>
        </section>
      </div>
    )
  }

  return (
    <div className="stack" style={{ maxWidth: 480, margin: '0 auto', paddingTop: 'var(--space-8)' }}>
      <section className="card">
        <div className="card-header">
          <span className="card-icon">📩</span>
          <div>
            <h2>Join {status.classroom_name}</h2>
            <p className="muted card-sub">Invitation for {status.email}</p>
          </div>
        </div>

        {status.requires_registration && (
          <div className="tabs">
            <button
              type="button"
              className={mode === 'login' ? 'tab active' : 'tab'}
              onClick={() => setMode('login')}
            >
              Sign in
            </button>
            <button
              type="button"
              className={mode === 'register' ? 'tab active' : 'tab'}
              onClick={() => setMode('register')}
            >
              Register
            </button>
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="form">
            <label>
              Email
              <input value={status.email} disabled />
            </label>
            <label>
              Password
              <div className="input-icon-wrap">
                <LockKeyhole className="input-icon" aria-hidden="true" size={18} />
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
            <button type="submit" className="primary btn-full">Log in &amp; join classroom →</button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="form">
            <label>
              Email
              <input value={status.email} disabled />
            </label>
            <div className="form-name-row">
              <label>
                First name
                <input name="first_name" value={form.first_name} onChange={handleChange} required />
              </label>
              <label>
                Last name
                <input name="last_name" value={form.last_name} onChange={handleChange} required />
              </label>
            </div>
            <label>
              Password
              <div className="input-icon-wrap">
                <LockKeyhole className="input-icon" aria-hidden="true" size={18} />
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                />
              </div>
            </label>
            {error && <p className="error">{error}</p>}
            <button type="submit" className="primary btn-full">Create account &amp; join →</button>
          </form>
        )}
      </section>
    </div>
  )
}

export default InvitePage
