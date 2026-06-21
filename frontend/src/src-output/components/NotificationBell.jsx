import { useState, useRef, useEffect } from 'react'

function NotificationBell({ notifications, hasUnread, onMarkRead, onLaunch }) {
  const [open, setOpen] = useState(false)
  const bellRef = useRef(null)
  const dropdownRef = useRef(null)

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
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleBellClick = () => {
    setOpen((prev) => !prev)
    if (hasUnread) {
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

  const activeNotifications = notifications.filter((n) => {
    const { remaining } = getTimeRemaining(n.created_at, n.countdown_seconds)
    return remaining > 0
  })

  return (
    <div className="notification-bell-wrap">
      <button
        ref={bellRef}
        type="button"
        className={`notification-bell-btn ${hasUnread ? 'has-unread' : ''}`}
        onClick={handleBellClick}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {hasUnread && <span className="notification-bell-badge" aria-hidden="true" />}
      </button>

      {open && (
        <div ref={dropdownRef} className="notification-dropdown">
          <div className="notification-dropdown-header">
            <span className="notification-dropdown-title">🔔 Notifications</span>
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
                      <span className="notification-card-timer">⏱ {display} remaining</span>
                    </div>
                    <button
                      type="button"
                      className="notification-launch-btn"
                      onClick={() => {
                        onLaunch(n)
                        setOpen(false)
                      }}
                    >
                      🚀 Launch
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
