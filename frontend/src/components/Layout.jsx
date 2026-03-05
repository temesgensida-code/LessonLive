import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GiHamburgerMenu } from 'react-icons/gi'

function Layout({ children, me, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="page">
      <header className="topbar">
        <Link to="/" className="brand">
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
              >
                <GiHamburgerMenu size={16} aria-hidden="true" />
              </button>
            </>
          ) : (
            <span className="nav-user">Teacher & Student Portal</span>
          )}
        </nav>
      </header>

      {/* Sidebar Overlay */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <button type="button" className="ghost danger logout-btn" onClick={onLogout}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Log out
          </button>
          <button type="button" className="ghost close-btn" onClick={() => setSidebarOpen(false)}>
            ✕
          </button>
        </div>
        <div className="sidebar-content" id="sidebar-portal-target">
          {/* Page-specific content will be rendered here via Portal */}
        </div>
      </aside>

      <main className="content">{children}</main>
    </div>
  )
}

export default Layout
