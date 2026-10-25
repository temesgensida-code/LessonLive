import { useEffect, useState, useCallback, useRef } from 'react'
import { X } from 'lucide-react'

function CountdownOverlay({ notification, onClose }) {
  const [remaining, setRemaining] = useState(() => {
    const created = new Date(notification.created_at).getTime()
    const endsAt = created + notification.countdown_seconds * 1000
    return Math.max(0, Math.floor((endsAt - Date.now()) / 1000))
  })

  const closeButtonRef = useRef(null)
  const totalSeconds = notification.countdown_seconds

  const tick = useCallback(() => {
    const created = new Date(notification.created_at).getTime()
    const endsAt = created + notification.countdown_seconds * 1000
    const left = Math.max(0, Math.floor((endsAt - Date.now()) / 1000))
    setRemaining(left)
    if (left <= 0) {
      return false
    }
    return true
  }, [notification])

  // Escape key handler and focus management
  useEffect(() => {
    closeButtonRef.current?.focus()

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    if (remaining <= 0) return undefined

    const intervalId = setInterval(() => {
      const shouldContinue = tick()
      if (!shouldContinue) {
        clearInterval(intervalId)
      }
    }, 1000)

    return () => clearInterval(intervalId)
  }, [tick, remaining > 0])

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const progress = totalSeconds > 0 ? remaining / totalSeconds : 0

  // SVG circular progress
  const size = 220
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - progress)

  const isFinished = remaining <= 0
  const isUrgent = remaining <= 30 && remaining > 0

  return (
    <div
      className={`countdown-overlay ${isFinished ? 'finished' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="countdown-title"
    >
      <div className="countdown-overlay-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="countdown-overlay-content">
        <button
          ref={closeButtonRef}
          type="button"
          className="countdown-close-btn"
          onClick={onClose}
          aria-label="Close countdown modal"
        >
          <X size={20} aria-hidden="true" />
        </button>

        <h2 id="countdown-title" className="countdown-message">
          {notification.message}
        </h2>
        <p className="countdown-from">
          From: {notification.created_by?.split('@')[0] || 'Teacher'}
        </p>

        <div className="countdown-ring-wrap" aria-hidden="true">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="countdown-ring-svg"
          >
            {/* Background ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={strokeWidth}
            />
            {/* Progress ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={isUrgent ? 'var(--error)' : isFinished ? 'var(--success)' : 'var(--primary)'}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              className="countdown-ring-progress"
            />
          </svg>
          <div className="countdown-ring-inner">
            {isFinished ? (
              <span className="countdown-finished-text">Time's Up!</span>
            ) : (
              <>
                <span className={`countdown-digits ${isUrgent ? 'urgent' : ''}`}>
                  {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </span>
                <span className="countdown-label">remaining</span>
              </>
            )}
          </div>
        </div>

        {/* Live region for screen readers */}
        <div className="sr-only" role="status" aria-live="polite">
          {isFinished
            ? "Time is up!"
            : `${minutes} minutes and ${seconds} seconds remaining`}
        </div>

        {isFinished && (
          <button type="button" className="primary countdown-done-btn" onClick={onClose}>
            Dismiss
          </button>
        )}
      </div>
    </div>
  )
}

export default CountdownOverlay
