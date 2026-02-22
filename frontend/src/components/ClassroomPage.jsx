import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import LiveClassSidePanel from './LiveClassSidePanel'
import { apiFetch, getNotesWebSocketUrl } from './apiClient'

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

export default ClassroomPage
