import { useEffect, useMemo, useState } from 'react'
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import './App.css'

const API_BASE = '/api'

async function requestAccessTokenRefresh(setAccessToken) {
  const response = await fetch(`${API_BASE}/auth/token/refresh/`, {
    method: 'POST',
    credentials: 'include',
  })

  if (!response.ok) {
    setAccessToken('')
    return ''
  }

  const data = await response.json()
  const access = data?.access || ''
  setAccessToken(access)
  return access
}

async function apiFetch(path, options = {}, auth = {}) {
  const { accessToken = '', setAccessToken, skipAuthRefresh = false } = auth

  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  })

  if (response.status === 401 && !skipAuthRefresh && typeof setAccessToken === 'function') {
    const refreshedAccess = await requestAccessTokenRefresh(setAccessToken)
    if (refreshedAccess) {
      return apiFetch(path, options, {
        accessToken: refreshedAccess,
        setAccessToken,
        skipAuthRefresh: true,
      })
    }
  }

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await response.json() : null

  if (!response.ok) {
    const message = data?.detail || data?.error || 'Request failed'
    const error = new Error(message)
    error.data = data
    throw error
  }

  return data
}

function useMe(accessToken, setAccessToken) {
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    try {
      let token = accessToken
      if (!token) {
        token = await requestAccessTokenRefresh(setAccessToken)
      }

      if (!token) {
        setMe(null)
        return
      }

      const data = await apiFetch('/auth/me/', {}, { accessToken: token, setAccessToken })
      setMe(data?.authenticated ? data : null)
    } catch {
      setMe(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [accessToken])

  return { me, loading, refresh }
}

function Layout({ children, me, onLogout }) {
  return (
    <div className="page">
      <header className="topbar">
        <Link to="/" className="brand">
          LessonLive
        </Link>
        <nav className="nav">
          {me?.authenticated ? (
            <>
              <span className="nav-user">{me.email}</span>
              <button type="button" className="ghost" onClick={onLogout}>
                Log out
              </button>
            </>
          ) : (
            <span className="nav-user">Teacher Portal</span>
          )}
        </nav>
      </header>
      <main className="content">{children}</main>
    </div>
  )
}

function TeacherAuth({ onSuccess }) {
  const [mode, setMode] = useState('signup')
  const [form, setForm] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
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
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <div className="tabs">
        <button
          type="button"
          className={mode === 'signup' ? 'tab active' : 'tab'}
          onClick={() => setMode('signup')}
        >
          Teacher Sign Up
        </button>
        <button
          type="button"
          className={mode === 'login' ? 'tab active' : 'tab'}
          onClick={() => setMode('login')}
        >
          Log In
        </button>
      </div>

      <form onSubmit={handleSubmit} className="form">
        {mode === 'signup' && (
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
        )}
        <label>
          Email
          <input name="email" type="email" value={form.email} onChange={handleChange} required />
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
        <button type="submit" className="primary" disabled={loading}>
          {loading ? 'Please wait…' : mode === 'signup' ? 'Create teacher account' : 'Log in'}
        </button>
      </form>
    </div>
  )
}

