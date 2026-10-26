import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from './apiClient'
import { GraduationCap, BookOpen, ArrowRight, AlertCircle } from 'lucide-react'

function StudentDashboard({ accessToken, setAccessToken, studentName = 'Student' }) {
  const [classrooms, setClassrooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchEnrolled = async () => {
      setLoading(true)
      setError('')
      try {
        const data = await apiFetch('/classrooms/enrolled/', {}, { accessToken, setAccessToken })
        setClassrooms(data.classrooms || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchEnrolled()
  }, [accessToken, setAccessToken])

  return (
    <div className="stack">
      {/* Welcome Banner */}
      <section className="dashboard-banner" aria-labelledby="student-welcome-heading">
        <div className="dashboard-banner-text">
          <h2 id="student-welcome-heading" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Welcome, {studentName}
            <GraduationCap size={24} aria-hidden="true" />
          </h2>
          <p className="muted">View your enrolled classrooms and join live lessons.</p>
        </div>
      </section>

      {/* Metrics Row */}
      <div className="dashboard-stats-row" role="region" aria-label="Enrolled statistics">
        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon" aria-hidden="true">
            <BookOpen size={20} />
          </div>
          <div>
            <div className="dashboard-stat-value">{classrooms.length}</div>
            <div className="dashboard-stat-label">Enrolled Classes</div>
          </div>
        </div>

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon" aria-hidden="true" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
            <GraduationCap size={20} />
          </div>
          <div>
            <div className="dashboard-stat-value">Student Hub</div>
            <div className="dashboard-stat-label">Active Participation</div>
          </div>
        </div>
      </div>

      <section className="card" aria-labelledby="enrolled-classrooms-heading">
        <div className="card-header">
          <span className="card-icon-wrap" aria-hidden="true">
            <BookOpen className="card-icon" size={20} />
          </span>
          <div>
            <h2 id="enrolled-classrooms-heading">Your classrooms</h2>
            <p className="muted card-sub">Ask your teacher for an invite link to join new ones</p>
          </div>
        </div>

        {loading ? (
          <div className="card-loading" role="status" aria-label="Loading classrooms">
            <div className="loading-spinner-sm" aria-hidden="true" />
            <span className="muted">Loading classrooms…</span>
          </div>
        ) : error ? (
          <div className="error-alert" role="alert">
            <AlertCircle size={16} aria-hidden="true" /> {error}
          </div>
        ) : classrooms.length === 0 ? (
          <div className="empty-state">
            <BookOpen className="empty-icon" size={36} aria-hidden="true" />
            <p>No classrooms yet.</p>
            <p className="muted">Ask your teacher for an invite link to get started.</p>
          </div>
        ) : (
          <ul className="classroom-list" aria-label="Enrolled classrooms">
            {classrooms.map((room) => (
              <li key={room.class_id} className="classroom-list-item">
                <div className="classroom-info">
                  <span className="classroom-name">{room.name}</span>
                  <span className="classroom-id muted">ID: {room.class_id}</span>
                </div>
                <Link
                  to={`/classrooms/${room.class_id}`}
                  className="ghost btn-sm"
                  aria-label={`Enter classroom ${room.name}`}
                >
                  Enter <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default StudentDashboard
