import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react'
import UsernameChat from '../UsernameChat'
import LiveAudioButton from './LiveAudioButton'
import { LIVEKIT_SERVER_URL } from './apiClient'

function LiveClassSidePanel({ token }) {
  return (
    <div className="live-side-shell">
      <LiveKitRoom
        connect
        video={false}
        audio
        token={token}
        serverUrl={LIVEKIT_SERVER_URL}
        data-lk-theme="default"
        className="live-room"
      >
        <div className="live-side-content">
          <h3>Live Class Chat</h3>
          <div className="live-chat-box">
            <UsernameChat />
          </div>
          <div className="live-audio-box">
            <h4>Audio Chat</h4>
            <LiveAudioButton />
          </div>
        </div>
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  )
}

export default LiveClassSidePanel
