import { useState, useEffect } from 'react'
import LiveClassSidePanel from '../LiveClassSidePanel'
import NotificationForm from '../NotificationForm'
import OptionsMenu from './OptionsMenu'
import { Radio, X, StopCircle } from 'lucide-react'
import MicroPollLauncherModal from '../engagement/MicroPollLauncherModal'
import TeacherMicroPollResults from '../engagement/TeacherMicroPollResults'

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
  onOpenAttendance,
  onOpenGradebook,
  onOpenStudyGuide,
  onOpenAIConfig,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPollModalOpen, setIsPollModalOpen] = useState(false)
  const [activePoll, setActivePoll] = useState(null)

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
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Radio size={18} color="var(--error)" aria-hidden="true" /> Live Class
        </h3>
        {owned && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <button
              type="button"
              className="ghost"
              onClick={handleToggleLiveClass}
              disabled={liveLoading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              {liveLoading ? (
                'Loading…'
              ) : (
                <>
                  <StopCircle size={14} aria-hidden="true" /> End Live
                </>
              )}
            </button>
            <OptionsMenu
              onToggleQuiz={onToggleQuizCard}
              onOpenNotification={() => setIsModalOpen(true)}
              onOpenAttendance={onOpenAttendance}
              onOpenMicroPoll={() => setIsPollModalOpen(true)}
              onOpenGradebook={onOpenGradebook}
              onOpenStudyGuide={onOpenStudyGuide}
              onOpenAIConfig={onOpenAIConfig}
              showQuizCard={showQuizCard}
            />
          </div>
        )}
      </div>

      {liveError && (
        <div style={{ padding: 'var(--space-3) var(--space-4)' }}>
          <p className="error" role="alert">{liveError}</p>
        </div>
      )}

      <LiveClassSidePanel owned={owned} chatStorageKey={`classroom-${classId}`} />

      {(noteError || noteMessage) && (
        <div style={{ padding: 'var(--space-2) var(--space-4)' }}>
          {noteError && <p className="error" role="alert">{noteError}</p>}
          {noteMessage && <p className="success" role="status">{noteMessage}</p>}
        </div>
      )}

      {owned && isModalOpen && (
        <div
          className="custom-modal-overlay"
          onClick={() => setIsModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="live-notify-modal-title"
        >
          <div className="custom-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="custom-modal-close"
              onClick={() => setIsModalOpen(false)}
              aria-label="Close notification modal"
            >
              <X size={18} aria-hidden="true" />
            </button>
            <h3 id="live-notify-modal-title" className="sr-only">Notify Students</h3>
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

      {owned && isPollModalOpen && (
        <MicroPollLauncherModal
          isOpen={isPollModalOpen}
          onClose={() => setIsPollModalOpen(false)}
          onPollLaunched={(poll) => setActivePoll(poll)}
        />
      )}

      {owned && activePoll && (
        <TeacherMicroPollResults
          activePoll={activePoll}
          onClose={() => setActivePoll(null)}
        />
      )}
    </div>
  )
}

export default LiveNotesPanel
