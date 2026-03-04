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
    <div className="notes-canvas">
      <div className="notes-canvas-title-row">
        <h3>Class Notes Canvas</h3>
        <div className="notes-canvas-meta">
          <strong>{classroom?.name}</strong>
          <p className="muted">Class ID: {classroom?.class_id}</p>
        </div>
      </div>

      {showScreenShare && <ScreenShareView />}

      {displayedNotes.length === 0 ? (
        <p className="muted">No notes displayed yet.</p>
      ) : (
        <div className="displayed-list">
          {displayedNotes.map((item) => (
            <article key={item.id} className="displayed-item">
              <div className="row">
                <div>
                  <strong>#{item.index} — {item.title}</strong>
                  <p className="muted">Saved: {formatDate(item.saved_date)}</p>
                </div>
                {owned && (
                  <button
                    type="button"
                    className="ghost danger"
                    onClick={() => onRemoveDisplayed(item.id)}
                    title="Remove displayed note"
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
