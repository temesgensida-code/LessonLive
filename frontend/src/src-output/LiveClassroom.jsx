import React, { useState, useEffect } from 'react'
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
  useLocalParticipant,
} from '@livekit/components-react'
import '@livekit/components-styles'
import { Track } from 'livekit-client'
import { useParams } from 'react-router-dom'
import UsernameChat from './UsernameChat'
import { API_BASE, LIVEKIT_SERVER_URL } from './components/apiClient'
import { MessageSquare, FileText, Mic, MicOff } from 'lucide-react'

const serverUrl = import.meta.env.VITE_LIVEKIT_URL || LIVEKIT_SERVER_URL

export default function LiveClassroom({ accessToken }) {
  const { classId } = useParams()
  const [token, setToken] = useState(null)
  const [tokenLoading, setTokenLoading] = useState(true)
  const [tokenError, setTokenError] = useState('')
  const [isTeacher, setIsTeacher] = useState(false)

  useEffect(() => {
    const fetchToken = async () => {
      setTokenLoading(true)
      setTokenError('')
      try {
        const response = await fetch(`${API_BASE}/classrooms/${classId}/token/`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (!response.ok) {
          setTokenError(`Unable to start live class (${response.status}).`)
          setToken(null)
          return
        }
        const data = await response.json()
        if (data?.livekit_enabled === false) {
          setTokenError(data.detail || 'Live class is unavailable in this environment.')
          setToken(null)
          return
        }

        if (!data?.token) {
          setTokenError(data?.detail || 'Unable to start live class.')
          setToken(null)
          return
        }

        setToken(data.token)

        const userRes = await fetch(`${API_BASE}/auth/me/`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (userRes.ok) {
          const userData = await userRes.json()
          if (userData.role === 'teacher') {
            setIsTeacher(true)
          }
        }
      } catch (e) {
        console.error(e)
        setTokenError('Unable to start live class.')
        setToken(null)
      } finally {
        setTokenLoading(false)
      }
    }
    if (accessToken) fetchToken()
    else {
      setTokenLoading(false)
    }
  }, [classId, accessToken])

  if (tokenLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: 'var(--bg-base)',
          color: 'var(--text-primary)',
          gap: '1rem',
        }}
        role="status"
        aria-label="Loading live classroom"
      >
        <div className="loading-spinner" aria-hidden="true" />
        <p className="muted">Connecting to live session…</p>
      </div>
    )
  }

  if (!token) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          textAlign: 'center',
          padding: '1.5rem',
          background: 'var(--bg-base)',
          color: 'var(--text-primary)',
        }}
        role="alert"
      >
        <div className="card" style={{ maxWidth: '440px', padding: '2rem' }}>
          <p className="error">{tokenError || 'Live classroom is unavailable right now.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
      <LiveKitRoom
        video={true}
        audio={true}
        token={token}
        serverUrl={serverUrl}
        data-lk-theme="default"
        style={{ flex: 1, display: 'flex' }}
      >
        {/* Main Stage */}
        <div
          style={{
            flex: 3,
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg-base)',
          }}
        >
          <Stage />
          <div
            style={{
              padding: '10px',
              display: 'flex',
              justifyContent: 'center',
              background: 'var(--bg-surface)',
              borderTop: '1px solid var(--border)',
            }}
          >
            <ControlBar variation="minimal" controls={{ screenShare: isTeacher, chat: false }} />
          </div>
        </div>

        {/* Sidebar */}
        <div
          style={{
            flexBasis: '40%',
            flexGrow: 2,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg-card)',
            borderLeft: '1px solid var(--border)',
          }}
        >
          <RightPanel isTeacher={isTeacher} classId={classId} accessToken={accessToken} />
        </div>

        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  )
}

function Stage() {
  const screenTracks = useTracks([Track.Source.ScreenShare])
  const cameraTracks = useTracks([Track.Source.Camera])
  const tracks = screenTracks.length > 0 ? screenTracks : cameraTracks

  return (
    <div style={{ flex: 1 }}>
      <GridLayout tracks={tracks}>
        <ParticipantTile />
      </GridLayout>
    </div>
  )
}

