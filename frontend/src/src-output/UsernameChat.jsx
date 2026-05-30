import { useEffect, useRef, useState } from 'react'
import { useRoomContext } from '@livekit/components-react'
import { DataPacket_Kind, RoomEvent } from 'livekit-client'
import { FiSend } from 'react-icons/fi'

const CHAT_TOPIC = 'lessonlive-chat'
const EMOJI_CHOICES = ['😀', '😂', '😍', '😎', '🤔', '👍', '👏', '🙏', '🎉', '🔥', '❤️', '✅']
const CHAT_HISTORY_LIMIT = 50
const CHAT_STORAGE_PREFIX = 'lessonlive-chat-history'

function getParticipantName(participant) {
  if (!participant) return 'Unknown'
  const name = (participant.name || '').trim()
  if (name) return name
  const identity = (participant.identity || '').trim()
  if (!identity) return 'Unknown'
  return identity.includes('@') ? identity.split('@')[0] : identity
}

function getParticipantRole(participant) {
  const metadata = participant?.metadata
  if (!metadata) return null
  if (metadata === 'teacher' || metadata === 'student') return metadata
  try {
    return JSON.parse(metadata)?.role || null
  } catch {
    return null
  }
}

function keepRecentMessages(items) {
  return items.slice(-CHAT_HISTORY_LIMIT)
}

function getResolvedStorageKey(chatStorageKey, room) {
  const scope = chatStorageKey || room?.name || room?.sid || room?.metadata || 'default'
  return `${CHAT_STORAGE_PREFIX}:${scope}`
}

export default function UsernameChat({ isTeacher = false, chatStorageKey = '' }) {
  const room = useRoomContext()
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
  const [historyReady, setHistoryReady] = useState(false)
  const emojiPickerRef = useRef(null)
  const listRef = useRef(null)
  const localIdentity = room?.localParticipant?.identity || ''
  const localName = getParticipantName(room?.localParticipant)
  const resolvedStorageKey = getResolvedStorageKey(chatStorageKey, room)

  // Load history
  useEffect(() => {
    setHistoryReady(false)
    try {
      const raw = window.localStorage.getItem(resolvedStorageKey)
      if (!raw) { setMessages([]); setHistoryReady(true); return }
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) { setMessages([]); setHistoryReady(true); return }
      const normalized = parsed
        .filter((item) => item && item.id && item.text)
        .map((item) => ({
          id: item.id,
          sender: item.sender || 'Unknown',
          senderIdentity: item.senderIdentity || '',
          senderRole: item.senderRole || null,
          text: item.text,
        }))
      setMessages(keepRecentMessages(normalized))
    } catch {
      setMessages([])
    } finally {
      setHistoryReady(true)
    }
  }, [resolvedStorageKey])

  // Persist history
  useEffect(() => {
    if (!historyReady) return
    try {
      window.localStorage.setItem(resolvedStorageKey, JSON.stringify(keepRecentMessages(messages)))
    } catch { /* ignore */ }
  }, [historyReady, messages, resolvedStorageKey])

  // Auto-scroll to latest message
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  // Close emoji picker on outside click
  useEffect(() => {
    if (!isEmojiPickerOpen) return undefined
    const handleOutside = (e) => {
      if (!emojiPickerRef.current?.contains(e.target)) {
        setIsEmojiPickerOpen(false)
      }
    }
    document.addEventListener('pointerdown', handleOutside)
    return () => document.removeEventListener('pointerdown', handleOutside)
  }, [isEmojiPickerOpen])

  // Receive messages
  useEffect(() => {
    if (!room) return undefined

    const handleData = (payload, participant, kind, topic) => {
      if (kind !== DataPacket_Kind.RELIABLE || topic !== CHAT_TOPIC) return
      try {
        const raw = new TextDecoder().decode(payload)
        const parsed = JSON.parse(raw)
        if (!parsed?.id || !parsed?.text) return
        setMessages((prev) => {
          if (prev.some((item) => item.id === parsed.id)) return prev
          return keepRecentMessages([
            ...prev,
            {
              id: parsed.id,
              sender: parsed.sender && parsed.sender !== 'Unknown'
                ? parsed.sender
                : getParticipantName(participant),
              senderIdentity: parsed.senderIdentity || participant?.identity || '',
              senderRole: parsed.senderRole || getParticipantRole(participant),
              text: parsed.text,
            },
          ])
        })
      } catch { /* ignore */ }
    }

    room.on(RoomEvent.DataReceived, handleData)
    return () => room.off(RoomEvent.DataReceived, handleData)
  }, [room])

  const handleSend = async (e) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || !room?.localParticipant) return

    const outgoing = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sender: getParticipantName(room.localParticipant),
      senderIdentity: room.localParticipant.identity || '',
      senderRole: isTeacher ? 'teacher' : null,
      text,
    }

    try {
      await room.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify(outgoing)),
        { reliable: true, topic: CHAT_TOPIC }
      )
      setMessages((prev) => keepRecentMessages([...prev, outgoing]))
      setDraft('')
      setIsEmojiPickerOpen(false)
    } catch { /* ignore */ }
  }

  const handleInsertEmoji = (emoji) => {
    setDraft((prev) => `${prev}${emoji}`)
    setIsEmojiPickerOpen(false)
  }

  return (
    <div className="username-chat">
      {/* Message list */}
      <div className="username-chat-list" ref={listRef}>
        {messages.length === 0 ? (
          <p className="muted">No messages yet — say hello!</p>
        ) : (
          messages.map((message) => {
            const isSelf = message.senderIdentity
              ? message.senderIdentity === localIdentity
              : message.sender === localName

            return (
              <div
                key={message.id}
                className={`username-chat-row ${isSelf ? 'is-self' : 'is-other'}`}
              >
                <div className="username-chat-meta">
                  {!isSelf && (
                    <>
                      <span className="username-chat-sender">{message.sender}</span>
                      {message.senderRole === 'teacher' && (
                        <span className="username-chat-teacher-tag">TCHR</span>
                      )}
                    </>
                  )}
                  {isSelf && (
                    <span className="username-chat-sender">You</span>
                  )}
                </div>
                <div className="username-chat-item">
                  <p className="username-chat-text">{message.text}</p>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Input area */}
      <form className="username-chat-form" onSubmit={handleSend}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          autoComplete="off"
        />
        <div className="username-chat-actions" ref={emojiPickerRef}>
          <button
            type="button"
            className="chatEmojiButton"
            onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
            aria-label="Open emoji picker"
            aria-expanded={isEmojiPickerOpen}
          >
            😊
          </button>

          {isEmojiPickerOpen && (
            <div className="chat-emoji-picker" role="listbox" aria-label="Emoji picker">
              {EMOJI_CHOICES.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="chat-emoji-item"
                  onClick={() => handleInsertEmoji(emoji)}
                  aria-label={`Insert ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <button
            type="submit"
            className="chatSendButton"
            aria-label="Send message"
            disabled={!draft.trim()}
          >
            <FiSend size={15} />
          </button>
        </div>
      </form>
    </div>
  )
}
