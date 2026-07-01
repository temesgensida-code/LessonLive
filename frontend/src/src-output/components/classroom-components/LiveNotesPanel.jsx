import { useState } from 'react'
import LiveClassSidePanel from '../LiveClassSidePanel'
import NotificationForm from '../NotificationForm'
import OptionsMenu from './OptionsMenu'

import { Radio } from 'lucide-react';

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
  const [isModalOpen, setIsModalOpen] = useState(false)
  return (
    <div className="notes-panel">
      {/* Header */}
      <div className="notes-panel-header">
        <h3><Radio /> Live Class</h3>
        {owned && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <button
              type="button"
              className="ghost"
              onClick={handleToggleLiveClass}
              disabled={liveLoading}
            >
              {liveLoading ? 'Loading…' : '⏹ End Live'}
            </button>
            <OptionsMenu
              onToggleQuiz={onToggleQuizCard}
              onOpenNotification={() => setIsModalOpen(true)}
              showQuizCard={showQuizCard}
            />
          </div>
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

      {owned && isModalOpen && (
        <div className="custom-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="custom-modal-content" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="custom-modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
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

export default LiveNotesPanel
