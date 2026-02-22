import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiFetch, setSessionHint } from './apiClient'

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

  if (error) {
    return (
      <div className="card">
        <h2>Invitation</h2>
        <p className="error">{error}</p>
      </div>
    )
  }

  if (!status) {
    return <p>Loading invitation…</p>
  }

  if (status.auto_enrolled) {
    return (
      <div className="card">
        <h2>Welcome to {status.classroom_name}</h2>
        <p className="success">You have been enrolled automatically.</p>
        <Link className="primary" to={`/classrooms/${status.class_id}`}>
          Go to classroom
        </Link>
      </div>
    )
  }

  return (
    <div className="card">
      <h2>Join {status.classroom_name}</h2>
      <p className="muted">Invitation for {status.email}</p>

      {mode === 'login' ? (
        <form onSubmit={handleLogin} className="form">
          <label>
            Email
            <input value={status.email} disabled />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="primary">Log in & join</button>
          {status.requires_registration && (
            <button type="button" className="ghost" onClick={() => setMode('register')}>
              Need an account? Register instead
            </button>
          )}
        </form>
      ) : (
        <form onSubmit={handleRegister} className="form">
          <label>
            Email
            <input value={status.email} disabled />
          </label>
          <div className="grid">
            <label>
              First name
              <input name="first_name" value={form.first_name} onChange={handleChange} />
            </label>
            <label>
              Last name
              <input name="last_name" value={form.last_name} onChange={handleChange} />
            </label>
          </div>
          <label>
            Password
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="primary">Create account & join</button>
          <button type="button" className="ghost" onClick={() => setMode('login')}>
            Already have an account? Log in
          </button>
        </form>
      )}
    </div>
  )
}

export default InvitePage
