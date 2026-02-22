import { Link } from 'react-router-dom'

function Layout({ children, me, onLogout }) {
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
              <button type="button" className="ghost" onClick={onLogout}>
                Log out
              </button>
            </>
          ) : (
            <span className="nav-user">Teacher & Student Portal</span>
          )}
        </nav>
      </header>
      <main className="content">{children}</main>
    </div>
  )
}

export default Layout
