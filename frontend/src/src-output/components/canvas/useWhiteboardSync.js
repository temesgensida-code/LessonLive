import { useEffect, useCallback } from 'react'
import useLiveKitDataTopic from '../engagement/useLiveKitDataTopic'

export const WHITEBOARD_TOPIC = 'lessonlive-whiteboard'

export function useWhiteboardSync({
  owned = false,
  elements = [],
  onRemoteElement,
  onRemoteClear,
  onRemoteSnapshot,
  onRemotePermissions,
}) {
  const handleMessage = useCallback(
    (data, participant) => {
      if (!data || !data.type) return

      if (data.type === 'WB_STROKE_END' && data.element) {
        onRemoteElement?.(data.element)
      } else if (data.type === 'WB_CLEAR') {
        onRemoteClear?.()
      } else if (data.type === 'WB_SNAPSHOT_RESPONSE' && Array.isArray(data.elements)) {
        onRemoteSnapshot?.(data.elements)
      } else if (data.type === 'WB_PERMISSIONS') {
        onRemotePermissions?.(data.mode)
      } else if (data.type === 'WB_REQUEST_SNAPSHOT' && owned) {
        publish?.({
          type: 'WB_SNAPSHOT_RESPONSE',
          elements,
        })
      }
    },
    [owned, elements, onRemoteElement, onRemoteClear, onRemoteSnapshot, onRemotePermissions]
  )

  const { publish, localParticipant } = useLiveKitDataTopic(WHITEBOARD_TOPIC, handleMessage)

  // Students request initial canvas state
  useEffect(() => {
    if (!owned && publish) {
      publish({ type: 'WB_REQUEST_SNAPSHOT' })
    }
  }, [owned, publish])

  const broadcastStroke = useCallback(
    async (element) => {
      await publish?.({
        type: 'WB_STROKE_END',
        element,
      })
    },
    [publish]
  )

  const broadcastClear = useCallback(async () => {
    await publish?.({
      type: 'WB_CLEAR',
    })
  }, [publish])

  const broadcastPermissions = useCallback(
    async (mode) => {
      await publish?.({
        type: 'WB_PERMISSIONS',
        mode,
      })
    },
    [publish]
  )

  return {
    broadcastStroke,
    broadcastClear,
    broadcastPermissions,
    localParticipant,
  }
}

export default useWhiteboardSync
