import { useEffect, useMemo, useState } from 'react'
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { LiveKitRoom, RoomAudioRenderer, useLocalParticipant } from '@livekit/components-react'
import '@livekit/components-styles'
import LiveClassroom from './LiveClassroom'
import UsernameChat from './UsernameChat'
import './App.css'


const API_BASE = '/api'
const SESSION_HINT_KEY = 'lessonlive_has_session'
const LIVEKIT_SERVER_URL = 'wss://lessonlivemain-i0wqfwh8.livekit.cloud'

function getNotesWebSocketUrl(classId, accessToken) {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const backendHost = import.meta.env.DEV
    ? `${window.location.hostname}:8000`
    : window.location.host
  return `${protocol}://${backendHost}/ws/classrooms/${classId}/notes/?token=${encodeURIComponent(
    accessToken
  )}`
}

function getSessionHint() {
  return window.localStorage.getItem(SESSION_HINT_KEY) === '1'
}

function setSessionHint(hasSession) {
  if (hasSession) {
    window.localStorage.setItem(SESSION_HINT_KEY, '1')
  } else {
    window.localStorage.removeItem(SESSION_HINT_KEY)
  }
}

async function requestAccessTokenRefresh(setAccessToken, options = {}) {
  const { requireSessionHint = false } = options

  if (requireSessionHint && !getSessionHint()) {
    return ''
  }

  const response = await fetch(`${API_BASE}/auth/token/refresh/`, {
    method: 'POST',
    credentials: 'include',
  })

  if (!response.ok) {
    setAccessToken('')
    if (response.status === 401) {
      setSessionHint(false)
    }
    return ''
  }

  const data = await response.json()
  const access = data?.access || ''
  setAccessToken(access)
  setSessionHint(Boolean(access))
  return access
}

