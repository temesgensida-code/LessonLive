import { useParams } from 'react-router-dom'
import { LiveKitRoom } from '@livekit/components-react'
import { LIVEKIT_SERVER_URL } from './apiClient'
import ClassroomSidebarPortal from './classroom-components/ClassroomSidebarPortal'
import DisplayedNotesCanvas from './classroom-components/DisplayedNotesCanvas'
import LiveNotesPanel from './classroom-components/LiveNotesPanel'
import TeacherNotesPanel from './classroom-components/TeacherNotesPanel'
import useClassroomPageController from './classroom-components/useClassroomPageController'

function ClassroomPage({ accessToken, setAccessToken }) {
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
    return <p>Loading classroom…</p>
  }

  return (
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
            <div className="notes-layout">
              <DisplayedNotesCanvas
                classroom={classroom}
                displayedNotes={displayedNotes}
                owned={owned}
                formatDate={formatDate}
                onRemoveDisplayed={handleRemoveDisplayed}
                showScreenShare
              />

              <LiveNotesPanel
                owned={owned}
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
  )
}

export default ClassroomPage
