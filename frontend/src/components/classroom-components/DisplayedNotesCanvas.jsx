import ScreenShareView from '../ScreenShareView'

function DisplayedNotesCanvas({
  classroom,
  displayedNotes,
  owned,
  formatDate,
  onRemoveDisplayed,
  showScreenShare,
}) {
  return (
    <div
      className="notes-canvas"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
    >
      {/* Header row */}
      <div className="notes-canvas-title-row">
        <h3>Class Notes Canvas</h3>
        <div className="notes-canvas-meta">
          <strong>{classroom?.name}</strong>
          <p className="muted">ID: {classroom?.class_id}</p>
        </div>
      </div>

      {/* Screen share fills remaining space */}
      {showScreenShare && <ScreenShareView />}

      {/* Displayed notes scrollable list */}
      {displayedNotes.length === 0 ? (
        <div
          style={{
            flex: '1 1 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-6)',
          }}
        >
          <p className="muted" style={{ textAlign: 'center' }}>
            No notes displayed yet.
          </p>
        </div>
      ) : (
        <div className="displayed-list">
          {displayedNotes.map((item) => (
            <article key={item.id} className="displayed-item">
              <div className="row" style={{ marginBottom: 'var(--space-2)' }}>
                <div>
                  <strong>#{item.index} — {item.title}</strong>
                  <p className="muted" style={{ marginTop: 'var(--space-1)' }}>
                    Saved: {formatDate(item.saved_date)}
                  </p>
                </div>
                {owned && (
                  <button
                    type="button"
                    className="ghost danger"
                    onClick={() => onRemoveDisplayed(item.id)}
                    title="Remove displayed note"
                    style={{ flexShrink: 0 }}
                  >
                    🗑
                  </button>
                )}
              </div>
              <p>{item.content}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export default DisplayedNotesCanvas
