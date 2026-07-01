import { useState, useRef, useEffect } from 'react'
import { FiMoreVertical } from 'react-icons/fi'
import { NotepadText } from 'lucide-react';
import { Megaphone } from 'lucide-react';

function OptionsMenu({ onToggleQuiz, onOpenNotification, showQuizCard }) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="options-menu-container" ref={menuRef}>
      <button
        type="button"
        className="ghost options-menu-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Options"
        aria-expanded={isOpen}
      >
        <FiMoreVertical size={18} />
      </button>
      {isOpen && (
        <div className="options-dropdown-menu">
          <button
            type="button"
            className="options-dropdown-item"
            onClick={() => {
              onToggleQuiz()
              setIsOpen(false)
            }}
          >
            <span className="icon"><NotepadText /></span> {showQuizCard ? 'Show Notes' : 'Show Quiz'}
          </button>
          <button
            type="button"
            className="options-dropdown-item"
            onClick={() => {
              onOpenNotification()
              setIsOpen(false)
            }}
          >
            <span className="icon"><Megaphone /></span> Notify Students
          </button>
        </div>
      )}
    </div>
  )
}

export default OptionsMenu
