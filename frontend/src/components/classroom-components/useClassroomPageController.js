import { useEffect, useState } from 'react'
import { apiFetch, getNotesWebSocketUrl } from '../apiClient'

function useClassroomPageController({ classId, accessToken, setAccessToken }) {
  const [classroom, setClassroom] = useState(null)
  const [owned, setOwned] = useState(false)
  const [emails, setEmails] = useState('')
  const [file, setFile] = useState(null)
  const [message, setMessage] = useState('')
  const [inviteLinks, setInviteLinks] = useState([])
  const [error, setError] = useState('')
  const [savedNotes, setSavedNotes] = useState([])
  const [displayedNotes, setDisplayedNotes] = useState([])
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [deleteConfirmNoteId, setDeleteConfirmNoteId] = useState(null)
  const [noteError, setNoteError] = useState('')
  const [noteMessage, setNoteMessage] = useState('')
  const [liveMode, setLiveMode] = useState(false)
  const [liveToken, setLiveToken] = useState('')
  const [liveLoading, setLiveLoading] = useState(false)
  const [liveError, setLiveError] = useState('')
  const [liveAutoInitialized, setLiveAutoInitialized] = useState(false)
  const [sidebarPortalTarget, setSidebarPortalTarget] = useState(null)
  const [sidebarTab, setSidebarTab] = useState(null)

  useEffect(() => {
    setSidebarPortalTarget(document.getElementById('sidebar-portal-target'))
  }, [])

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
    if (!accessToken) {
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
  }, [classId, accessToken])

  const handleInvite = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setInviteLinks([])

    if (!emails.trim() && !file) {
      setError('Enter at least one student email or upload a CSV file.')
      return
    }

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

      const skippedSummary = (data.skipped || [])
        .map((item) => {
          const reason = item.detail ? `${item.reason} (${item.detail})` : item.reason
          const linkText = item.invite_link ? ` [invite link: ${item.invite_link}]` : ''
          return `${item.email}: ${reason}${linkText}`
        })
        .join(' | ')

      const linkItems = [
        ...(data.invited || [])
          .filter((item) => item.invite_link)
          .map((item) => ({ email: item.email, link: item.invite_link, source: 'invited' })),
        ...(data.skipped || [])
          .filter((item) => item.invite_link)
          .map((item) => ({ email: item.email, link: item.invite_link, source: 'fallback' })),
      ]

      setInviteLinks(linkItems)

      const baseMessage = `Invited ${data.invited_count} students. Skipped ${data.skipped_count}.`
      const details = [
        skippedSummary,
      ]
        .filter(Boolean)
        .join(' | ')

      setMessage(details ? `${baseMessage} ${details}` : baseMessage)
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

  const handleDeleteNote = async (noteId) => {
    setNoteError('')
    setNoteMessage('')
    try {
      const data = await apiFetch(`/classrooms/${classId}/notes/${noteId}/`, {
        method: 'DELETE',
      }, { accessToken, setAccessToken })

      setSavedNotes(data?.notes || [])
      setDeleteConfirmNoteId(null)
      if (data?.removed?.index) {
        setNoteMessage(`Deleted note #${data.removed.index}`)
      }
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

  const notePendingDelete = savedNotes.find((note) => note.id === deleteConfirmNoteId) || null

  return {
    classroom,
    owned,
    emails,
    setEmails,
    setFile,
    message,
    inviteLinks,
    error,
    savedNotes,
    displayedNotes,
    noteTitle,
    setNoteTitle,
    noteContent,
    setNoteContent,
    deleteConfirmNoteId,
    setDeleteConfirmNoteId,
    noteError,
    noteMessage,
    liveMode,
    liveToken,
    liveLoading,
    liveError,
    sidebarPortalTarget,
    sidebarTab,
    setSidebarTab,
    notePendingDelete,
    formatDate,
    handleInvite,
    handleSaveNote,
    handleDisplayNote,
    handleDeleteNote,
    handleRemoveDisplayed,
    handleToggleLiveClass,
  }
}

export default useClassroomPageController
