import { RoomAudioRenderer } from '@livekit/components-react'
import UsernameChat from '../UsernameChat'
import LiveAudioButton from './LiveAudioButton'

function LiveClassSidePanel({ owned, chatStorageKey }) {
  return (
    <div className="live-side-shell">
      <div className="live-side-content">
        <h3>Chat</h3>

        {/* Chat fills available height */}
        <div className="live-chat-box">
          <UsernameChat chatStorageKey={chatStorageKey} />
        </div>

        {/* Audio controls pinned at bottom */}
        <div className="live-audio-box">
          <h4>Audio</h4>
          <LiveAudioButton owned={owned} />
        </div>
      </div>

      <RoomAudioRenderer />
    </div>
  )
}

export default LiveClassSidePanel
