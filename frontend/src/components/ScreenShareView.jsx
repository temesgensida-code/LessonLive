import { useTracks, VideoTrack } from '@livekit/components-react'
import { Track } from 'livekit-client'

/**
 * ScreenShareView — fills the full notes-canvas card when active.
 * Returns null when no screen share is present.
 */
function ScreenShareView() {
  const tracks = useTracks([{ source: Track.Source.ScreenShare, withPlaceholder: false }])

  if (tracks.length === 0) return null

  return (
    <div
      className="screen-share-container"
      style={{
        flex: '1 1 auto',
        minHeight: 0,
        width: '100%',
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <VideoTrack
        trackRef={tracks[0]}
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', flex: 1 }}
      />
    </div>
  )
}

export default ScreenShareView
