import { Trash2, Clock, Globe } from 'lucide-react'

export default function ScheduleTimeSlotRow({ slot, onDelete, disabled }) {
  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    const [h, m] = timeStr.split(':')
    const hour = parseInt(h, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const formattedHour = hour % 12 || 12
    return `${formattedHour}:${m} ${ampm}`
  }

  return (
    <div className="slot-item">
      <div>
        <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.9rem' }}>
          {slot.day_name}s: {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
          <Globe size={12} /> {slot.timezone_name} · {slot.title || 'Regular Lecture'}
        </div>
      </div>

      {onDelete && (
        <button
          type="button"
          className="ghost"
          style={{ color: '#f87171', padding: '0.3rem' }}
          aria-label={`Delete ${slot.day_name} schedule`}
          disabled={disabled}
          onClick={() => onDelete(slot.id)}
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  )
}
