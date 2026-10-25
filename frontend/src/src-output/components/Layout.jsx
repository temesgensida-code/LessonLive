import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, Hexagon, School, GraduationCap, X } from 'lucide-react'
import NotificationBell from './NotificationBell'
import { useNotificationContext } from './NotificationContext'

function Layout({ children, me, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const menuButtonRef = useRef(null)
  const closeButtonRef = useRef(null)
  const navigate = useNavigate()
  const { notifications, hasUnread, markRead, setActiveCountdown } = useNotificationContext()

  const isStudent = me?.authenticated && me?.role !== 'teacher'
  const showBell = isStudent && notifications.length > 0

  // Close sidebar on Escape key and restore focus
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false)
        menuButtonRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [sidebarOpen])

  // Move focus to close button when sidebar opens
  useEffect(() => {
    if (sidebarOpen) {
      closeButtonRef.current?.focus()
    }
  }, [sidebarOpen])

  return (
    <div className="page">
      {/* Skip Link for Keyboard Accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <header className="topbar" role="banner">
        <Link to="/" className="brand" aria-label="LessonLive home">
          <Hexagon className="brand-icon" aria-hidden="true" size={24} />
          <span>LessonLive</span>
        </Link>
        <nav className="nav" aria-label="Main Navigation">
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
                <span className="nav-user-text">{me.email}</span>
              </span>

              <button
                ref={menuButtonRef}
                type="button"
                className="menu-toggle-btn"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar menu"
                aria-expanded={sidebarOpen}
                aria-controls="classroom-sidebar-drawer"
              >
                <Menu size={24} strokeWidth={2.2} aria-hidden="true" />
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
        onClick={() => {
          setSidebarOpen(false)
          menuButtonRef.current?.focus()
        }}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        id="classroom-sidebar-drawer"
        className={`sidebar ${sidebarOpen ? 'open' : ''}`}
        aria-label="Application menu"
        aria-hidden={!sidebarOpen}
      >
        <div className="sidebar-header">
          <div className="sidebar-user-info">
            <span className="sidebar-user-avatar" aria-hidden="true">
              {me?.email?.[0]?.toUpperCase() || '?'}
            </span>
            <div>
              <p className="sidebar-user-email">{me?.email}</p>
              <p className="sidebar-user-role">
                {me?.role === 'teacher' ? (
                  <><School size={16} aria-hidden="true" /> Teacher</>
                ) : (
                  <><GraduationCap size={16} aria-hidden="true" /> Student</>
                )}
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="ghost close-btn"
            onClick={() => {
              setSidebarOpen(false)
              menuButtonRef.current?.focus()
            }}
            aria-label="Close menu"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="sidebar-content" id="sidebar-portal-target">
          {/* Page-specific content via portal */}
        </div>
        <div className="sidebar-footer">
          <button type="button" className="ghost danger logout-btn" onClick={onLogout}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
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

      <main id="main-content" className="content" tabIndex={-1}>
        {children}
      </main>
    </div>
  )
}

export default Layout
