import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GiHamburgerMenu } from 'react-icons/gi'

function Layout({ children, me, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="page">
      <header className="topbar">
        <Link to="/" className="brand" aria-label="LessonLive home">
          LessonLive
        </Link>
        <nav className="nav">
          {me?.authenticated ? (
            <>
              <span className="nav-user">{me.email}</span>
              <button
                type="button"
                className="ghost menu-toggle"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
                aria-expanded={sidebarOpen}
              >
                <GiHamburgerMenu size={16} aria-hidden="true" />
              </button>
            </>
          ) : (
            <span className="nav-user">Teacher &amp; Student Portal</span>
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
          <button type="button" className="ghost danger logout-btn" onClick={onLogout}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Log out
          </button>
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
      </aside>

      <main className="content">{children}</main>
    </div>
  )
}

export default Layout
