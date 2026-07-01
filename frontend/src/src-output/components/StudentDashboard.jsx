import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from './apiClient'
import { GraduationCap } from 'lucide-react'
import { FileChartColumnIncreasing } from 'lucide-react';
import { PencilOff } from 'lucide-react';

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
  }, [accessToken])

  return (
    <div className="stack">
      {/* Welcome Banner */}
      <section className="dashboard-banner">
        <div className="dashboard-banner-text">
          <h2>Welcome, {studentName} <GraduationCap /></h2>
          <p className="muted">View your enrolled classrooms and join live sessions below.</p>
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <span className="card-icon"><FileChartColumnIncreasing /></span>
          <div>
            <h2>Your classrooms</h2>
            <p className="muted card-sub">Ask your teacher for an invite link to join new ones</p>
          </div>
        </div>

        {loading ? (
          <div className="card-loading">
            <div className="loading-spinner-sm" />
            <span className="muted">Loading classrooms…</span>
          </div>
        ) : error ? (
          <p className="error">{error}</p>
        ) : classrooms.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon"><PencilOff /></span>
            <p>No classrooms yet.</p>
            <p className="muted">Ask your teacher for an invite link to get started.</p>
          </div>
        ) : (
          <ul className="classroom-list">
            {classrooms.map((room) => (
              <li key={room.class_id} className="classroom-list-item">
                <Link to={`/classrooms/${room.class_id}`} className="classroom-link">
                  <span className="classroom-name">{room.name}</span>
                  <span className="classroom-id muted">{room.class_id}</span>
                </Link>
                <Link to={`/classrooms/${room.class_id}`} className="ghost btn-sm">
                  Enter →
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
