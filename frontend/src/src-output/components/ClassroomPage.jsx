import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { LiveKitRoom } from '@livekit/components-react'
import { LIVEKIT_SERVER_URL } from './apiClient'
import useClassroomPageController from './classroom-components/useClassroomPageController'
import LiveQuizCard from './LiveQuizCard'
import StudentQuizPage from './StudentQuizPage'
import CountdownOverlay from './CountdownOverlay'
import { useNotificationContext } from './NotificationContext'
import AttendanceDashboard from './classroom-components/AttendanceDashboard'
import './classroom-components/AttendanceDashboard.css'
import StudentMicroPollToast from './engagement/StudentMicroPollToast'
import GradebookDashboard from './gradebook/GradebookDashboard'
import ClassroomScheduleBanner from './schedule/ClassroomScheduleBanner'
import AIStudyGuideModal from './ai/AIStudyGuideModal'
import AIKeyConfigModal from './ai/AIKeyConfigModal'

const ClassroomSidebarPortal = lazy(() => import('./classroom-components/ClassroomSidebarPortal'))
const DisplayedNotesCanvas = lazy(() => import('./classroom-components/DisplayedNotesCanvas'))
const LiveNotesPanel = lazy(() => import('./classroom-components/LiveNotesPanel'))
const TeacherNotesPanel = lazy(() => import('./classroom-components/TeacherNotesPanel'))
const CanvasViewSwitcher = lazy(() => import('./canvas/CanvasViewSwitcher'))
const WhiteboardCanvas = lazy(() => import('./canvas/WhiteboardCanvas'))

const MOBILE_BREAKPOINT = 900

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

const classroomLoadingFallback = (
  <section className="card" role="status" aria-label="Loading classroom">
    <div className="loading-spinner-sm" aria-hidden="true" style={{ margin: '0 auto var(--space-2)' }} />
    <p className="muted" style={{ textAlign: 'center' }}>Loading classroom…</p>
  </section>
)

