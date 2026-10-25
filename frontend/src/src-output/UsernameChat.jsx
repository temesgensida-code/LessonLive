import { useState, useEffect, useRef } from 'react'
import { useRoomContext } from '@livekit/components-react'
import { FiSend } from 'react-icons/fi'
import { Smile } from 'lucide-react'

const CHAT_TOPIC = 'lessonlive-chat'
const MAX_MESSAGES = 100
const EMOJI_CHOICES = ['👍', '👋', '🎉', '❤️', '🔥', '🤔', '🙌', '💡', '✅', '🚀', '👏', '⭐']

function safeParsePayload(payload) {
  try {
    return JSON.parse(payload)
  } catch {
    return null
  }
}

function keepRecentMessages(messages) {
  if (messages.length <= MAX_MESSAGES) return messages
  return messages.slice(messages.length - MAX_MESSAGES)
}

export default function UsernameChat({ chatStorageKey, isTeacher = false }) {
  const room = useRoomContext()
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
  const listRef = useRef(null)
  const emojiPickerRef = useRef(null)
  const emojiButtonRef = useRef(null)

  const localParticipant = room?.localParticipant
  const localIdentity = localParticipant?.identity || ''
  const localName = localParticipant?.name || (isTeacher ? 'Teacher' : 'Student')

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  // Escape key handler to close emoji picker
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isEmojiPickerOpen) {
        setIsEmojiPickerOpen(false)
        emojiButtonRef.current?.focus()
      }
    }

    const handleClickOutside = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setIsEmojiPickerOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isEmojiPickerOpen])

  // Handle incoming LiveKit data messages
  useEffect(() => {
    if (!room) return

    const handleDataReceived = (payload, participant, kind, topic) => {
      if (topic !== CHAT_TOPIC) return

      const text = new TextDecoder().decode(payload)
      const data = safeParsePayload(text)
      if (!data || !data.text) return

      const incomingMsg = {
        id: data.id || `${Date.now()}-${Math.random()}`,
        sender: data.sender || participant?.name || 'Participant',
        senderIdentity: participant?.identity || '',
        senderRole: data.senderRole || (data.isTeacher ? 'teacher' : 'student'),
        text: data.text,
        timestamp: data.timestamp || Date.now(),
      }

      setMessages((prev) => keepRecentMessages([...prev, incomingMsg]))
    }

    room.on('dataReceived', handleDataReceived)
    return () => {
      room.off('dataReceived', handleDataReceived)
    }
  }, [room])

  const handleSend = async (e) => {
    e.preventDefault()
    const trimmed = draft.trim()
    if (!trimmed || !room?.localParticipant) return

    const outgoing = {
      id: `${Date.now()}-${Math.random()}`,
      sender: localName,
      senderIdentity: localIdentity,
      senderRole: isTeacher ? 'teacher' : 'student',
      text: trimmed,
      timestamp: Date.now(),
    }

    try {
      await room.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify(outgoing)),
        { reliable: true, topic: CHAT_TOPIC }
      )
      setMessages((prev) => keepRecentMessages([...prev, outgoing]))
      setDraft('')
      setIsEmojiPickerOpen(false)
    } catch {
      /* ignore send failure */
    }
  }

  const handleInsertEmoji = (emoji) => {
    setDraft((prev) => `${prev}${emoji}`)
    setIsEmojiPickerOpen(false)
    emojiButtonRef.current?.focus()
  }

  return (
    <div className="username-chat">
      {/* Message list */}
      <div
        className="username-chat-list"
        ref={listRef}
        tabIndex={0}
        role="log"
        aria-label="Classroom chat messages"
      >
        {messages.length === 0 ? (
          <p className="muted" style={{ padding: '1rem', textAlign: 'center' }}>
            No messages yet — say hello!
          </p>
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
      <form className="username-chat-form" onSubmit={handleSend} aria-label="Send chat message">
        <label htmlFor="chat-message-input" className="sr-only">
          Type a message
        </label>
        <input
          id="chat-message-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          autoComplete="off"
          aria-label="Type a message"
        />
        <div className="username-chat-actions" ref={emojiPickerRef}>
          <button
            ref={emojiButtonRef}
            type="button"
            className="chatEmojiButton"
            onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
            aria-label="Open emoji picker"
            aria-expanded={isEmojiPickerOpen}
          >
            <Smile size={18} aria-hidden="true" />
          </button>

          {isEmojiPickerOpen && (
            <div className="chat-emoji-picker" role="listbox" aria-label="Emoji picker">
              {EMOJI_CHOICES.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  role="option"
                  aria-selected="false"
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
            <FiSend size={15} aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  )
}
