import React, { useState, useEffect } from 'react'
import { apiFetch, API_BASE } from '../apiClient'

export default function AttendanceDashboard({ classId, accessToken, setAccessToken, onClose }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState({
    total_enrolled: 0,
    total_attended: 0,
    active_now: 0,
    attendance_rate: 0,
    avg_duration_minutes: 0,
  })
  const [students, setStudents] = useState([])
  const [sessions, setSessions] = useState([])
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchAttendance()
  }, [selectedSessionId])

  const fetchAttendance = async () => {
    try {
      setLoading(true)
      setError('')
      const query = selectedSessionId ? `?session_id=${selectedSessionId}` : ''
      const data = await apiFetch(`/classrooms/${classId}/attendance/${query}`, {}, { accessToken, setAccessToken })
      setSummary(data.summary || {})
      setStudents(data.students || [])
      setSessions(data.sessions || [])
    } catch (err) {
      setError(err.message || 'Failed to load attendance data')
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    const exportUrl = `${API_BASE}/classrooms/${classId}/attendance/export/`
    const link = document.createElement('a')
    link.href = exportUrl
    link.setAttribute('download', `attendance_${classId}.csv`)
    // Pass bearer token in query parameter if credentials needed or rely on cookie / new window
    window.open(exportUrl, '_blank')
  }

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      (s.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.username || '').toLowerCase().includes(searchQuery.toLowerCase())

    let matchesStatus = true
    if (statusFilter === 'active') matchesStatus = s.status === 'Active Now'
    else if (statusFilter === 'left') matchesStatus = s.status === 'Left'
    else if (statusFilter === 'absent') matchesStatus = s.status === 'Absent'

    return matchesSearch && matchesStatus
  })

  const getEngagementBadge = (engagement) => {
    switch (engagement) {
      case 'High':
        return <span className="badge badge-high">🔥 High ({'>'}15m)</span>
      case 'Moderate':
        return <span className="badge badge-moderate">⚡ Moderate</span>
      case 'Low':
        return <span className="badge badge-low">⚠️ Low ({'<'}5m)</span>
      default:
        return <span className="badge badge-none">❌ Absent</span>
    }
  }

  const getStatusBadge = (status) => {
    if (status === 'Active Now') {
      return (
        <span className="status-badge status-active">
          <span className="pulse-dot"></span> Active Now
        </span>
      )
    }
    if (status === 'Left') {
      return <span className="status-badge status-left">Left Session</span>
    }
    return <span className="status-badge status-absent">Absent</span>
  }

  const formatTime = (isoString) => {
    if (!isoString) return '-'
    const d = new Date(isoString)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="attendance-modal-backdrop" onClick={onClose}>
      <div className="attendance-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="title-group">
            <div className="header-icon-box">📊</div>
            <div>
              <h2>Classroom Attendance & Insights</h2>
              <p className="subtitle">Real-time student stay duration and participation stats</p>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn-export" onClick={handleExportCSV}>
              📥 Export CSV
            </button>
            <button className="btn-close" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="modal-body">
          {error && <div className="error-alert">⚠️ {error}</div>}

          {/* Metric Cards Grid */}
          <div className="metrics-grid">
            <div className="metric-card card-enrolled">
              <span className="metric-icon">👥</span>
              <div className="metric-info">
                <span className="metric-value">{summary.total_enrolled}</span>
                <span className="metric-label">Enrolled Students</span>
              </div>
            </div>

            <div className="metric-card card-attended">
              <span className="metric-icon">✅</span>
              <div className="metric-info">
                <span className="metric-value">
                  {summary.total_attended} <small>({summary.attendance_rate}%)</small>
                </span>
                <span className="metric-label">Attended Classroom</span>
              </div>
            </div>

            <div className="metric-card card-active">
              <span className="metric-icon">⚡</span>
              <div className="metric-info">
                <span className="metric-value live-count">
                  {summary.active_now} <span className="live-pill">LIVE</span>
                </span>
                <span className="metric-label">Currently Active</span>
              </div>
            </div>

            <div className="metric-card card-duration">
              <span className="metric-icon">⏱️</span>
              <div className="metric-info">
                <span className="metric-value">{summary.avg_duration_minutes} <small>mins</small></span>
                <span className="metric-label">Avg. Stay Duration</span>
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="controls-bar">
            <div className="search-box">
              <span>🔍</span>
              <input
                type="text"
                placeholder="Search by student name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="filter-group">
              <select
                className="select-filter"
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
              >
                <option value="">All Sessions Summary</option>
                {sessions.map((sess) => (
                  <option key={sess.id} value={sess.id}>
                    {sess.title}
                  </option>
                ))}
              </select>

              <select
                className="select-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Now</option>
                <option value="left">Left Session</option>
                <option value="absent">Absent</option>
              </select>
            </div>
          </div>

          {/* Attendance Table */}
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <span>Gathering live classroom insights...</span>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Status</th>
                    <th>Join Time</th>
                    <th>Leave Time</th>
                    <th>Stay Duration</th>
                    <th>Topic Joined</th>
                    <th>Engagement</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="empty-row">
                        No student records match your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((st) => (
                      <tr key={st.student_id} className={st.status === 'Active Now' ? 'row-active' : ''}>
                        <td className="student-cell">
                          <div className="avatar">{st.full_name?.charAt(0).toUpperCase() || 'S'}</div>
                          <div className="student-names">
                            <span className="student-name">{st.full_name}</span>
                            <span className="student-email">{st.email}</span>
                          </div>
                        </td>
                        <td>{getStatusBadge(st.status)}</td>
                        <td>{formatTime(st.joined_at)}</td>
                        <td>{st.status === 'Active Now' ? 'Ongoing' : formatTime(st.left_at)}</td>
                        <td className="duration-cell">
                          <div className="duration-text">
                            <strong>{st.total_duration_minutes}</strong> mins
                          </div>
                          <div className="duration-bar-bg">
                            <div
                              className="duration-bar-fill"
                              style={{
                                width: `${Math.min(100, (st.total_duration_minutes / 30) * 100)}%`,
                              }}
                            ></div>
                          </div>
                        </td>
                        <td className="topic-cell">{st.joined_topic}</td>
                        <td>{getEngagementBadge(st.engagement)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
