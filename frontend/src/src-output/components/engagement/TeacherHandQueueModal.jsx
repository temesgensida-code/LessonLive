import { useState, useCallback, useEffect } from 'react'
import { Hand, Mic, MicOff, X, Check, Volume2 } from 'lucide-react'
import useLiveKitDataTopic from './useLiveKitDataTopic'
import './engagement.css'

export const HAND_TOPIC = 'lessonlive-hand'

function TeacherHandQueueModal() {
  const [queue, setQueue] = useState([])
  const [isOpen, setIsOpen] = useState(false)

  const handleMessage = useCallback((data, participant) => {
    if (!data || !data.type) return

    if (data.type === 'HAND_RAISE') {
      const student = {
        identity: data.identity || participant?.identity || '',
        name: data.name || participant?.name || 'Student',
        raisedAt: data.raisedAt || Date.now(),
        micGranted: false,
      }
      setQueue((prev) => {
        if (prev.some((item) => item.identity === student.identity)) {
          return prev
        }
        const updated = [...prev, student].sort((a, b) => a.raisedAt - b.raisedAt)
        return updated
      })
    } else if (data.type === 'HAND_LOWER') {
      setQueue((prev) => prev.filter((item) => item.identity !== data.identity))
    }
  }, [])

  const { publish } = useLiveKitDataTopic(HAND_TOPIC, handleMessage)

  // Broadcast sync to students whenever queue changes
  useEffect(() => {
    if (publish) {
      publish({
        type: 'HAND_SYNC',
        queue,
      })
    }
  }, [queue, publish])

  const handleGrantMic = async (identity) => {
    await publish({
      type: 'GRANT_MIC',
      targetIdentity: identity,
    })
    setQueue((prev) =>
      prev.map((item) =>
        item.identity === identity ? { ...item, micGranted: true } : item
      )
    )
  }

  const handleRevokeMic = async (identity) => {
    await publish({
      type: 'REVOKE_MIC',
      targetIdentity: identity,
    })
    setQueue((prev) =>
      prev.map((item) =>
        item.identity === identity ? { ...item, micGranted: false } : item
      )
    )
  }

  const handleLowerHand = async (identity) => {
    await publish({
      type: 'HAND_LOWER',
      identity,
      loweredBy: 'teacher',
    })
    setQueue((prev) => prev.filter((item) => item.identity !== identity))
  }

  const handleLowerAll = async () => {
    await publish({
      type: 'HAND_LOWER',
      identity: 'ALL',
      loweredBy: 'teacher',
    })
    setQueue([])
  }

  return (
    <>
      <button
        type="button"
        className={`teacher-hand-badge-btn ${queue.length > 0 ? 'has-hands' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={`${queue.length} students have raised hands`}
        aria-expanded={isOpen}
      >
        <Hand size={15} fill={queue.length > 0 ? 'currentColor' : 'none'} aria-hidden="true" />
        <span>{queue.length} {queue.length === 1 ? 'Hand' : 'Hands'}</span>
      </button>

      {isOpen && (
        <div
          className="custom-modal-overlay"
          onClick={() => setIsOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="hand-queue-modal-title"
        >
          <div
            className="custom-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Hand size={18} color="#f59e0b" aria-hidden="true" />
                <h3 id="hand-queue-modal-title" style={{ margin: 0, fontSize: '1.05rem' }}>
                  Speaker Permission Queue ({queue.length})
                </h3>
              </div>
              <button
                type="button"
                className="custom-modal-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close hand queue"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {queue.length === 0 ? (
              <p className="muted" style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                No hands currently raised.
              </p>
            ) : (
              <>
                <ul className="hand-queue-list" aria-label="Raised hands queue">
                  {queue.map((student, index) => {
                    const elapsedSecs = Math.max(0, Math.round((Date.now() - student.raisedAt) / 1000))
                    return (
                      <li key={student.identity} className="hand-queue-item">
                        <div className="hand-queue-info">
                          <span className="hand-queue-index">#{index + 1}</span>
                          <div>
                            <strong style={{ fontSize: '0.88rem', display: 'block' }}>{student.name}</strong>
                            <span className="muted" style={{ fontSize: '0.72rem' }}>
                              Raised {elapsedSecs}s ago
                            </span>
                          </div>
                        </div>

                        <div className="row" style={{ gap: '6px' }}>
                          {student.micGranted ? (
                            <button
                              type="button"
                              className="ghost danger btn-sm"
                              onClick={() => handleRevokeMic(student.identity)}
                              title="Revoke speaking floor"
                              aria-label={`Mute ${student.name}`}
                            >
                              <MicOff size={14} aria-hidden="true" />
                              <span>Mute</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="primary btn-sm"
                              onClick={() => handleGrantMic(student.identity)}
                              title="Grant microphone permission"
                              aria-label={`Grant mic to ${student.name}`}
                            >
                              <Mic size={14} aria-hidden="true" />
                              <span>Grant Mic</span>
                            </button>
                          )}

                          <button
                            type="button"
                            className="ghost btn-sm icon-btn"
                            onClick={() => handleLowerHand(student.identity)}
                            title="Lower hand"
                            aria-label={`Lower hand for ${student.name}`}
                          >
                            <X size={15} aria-hidden="true" />
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>

                <div className="row" style={{ marginTop: '1.25rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="ghost danger btn-sm"
                    onClick={handleLowerAll}
                  >
                    Lower All Hands
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default TeacherHandQueueModal
