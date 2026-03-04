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
      <div className="notes-panel-header">
        <h3>{owned ? 'Teacher Notes' : 'Right Panel'}</h3>
        {owned && (
          <button type="button" className="primary" onClick={handleToggleLiveClass} disabled={liveLoading}>
            {liveLoading ? 'Loading…' : 'Live Class'}
          </button>
        )}
      </div>

      {liveError && <p className="error">{liveError}</p>}

      {owned ? (
        <>
          <form className="form" onSubmit={handleSaveNote}>
            <label className="tit">
              Title
              <input value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} required />
            </label>
            <label className="not">
              Note
              <textarea
                rows={6}
                value={noteContent}
                onChange={(event) => setNoteContent(event.target.value)}
                required
              />
            </label>
            <button type="submit" className="primary">Save note</button>
          </form>

          <h4>Saved Notes</h4>
          {notePendingDelete && (
            <div className="drawer">
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
                  <div className="row">
                    <button
                      type="button"
                      className="primary"
                      onClick={() => handleDisplayNote(note.id)}
                    >
                      Display #{note.index}
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
        </>
      ) : (
        <p className="muted">Reserved for another student component.</p>
      )}

      {noteError && <p className="error">{noteError}</p>}
      {noteMessage && <p className="success">{noteMessage}</p>}
    </div>
  )
}

export default TeacherNotesPanel
