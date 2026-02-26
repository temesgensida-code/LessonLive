import { useTracks, VideoTrack } from '@livekit/components-react'
import { Track } from 'livekit-client'

function ScreenShareView() {
  const tracks = useTracks([Track.Source.ScreenShare])

  if (tracks.length === 0) {
    return null
  }

  return (
    <div className="screen-share-container" style={{ marginBottom: '1rem', borderRadius: '8px', overflow: 'hidden', background: '#000' }}>
      <VideoTrack trackRef={tracks[0]} style={{ width: '100%', height: 'auto', display: 'block' }} />
    </div>
  )
}

export default ScreenShareView
