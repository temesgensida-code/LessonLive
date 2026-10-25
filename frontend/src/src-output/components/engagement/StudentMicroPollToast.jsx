import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, Clock } from 'lucide-react'
import useLiveKitDataTopic from './useLiveKitDataTopic'
import './engagement.css'

export const POLL_TOPIC = 'lessonlive-poll'

function StudentMicroPollToast() {
  const [activePoll, setActivePoll] = useState(null)
  const [remainingSecs, setRemainingSecs] = useState(0)
  const [votedIndex, setVotedIndex] = useState(null)

  const handleMessage = useCallback((data) => {
    if (!data || !data.type) return

    if (data.type === 'POLL_START' && data.poll) {
      setActivePoll(data.poll)
      setRemainingSecs(data.poll.durationSeconds || 15)
      setVotedIndex(null)
    } else if (data.type === 'POLL_END') {
      setActivePoll(null)
    }
  }, [])

  const { publish, localParticipant } = useLiveKitDataTopic(POLL_TOPIC, handleMessage)

  // Countdown timer
  useEffect(() => {
    if (!activePoll || remainingSecs <= 0) return

    const timer = setInterval(() => {
      setRemainingSecs((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setTimeout(() => setActivePoll(null), 1500)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [activePoll, remainingSecs])

  if (!activePoll) return null

  const handleVote = async (index) => {
    if (votedIndex !== null || !localParticipant) return

    setVotedIndex(index)
    await publish?.({
      type: 'POLL_VOTE',
      pollId: activePoll.id,
      voterIdentity: localParticipant.identity,
      optionIndex: index,
    })
  }

  const percentLeft = Math.max(0, (remainingSecs / (activePoll.durationSeconds || 15)) * 100)

  return (
    <div
      className="student-poll-toast"
      role="alert"
      aria-live="assertive"
      data-testid="student-poll-toast"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--primary)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Quick Pulse Check
        </span>
        <span style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
          <Clock size={13} aria-hidden="true" />
          <span>{remainingSecs}s</span>
        </span>
      </div>

      <div className="poll-timer-bar">
        <div className="poll-timer-fill" style={{ width: `${percentLeft}%` }} />
      </div>

      <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>
        {activePoll.prompt}
      </p>

      {votedIndex !== null ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#10b981',
            fontSize: '0.85rem',
            padding: '0.5rem 0',
          }}
        >
          <CheckCircle2 size={16} aria-hidden="true" />
          <span>Response recorded! Waiting for instructor to close poll…</span>
        </div>
      ) : (
        <div className="poll-options-grid">
          {activePoll.options.map((opt, idx) => (
            <button
              key={idx}
              type="button"
              className="poll-option-btn"
              onClick={() => handleVote(idx)}
              disabled={remainingSecs <= 0}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default StudentMicroPollToast
