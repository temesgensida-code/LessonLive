import { useState, useEffect, useCallback } from 'react'
import { Hand, Mic } from 'lucide-react'
import useLiveKitDataTopic from './useLiveKitDataTopic'
import './engagement.css'

export const HAND_TOPIC = 'lessonlive-hand'

function RaiseHandButton({ disabled = false }) {
  const [isRaised, setIsRaised] = useState(false)
  const [queuePosition, setQueuePosition] = useState(null)
  const [micGranted, setMicGranted] = useState(false)

  const handleMessage = useCallback((data, participant) => {
    if (!data || !data.type) return

    if (data.type === 'GRANT_MIC') {
      if (data.targetIdentity === localParticipant?.identity) {
        setMicGranted(true)
        setIsRaised(false)
        localParticipant?.setMicrophoneEnabled?.(true).catch(() => {})
      }
    } else if (data.type === 'REVOKE_MIC') {
      if (data.targetIdentity === localParticipant?.identity) {
        setMicGranted(false)
        localParticipant?.setMicrophoneEnabled?.(false).catch(() => {})
      }
    } else if (data.type === 'HAND_LOWER') {
      if (data.identity === localParticipant?.identity || data.identity === 'ALL') {
        setIsRaised(false)
        setMicGranted(false)
        setQueuePosition(null)
      }
    } else if (data.type === 'HAND_SYNC') {
      if (Array.isArray(data.queue)) {
        const idx = data.queue.findIndex((item) => item.identity === localParticipant?.identity)
        if (idx !== -1) {
          setIsRaised(true)
          setQueuePosition(idx + 1)
          setMicGranted(Boolean(data.queue[idx].micGranted))
        } else {
          setIsRaised(false)
          setQueuePosition(null)
        }
      }
    }
  }, [])

  const { publish, localParticipant } = useLiveKitDataTopic(HAND_TOPIC, handleMessage)

  const handleToggle = async () => {
    if (!localParticipant) return

    if (micGranted) {
      // If student is speaking and clicks, they surrender the floor
      await publish({
        type: 'HAND_LOWER',
        identity: localParticipant.identity,
        loweredBy: 'student',
      })
      setMicGranted(false)
      setIsRaised(false)
      await localParticipant.setMicrophoneEnabled?.(false).catch(() => {})
      return
    }

    if (isRaised) {
      await publish({
        type: 'HAND_LOWER',
        identity: localParticipant.identity,
        loweredBy: 'student',
      })
      setIsRaised(false)
      setQueuePosition(null)
    } else {
      const payload = {
        type: 'HAND_RAISE',
        identity: localParticipant.identity,
        name: localParticipant.name || 'Student',
        raisedAt: Date.now(),
      }
      await publish(payload)
      setIsRaised(true)
    }
  }

  return (
    <button
      type="button"
      className={`raise-hand-btn ${micGranted ? 'mic-granted' : isRaised ? 'raised' : 'ghost'}`}
      onClick={handleToggle}
      disabled={disabled}
      aria-label={
        micGranted
          ? 'You have the floor (mic unmuted). Click to finish.'
          : isRaised
          ? `Hand raised${queuePosition ? ` (#${queuePosition} in queue)` : ''}. Click to lower.`
          : 'Raise hand to speak'
      }
      aria-pressed={isRaised || micGranted}
    >
      {micGranted ? (
        <>
          <Mic size={15} aria-hidden="true" />
          <span>Speaking (Floor Granted)</span>
        </>
      ) : isRaised ? (
        <>
          <Hand size={15} fill="currentColor" aria-hidden="true" />
          <span>Hand Raised {queuePosition ? `(#${queuePosition})` : ''}</span>
        </>
      ) : (
        <>
          <Hand size={15} aria-hidden="true" />
          <span>Raise Hand</span>
        </>
      )}
    </button>
  )
}

export default RaiseHandButton
