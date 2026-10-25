import { useState, useEffect } from 'react'
import { X, Award, MessageSquare, Download, CheckCircle, Clock } from 'lucide-react'
import { apiFetch } from '../apiClient'
import AssignmentStatusBadge from './AssignmentStatusBadge'

export default function TeacherGradingModal({ classId, assignment, accessToken, setAccessToken, isOpen, onClose, onGraded }) {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [scores, setScores] = useState({})
  const [feedbacks, setFeedbacks] = useState({})
  const [savingId, setSavingId] = useState(null)
  const [saveSuccessId, setSaveSuccessId] = useState(null)

  useEffect(() => {
    if (!isOpen || !assignment) return
    let active = true

    const fetchSubmissions = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await apiFetch(
          `/classrooms/${classId}/assignments/${assignment.id}/submissions/`,
          {},
          { accessToken, setAccessToken }
        )
        if (active) {
          const subs = data?.submissions || []
          setSubmissions(subs)
          const initialScores = {}
          const initialFeedbacks = {}
          subs.forEach((s) => {
            initialScores[s.id] = s.score !== null ? String(s.score) : ''
            initialFeedbacks[s.id] = s.feedback || ''
          })
          setScores(initialScores)
          setFeedbacks(initialFeedbacks)
        }
      } catch (err) {
        if (active) setError(err.message || 'Failed to load submissions')
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchSubmissions()
    return () => { active = false }
  }, [classId, assignment, isOpen, accessToken, setAccessToken])

  if (!isOpen || !assignment) return null

  const handleGradeSubmit = async (subId) => {
    const rawScore = scores[subId]
    if (rawScore === '' || rawScore === undefined) {
      alert('Please enter a score')
      return
    }

    const numScore = Number(rawScore)
    if (isNaN(numScore) || numScore < 0 || numScore > assignment.max_points) {
      alert(`Score must be a number between 0 and ${assignment.max_points}`)
      return
    }

    try {
      setSavingId(subId)
      const updated = await apiFetch(
        `/classrooms/${classId}/assignments/${assignment.id}/submissions/${subId}/grade/`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            score: numScore,
            feedback: feedbacks[subId] || '',
          }),
        },
        { accessToken, setAccessToken }
      )

      setSubmissions((prev) =>
        prev.map((s) => (s.id === subId ? { ...s, ...updated } : s))
      )
      setSaveSuccessId(subId)
      setTimeout(() => setSaveSuccessId(null), 2500)

      if (onGraded) {
        onGraded(updated)
      }
    } catch (err) {
      alert(err.message || 'Failed to save grade')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="assignment-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="grading-modal-title">
      <div className="assignment-modal" style={{ maxWidth: '720px' }}>
        <div className="assignment-modal-header">
          <div>
            <h4 id="grading-modal-title">Submissions: {assignment.title}</h4>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Max Points: {assignment.max_points} · {submissions.length} Total Submissions
            </span>
          </div>
          <button type="button" className="ghost" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <div className="assignment-modal-body">
          {error && <div className="error-alert" role="alert">{error}</div>}

          {loading ? (
            <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem 0' }}>Loading student submissions...</p>
          ) : submissions.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem 0' }}>
              No students have submitted this assignment yet.
            </p>
          ) : (
            submissions.map((sub) => (
              <div key={sub.id} className="submission-item-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ color: '#f8fafc', fontSize: '0.95rem' }}>{sub.student_name}</strong>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {sub.student_email} · Submitted: {sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                  <AssignmentStatusBadge status={sub.status} score={sub.score} maxPoints={assignment.max_points} />
                </div>

                {sub.text_response && (
                  <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '0.6rem 0.8rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Student Response:</div>
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#e2e8f0' }}>{sub.text_response}</p>
                  </div>
                )}

                {sub.submission_file_url && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                    <Download size={14} color="#60a5fa" />
                    <a
                      href={sub.submission_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#60a5fa', textDecoration: 'underline' }}
                    >
                      Download {sub.submission_file_name || 'Attached File'}
                    </a>
                  </div>
                )}

                <div className="submission-grading-form">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <label htmlFor={`score-${sub.id}`} style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                        Score:
                      </label>
                      <input
                        id={`score-${sub.id}`}
                        type="number"
                        min="0"
                        max={assignment.max_points}
                        value={scores[sub.id] || ''}
                        onChange={(e) => setScores({ ...scores, [sub.id]: e.target.value })}
                        style={{ width: '70px', padding: '0.3rem 0.5rem', borderRadius: '4px', border: '1px solid #475569', background: '#0f172a', color: '#fff', fontSize: '0.85rem' }}
                      />
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>/ {assignment.max_points}</span>
                    </div>

                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <input
                        type="text"
                        placeholder="Private feedback to student..."
                        value={feedbacks[sub.id] || ''}
                        onChange={(e) => setFeedbacks({ ...feedbacks, [sub.id]: e.target.value })}
                        style={{ width: '100%', padding: '0.3rem 0.5rem', borderRadius: '4px', border: '1px solid #475569', background: '#0f172a', color: '#fff', fontSize: '0.85rem' }}
                      />
                    </div>

                    <button
                      type="button"
                      className="button primary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      disabled={savingId === sub.id}
                      onClick={() => handleGradeSubmit(sub.id)}
                    >
                      {savingId === sub.id ? 'Saving...' : saveSuccessId === sub.id ? 'Saved!' : 'Grade'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="assignment-modal-footer">
          <button type="button" className="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
