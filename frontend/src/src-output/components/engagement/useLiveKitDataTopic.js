import { useEffect, useCallback } from 'react'
import { useRoomContext } from '@livekit/components-react'

export function useLiveKitDataTopic(topic, onMessage) {
  let room = null
  try {
    room = useRoomContext()
  } catch {
    room = null
  }

  useEffect(() => {
    if (!room || !onMessage) return

    const handleData = (payload, participant, kind, incomingTopic) => {
      if (incomingTopic !== topic) return
      try {
        const text = new TextDecoder().decode(payload)
        const data = JSON.parse(text)
        onMessage(data, participant)
      } catch (err) {
        // Safe catch for invalid payloads
      }
    }

    room.on('dataReceived', handleData)
    return () => {
      room.off('dataReceived', handleData)
    }
  }, [room, topic, onMessage])

  const publish = useCallback(
    async (data) => {
      if (!room?.localParticipant) return
      try {
        const bytes = new TextEncoder().encode(JSON.stringify(data))
        await room.localParticipant.publishData(bytes, { reliable: true, topic })
      } catch (err) {
        // Safe catch for disconnect / publish errors
      }
    },
    [room, topic]
  )

  return {
    publish,
    room,
    localParticipant: room?.localParticipant,
  }
}

export default useLiveKitDataTopic