function RightPanel({ isTeacher, classId, accessToken }) {
  const [teacherMode, setTeacherMode] = useState('chat')

  if (isTeacher) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <button
          type="button"
          onClick={() => setTeacherMode(teacherMode === 'chat' ? 'notes' : 'chat')}
          className="primary"
          style={{
            width: '100%',
            padding: '14px',
            fontSize: '15px',
            fontWeight: 700,
            background: teacherMode === 'chat' ? 'var(--primary)' : 'var(--success-bg)',
            color: teacherMode === 'chat' ? '#ffffff' : 'var(--success)',
            border: 'none',
            borderBottom: '1px solid var(--border)',
            borderRadius: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          {teacherMode === 'chat' ? (
            <>
              <FileText size={16} aria-hidden="true" /> Switch to Writing Notes
            </>
          ) : (
            <>
              <MessageSquare size={16} aria-hidden="true" /> Switch to Classroom Chat
            </>
          )}
        </button>

        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {teacherMode === 'chat' ? (
            <UsernameChat isTeacher={isTeacher} chatStorageKey={`classroom-${classId}`} />
          ) : (
            <NotesComponent classId={classId} accessToken={accessToken} />
          )}
        </div>
      </div>
    )
  }

  // Student View
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <UsernameChat isTeacher={isTeacher} chatStorageKey={`classroom-${classId}`} />
      </div>

      <div
        style={{
          padding: '16px',
          backgroundColor: 'var(--bg-surface)',
          borderTop: '1px solid var(--border)',
        }}
      >
        <h4 style={{ marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Audio Controls
        </h4>
        <AudioStreamButton />
      </div>
    </div>
  )
}

function AudioStreamButton() {
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant()

  const toggleAudio = async () => {
    if (localParticipant) {
      const desired = !isMicrophoneEnabled
      await localParticipant.setMicrophoneEnabled(desired)
    }
  }

  return (
    <button
      type="button"
      onClick={toggleAudio}
      aria-pressed={isMicrophoneEnabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        width: '100%',
        padding: '12px',
        backgroundColor: isMicrophoneEnabled ? 'var(--error-bg)' : 'var(--success-bg)',
        color: isMicrophoneEnabled ? 'var(--error)' : 'var(--success)',
        border: `1px solid ${isMicrophoneEnabled ? 'var(--error-border)' : 'var(--success-border)'}`,
        borderRadius: 'var(--radius-md)',
        fontSize: '15px',
        cursor: 'pointer',
        fontWeight: 600,
        minHeight: '44px',
        transition: 'background-color var(--ease-fast), border-color var(--ease-fast)',
      }}
    >
      {isMicrophoneEnabled ? (
        <>
          <MicOff size={18} aria-hidden="true" /> Mute Microphone
        </>
      ) : (
        <>
          <Mic size={18} aria-hidden="true" /> Unmute Microphone
        </>
      )}
    </button>
  )
}

function NotesComponent({ classId, accessToken }) {
  const [note, setNote] = useState('')
  const [status, setStatus] = useState('')

  const handleSave = async () => {
    const trimmed = note.trim()
    if (!trimmed) {
      setStatus('Type a note before saving.')
      return
    }

    try {
      setStatus('Saving…')
      const response = await fetch(`${API_BASE}/classrooms/${classId}/notes/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: `Live note ${new Date().toLocaleString()}`,
          content: trimmed,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        setStatus(errorData.detail || 'Unable to save note.')
        return
      }

      setStatus('Saved successfully.')
    } catch {
      setStatus('Unable to save note.')
    }
  }

  return (
    <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ marginBottom: '12px', fontSize: '1.1rem' }}>Private Notes</h3>
      <label htmlFor="live-private-note" className="sr-only">
        Private Notes
      </label>
      <textarea
        id="live-private-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Take notes during the live lecture…"
        style={{
          flex: 1,
          width: '100%',
          padding: '12px',
          marginBottom: '15px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-bright)',
          backgroundColor: 'var(--bg-input)',
          color: 'var(--text-primary)',
          resize: 'none',
          fontSize: '14px',
          fontFamily: 'inherit',
        }}
      />
      {status && (
        <p
          className={status.includes('Unable') || status.includes('Type') ? 'error' : 'success'}
          role={status.includes('Unable') ? 'alert' : 'status'}
          style={{ marginBottom: '10px' }}
        >
          {status}
        </p>
      )}
      <button type="button" className="primary" onClick={handleSave}>
        Save Note
      </button>
    </div>
  )
}
