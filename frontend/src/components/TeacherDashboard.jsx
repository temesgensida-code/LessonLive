import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiFetch } from './apiClient'

function TeacherDashboard({ refreshMe, accessToken, setAccessToken }) {
  const [classrooms, setClassrooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [className, setClassName] = useState('')
  const [error, setError] = useState('')
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

  const handleCreate = async (event) => {
    event.preventDefault()
    setError('')
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
    }
  }

  return (
    <div className="stack">
      <section className="card">
        <h2>Create a classroom</h2>
        <form className="form" onSubmit={handleCreate}>
          <label>
            Class name
            <input value={className} onChange={(event) => setClassName(event.target.value)} required />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="primary">Create classroom</button>
        </form>
      </section>

      <section className="card">
        <h2>Your classrooms</h2>
        {loading ? (
          <p>Loading classrooms…</p>
        ) : classrooms.length === 0 ? (
          <p>No classrooms yet. Create one to start inviting students.</p>
        ) : (
          <ul className="list">
            {classrooms.map((room) => (
              <li key={room.class_id}>
                <Link to={`/classrooms/${room.class_id}`}>{room.name}</Link>
                <span className="muted">{room.class_id}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default TeacherDashboard
