import { useState } from 'react'
import { X, Plus, Calendar, Clock, Globe } from 'lucide-react'
import { apiFetch } from '../apiClient'
import ScheduleTimeSlotRow from './ScheduleTimeSlotRow'

const DAYS = [
  { value: 0, label: 'Monday' },
  { value: 1, label: 'Tuesday' },
  { value: 2, label: 'Wednesday' },
  { value: 3, label: 'Thursday' },
  { value: 4, label: 'Friday' },
  { value: 5, label: 'Saturday' },
  { value: 6, label: 'Sunday' },
]

export default function TeacherScheduleModal({ classId, schedules = [], accessToken, setAccessToken, isOpen, onClose, onScheduleUpdated }) {
  const [dayOfWeek, setDayOfWeek] = useState(0)
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('11:30')
  const [title, setTitle] = useState('Regular Lecture')
  const [timezoneName, setTimezoneName] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    } catch {
      return 'UTC'
    }
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState(null)

  if (!isOpen) return null

  const handleAddSlot = async (e) => {
    e.preventDefault()
    if (!startTime || !endTime) {
      setError('Please provide start and end times')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      await apiFetch(
        `/classrooms/${classId}/schedule/`,
        {
          method: 'POST',
          body: JSON.stringify({
            title: title.trim() || 'Regular Lecture',
            day_of_week: Number(dayOfWeek),
            start_time: startTime,
            end_time: endTime,
            timezone_name: timezoneName,
          }),
        },
        { accessToken, setAccessToken }
      )

      if (onScheduleUpdated) {
        onScheduleUpdated()
      }
    } catch (err) {
      setError(err.message || 'Failed to add schedule')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteSlot = async (slotId) => {
    try {
      setDeletingId(slotId)
      await apiFetch(
        `/classrooms/${classId}/schedule/${slotId}/`,
        { method: 'DELETE' },
        { accessToken, setAccessToken }
      )
      if (onScheduleUpdated) {
        onScheduleUpdated()
      }
    } catch (err) {
      alert(err.message || 'Failed to delete schedule slot')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="schedule-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="manage-schedule-title">
      <div className="schedule-modal">
        <div className="schedule-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={20} color="#38bdf8" />
            <h4 id="manage-schedule-title" style={{ margin: 0, color: '#f8fafc' }}>
              Recurring Lecture Schedule
            </h4>
          </div>
          <button type="button" className="ghost" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <div className="schedule-modal-body">
          {error && <div className="error-alert" role="alert">{error}</div>}

          {/* Add slot form */}
          <form onSubmit={handleAddSlot} style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
            <h5 style={{ margin: '0 0 0.75rem 0', color: '#f8fafc', fontSize: '0.9rem' }}>
              Add Weekly Lecture Slot
            </h5>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div className="form-group">
                <label htmlFor="slot-day" style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Day of Week</label>
                <select
                  id="slot-day"
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(Number(e.target.value))}
                  className="courseware-search-input"
                  style={{ width: '100%' }}
                >
                  {DAYS.map((d) => (
                    <option key={d.value} value={d.value}>Every {d.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="slot-title" style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Topic / Label</label>
                <input
                  id="slot-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="courseware-search-input"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div className="form-group">
                <label htmlFor="slot-start" style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Start Time</label>
                <input
                  id="slot-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="courseware-search-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="slot-end" style={{ fontSize: '0.8rem', color: '#94a3b8' }}>End Time</label>
                <input
                  id="slot-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  className="courseware-search-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="slot-tz" style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Timezone</label>
                <input
                  id="slot-tz"
                  type="text"
                  value={timezoneName}
                  onChange={(e) => setTimezoneName(e.target.value)}
                  className="courseware-search-input"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="button primary"
              disabled={isSubmitting}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
            >
              <Plus size={14} /> {isSubmitting ? 'Adding...' : 'Add Slot'}
            </button>
          </form>

          {/* Current slots list */}
          <div>
            <h5 style={{ margin: '0 0 0.5rem 0', color: '#94a3b8', fontSize: '0.85rem' }}>
              Active Recurring Schedule ({schedules.length})
            </h5>
            {schedules.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>
                No recurring time slots scheduled yet. Add one above!
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {schedules.map((slot) => (
                  <ScheduleTimeSlotRow
                    key={slot.id}
                    slot={slot}
                    onDelete={handleDeleteSlot}
                    disabled={deletingId === slot.id}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'flex-end', background: 'rgba(0, 0, 0, 0.2)' }}>
          <button type="button" className="button" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
