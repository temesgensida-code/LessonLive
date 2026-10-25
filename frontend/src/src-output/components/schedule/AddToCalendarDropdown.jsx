import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronDown, Download, ExternalLink } from 'lucide-react'
import { API_BASE } from '../apiClient'

export default function AddToCalendarDropdown({ calendarLinks = {}, accessToken }) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleDownloadICS = async () => {
    try {
      const icsPath = calendarLinks?.ics_download_url || ''
      const url = icsPath.startsWith('http') ? icsPath : `${API_BASE.replace('/api', '')}${icsPath}`
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
      const res = await fetch(url, { headers })
      if (!res.ok) throw new Error('Failed to download calendar')
      const blob = await res.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = 'classroom_schedule.ics'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(blobUrl)
      setIsOpen(false)
    } catch (err) {
      alert(err.message || 'Download failed')
    }
  }

  return (
    <div className="calendar-dropdown-container" ref={menuRef}>
      <button
        type="button"
        className="button"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Add to Calendar options"
      >
        <Calendar size={14} /> Add to Calendar <ChevronDown size={14} />
      </button>

      {isOpen && (
        <div className="calendar-menu" role="menu">
          {calendarLinks?.google && (
            <a
              href={calendarLinks.google}
              target="_blank"
              rel="noopener noreferrer"
              className="calendar-menu-item"
              role="menuitem"
              onClick={() => setIsOpen(false)}
            >
              <ExternalLink size={14} color="#4285F4" />
              Google Calendar
            </a>
          )}

          {calendarLinks?.outlook && (
            <a
              href={calendarLinks.outlook}
              target="_blank"
              rel="noopener noreferrer"
              className="calendar-menu-item"
              role="menuitem"
              onClick={() => setIsOpen(false)}
            >
              <ExternalLink size={14} color="#0078D4" />
              Outlook / Office 365
            </a>
          )}

          <button
            type="button"
            className="calendar-menu-item"
            role="menuitem"
            onClick={handleDownloadICS}
          >
            <Download size={14} color="#10B981" />
            Download iCalendar (.ics)
          </button>
        </div>
      )}
    </div>
  )
}
