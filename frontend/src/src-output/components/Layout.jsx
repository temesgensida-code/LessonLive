import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu } from 'lucide-react'
import NotificationBell from './NotificationBell'
import { useNotificationContext } from './NotificationContext'

function Layout({ children, me, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const { notifications, hasUnread, markRead, setActiveCountdown } = useNotificationContext()

  const isStudent = me?.authenticated && me?.role !== 'teacher'
  const showBell = isStudent && notifications.length > 0

  return (
    <div className="page">
      <header className="topbar">
        <Link to="/" className="brand" aria-label="LessonLive home">
          <span className="brand-icon" aria-hidden="true">⬡</span>
          LessonLive
        </Link>
        <nav className="nav">
          {me?.authenticated ? (
            <>
              {/* Notification bell for students — in the topbar */}
              {showBell && (
                <NotificationBell
                  notifications={notifications}
                  hasUnread={hasUnread}
                  onMarkRead={markRead}
                  onLaunch={(n) => setActiveCountdown(n)}
                />
              )}

              <span className={`nav-user ${hasUnread && isStudent ? 'nav-user-glow' : ''}`}>
                <span className="nav-user-dot" aria-hidden="true" />
                {me.email}
              </span>
              {/* <button
                type="button"
                className="ghost menu-toggle"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
                aria-expanded={sidebarOpen}
              >
                <Menu size={32} aria-hidden="true" />
              </button> */}

              <button
                aria-label="Menu"
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: 0,
                  cursor: 'pointer'
                }}
              >
                <Menu size={28} onClick={() => setSidebarOpen(true)} strokeWidth={2.5} aria-hidden="true" />
              </button>

            </>
          ) : (
            <div className="nav-actions">
              <span className="nav-tagline">Teacher &amp; Student Portal</span>
              <button
                type="button"
                className="primary nav-signin-btn"
                onClick={() => navigate('/auth')}
              >
                Sign in
              </button>
            </div>
          )}
        </nav>
      </header>

      {/* Overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} aria-label="Application menu">
        <div className="sidebar-header">
          <div className="sidebar-user-info">
            <span className="sidebar-user-avatar" aria-hidden="true">
              {me?.email?.[0]?.toUpperCase() || '?'}
            </span>
            <div>
              <p className="sidebar-user-email">{me?.email}</p>
              <p className="sidebar-user-role">{me?.role === 'teacher' ? '👨‍🏫 Teacher' : '🎓 Student'}</p>
            </div>
          </div>
          <button
            type="button"
            className="ghost close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>
        <div className="sidebar-content" id="sidebar-portal-target">
          {/* Page-specific content via portal */}
        </div>
        <div className="sidebar-footer">
          <button type="button" className="ghost danger logout-btn" onClick={onLogout}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Log out
          </button>
        </div>
      </aside>

      <main className="content">{children}</main>
    </div>
  )
}

export default Layout