async function apiFetch(path, options = {}, auth = {}) {
  const { accessToken = '', setAccessToken, skipAuthRefresh = false } = auth

  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  })

  if (response.status === 401 && !skipAuthRefresh && typeof setAccessToken === 'function') {
    const refreshedAccess = await requestAccessTokenRefresh(setAccessToken, { requireSessionHint: true })
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
        token = await requestAccessTokenRefresh(setAccessToken, { requireSessionHint: true })
      }

      if (!token) {
        setMe(null)
        return
      }

      const data = await apiFetch('/auth/me/', {}, { accessToken: token, setAccessToken })
      setMe(data?.authenticated ? data : null)
      setSessionHint(Boolean(data?.authenticated))
    } catch {
      setMe(null)
      setSessionHint(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [accessToken, setAccessToken])

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
            <span className="nav-user">Teacher & Student Portal</span>
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
      if (mode === 'signup' && /already exists/i.test(err.message || '')) {
        setMode('login')
        setError('Account already exists. Please log in with the same email/password.')
        return
      }
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

function StudentLogin({ onSuccess }) {
  const [form, setForm] = useState({
    email: '',
    password: '',
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
    <div className="card">
      <h2>Student Login</h2>
      <form onSubmit={handleSubmit} className="form">
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
          {loading ? 'Please wait…' : 'Log in'}
        </button>
      </form>
    </div>
  )
}

function AuthGateway({ onSuccess }) {
  const [authType, setAuthType] = useState('teacher')

  return (
    <div className="stack">
      <section className="card">
        <div className="tabs">
          <button
            type="button"
            className={authType === 'teacher' ? 'tab active' : 'tab'}
            onClick={() => setAuthType('teacher')}
          >
            Teacher
          </button>
          <button
            type="button"
            className={authType === 'student' ? 'tab active' : 'tab'}
            onClick={() => setAuthType('student')}
          >
            Student
          </button>
        </div>
      </section>

      {authType === 'teacher' ? <TeacherAuth onSuccess={onSuccess} /> : <StudentLogin onSuccess={onSuccess} />}
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
      if (/authentication required|invalid or expired refresh token/i.test(err.message || '')) {
        setError('Your session is not active. Please log in first.')
        return
      }
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

function StudentDashboard({ accessToken, setAccessToken }) {
  const [classrooms, setClassrooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchEnrolledClassrooms = async () => {
      setLoading(true)
      setError('')
      try {
        const data = await apiFetch('/classrooms/enrolled/', {}, { accessToken, setAccessToken })
        setClassrooms(data.classrooms || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchEnrolledClassrooms()
  }, [accessToken])

  return (
    <section className="card">
      <h2>Student portal</h2>
      <p className="muted">Students cannot create classrooms.</p>
      <h3>Your invited classrooms</h3>
      {loading ? (
        <p>Loading classrooms…</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : classrooms.length === 0 ? (
        <p className="muted">No invited classrooms yet.</p>
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
  const [savedNotes, setSavedNotes] = useState([])
  const [displayedNotes, setDisplayedNotes] = useState([])
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [noteError, setNoteError] = useState('')
  const [noteMessage, setNoteMessage] = useState('')
  const [liveMode, setLiveMode] = useState(false)
  const [liveToken, setLiveToken] = useState('')
  const [liveLoading, setLiveLoading] = useState(false)
  const [liveError, setLiveError] = useState('')
  const [liveAutoInitialized, setLiveAutoInitialized] = useState(false)

  const upsertDisplayedNote = (incomingNote) => {
    if (!incomingNote?.id) {
      return
    }
    setDisplayedNotes((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === incomingNote.id)
      if (existingIndex === -1) {
        return [...prev, incomingNote]
      }

      const next = [...prev]
      next[existingIndex] = incomingNote
      return next
    })
  }

  const removeDisplayedNoteFromState = (displayedNoteId) => {
    if (!displayedNoteId) {
      return
    }
    setDisplayedNotes((prev) => prev.filter((item) => item.id !== displayedNoteId))
  }

  const formatDate = (isoValue) => {
    if (!isoValue) {
      return ''
    }
    const parsed = new Date(isoValue)
    if (Number.isNaN(parsed.getTime())) {
      return isoValue
    }
    return parsed.toLocaleString()
  }

  useEffect(() => {
    let isCurrent = true

    setClassroom(null)
    setOwned(false)
    setError('')
    setNoteError('')
    setNoteMessage('')
    setSavedNotes([])
    setDisplayedNotes([])
    setLiveMode(false)
    setLiveToken('')
    setLiveLoading(false)
    setLiveError('')
    setLiveAutoInitialized(false)

    const loadClassroom = async () => {
      try {
        const data = await apiFetch(`/classrooms/${classId}/`, {}, { accessToken, setAccessToken })
        if (!isCurrent) {
          return
        }
        setClassroom(data.classroom)
        setOwned(data.owned)
      } catch (err) {
        if (!isCurrent) {
          return
        }
        setError(err.message)
      }
    }

    const loadSavedNotes = async () => {
      try {
        const data = await apiFetch(`/classrooms/${classId}/notes/`, {}, { accessToken, setAccessToken })
        if (!isCurrent) {
          return
        }
        setSavedNotes(data.notes || [])
      } catch (err) {
        if (!isCurrent) {
          return
        }
        setSavedNotes([])
        setNoteError(err.message)
      }
    }

    const loadDisplayedNotes = async () => {
      try {
        const data = await apiFetch(`/classrooms/${classId}/displayed-notes/`, {}, { accessToken, setAccessToken })
        if (!isCurrent) {
          return
        }
        setDisplayedNotes(data.displayed_notes || [])
      } catch (err) {
        if (!isCurrent) {
          return
        }
        setDisplayedNotes([])
        setNoteError(err.message)
      }
    }

    loadClassroom()
    loadSavedNotes()
    loadDisplayedNotes()

    return () => {
      isCurrent = false
    }
  }, [classId, accessToken, setAccessToken])

  useEffect(() => {
    if (!accessToken || liveMode) {
      return undefined
    }

    let socket
    let reconnectTimeoutId
    let shouldReconnect = true
    const reconnectDelayMs = 1500

    const websocketUrl = getNotesWebSocketUrl(classId, accessToken)

    const connect = () => {
      socket = new WebSocket(websocketUrl)

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'note_displayed' && data.payload) {
            upsertDisplayedNote(data.payload)
          }
          if (data.type === 'note_removed' && data.payload?.id) {
            removeDisplayedNoteFromState(data.payload.id)
          }
        } catch {
          return
        }
      }

      socket.onclose = (event) => {
        if (event.code === 4001 || event.code === 4003) {
          shouldReconnect = false
          return
        }
        if (!shouldReconnect) {
          return
        }
        reconnectTimeoutId = window.setTimeout(connect, reconnectDelayMs)
      }
    }

    connect()

    return () => {
      shouldReconnect = false
      if (reconnectTimeoutId) {
        window.clearTimeout(reconnectTimeoutId)
      }
      if (socket && socket.readyState !== WebSocket.CLOSED) {
        socket.close()
      }
    }
  }, [classId, accessToken, liveMode])

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

  const handleSaveNote = async (event) => {
    event.preventDefault()
    setNoteError('')
    setNoteMessage('')
    try {
      const data = await apiFetch(`/classrooms/${classId}/notes/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: noteTitle, content: noteContent }),
      }, { accessToken, setAccessToken })

      setSavedNotes((prev) => [...prev, data.note])
      setNoteTitle('')
      setNoteContent('')
      setNoteMessage(`Saved note #${data.note.index}`)
    } catch (err) {
      setNoteError(err.message)
    }
  }

  const handleDisplayNote = async (noteId) => {
    setNoteError('')
    setNoteMessage('')
    try {
      const data = await apiFetch(`/classrooms/${classId}/notes/${noteId}/display/`, {
        method: 'POST',
      }, { accessToken, setAccessToken })
      upsertDisplayedNote(data?.displayed_note)
      setNoteMessage(`Displayed note #${noteId}`)
    } catch (err) {
      setNoteError(err.message)
    }
  }

  const handleRemoveDisplayed = async (displayedId) => {
    setNoteError('')
    try {
      const data = await apiFetch(`/classrooms/${classId}/displayed-notes/${displayedId}/`, {
        method: 'DELETE',
      }, { accessToken, setAccessToken })
      removeDisplayedNoteFromState(data?.removed?.id || displayedId)
    } catch (err) {
      setNoteError(err.message)
    }
  }

  const activateLiveClass = async () => {
    if (liveToken) {
      setLiveMode(true)
      setLiveError('')
      return
    }

    setLiveLoading(true)
    setLiveError('')
    try {
      const data = await apiFetch(`/classrooms/${classId}/token/`, {}, { accessToken, setAccessToken })
      setLiveToken(data?.token || '')
      setLiveMode(Boolean(data?.token))
      if (!data?.token) {
        setLiveError('Unable to start live class.')
      }
    } catch (err) {
      setLiveError(err.message)
      setLiveMode(false)
    } finally {
      setLiveLoading(false)
    }
  }

  const handleToggleLiveClass = async () => {
    if (liveMode) {
      setLiveMode(false)
      setLiveError('')
      return
    }

    await activateLiveClass()
  }

  useEffect(() => {
    if (!accessToken || owned !== false || liveAutoInitialized) {
      return
    }

    setLiveAutoInitialized(true)
    activateLiveClass()
  }, [accessToken, owned, liveAutoInitialized])

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
          <div className="row classroom-actions">
            {owned && (
              <button type="button" className="primary" onClick={handleToggleLiveClass} disabled={liveLoading}>
                {liveLoading ? 'Loading…' : liveMode ? 'Back to Notes' : 'Live Class'}
              </button>
            )}
            {owned && (
              <button type="button" className="ghost" onClick={() => setMenuOpen((open) => !open)}>
                ☰ Menu
              </button>
            )}
          </div>
        </div>
        {liveError && <p className="error">{liveError}</p>}
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

      <section className="card notes-shell">
        <div className="notes-layout">
          <div className="notes-canvas">
            <h3>Class Notes Canvas</h3>
            {displayedNotes.length === 0 ? (
              <p className="muted">No notes displayed yet.</p>
            ) : (
              <div className="displayed-list">
                {displayedNotes.map((item) => (
                  <article key={item.id} className="displayed-item">
                    <div className="row">
                      <div>
                        <strong>#{item.index} — {item.title}</strong>
                        <p className="muted">Saved: {formatDate(item.saved_date)}</p>
                      </div>
                      {owned && (
                        <button
                          type="button"
                          className="ghost danger"
                          onClick={() => handleRemoveDisplayed(item.id)}
                          title="Remove displayed note"
                        >
                          🗑
                        </button>
                      )}
                    </div>
                    <p>{item.content}</p>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="notes-panel">
            {liveMode && liveToken ? (
              <LiveClassSidePanel token={liveToken} />
            ) : owned ? (
              <>
                <h3>Teacher Notes</h3>
                <form className="form" onSubmit={handleSaveNote}>
                  <label>
                    Title
                    <input value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} required />
                  </label>
                  <label>
                    Note
                    <textarea
                      rows={6}
                      value={noteContent}
                      onChange={(event) => setNoteContent(event.target.value)}
                      required
                    />
                  </label>
                  <button type="submit" className="primary">Save note</button>
                </form>

                <h4>Saved Notes</h4>
                {savedNotes.length === 0 ? (
                  <p className="muted">No saved notes yet.</p>
                ) : (
                  <ul className="list">
                    {savedNotes.map((note) => (
                      <li key={note.id} className="note-list-item">
                        <div className="note-list-meta">
                          <strong>#{note.index}</strong>
                          <p className="note-list-title">{note.title}</p>
                        </div>
                        <button
                          type="button"
                          className="primary"
                          onClick={() => handleDisplayNote(note.id)}
                        >
                          Display #{note.index}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <>
                <h3>Right Panel</h3>
                <p className="muted">Reserved for another student component.</p>
              </>
            )}

            {noteError && <p className="error">{noteError}</p>}
            {noteMessage && <p className="success">{noteMessage}</p>}
          </div>
        </div>
      </section>
    </div>
  )
}

function LiveClassSidePanel({ token }) {
  return (
    <div className="live-side-shell">
      <LiveKitRoom
        connect
        video={false}
        audio
        token={token}
        serverUrl={LIVEKIT_SERVER_URL}
        data-lk-theme="default"
        className="live-room"
      >
        <div className="live-side-content">
          <h3>Live Class Chat</h3>
          <div className="live-chat-box">
            <UsernameChat />
          </div>
          <div className="live-audio-box">
            <h4>Audio Chat</h4>
            <LiveAudioButton />
          </div>
        </div>
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  )
}

function LiveAudioButton() {
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant()

  const handleToggleMic = async () => {
    if (!localParticipant) {
      return
    }
    await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)
  }

  return (
    <button type="button" className="primary live-audio-btn" onClick={handleToggleMic}>
      {isMicrophoneEnabled ? 'Mute audio' : 'Unmute audio'}
    </button>
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

function App() {
  const [accessToken, setAccessToken] = useState('')
  const { me, loading, refresh } = useMe(accessToken, setAccessToken)
  const [logoutError, setLogoutError] = useState('')
  const navigate = useNavigate()

  const handleLogout = async () => {
    setLogoutError('')
    try {
      await apiFetch('/auth/logout/', { method: 'POST' }, { accessToken, setAccessToken, skipAuthRefresh: true })
    } catch (err) {
      setLogoutError(err.message)
    } finally {
      setAccessToken('')
      setSessionHint(false)
      await refresh()
      navigate('/')
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
              me?.role === 'teacher' ? (
                <TeacherDashboard
                  me={me}
                  refreshMe={refresh}
                  accessToken={accessToken}
                  setAccessToken={setAccessToken}
                />
              ) : (
                <StudentDashboard accessToken={accessToken} setAccessToken={setAccessToken} />
              )
            ) : (
              <AuthGateway
                onSuccess={async (newAccessToken) => {
                  setAccessToken(newAccessToken)
                  setSessionHint(Boolean(newAccessToken))
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
          path="/classrooms/:classId/live"
          element={<LiveClassroom accessToken={accessToken} />}
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
