import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiFetch } from './apiClient'
import { Plus, School, ArrowRight, BookOpen } from 'lucide-react'

function TeacherDashboard({ refreshMe, accessToken, setAccessToken }) {
  const [classrooms, setClassrooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [className, setClassName] = useState('')
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()

  const fetchClassrooms = async () => {
    setLoading(true)
    try {
      const data = await apiFetch('/classrooms/', {}, { accessToken, setAccessToken })
      setClassrooms(data.classrooms || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClassrooms()
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    setCreating(true)
    try {
      const data = await apiFetch('/classrooms/create/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: className }),
      }, { accessToken, setAccessToken })
      setClassName('')
      await fetchClassrooms()
      refreshMe()
      navigate(data.redirect_url)
    } catch (err) {
      if (/authentication required|invalid or expired refresh token/i.test(err.message || '')) {
        setError('Your session is not active. Please log in first.')
        return
      }
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="stack">
      {/* Welcome Banner */}
      <section className="dashboard-banner" aria-labelledby="teacher-welcome-title">
        <div className="dashboard-banner-text">
          <h2 id="teacher-welcome-title">Welcome back, Teacher</h2>
          <p className="muted">Manage your classrooms, invite students, and conduct real-time interactive lessons.</p>
        </div>
      </section>

      <div className="dashboard-grid">
        {/* Create classroom */}
        <section className="card create-card" aria-labelledby="create-class-heading">
          <div className="card-header">
            <span className="card-icon-wrap" aria-hidden="true">
              <Plus className="card-icon" size={20} />
            </span>
            <div>
              <h2 id="create-class-heading">New classroom</h2>
              <p className="muted card-sub">Create a new class and invite students</p>
            </div>
          </div>

          <form className="form" onSubmit={handleCreate} aria-label="Create classroom form">
            <div className="form-group">
              <label htmlFor="teacher-new-class-name">Class name</label>
              <input
                id="teacher-new-class-name"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="e.g. Biology 101"
                required
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'create-class-error' : undefined}
              />
            </div>
            {error && (
              <p id="create-class-error" className="error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="primary" disabled={creating}>
              {creating ? 'Creating…' : 'Create classroom'}
            </button>
          </form>
        </section>

        {/* Classrooms list */}
        <section className="card classrooms-card" aria-labelledby="teacher-classrooms-heading">
          <div className="card-header">
            <span className="card-icon-wrap" aria-hidden="true">
              <School className="card-icon" size={20} />
            </span>
            <div>
              <h2 id="teacher-classrooms-heading">Your classrooms</h2>
              <p className="muted card-sub">
                {classrooms.length} classroom{classrooms.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="card-loading" role="status" aria-label="Loading classrooms">
              <div className="loading-spinner-sm" aria-hidden="true" />
              <span className="muted">Loading classrooms…</span>
            </div>
          ) : classrooms.length === 0 ? (
            <div className="empty-state">
              <BookOpen className="empty-icon" size={36} aria-hidden="true" />
              <p>No classrooms yet.</p>
              <p className="muted">Create one using the form on the left to start inviting students.</p>
            </div>
          ) : (
            <ul className="classroom-list" aria-label="Teacher classrooms">
              {classrooms.map((room) => (
                <li key={room.class_id} className="classroom-list-item">
                  <div className="classroom-info">
                    <span className="classroom-name">{room.name}</span>
                    <span className="classroom-id muted">ID: {room.class_id}</span>
                  </div>
                  <Link
                    to={`/classrooms/${room.class_id}`}
                    className="ghost btn-sm"
                    aria-label={`Open classroom ${room.name}`}
                  >
                    Open <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

export default TeacherDashboard
