import { RoomAudioRenderer } from '@livekit/components-react'
import UsernameChat from '../UsernameChat'
import LiveAudioButton from './LiveAudioButton'

function LiveClassSidePanel({ owned, chatStorageKey }) {
  return (
    <div className="live-side-shell">
      <div className="live-side-content">
        <h3>Live Class Chat</h3>
        <div className="live-chat-box">
          <UsernameChat chatStorageKey={chatStorageKey} />
        </div>
        <div className="live-audio-box">
          <h4>Audio Chat</h4>
          <LiveAudioButton owned={owned} />
        </div>
      </div>
      <RoomAudioRenderer />
    </div>
  )
}

export default LiveClassSidePanel
