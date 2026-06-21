import LiveClassSidePanel from '../LiveClassSidePanel'
import NotificationForm from '../NotificationForm'

function LiveNotesPanel({
  owned,
  classId,
  liveLoading,
  handleToggleLiveClass,
  liveError,
  noteError,
  noteMessage,
  showQuizCard,
  onToggleQuizCard,
  // Notification props
  notifMessage,
  setNotifMessage,
  notifMinutes,
  setNotifMinutes,
  notifError,
  notifSuccess,
  handleSendNotification,
}) {
  return (
    <div className="notes-panel">
      {/* Header */}
      <div className="notes-panel-header">
        <h3>🔴 Live Class</h3>
        {owned && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <button
              type="button"
              className="ghost"
              onClick={onToggleQuizCard}
              aria-pressed={showQuizCard}
            >
              {showQuizCard ? 'Show notes' : 'Show quiz'}
            </button>
            <button
              type="button"
              className="ghost"
              onClick={handleToggleLiveClass}
              disabled={liveLoading}
            >
              {liveLoading ? 'Loading…' : '⏹ End Live'}
            </button>
          </div>
        )}
      </div>

      {liveError && (
        <div style={{ padding: 'var(--space-3) var(--space-4)' }}>
          <p className="error">{liveError}</p>
        </div>
      )}

      <LiveClassSidePanel owned={owned} chatStorageKey={`classroom-${classId}`} />

      {owned && (
        <div style={{ padding: '0 var(--space-4) var(--space-3)' }}>
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
      )}

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
