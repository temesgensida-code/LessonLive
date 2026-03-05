import LiveClassSidePanel from '../LiveClassSidePanel'

function LiveNotesPanel({ owned, classId, liveLoading, handleToggleLiveClass, liveError, noteError, noteMessage }) {
  return (
    <div className="notes-panel">
      <div className="notes-panel-header">
        <h3>Live Class</h3>
        {owned && (
          <button type="button" className="primary" onClick={handleToggleLiveClass} disabled={liveLoading}>
            {liveLoading ? 'Loading…' : 'Back to Notes'}
          </button>
        )}
      </div>

      {liveError && <p className="error">{liveError}</p>}

      <LiveClassSidePanel owned={owned} chatStorageKey={`classroom-${classId}`} />

      {noteError && <p className="error">{noteError}</p>}
      {noteMessage && <p className="success">{noteMessage}</p>}
    </div>
  )
}

export default LiveNotesPanel
