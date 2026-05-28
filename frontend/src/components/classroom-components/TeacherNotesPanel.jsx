function TeacherNotesPanel({
  owned,
  liveLoading,
  handleToggleLiveClass,
  liveError,
  handleSaveNote,
  noteTitle,
  setNoteTitle,
  noteContent,
  setNoteContent,
  notePendingDelete,
  setDeleteConfirmNoteId,
  handleDeleteNote,
  savedNotes,
  handleDisplayNote,
  noteError,
  noteMessage,
}) {
  return (
    <div className="notes-panel">
      {/* Header */}
      <div className="notes-panel-header">
        <h3>{owned ? 'Teacher Notes' : 'Notes'}</h3>
        {owned && (
          <button type="button" className="primary" onClick={handleToggleLiveClass} disabled={liveLoading}>
            {liveLoading ? 'Loading…' : '▶ Go Live'}
          </button>
        )}
      </div>

      <div className="notes-panel-body">
        {liveError && <p className="error">{liveError}</p>}

        {owned ? (
          <>
            {/* Create note form */}
            <form className="form" onSubmit={handleSaveNote}>
              <label>
                Note title
                <input
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Lesson topic…"
                  required
                />
              </label>
              <label>
                Content
                <textarea
                  rows={5}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Write your note here…"
                  required
                />
              </label>
              <button type="submit" className="primary">Save note</button>
            </form>

            {/* Delete confirmation */}
            {notePendingDelete && (
              <div className="drawer">
                <p>Delete #{notePendingDelete.index} — {notePendingDelete.title}?</p>
                <div className="row">
                  <button type="button" className="ghost" onClick={() => setDeleteConfirmNoteId(null)}>
                    Cancel
                  </button>
                  <button type="button" className="ghost danger" onClick={() => handleDeleteNote(notePendingDelete.id)}>
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
                <ul className="list">
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
                          className="ghost danger"
                          onClick={() => setDeleteConfirmNoteId(note.id)}
                          title={`Delete note #${note.index}`}
                        >
                          🗑
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

        {noteError && <p className="error">{noteError}</p>}
        {noteMessage && <p className="success">{noteMessage}</p>}
      </div>
    </div>
  )
}

export default TeacherNotesPanel
