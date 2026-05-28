import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from './apiClient'

function StudentDashboard({ accessToken, setAccessToken }) {
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
    <section className="card">
      <h2>Student portal</h2>
      <p className="muted" style={{ marginBottom: 'var(--space-5)' }}>
        Join classrooms via invite links shared by your teacher.
      </p>
      <h3>Your classrooms</h3>
      {loading ? (
        <p className="muted">Loading classrooms…</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : classrooms.length === 0 ? (
        <p className="muted">No classrooms yet — ask your teacher for an invite link.</p>
      ) : (
        <ul className="list">
          {classrooms.map((room) => (
            <li key={room.class_id}>
              <Link to={`/classrooms/${room.class_id}`} style={{ fontWeight: 600, color: 'var(--text-link)' }}>
                {room.name}
              </Link>
              <span className="muted">{room.class_id}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default StudentDashboard
