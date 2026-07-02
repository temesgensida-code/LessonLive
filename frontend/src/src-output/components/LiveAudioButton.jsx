import { useLocalParticipant } from '@livekit/components-react'
import { Mic, MicOff, MonitorPlay, MonitorOff } from 'lucide-react'

function LiveAudioButton({ owned }) {
  const { localParticipant, isMicrophoneEnabled, isScreenShareEnabled } = useLocalParticipant()

  const handleToggleMic = async () => {
    if (!localParticipant) return
    await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)
  }

  const handleToggleScreenShare = async () => {
    if (!localParticipant) return
    await localParticipant.setScreenShareEnabled(!isScreenShareEnabled)
  }

  return (
    <div className="live-audio-btn-row">
      <button
        type="button"
        className={isMicrophoneEnabled ? 'ghost' : 'primary'}
        onClick={handleToggleMic}
        style={{ flex: 1 }}
      >
        {isMicrophoneEnabled ? (
          <><MicOff size={16} aria-hidden="true" /> Mute</>
        ) : (
          <><Mic size={16} aria-hidden="true" /> Unmute</>
        )}
      </button>

      {owned && (
        <button
          type="button"
          className={isScreenShareEnabled ? 'ghost danger' : 'primary'}
          onClick={handleToggleScreenShare}
          style={{ flex: 1 }}
        >
          {isScreenShareEnabled ? (
            <><MonitorOff size={16} aria-hidden="true" /> Stop share</>
          ) : (
            <><MonitorPlay size={16} aria-hidden="true" /> Share screen</>
          )}
        </button>
      )}
    </div>
  )
}

export default LiveAudioButton
