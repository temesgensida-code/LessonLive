import { useLocalParticipant } from '@livekit/components-react'

function LiveAudioButton() {
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant()

  const handleToggleMic = async () => {
    if (!localParticipant) {
      return
    }
    await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)
  }

  return (
    <button type="button" className="primary live-audio-btn" onClick={handleToggleMic}>
      {isMicrophoneEnabled ? 'Mute audio' : 'Unmute audio'}
    </button>
  )
}

export default LiveAudioButton