function TeacherDashboard({ me, refreshMe, accessToken, setAccessToken }) {
  const [classrooms, setClassrooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [className, setClassName] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const fetchClassrooms = async () => {
    setLoading(true)
    try {
      const data = await apiFetch('/classrooms/', {}, { accessToken, setAccessToken })
      setClassrooms(data.classrooms || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClassrooms()
  }, [])

  const handleCreate = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const data = await apiFetch('/classrooms/create/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: className }),
      }, { accessToken, setAccessToken })
      setClassName('')
      await fetchClassrooms()
      refreshMe()
      navigate(data.redirect_url)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="stack">
      <section className="card">
        <h2>Create a classroom</h2>
        <form className="form" onSubmit={handleCreate}>
          <label>
            Class name
            <input value={className} onChange={(event) => setClassName(event.target.value)} required />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="primary">Create classroom</button>
        </form>
      </section>

      <section className="card">
        <h2>Your classrooms</h2>
        {loading ? (
          <p>Loading classrooms…</p>
        ) : classrooms.length === 0 ? (
          <p>No classrooms yet. Create one to start inviting students.</p>
        ) : (
          <ul className="list">
            {classrooms.map((room) => (
              <li key={room.class_id}>
                <Link to={`/classrooms/${room.class_id}`}>{room.name}</Link>
                <span className="muted">{room.class_id}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function ClassroomPage({ accessToken, setAccessToken }) {
  const { classId } = useParams()
  const [classroom, setClassroom] = useState(null)
  const [owned, setOwned] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [emails, setEmails] = useState('')
  const [file, setFile] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const fetchClassroom = async () => {
    try {
      const data = await apiFetch(`/classrooms/${classId}/`, {}, { accessToken, setAccessToken })
      setClassroom(data.classroom)
      setOwned(data.owned)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    fetchClassroom()
  }, [classId])

  const handleInvite = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    const formData = new FormData()
    if (emails.trim()) {
      formData.append('emails', emails)
    }
    if (file) {
      formData.append('file', file)
    }

    try {
      const data = await apiFetch(`/classrooms/${classId}/invite/`, {
        method: 'POST',
        body: formData,
      }, { accessToken, setAccessToken })
      setMessage(`Invited ${data.invited_count} students. Skipped ${data.skipped_count}.`)
      setEmails('')
      setFile(null)
    } catch (err) {
      setError(err.message)
    }
  }

  if (!classroom && !error) {
    return <p>Loading classroom…</p>
  }

  return (
    <div className="stack">
      <section className="card">
        <div className="row">
          <div>
            <h2>{classroom?.name}</h2>
            <p className="muted">Class ID: {classroom?.class_id}</p>
          </div>
          {owned && (
            <button type="button" className="ghost" onClick={() => setMenuOpen((open) => !open)}>
              ☰ Menu
            </button>
          )}
        </div>
        {owned && menuOpen && (
          <div className="drawer">
            <h3>Invite students</h3>
            <form onSubmit={handleInvite} className="form">
              <label>
                Paste student emails (comma or newline separated)
                <textarea
                  rows={4}
                  value={emails}
                  onChange={(event) => setEmails(event.target.value)}
                />
              </label>
              <label>
                Or upload a CSV (first column = email)
                <input type="file" accept=".csv" onChange={(event) => setFile(event.target.files[0])} />
              </label>
              {error && <p className="error">{error}</p>}
              {message && <p className="success">{message}</p>}
              <button type="submit" className="primary">Send invitations</button>
            </form>
          </div>
        )}
      </section>

      {owned && classroom?.students && (
        <section className="card">
          <h3>Enrolled students</h3>
          {classroom.students.length === 0 ? (
            <p className="muted">No students enrolled yet.</p>
          ) : (
            <ul className="list">
              {classroom.students.map((email) => (
                <li key={email}>{email}</li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}

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

function App() {
  const [accessToken, setAccessToken] = useState('')
  const { me, loading, refresh } = useMe(accessToken, setAccessToken)
  const [logoutError, setLogoutError] = useState('')

  const handleLogout = async () => {
    setLogoutError('')
    try {
      await apiFetch('/auth/logout/', { method: 'POST' }, { accessToken, setAccessToken, skipAuthRefresh: true })
      setAccessToken('')
      await refresh()
    } catch (err) {
      setLogoutError(err.message)
    }
  }

  const layoutProps = useMemo(
    () => ({ me, onLogout: handleLogout }),
    [me]
  )

  return (
    <Layout {...layoutProps}>
      {logoutError && <p className="error">{logoutError}</p>}
      <Routes>
        <Route
          path="/"
          element={
            loading ? (
              <p>Loading profile…</p>
            ) : me?.authenticated ? (
              <TeacherDashboard
                me={me}
                refreshMe={refresh}
                accessToken={accessToken}
                setAccessToken={setAccessToken}
              />
            ) : (
              <TeacherAuth
                onSuccess={async (newAccessToken) => {
                  setAccessToken(newAccessToken)
                  await refresh()
                }}
              />
            )
          }
        />
        <Route
          path="/classrooms/:classId"
          element={<ClassroomPage accessToken={accessToken} setAccessToken={setAccessToken} />}
        />
        <Route
          path="/invite/:token"
          element={<InvitePage accessToken={accessToken} setAccessToken={setAccessToken} />}
        />
      </Routes>
    </Layout>
  )
}

export default App
