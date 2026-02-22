import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from './apiClient'

function StudentDashboard({ accessToken, setAccessToken }) {
  const [classrooms, setClassrooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchEnrolledClassrooms = async () => {
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

    fetchEnrolledClassrooms()
  }, [accessToken])

  return (
    <section className="card">
      <h2>Student portal</h2>
      <p className="muted">Students cannot create classrooms.</p>
      <h3>Your invited classrooms</h3>
      {loading ? (
        <p>Loading classrooms…</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : classrooms.length === 0 ? (
        <p className="muted">No invited classrooms yet.</p>
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
  )
}

export default StudentDashboard
