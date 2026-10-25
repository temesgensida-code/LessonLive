import { useState, useRef, useEffect } from 'react'
import { Bell, Rocket, Clock3 } from 'lucide-react'

function NotificationBell({ notifications = [], hasUnread = false, onMarkRead, onLaunch }) {
  const [open, setOpen] = useState(false)
  const [, setTick] = useState(0)
  const bellRef = useRef(null)
  const dropdownRef = useRef(null)

  // Timer tick while dropdown is open so remaining time updates in real time
  useEffect(() => {
    if (!open) return
    const timer = setInterval(() => {
      setTick((t) => t + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [open])

  // Click outside and Escape key to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        bellRef.current &&
        !bellRef.current.contains(event.target)
      ) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && open) {
        setOpen(false)
        bellRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const handleBellClick = () => {
    const nextOpen = !open
    setOpen(nextOpen)
    if (nextOpen && hasUnread && onMarkRead) {
      onMarkRead()
    }
  }

  const getTimeRemaining = (createdAt, countdownSeconds) => {
    const created = new Date(createdAt).getTime()
    const endsAt = created + countdownSeconds * 1000
    const remaining = Math.max(0, Math.floor((endsAt - Date.now()) / 1000))
    const minutes = Math.floor(remaining / 60)
    const seconds = remaining % 60
    return { remaining, display: `${minutes}m ${String(seconds).padStart(2, '0')}s` }
  }

  const activeNotifications = (notifications || []).filter((n) => {
    const { remaining } = getTimeRemaining(n.created_at, n.countdown_seconds)
    return remaining > 0
  })

  const accessibleLabel = hasUnread
    ? `Notifications: ${activeNotifications.length} active, new unread notification`
    : `Notifications: ${activeNotifications.length} active`

  return (
    <div className="notification-bell-wrap">
      <button
        ref={bellRef}
        type="button"
        className={`notification-bell-btn ${hasUnread ? 'has-unread' : ''}`}
        onClick={handleBellClick}
        aria-label={accessibleLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell size={20} aria-hidden="true" />
        {hasUnread && <span className="notification-bell-badge" aria-hidden="true" />}
      </button>

      {open && (
        <div
          ref={dropdownRef}
          className="notification-dropdown"
          role="region"
          aria-label="Notifications panel"
        >
          <div className="notification-dropdown-header">
            <span className="notification-dropdown-title">
              <Bell size={16} aria-hidden="true" /> Notifications
            </span>
            <span className="notification-dropdown-count">
              {activeNotifications.length} active
            </span>
          </div>

          {activeNotifications.length === 0 ? (
            <div className="notification-dropdown-empty">
              <span>No active notifications</span>
            </div>
          ) : (
            <div className="notification-dropdown-list">
              {activeNotifications.map((n) => {
                const { display } = getTimeRemaining(n.created_at, n.countdown_seconds)
                return (
                  <div key={n.id} className="notification-card">
                    <div className="notification-card-body">
                      <p className="notification-card-message">{n.message}</p>
                      <span className="notification-card-timer">
                        <Clock3 size={14} aria-hidden="true" /> {display} remaining
                      </span>
                    </div>
                    <button
                      type="button"
                      className="notification-launch-btn"
                      onClick={() => {
                        onLaunch(n)
                        setOpen(false)
                      }}
                      aria-label={`Launch timer for: ${n.message}`}
                    >
                      <Rocket size={14} aria-hidden="true" /> Launch
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationBell
