import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Copy, Check, Users, UserPlus, Upload, Mail, Folder, FileText } from 'lucide-react'
import ResourcesTab from '../courseware/ResourcesTab'
import AssignmentsTab from '../assignments/AssignmentsTab'

function ClassroomSidebarPortal({
  owned,
  classId,
  accessToken,
  setAccessToken,
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
  inviteLinks = [],
}) {
  const [copiedLinkIndex, setCopiedLinkIndex] = useState(null)

  if (!sidebarPortalTarget) {
    return null
  }

  const handleCopyLink = (link, index) => {
    navigator.clipboard?.writeText(link)
    setCopiedLinkIndex(index)
    setTimeout(() => {
      setCopiedLinkIndex(null)
    }, 2000)
  }

  return createPortal(
    <div className="sidebar-layout">
      <nav className="sidebar-nav" role="tablist" aria-label="Classroom management sections">
        <button
          type="button"
          role="tab"
          id="tab-resources"
          aria-selected={sidebarTab === 'resources'}
          aria-controls="panel-resources"
          className={`sidebar-nav-item ${sidebarTab === 'resources' ? 'active' : ''}`}
          onClick={() => setSidebarTab(sidebarTab === 'resources' ? null : 'resources')}
        >
          <Folder size={16} aria-hidden="true" /> Materials &amp; Files
        </button>
        <button
          type="button"
          role="tab"
          id="tab-assignments"
          aria-selected={sidebarTab === 'assignments'}
          aria-controls="panel-assignments"
          className={`sidebar-nav-item ${sidebarTab === 'assignments' ? 'active' : ''}`}
          onClick={() => setSidebarTab(sidebarTab === 'assignments' ? null : 'assignments')}
        >
          <FileText size={16} aria-hidden="true" /> Assignments
        </button>
        <button
          type="button"
          role="tab"
          id="tab-enrolled"
          aria-selected={sidebarTab === 'enrolled'}
          aria-controls="panel-enrolled"
          className={`sidebar-nav-item ${sidebarTab === 'enrolled' ? 'active' : ''}`}
          onClick={() => setSidebarTab(sidebarTab === 'enrolled' ? null : 'enrolled')}
        >
          <Users size={16} aria-hidden="true" /> {owned ? 'Enrolled Students' : 'Classmates'}
        </button>
        {owned && (
          <button
            type="button"
            role="tab"
            id="tab-invite"
            aria-selected={sidebarTab === 'invite'}
            aria-controls="panel-invite"
            className={`sidebar-nav-item ${sidebarTab === 'invite' ? 'active' : ''}`}
            onClick={() => setSidebarTab(sidebarTab === 'invite' ? null : 'invite')}
          >
            <UserPlus size={16} aria-hidden="true" /> Invite Students
          </button>
        )}
      </nav>

      <div className="sidebar-pane">
        {sidebarTab === 'resources' && (
          <div
            id="panel-resources"
            role="tabpanel"
            aria-labelledby="tab-resources"
            className="drawer"
          >
            <ResourcesTab
              classId={classId}
              owned={owned}
              accessToken={accessToken}
              setAccessToken={setAccessToken}
            />
          </div>
        )}
        {sidebarTab === 'assignments' && (
          <div
            id="panel-assignments"
            role="tabpanel"
            aria-labelledby="tab-assignments"
            className="drawer"
          >
            <AssignmentsTab
              classId={classId}
              owned={owned}
              accessToken={accessToken}
              setAccessToken={setAccessToken}
            />
          </div>
        )}
        {sidebarTab === 'enrolled' && (
          <div
            id="panel-enrolled"
            role="tabpanel"
            aria-labelledby="tab-enrolled"
            className="drawer"
          >
            <h3>Enrolled students</h3>
            {classroom?.students?.length === 0 ? (
              <p className="muted">No students enrolled yet.</p>
            ) : (
              <ul className="list" aria-label="Enrolled student emails">
                {classroom?.students?.map((email) => (
                  <li key={email} className="enrolled-student-item">
                    <Mail size={14} className="muted" aria-hidden="true" />
                    <span>{email}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {sidebarTab === 'invite' && (
          <div
            id="panel-invite"
            role="tabpanel"
            aria-labelledby="tab-invite"
            className="drawer"
          >
            <h3>Invite students</h3>
            <form onSubmit={handleInvite} className="form" aria-label="Invite students form">
              <div className="form-group">
                <label htmlFor="invite-emails-input">
                  Paste student emails (comma or newline separated)
                </label>
                <textarea
                  id="invite-emails-input"
                  rows={3}
                  value={emails}
                  placeholder="student1@school.edu, student2@school.edu"
                  onChange={(event) => setEmails(event.target.value)}
                  aria-invalid={Boolean(error)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="invite-csv-input" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Upload size={14} aria-hidden="true" /> Or upload a CSV (first column = email)
                </label>
                <input
                  id="invite-csv-input"
                  type="file"
                  accept=".csv"
                  onChange={(event) => setFile(event.target.files?.[0])}
                />
              </div>

              {error && <p className="error" role="alert">{error}</p>}
              {message && <p className="success" role="status">{message}</p>}

              {inviteLinks.length > 0 && (
                <div className="invite-links-section">
                  <p className="muted" style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                    Generated invitation links:
                  </p>
                  <ul className="list invite-links-list" aria-label="Generated invitation links">
                    {inviteLinks.map((item, index) => (
                      <li key={`${item.email}-${index}`} className="invite-link-item">
                        <div className="invite-link-details">
                          <strong>{item.email}</strong>
                          <span className="invite-link-text">{item.link}</span>
                        </div>
                        <button
                          type="button"
                          className="ghost btn-sm copy-link-btn"
                          onClick={() => handleCopyLink(item.link, index)}
                          aria-label={`Copy invitation link for ${item.email}`}
                        >
                          {copiedLinkIndex === index ? (
                            <><Check size={14} color="var(--success)" aria-hidden="true" /> Copied</>
                          ) : (
                            <><Copy size={14} aria-hidden="true" /> Copy</>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button type="submit" className="primary btn-full">
                Send invitations
              </button>
            </form>
          </div>
        )}
      </div>
    </div>,
    sidebarPortalTarget
  )
}

export default ClassroomSidebarPortal
