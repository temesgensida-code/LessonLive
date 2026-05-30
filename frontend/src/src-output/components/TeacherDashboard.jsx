import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiFetch } from './apiClient'

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

  useEffect(() => { fetchClassrooms() }, [])

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
      <section className="dashboard-banner">
        <div className="dashboard-banner-text">
          <h2>Welcome back, Teacher 👋</h2>
          <p className="muted">Manage your classrooms and start live sessions below.</p>
        </div>
      </section>

      <div className="dashboard-grid">
        {/* Create classroom */}
        <section className="card create-card">
          <div className="card-header">
            <span className="card-icon">➕</span>
            <div>
              <h2>New classroom</h2>
              <p className="muted card-sub">Create a new class and invite students</p>
            </div>
          </div>
          <form className="form" onSubmit={handleCreate}>
            <label>
              Class name
              <input
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="e.g. Biology 101"
                required
              />
            </label>
            {error && <p className="error">{error}</p>}
            <button type="submit" className="primary" disabled={creating}>
              {creating ? 'Creating…' : 'Create classroom'}
            </button>
          </form>
        </section>

        {/* Classrooms list */}
        <section className="card classrooms-card">
          <div className="card-header">
            <span className="card-icon">🏫</span>
            <div>
              <h2>Your classrooms</h2>
              <p className="muted card-sub">{classrooms.length} classroom{classrooms.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          {loading ? (
            <div className="card-loading">
              <div className="loading-spinner-sm" />
              <span className="muted">Loading classrooms…</span>
            </div>
          ) : classrooms.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">🏫</span>
              <p>No classrooms yet.</p>
              <p className="muted">Create one above to start inviting students.</p>
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
                    Open →
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
