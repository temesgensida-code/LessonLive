import { useLocalParticipant } from '@livekit/components-react'

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
        {isMicrophoneEnabled ? '🎙 Mute' : '🎙 Unmute'}
      </button>

      {owned && (
        <button
          type="button"
          className={isScreenShareEnabled ? 'ghost danger' : 'primary'}
          onClick={handleToggleScreenShare}
          style={{ flex: 1 }}
        >
          {isScreenShareEnabled ? '⏹ Stop share' : '📺 Share screen'}
        </button>
      )}
    </div>
  )
}

export default LiveAudioButton
