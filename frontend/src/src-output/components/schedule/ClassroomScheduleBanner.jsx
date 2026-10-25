import { useState, useEffect, useCallback } from 'react'
import { Calendar, Radio, Clock, Settings, Play, CheckCircle } from 'lucide-react'
import { apiFetch } from '../apiClient'
import AddToCalendarDropdown from './AddToCalendarDropdown'
import TeacherScheduleModal from './TeacherScheduleModal'
import './schedule.css'

export default function ClassroomScheduleBanner({ classId, owned, accessToken, setAccessToken, onGoLive }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const fetchSchedule = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiFetch(
        `/classrooms/${classId}/schedule/`,
        {},
        { accessToken, setAccessToken }
      )
      setData(res)
    } catch {
      // If error or unauthenticated, ignore gracefully
    } finally {
      setLoading(false)
    }
  }, [classId, accessToken, setAccessToken])

  useEffect(() => {
    fetchSchedule()
  }, [fetchSchedule])

  if (loading) {
    return null
  }

  const nextSession = data?.next_session
  const schedules = data?.schedules || []
  const isLive = nextSession?.is_live_now

  return (
    <div className={`schedule-banner ${isLive ? 'is-live' : ''}`} role="region" aria-label="Classroom schedule">
      <div className="schedule-banner-left">
        <div className={`schedule-icon-container ${isLive ? 'live' : ''}`}>
          {isLive ? <Radio size={20} aria-hidden="true" /> : <Calendar size={20} aria-hidden="true" />}
        </div>

        <div>
          {isLive ? (
            <>
              <h4 className="schedule-info-title" style={{ color: '#f87171' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                Live Lecture in Progress!
              </h4>
              <p className="schedule-info-subtitle">
                {nextSession?.title || 'Classroom Session'} is active now ({nextSession?.start_time} – {nextSession?.end_time})
              </p>
            </>
          ) : nextSession ? (
            <>
              <h4 className="schedule-info-title">
                Next Session: {nextSession.human_relative}
              </h4>
              <p className="schedule-info-subtitle">
                {nextSession.title} · {nextSession.day_name}s {nextSession.start_time} – {nextSession.end_time} ({nextSession.timezone})
              </p>
            </>
          ) : (
            <>
              <h4 className="schedule-info-title">No upcoming lectures scheduled</h4>
              <p className="schedule-info-subtitle">
                {owned
                  ? 'Set recurring lecture hours so students receive calendar invites and automated 30-min reminders.'
                  : 'Your teacher has not set a recurring schedule yet.'}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="schedule-banner-actions">
        {nextSession && (
          <AddToCalendarDropdown
            calendarLinks={data?.calendar_links}
            accessToken={accessToken}
          />
        )}

        {owned && (
          <button
            type="button"
            className="button"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
            onClick={() => setIsModalOpen(true)}
          >
            <Settings size={14} /> Manage Schedule
          </button>
        )}

        {isLive && onGoLive && (
          <button
            type="button"
            className="button primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.4rem 0.75rem', background: '#ef4444', borderColor: '#dc2626' }}
            onClick={onGoLive}
          >
            <Play size={14} fill="currentColor" /> {owned ? 'Go Live' : 'Join Now'}
          </button>
        )}
      </div>

      {isModalOpen && (
        <TeacherScheduleModal
          classId={classId}
          schedules={schedules}
          accessToken={accessToken}
          setAccessToken={setAccessToken}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onScheduleUpdated={() => {
            fetchSchedule()
          }}
        />
      )}
    </div>
  )
}
