import { useState, useRef, useEffect } from 'react'
import { FiMoreVertical } from 'react-icons/fi'
import { NotepadText, Megaphone, Users, BarChart2, GraduationCap, Sparkles, Key } from 'lucide-react'

function OptionsMenu({
  onToggleQuiz,
  onOpenNotification,
  onOpenAttendance,
  onOpenMicroPoll,
  onOpenGradebook,
  onOpenStudyGuide,
  onOpenAIConfig,
  showQuizCard,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef(null)
  const triggerRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div className="options-menu-container" ref={menuRef}>
      <button
        ref={triggerRef}
        type="button"
        className="ghost options-menu-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Classroom options menu"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <FiMoreVertical size={18} aria-hidden="true" />
      </button>
      {isOpen && (
        <div className="options-dropdown-menu" role="menu" aria-label="Classroom options">
          <button
            type="button"
            role="menuitem"
            className="options-dropdown-item"
            onClick={() => {
              onToggleQuiz()
              setIsOpen(false)
            }}
          >
            <span className="icon"><NotepadText size={16} aria-hidden="true" /></span> {showQuizCard ? 'Show Notes' : 'Show Quiz'}
          </button>
          <button
            type="button"
            role="menuitem"
            className="options-dropdown-item"
            onClick={() => {
              onOpenNotification()
              setIsOpen(false)
            }}
          >
            <span className="icon"><Megaphone size={16} aria-hidden="true" /></span> Notify Students
          </button>
          {onOpenAttendance && (
            <button
              type="button"
              role="menuitem"
              className="options-dropdown-item"
              onClick={() => {
                onOpenAttendance()
                setIsOpen(false)
              }}
            >
              <span className="icon"><Users size={16} aria-hidden="true" /></span> Attendance &amp; Insights
            </button>
          )}
          {onOpenMicroPoll && (
            <button
              type="button"
              role="menuitem"
              className="options-dropdown-item"
              onClick={() => {
                onOpenMicroPoll()
                setIsOpen(false)
              }}
            >
              <span className="icon"><BarChart2 size={16} aria-hidden="true" /></span> Quick Micro-Poll
            </button>
          )}
          {onOpenGradebook && (
            <button
              type="button"
              role="menuitem"
              className="options-dropdown-item"
              onClick={() => {
                onOpenGradebook()
                setIsOpen(false)
              }}
            >
              <span className="icon"><GraduationCap size={16} aria-hidden="true" /></span> Gradebook &amp; Analytics
            </button>
          )}
          {onOpenStudyGuide && (
            <button
              type="button"
              role="menuitem"
              className="options-dropdown-item"
              onClick={() => {
                onOpenStudyGuide()
                setIsOpen(false)
              }}
            >
              <span className="icon"><Sparkles size={16} color="#a855f7" aria-hidden="true" /></span> AI Study Guide
            </button>
          )}
          {onOpenAIConfig && (
            <button
              type="button"
              role="menuitem"
              className="options-dropdown-item"
              onClick={() => {
                onOpenAIConfig()
                setIsOpen(false)
              }}
            >
              <span className="icon"><Key size={16} color="#38bdf8" aria-hidden="true" /></span> AI Settings (BYOK)
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default OptionsMenu