function ClassroomPage({ accessToken, setAccessToken }) {
  const [mobileSplitTop, setMobileSplitTop] = useState(56)
  const [isDraggingMobileSplit, setIsDraggingMobileSplit] = useState(false)
  const [showQuizCard, setShowQuizCard] = useState(false)
  const [showStudentQuiz, setShowStudentQuiz] = useState(false)
  const [showAttendanceModal, setShowAttendanceModal] = useState(false)
  const [showGradebookModal, setShowGradebookModal] = useState(false)
  const [showStudyGuideModal, setShowStudyGuideModal] = useState(false)
  const [showAIConfigModal, setShowAIConfigModal] = useState(false)
  const [canvasView, setCanvasView] = useState('notes') // 'notes' | 'whiteboard' | 'screen'
  const mobileSplitLayoutRef = useRef(null)

  const updateMobileSplit = (clientY) => {
    const layoutRect = mobileSplitLayoutRef.current?.getBoundingClientRect()
    if (!layoutRect?.height) {
      return
    }

    const nextTopPercent = ((clientY - layoutRect.top) / layoutRect.height) * 100
    setMobileSplitTop(clamp(nextTopPercent, 0, 78))
  }

  const handleMobileSplitterPointerDown = (event) => {
    if (window.innerWidth > MOBILE_BREAKPOINT) {
      return
    }

    setIsDraggingMobileSplit(true)
    event.currentTarget.setPointerCapture(event.pointerId)
    updateMobileSplit(event.clientY)
  }

  const handleMobileSplitterPointerMove = (event) => {
    if (!isDraggingMobileSplit || window.innerWidth > MOBILE_BREAKPOINT) {
      return
    }
    updateMobileSplit(event.clientY)
  }

  const handleMobileSplitterPointerUp = (event) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setIsDraggingMobileSplit(false)
  }

  const handleToggleQuizCard = () => {
    setShowQuizCard((prev) => !prev)
  }

  const { classId } = useParams()
  const {
    classroom,
    owned,
    emails,
    setEmails,
    setFile,
    message,
    inviteLinks,
    error,
    savedNotes,
    setSavedNotes,
    displayedNotes,
    noteTitle,
    setNoteTitle,
    noteContent,
    setNoteContent,
    setDeleteConfirmNoteId,
    noteError,
    noteMessage,
    liveMode,
    liveToken,
    liveLoading,
    liveError,
    sidebarPortalTarget,
    sidebarTab,
    setSidebarTab,
    notePendingDelete,
    formatDate,
    handleInvite,
    handleSaveNote,
    handleDisplayNote,
    handleDeleteNote,
    handleRemoveDisplayed,
    handleToggleLiveClass,
    // Notifications
    notifications,
    hasUnreadNotifications,
    activeCountdown,
    setActiveCountdown,
    notifMessage,
    setNotifMessage,
    notifMinutes,
    setNotifMinutes,
    notifError,
    notifSuccess,
    handleSendNotification,
    handleMarkNotificationsRead,
  } = useClassroomPageController({ classId, accessToken, setAccessToken })

  const notificationProps = {
    notifMessage,
    setNotifMessage,
    notifMinutes,
    setNotifMinutes,
    notifError,
    notifSuccess,
    handleSendNotification,
  }

  const notificationCtx = useNotificationContext()

  // Sync notification state up to context so the Layout topbar bell can access it
  useEffect(() => {
    notificationCtx.setNotificationData(notifications, hasUnreadNotifications)
  }, [notifications, hasUnreadNotifications])

  // Sync activeCountdown from context (set by Layout bell click)
  const resolvedActiveCountdown = notificationCtx.activeCountdown || activeCountdown
  const closeCountdown = () => {
    setActiveCountdown(null)
    notificationCtx.setActiveCountdown(null)
  }

  if (!classroom && !error) {
    return classroomLoadingFallback
  }

  return (
    <Suspense fallback={classroomLoadingFallback}>
      <div className="stack">
        {/* Countdown overlay */}
        {resolvedActiveCountdown && (
          <CountdownOverlay
            notification={resolvedActiveCountdown}
            onClose={closeCountdown}
          />
        )}

        <ClassroomSidebarPortal
          owned={owned}
          classId={classId}
          accessToken={accessToken}
          setAccessToken={setAccessToken}
          sidebarPortalTarget={sidebarPortalTarget}
          sidebarTab={sidebarTab}
          setSidebarTab={setSidebarTab}
          classroom={classroom}
          handleInvite={handleInvite}
          emails={emails}
          setEmails={setEmails}
          setFile={setFile}
          error={error}
          message={message}
          inviteLinks={inviteLinks}
        />

        {owned && liveError && (
          <section className="card">
            <p className="error" role="alert">{liveError}</p>
          </section>
        )}

        <ClassroomScheduleBanner
          classId={classId}
          owned={owned}
          accessToken={accessToken}
          setAccessToken={setAccessToken}
          onGoLive={handleToggleLiveClass}
        />

        {liveMode && liveToken ? (
          <LiveKitRoom
            serverUrl={LIVEKIT_SERVER_URL}
            token={liveToken}
            connect={true}
            data-lk-theme="default"
            style={{ width: '100%' }}
          >
            <section className="card notes-shell">
              <div
                ref={mobileSplitLayoutRef}
                className="notes-layout"
                style={{
                  '--mobile-notes-ratio': `${mobileSplitTop}%`,
                  '--mobile-live-ratio': `${100 - mobileSplitTop}%`,
                }}
              >
                {owned && showQuizCard ? (
                  <div className="notes-canvas-slot">
                    <LiveQuizCard
                      owned={owned}
                      classId={classId}
                      sessionLabel="Your Course"
                      accessToken={accessToken}
                      setAccessToken={setAccessToken}
                    />
                  </div>
                ) : (
                  <div className="notes-canvas-slot">
                    <CanvasViewSwitcher
                      activeView={canvasView}
                      onViewChange={setCanvasView}
                      hasScreenShare={true}
                    />
                    {canvasView === 'whiteboard' ? (
                      <WhiteboardCanvas
                        classId={classId}
                        owned={owned}
                        accessToken={accessToken}
                        setAccessToken={setAccessToken}
                        onNoteCreated={(note) => {
                          setSavedNotes((prev) => [...prev, note])
                        }}
                      />
                    ) : (
                      <>
                        <DisplayedNotesCanvas
                          classroom={classroom}
                          displayedNotes={displayedNotes}
                          owned={owned}
                          formatDate={formatDate}
                          onRemoveDisplayed={handleRemoveDisplayed}
                          showScreenShare={canvasView === 'screen'}
                        />
                        <div className="student-quiz-slot">
                          <StudentQuizPage
                            owned={owned}
                            classId={classId}
                            sessionLabel={classroom?.name || 'LessonLive'}
                            accessToken={accessToken}
                            setAccessToken={setAccessToken}
                            onQuizVisibilityChange={setShowStudentQuiz}
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div
                  tabIndex={0}
                  className={`mobile-splitter ${isDraggingMobileSplit ? 'is-dragging' : ''}`}
                  onPointerDown={handleMobileSplitterPointerDown}
                  onPointerMove={handleMobileSplitterPointerMove}
                  onPointerUp={handleMobileSplitterPointerUp}
                  onPointerCancel={handleMobileSplitterPointerUp}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                      e.preventDefault()
                      setMobileSplitTop((top) => Math.max(0, top - 5))
                    } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                      e.preventDefault()
                      setMobileSplitTop((top) => Math.min(78, top + 5))
                    }
                  }}
                  aria-label="Resize notes and live panel"
                  role="separator"
                  aria-orientation="horizontal"
                  aria-valuenow={Math.round(mobileSplitTop)}
                  aria-valuemin={0}
                  aria-valuemax={78}
                >
                  <span className="mobile-splitter-arrow" aria-hidden="true">^</span>
                </div>

                <LiveNotesPanel
                  owned={owned}
                  classId={classId}
                  liveLoading={liveLoading}
                  handleToggleLiveClass={handleToggleLiveClass}
                  liveError={liveError}
                  noteError={noteError}
                  noteMessage={noteMessage}
                  showQuizCard={showQuizCard}
                  onToggleQuizCard={handleToggleQuizCard}
                  onOpenAttendance={() => setShowAttendanceModal(true)}
                  onOpenGradebook={() => setShowGradebookModal(true)}
                  onOpenStudyGuide={() => setShowStudyGuideModal(true)}
                  onOpenAIConfig={() => setShowAIConfigModal(true)}
                  {...notificationProps}
                />
              </div>
            </section>
            {!owned && <StudentMicroPollToast />}
          </LiveKitRoom>
        ) : (
          <section className="card notes-shell">
            <div className="notes-layout">
              {owned && showQuizCard ? (
                <div className="notes-canvas-slot">
                  <LiveQuizCard
                    owned={owned}
                    classId={classId}
                    sessionLabel="Your Course"
                    accessToken={accessToken}
                    setAccessToken={setAccessToken}
                  />
                </div>
              ) : (
                <div className="notes-canvas-slot">
                  <CanvasViewSwitcher
                    activeView={canvasView}
                    onViewChange={setCanvasView}
                    hasScreenShare={false}
                  />
                  {canvasView === 'whiteboard' ? (
                    <WhiteboardCanvas
                      classId={classId}
                      owned={owned}
                      accessToken={accessToken}
                      setAccessToken={setAccessToken}
                      onNoteCreated={(note) => {
                        setSavedNotes((prev) => [...prev, note])
                      }}
                    />
                  ) : (
                    <DisplayedNotesCanvas
                      classroom={classroom}
                      displayedNotes={displayedNotes}
                      owned={owned}
                      formatDate={formatDate}
                      onRemoveDisplayed={handleRemoveDisplayed}
                      showScreenShare={false}
                    />
                  )}
                </div>
              )}

              {owned && (
                <TeacherNotesPanel
                  owned={owned}
                  liveLoading={liveLoading}
                  handleToggleLiveClass={handleToggleLiveClass}
                  liveError={liveError}
                  showQuizCard={showQuizCard}
                  handleToggleQuizCard={handleToggleQuizCard}
                  handleSaveNote={handleSaveNote}
                  noteTitle={noteTitle}
                  setNoteTitle={setNoteTitle}
                  noteContent={noteContent}
                  setNoteContent={setNoteContent}
                  notePendingDelete={notePendingDelete}
                  setDeleteConfirmNoteId={setDeleteConfirmNoteId}
                  handleDeleteNote={handleDeleteNote}
                  savedNotes={savedNotes}
                  handleDisplayNote={handleDisplayNote}
                  noteError={noteError}
                  noteMessage={noteMessage}
                  onOpenAttendance={() => setShowAttendanceModal(true)}
                  onOpenGradebook={() => setShowGradebookModal(true)}
                  onOpenStudyGuide={() => setShowStudyGuideModal(true)}
                  onOpenAIConfig={() => setShowAIConfigModal(true)}
                  {...notificationProps}
                />
              )}
            </div>
          </section>
        )}

        {showAttendanceModal && (
          <AttendanceDashboard
            classId={classId}
            accessToken={accessToken}
            setAccessToken={setAccessToken}
            onClose={() => setShowAttendanceModal(false)}
          />
        )}

        {showGradebookModal && (
          <GradebookDashboard
            classId={classId}
            accessToken={accessToken}
            setAccessToken={setAccessToken}
            isOpen={showGradebookModal}
            onClose={() => setShowGradebookModal(false)}
          />
        )}

        {showStudyGuideModal && (
          <AIStudyGuideModal
            classId={classId}
            classroomName={classroom?.name || 'Your Course'}
            notes={savedNotes}
            isOpen={showStudyGuideModal}
            onClose={() => setShowStudyGuideModal(false)}
            accessToken={accessToken}
            setAccessToken={setAccessToken}
          />
        )}

        {showAIConfigModal && (
          <AIKeyConfigModal
            isOpen={showAIConfigModal}
            onClose={() => setShowAIConfigModal(false)}
            accessToken={accessToken}
            setAccessToken={setAccessToken}
          />
        )}
      </div>
    </Suspense>
  )
}

export default ClassroomPage
