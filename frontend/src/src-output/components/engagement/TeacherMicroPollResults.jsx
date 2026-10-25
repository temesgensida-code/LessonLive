import { useState, useEffect, useCallback } from 'react'
import { BarChart2, X, Users, Clock } from 'lucide-react'
import useLiveKitDataTopic from './useLiveKitDataTopic'
import './engagement.css'

export const POLL_TOPIC = 'lessonlive-poll'

function TeacherMicroPollResults({ activePoll, onClose }) {
  const [votes, setVotes] = useState({}) // optionIndex -> Set of voterIdentities
  const [remainingSecs, setRemainingSecs] = useState(activePoll?.durationSeconds || 15)

  const handleMessage = useCallback((data) => {
    if (!data || !data.type) return

    if (data.type === 'POLL_VOTE' && data.pollId === activePoll?.id) {
      setVotes((prev) => {
        const optionVotes = new Set(prev[data.optionIndex] || [])
        optionVotes.add(data.voterIdentity)
        return {
          ...prev,
          [data.optionIndex]: optionVotes,
        }
      })
    }
  }, [activePoll?.id])

  const { publish } = useLiveKitDataTopic(POLL_TOPIC, handleMessage)

  // Countdown timer
  useEffect(() => {
    if (remainingSecs <= 0) return

    const timer = setInterval(() => {
      setRemainingSecs((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [remainingSecs])

  if (!activePoll) return null

  // Calculate totals
  let totalVotes = 0
  const countsPerOption = {}
  activePoll.options.forEach((_, idx) => {
    const count = votes[idx]?.size || 0
    countsPerOption[idx] = count
    totalVotes += count
  })

  const handleEndPoll = async () => {
    await publish?.({
      type: 'POLL_END',
      pollId: activePoll.id,
      results: countsPerOption,
      totalVotes,
    })
    onClose()
  }

  return (
    <div
      className="custom-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="poll-results-title"
    >
      <div
        className="custom-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '440px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 size={18} color="var(--primary)" aria-hidden="true" />
            <h3 id="poll-results-title" style={{ margin: 0, fontSize: '1.05rem' }}>
              Live Poll Results
            </h3>
          </div>
          <button
            type="button"
            className="custom-modal-close"
            onClick={onClose}
            aria-label="Close poll results"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <p style={{ fontWeight: 600, fontSize: '0.95rem', margin: '0 0 0.75rem' }}>
          {activePoll.prompt}
        </p>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Users size={14} aria-hidden="true" />
            <span>{totalVotes} {totalVotes === 1 ? 'response' : 'responses'}</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={14} aria-hidden="true" />
            <span>{remainingSecs}s remaining</span>
          </span>
        </div>

        <div className="poll-results-bar-container">
          {activePoll.options.map((option, idx) => {
            const count = countsPerOption[idx] || 0
            const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
            return (
              <div key={idx} className="poll-result-bar-row">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span>{option}</span>
                  <strong>{count} ({pct}%)</strong>
                </div>
                <div className="poll-result-track">
                  <div className="poll-result-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>

        <div className="row" style={{ marginTop: '1.5rem', justifyContent: 'flex-end', gap: '8px' }}>
          <button type="button" className="ghost danger btn-sm" onClick={handleEndPoll}>
            End Poll
          </button>
        </div>
      </div>
    </div>
  )
}

export default TeacherMicroPollResults
