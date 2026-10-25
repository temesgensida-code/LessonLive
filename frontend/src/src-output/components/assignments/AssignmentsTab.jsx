import { useState, useEffect, useCallback } from 'react'
import { Plus, Calendar, Award, Trash2, CheckCircle, FileText, Send, Users } from 'lucide-react'
import { apiFetch } from '../apiClient'
import AssignmentStatusBadge from './AssignmentStatusBadge'
import CreateAssignmentModal from './CreateAssignmentModal'
import StudentSubmitModal from './StudentSubmitModal'
import TeacherGradingModal from './TeacherGradingModal'
import './assignment.css'

export default function AssignmentsTab({ classId, owned, accessToken, setAccessToken }) {
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [activeSubmitAsg, setActiveSubmitAsg] = useState(null)
  const [activeGradeAsg, setActiveGradeAsg] = useState(null)

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiFetch(
        `/classrooms/${classId}/assignments/`,
        {},
        { accessToken, setAccessToken }
      )
      setAssignments(data?.assignments || [])
    } catch (err) {
      setError(err.message || 'Failed to load assignments')
    } finally {
      setLoading(false)
    }
  }, [classId, accessToken, setAccessToken])

  useEffect(() => {
    fetchAssignments()
  }, [fetchAssignments])

  const handleDelete = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to delete this assignment?')) return
    try {
      await apiFetch(
        `/classrooms/${classId}/assignments/${assignmentId}/`,
        { method: 'DELETE' },
        { accessToken, setAccessToken }
      )
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId))
    } catch (err) {
      alert(err.message || 'Failed to delete assignment')
    }
  }

  return (
    <div className="assignments-container">
      <div className="assignments-header">
        <div className="assignments-title-group">
          <FileText size={20} color="#38bdf8" />
          <h3>Classroom Assignments</h3>
        </div>

        {owned && (
          <button
            type="button"
            className="button primary"
            onClick={() => setIsCreateOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            <Plus size={16} /> Create Assignment
          </button>
        )}
      </div>

      {error && <div className="error-alert" role="alert">{error}</div>}

      {loading ? (
        <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem 0' }}>Loading assignments...</p>
      ) : assignments.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem 1rem', border: '1px dashed #334155', borderRadius: '8px' }}>
          <FileText size={36} style={{ margin: '0 auto 0.75rem auto', opacity: 0.6 }} />
          <h4 style={{ margin: 0, color: '#f8fafc' }}>No Assignments Posted Yet</h4>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>
            {owned ? 'Click "Create Assignment" to create homework, lab reports, or problem sets.' : 'Check back later when your teacher posts coursework.'}
          </p>
        </div>
      ) : (
        <div className="assignments-list">
          {assignments.map((asg) => {
            const dueDateFormatted = new Date(asg.due_date).toLocaleString()
            const myStatus = asg.my_status || 'pending'
            const myScore = asg.my_submission?.score ?? null

            return (
              <div key={asg.id} className="assignment-card">
                <div className="assignment-card-header">
                  <div>
                    <h4 className="assignment-title">{asg.title}</h4>
                    {asg.instructions && (
                      <p className="assignment-instructions">{asg.instructions}</p>
                    )}
                  </div>

                  {!owned ? (
                    <AssignmentStatusBadge status={myStatus} score={myScore} maxPoints={asg.max_points} />
                  ) : (
                    <span className="assignment-badge submitted">
                      <Users size={12} /> {asg.submissions_count} submitted
                    </span>
                  )}
                </div>

                <div className="assignment-meta-row">
                  <div className="assignment-meta-item">
                    <Calendar size={14} /> Due: {dueDateFormatted}
                  </div>
                  <div className="assignment-meta-item">
                    <Award size={14} /> Max Points: {asg.max_points}
                  </div>
                  {asg.attachment_url && (
                    <div className="assignment-meta-item">
                      <a
                        href={asg.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#60a5fa', textDecoration: 'underline' }}
                      >
                        Attachment: {asg.attachment_name || 'Prompt File'}
                      </a>
                    </div>
                  )}
                </div>

                {/* Student Submission / Feedback View */}
                {!owned && asg.my_submission && asg.my_submission.feedback && (
                  <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.25)', padding: '0.6rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                    <strong style={{ color: '#4ade80' }}>Teacher Feedback:</strong>
                    <p style={{ margin: '0.2rem 0 0 0', color: '#e2e8f0' }}>{asg.my_submission.feedback}</p>
                  </div>
                )}

                <div className="assignment-actions">
                  {owned ? (
                    <>
                      <button
                        type="button"
                        className="button"
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        onClick={() => setActiveGradeAsg(asg)}
                      >
                        <Users size={14} /> View Submissions ({asg.submissions_count})
                      </button>
                      <button
                        type="button"
                        className="ghost"
                        style={{ color: '#f87171', padding: '0.35rem' }}
                        aria-label="Delete assignment"
                        onClick={() => handleDelete(asg.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="button primary"
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                      onClick={() => setActiveSubmitAsg(asg)}
                    >
                      <Send size={14} /> {asg.my_submission ? 'Resubmit Work' : 'Submit Assignment'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      {isCreateOpen && (
        <CreateAssignmentModal
          classId={classId}
          accessToken={accessToken}
          setAccessToken={setAccessToken}
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onCreated={(newAsg) => {
            setAssignments((prev) => [newAsg, ...prev])
          }}
        />
      )}

      {activeSubmitAsg && (
        <StudentSubmitModal
          classId={classId}
          assignment={activeSubmitAsg}
          accessToken={accessToken}
          setAccessToken={setAccessToken}
          isOpen={Boolean(activeSubmitAsg)}
          onClose={() => setActiveSubmitAsg(null)}
          onSubmitted={(sub) => {
            setAssignments((prev) =>
              prev.map((a) => (a.id === activeSubmitAsg.id ? { ...a, my_submission: sub, my_status: sub.status } : a))
            )
          }}
        />
      )}

      {activeGradeAsg && (
        <TeacherGradingModal
          classId={classId}
          assignment={activeGradeAsg}
          accessToken={accessToken}
          setAccessToken={setAccessToken}
          isOpen={Boolean(activeGradeAsg)}
          onClose={() => setActiveGradeAsg(null)}
          onGraded={() => {
            fetchAssignments()
          }}
        />
      )}
    </div>
  )
}
