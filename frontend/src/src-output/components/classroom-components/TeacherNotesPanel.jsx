import { useState, useEffect } from 'react'
import NotificationForm from '../NotificationForm'
import OptionsMenu from './OptionsMenu'
import { X, Play } from 'lucide-react'
import RichNoteEditor from '../canvas/RichNoteEditor'

function TeacherNotesPanel({
  owned,
  liveLoading,
  handleToggleLiveClass,
  liveError,
  showQuizCard,
  handleToggleQuizCard,
  handleSaveNote,
  noteTitle,
  setNoteTitle,
  noteContent,
  setNoteContent,
  notePendingDelete,
  setDeleteConfirmNoteId,
  handleDeleteNote,
  savedNotes = [],
  handleDisplayNote,
  noteError,
  noteMessage,
  // Notification props
  notifMessage,
  setNotifMessage,
  notifMinutes,
  setNotifMinutes,
  notifError,
  notifSuccess,
  handleSendNotification,
  onOpenAttendance,
  onOpenGradebook,
  onOpenStudyGuide,
  onOpenAIConfig,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isModalOpen])

  return (
    <div className="notes-panel">
      {/* Header */}
      <div className="notes-panel-header">
        <h3>{owned ? 'Teacher Notes' : 'Notes'}</h3>
        {owned && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <button
              type="button"
              className="primary"
              onClick={handleToggleLiveClass}
              disabled={liveLoading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              {liveLoading ? 'Loading…' : <><Play size={14} fill="currentColor" aria-hidden="true" /> Go Live</>}
            </button>
            <OptionsMenu
              onToggleQuiz={handleToggleQuizCard}
              onOpenNotification={() => setIsModalOpen(true)}
              onOpenAttendance={onOpenAttendance}
              onOpenGradebook={onOpenGradebook}
              onOpenStudyGuide={onOpenStudyGuide}
              onOpenAIConfig={onOpenAIConfig}
              showQuizCard={showQuizCard}
            />
          </div>
        )}
      </div>

      <div className="notes-panel-body">
        {liveError && <p className="error" role="alert">{liveError}</p>}

        {owned ? (
          <>
            {/* Create note form */}
            <form className="form" onSubmit={handleSaveNote} aria-label="Create new lesson note">
              <div className="form-group">
                <label htmlFor="teacher-note-title">Note title</label>
                <input
                  id="teacher-note-title"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Lesson topic…"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="teacher-note-content">Content (Markdown &amp; LaTeX)</label>
                <RichNoteEditor
                  id="teacher-note-content"
                  value={noteContent}
                  onChange={setNoteContent}
                  placeholder="Write lesson notes with Markdown and formulas ($E=mc^2$)…"
                  required
                />
              </div>
              <button type="submit" className="primary">Save note</button>
            </form>

            {/* Delete confirmation */}
            {notePendingDelete && (
              <div className="drawer" role="alertdialog" aria-label="Confirm note deletion">
                <p>Delete #{notePendingDelete.index} — {notePendingDelete.title}?</p>
                <div className="row">
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => setDeleteConfirmNoteId(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="ghost danger"
                    onClick={() => handleDeleteNote(notePendingDelete.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}

            {/* Saved notes */}
            <div>
              <h3 style={{ marginBottom: 'var(--space-3)' }}>Saved Notes</h3>
              {savedNotes.length === 0 ? (
                <p className="muted">No saved notes yet.</p>
              ) : (
                <ul className="list" aria-label="Saved notes list">
                  {savedNotes.map((note) => (
                    <li key={note.id} className="note-list-item">
                      <div className="note-list-meta">
                        <strong>#{note.index}</strong>
                        <p className="note-list-title">{note.title}</p>
                      </div>
                      <div className="row" style={{ gap: 'var(--space-2)', flexShrink: 0 }}>
                        <button
                          type="button"
                          className="primary"
                          onClick={() => handleDisplayNote(note.id)}
                        >
                          Display
                        </button>
                        <button
                          type="button"
                          className="ghost icon-btn"
                          onClick={() => setDeleteConfirmNoteId(note.id)}
                          aria-label={`Delete note #${note.index}: ${note.title}`}
                        >
                          <X size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : (
          <p className="muted">Notes will appear here during the live class.</p>
        )}

        {noteError && <p className="error" role="alert">{noteError}</p>}
        {noteMessage && <p className="success" role="status">{noteMessage}</p>}
      </div>

      {owned && isModalOpen && (
        <div
          className="custom-modal-overlay"
          onClick={() => setIsModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="notify-modal-title"
        >
          <div className="custom-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="custom-modal-close"
              onClick={() => setIsModalOpen(false)}
              aria-label="Close notification form"
            >
              <X size={18} aria-hidden="true" />
            </button>
            <h3 id="notify-modal-title" className="sr-only">Notify Students</h3>
            <NotificationForm
              notifMessage={notifMessage}
              setNotifMessage={setNotifMessage}
              notifMinutes={notifMinutes}
              setNotifMinutes={setNotifMinutes}
              notifError={notifError}
              notifSuccess={notifSuccess}
              onSubmit={handleSendNotification}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default TeacherNotesPanel
