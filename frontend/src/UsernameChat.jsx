import { useEffect, useMemo, useState } from 'react'
import { useRoomContext } from '@livekit/components-react'
import { DataPacket_Kind, RoomEvent } from 'livekit-client'

const CHAT_TOPIC = 'lessonlive-chat'

function getParticipantName(participant) {
  if (!participant) {
    return 'Unknown'
  }
  return participant.name || participant.identity || 'Unknown'
}

export default function UsernameChat() {
  const room = useRoomContext()
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')

  const localSenderName = useMemo(() => {
    return getParticipantName(room?.localParticipant)
  }, [room?.localParticipant])

  useEffect(() => {
    if (!room) {
      return undefined
    }

    const handleData = (payload, participant, kind, topic) => {
      if (kind !== DataPacket_Kind.RELIABLE || topic !== CHAT_TOPIC) {
        return
      }

      try {
        const raw = new TextDecoder().decode(payload)
        const parsed = JSON.parse(raw)
        if (!parsed?.id || !parsed?.text) {
          return
        }

        setMessages((prev) => {
          if (prev.some((item) => item.id === parsed.id)) {
            return prev
          }
          return [
            ...prev,
            {
              id: parsed.id,
              sender: parsed.sender || getParticipantName(participant),
              text: parsed.text,
            },
          ]
        })
      } catch {
        return
      }
    }

    room.on(RoomEvent.DataReceived, handleData)
    return () => {
      room.off(RoomEvent.DataReceived, handleData)
    }
  }, [room])

  const handleSend = async (event) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text || !room?.localParticipant) {
      return
    }

    const outgoing = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sender: localSenderName,
      text,
    }

    try {
      await room.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify(outgoing)),
        {
          reliable: true,
          topic: CHAT_TOPIC,
        }
      )

      setMessages((prev) => [...prev, outgoing])
      setDraft('')
    } catch {
      return
    }
  }

  return (
    <div className="username-chat">
      <div className="username-chat-list">
        {messages.length === 0 ? (
          <p className="muted">No messages yet.</p>
        ) : (
          messages.map((message) => (
            <p key={message.id} className="username-chat-item">
              <strong>{message.sender}:</strong> {message.text}
            </p>
          ))
        )}
      </div>

      <form className="username-chat-form" onSubmit={handleSend}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Type a message"
        />
        <button type="submit" className="primary">Send</button>
      </form>
    </div>
  )
}
