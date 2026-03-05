import { useEffect, useState } from 'react'
import { useRoomContext } from '@livekit/components-react'
import { DataPacket_Kind, RoomEvent } from 'livekit-client'
import { FiSend } from "react-icons/fi";

const CHAT_TOPIC = 'lessonlive-chat'

function getParticipantName(participant) {
  if (!participant) {
    return 'Unknown'
  }

  const name = (participant.name || '').trim()
  if (name) {
    return name
  }

  const identity = (participant.identity || '').trim()
  if (!identity) {
    return 'Unknown'
  }

  if (identity.includes('@')) {
    return identity.split('@')[0]
  }

  return identity
}

export default function UsernameChat() {
  const room = useRoomContext()
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')

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
              sender: parsed.sender && parsed.sender !== 'Unknown'
                ? parsed.sender
                : getParticipantName(participant),
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
      sender: getParticipantName(room.localParticipant),
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
              <strong>{message.sender}:</strong> <br/>{message.text}
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
        <button type="submit" className="chatSendButton">
          <FiSend size={20} />
        </button>
      </form>
    </div>
  )
}
