import LiveClassSidePanel from '../LiveClassSidePanel'

function LiveNotesPanel({ owned, classId, liveLoading, handleToggleLiveClass, liveError, noteError, noteMessage }) {
  return (
    <div className="notes-panel">
      {/* Header */}
      <div className="notes-panel-header">
        <h3>🔴 Live Class</h3>
        {owned && (
          <button
            type="button"
            className="ghost"
            onClick={handleToggleLiveClass}
            disabled={liveLoading}
          >
            {liveLoading ? 'Loading…' : '⏹ End Live'}
          </button>
        )}
      </div>

      {liveError && (
        <div style={{ padding: 'var(--space-3) var(--space-4)' }}>
          <p className="error">{liveError}</p>
        </div>
      )}

      <LiveClassSidePanel owned={owned} chatStorageKey={`classroom-${classId}`} />

      {(noteError || noteMessage) && (
        <div style={{ padding: 'var(--space-2) var(--space-4)' }}>
          {noteError && <p className="error">{noteError}</p>}
          {noteMessage && <p className="success">{noteMessage}</p>}
        </div>
      )}
    </div>
  )
}

export default LiveNotesPanel
