import ScreenShareView from '../ScreenShareView'
import { X, BookOpen } from 'lucide-react'
import MarkdownMathRenderer from '../canvas/MarkdownMathRenderer'

function DisplayedNotesCanvas({
  classroom,
  displayedNotes = [],
  owned,
  formatDate,
  onRemoveDisplayed,
  showScreenShare,
}) {
  return (
    <div
      className="notes-canvas"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden' }}
    >
      {/* Header row */}
      <div className="notes-canvas-title-row">
        <h3>Class Notes Canvas</h3>
        <div className="notes-canvas-meta">
          <strong>{classroom?.name}</strong>
          <p className="muted">ID: {classroom?.class_id}</p>
        </div>
      </div>

      {/* Body container with relative positioning for screen share overlay */}
      <div className="notes-canvas-body" style={{ position: 'relative', flex: '1 1 auto', minHeight: 0, width: '100%', overflow: 'hidden' }}>
        {showScreenShare && <ScreenShareView />}

        {/* Displayed notes scrollable list */}
        {displayedNotes.length === 0 ? (
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'var(--space-6)',
              gap: '0.5rem',
            }}
          >
            <BookOpen size={36} className="muted" aria-hidden="true" />
            <p className="muted" style={{ textAlign: 'center' }}>
              No notes displayed yet.
            </p>
          </div>
        ) : (
          <div className="displayed-list" style={{ height: '100%', overflowY: 'auto' }} tabIndex={0} aria-label="Displayed notes list">
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
                      className="ghost danger canvas-remove-btn"
                      onClick={() => onRemoveDisplayed(item.id)}
                      aria-label={`Remove note "${item.title}" from display`}
                    >
                      <X size={18} aria-hidden="true" />
                    </button>
                  )}
                </div>
                <MarkdownMathRenderer content={item.content} />
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default DisplayedNotesCanvas
