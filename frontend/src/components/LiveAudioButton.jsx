import { useLocalParticipant } from '@livekit/components-react'

function LiveAudioButton({ owned }) {
  const { localParticipant, isMicrophoneEnabled, isScreenShareEnabled } = useLocalParticipant()

  const handleToggleMic = async () => {
    if (!localParticipant) {
      return
    }
    await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)
  }

  const handleToggleScreenShare = async () => {
    if (!localParticipant) {
      return
    }
    await localParticipant.setScreenShareEnabled(!isScreenShareEnabled)
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <button type="button" className="primary live-audio-btn" onClick={handleToggleMic}>
        {isMicrophoneEnabled ? 'Mute audio' : 'Unmute audio'}
      </button>
      {owned && (
        <button type="button" className="primary live-audio-btn" onClick={handleToggleScreenShare}>
          {isScreenShareEnabled ? 'Stop sharing' : 'Share screen'}
        </button>
      )}
    </div>
  )
}

export default LiveAudioButton
