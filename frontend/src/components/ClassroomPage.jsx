import { Suspense, lazy, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { LiveKitRoom } from '@livekit/components-react'
import { LIVEKIT_SERVER_URL } from './apiClient'
import useClassroomPageController from './classroom-components/useClassroomPageController'

const ClassroomSidebarPortal = lazy(() => import('./classroom-components/ClassroomSidebarPortal'))
const DisplayedNotesCanvas = lazy(() => import('./classroom-components/DisplayedNotesCanvas'))
const LiveNotesPanel = lazy(() => import('./classroom-components/LiveNotesPanel'))
const TeacherNotesPanel = lazy(() => import('./classroom-components/TeacherNotesPanel'))

const MOBILE_BREAKPOINT = 900

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

const classroomLoadingFallback = (
  <section className="card">
    <p className="muted">Loading classroom…</p>
  </section>
)

function ClassroomPage({ accessToken, setAccessToken }) {
  const [mobileSplitTop, setMobileSplitTop] = useState(56)
  const [isDraggingMobileSplit, setIsDraggingMobileSplit] = useState(false)
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
  } = useClassroomPageController({ classId, accessToken, setAccessToken })

  if (!classroom && !error) {
    return classroomLoadingFallback
  }

  return (
    <Suspense fallback={classroomLoadingFallback}>
      <div className="stack">
        <ClassroomSidebarPortal
          owned={owned}
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
            <p className="error">{liveError}</p>
          </section>
        )}

        {liveMode && liveToken ? (
          <LiveKitRoom
            connect
            video={false}
            audio
            token={liveToken}
            serverUrl={LIVEKIT_SERVER_URL}
            data-lk-theme="default"
            className="live-room"
          >
            <section className="card notes-shell">
              <div
                ref={mobileSplitLayoutRef}
                className="notes-layout mobile-resizable"
                style={{
                  '--mobile-notes-ratio': `${mobileSplitTop}%`,
                  '--mobile-live-ratio': `${100 - mobileSplitTop}%`,
                }}
              >
                <DisplayedNotesCanvas
                  classroom={classroom}
                  displayedNotes={displayedNotes}
                  owned={owned}
                  formatDate={formatDate}
                  onRemoveDisplayed={handleRemoveDisplayed}
                  showScreenShare
                />

                <div
                  className={`mobile-splitter ${isDraggingMobileSplit ? 'is-dragging' : ''}`}
                  onPointerDown={handleMobileSplitterPointerDown}
                  onPointerMove={handleMobileSplitterPointerMove}
                  onPointerUp={handleMobileSplitterPointerUp}
                  onPointerCancel={handleMobileSplitterPointerUp}
                  aria-label="Drag to resize notes and live panel"
                  role="separator"
                  aria-orientation="horizontal"
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
                />
              </div>
            </section>
          </LiveKitRoom>
        ) : (
          <section className="card notes-shell">
            <div className="notes-layout">
              <DisplayedNotesCanvas
                classroom={classroom}
                displayedNotes={displayedNotes}
                owned={owned}
                formatDate={formatDate}
                onRemoveDisplayed={handleRemoveDisplayed}
                showScreenShare={false}
              />

              <TeacherNotesPanel
                owned={owned}
                liveLoading={liveLoading}
                handleToggleLiveClass={handleToggleLiveClass}
                liveError={liveError}
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
              />
            </div>
          </section>
        )}
      </div>
    </Suspense>
  )
}

export default ClassroomPage
