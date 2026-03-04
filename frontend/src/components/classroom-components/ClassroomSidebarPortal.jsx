import { createPortal } from 'react-dom'

function ClassroomSidebarPortal({
  owned,
  sidebarPortalTarget,
  sidebarTab,
  setSidebarTab,
  classroom,
  handleInvite,
  emails,
  setEmails,
  setFile,
  error,
  message,
  inviteLinks,
}) {
  if (!owned || !sidebarPortalTarget) {
    return null
  }

  return createPortal(
    <div className="sidebar-layout">
      <nav className="sidebar-nav">
        <button
          type="button"
          className={`sidebar-nav-item ${sidebarTab === 'enrolled' ? 'active' : ''}`}
          onClick={() => setSidebarTab(sidebarTab === 'enrolled' ? null : 'enrolled')}
        >
          Enrolled Students
        </button>
        <button
          type="button"
          className={`sidebar-nav-item ${sidebarTab === 'invite' ? 'active' : ''}`}
          onClick={() => setSidebarTab(sidebarTab === 'invite' ? null : 'invite')}
        >
          Invite Students
        </button>
      </nav>

      <div className="sidebar-pane">
        {sidebarTab === 'enrolled' && (
          <div className="drawer">
            <h3>Enrolled students</h3>
            {classroom?.students?.length === 0 ? (
              <p className="muted">No students enrolled yet.</p>
            ) : (
              <ul className="list">
                {classroom?.students?.map((email) => (
                  <li key={email}>{email}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {sidebarTab === 'invite' && (
          <div className="drawer">
            <h3>Invite students</h3>
            <form onSubmit={handleInvite} className="form">
              <label>
                Paste student emails (comma or newline separated)
                <textarea
                  rows={4}
                  value={emails}
                  onChange={(event) => setEmails(event.target.value)}
                />
              </label>
              <label>
                Or upload a CSV (first column = email)
                <input type="file" accept=".csv" onChange={(event) => setFile(event.target.files[0])} />
              </label>
              {error && <p className="error">{error}</p>}
              {message && <p className="success">{message}</p>}
              {inviteLinks.length > 0 && (
                <div>
                  <p className="muted">Invitation links (copy or open):</p>
                  <ul className="list">
                    {inviteLinks.map((item, index) => (
                      <li key={`${item.email}-${index}`}>
                        <strong>{item.email}</strong>: <a href={item.link} target="_blank" rel="noreferrer">{item.link}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <button type="submit" className="primary">Send invitations</button>
            </form>
          </div>
        )}
      </div>
    </div>,
    sidebarPortalTarget
  )
}

export default ClassroomSidebarPortal
