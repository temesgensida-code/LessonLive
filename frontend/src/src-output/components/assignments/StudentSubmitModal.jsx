import { useState } from 'react'
import { X, Upload, Send, FileCheck } from 'lucide-react'
import { apiFetch, API_BASE } from '../apiClient'

export default function StudentSubmitModal({ classId, assignment, accessToken, setAccessToken, isOpen, onClose, onSubmitted }) {
  const [textResponse, setTextResponse] = useState(assignment?.my_submission?.text_response || '')
  const [submissionFile, setSubmissionFile] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  if (!isOpen || !assignment) return null

  const isLate = assignment.is_past_due

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!textResponse.trim() && !submissionFile) {
      setError('Please provide a written response or choose a file to submit.')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      let res
      if (submissionFile) {
        const formData = new FormData()
        if (textResponse.trim()) {
          formData.append('text_response', textResponse.trim())
        }
        formData.append('submission_file', submissionFile)

        const authHeaders = accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
        const response = await fetch(`${API_BASE}/classrooms/${classId}/assignments/${assignment.id}/submit/`, {
          method: 'POST',
          headers: authHeaders,
          body: formData,
        })
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.detail || 'Submission failed')
        }
        res = await response.json()
      } else {
        res = await apiFetch(
          `/classrooms/${classId}/assignments/${assignment.id}/submit/`,
          {
            method: 'POST',
            body: JSON.stringify({ text_response: textResponse.trim() }),
          },
          { accessToken, setAccessToken }
        )
      }

      if (onSubmitted) {
        onSubmitted(res)
      }
      onClose()
    } catch (err) {
      setError(err.message || 'Submission failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="assignment-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="submit-asg-title">
      <div className="assignment-modal">
        <div className="assignment-modal-header">
          <div>
            <h4 id="submit-asg-title">Submit: {assignment.title}</h4>
            {isLate && (
              <span style={{ fontSize: '0.75rem', color: '#fbbf24' }}>
                ⚠️ Notice: This assignment is past due. Your submission will be marked as Late.
              </span>
            )}
          </div>
          <button type="button" className="ghost" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="assignment-modal-body">
            {error && <div className="error-alert" role="alert">{error}</div>}

            {assignment.instructions && (
              <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                <strong style={{ color: '#94a3b8' }}>Prompt:</strong>
                <p style={{ margin: '0.25rem 0 0 0', whiteSpace: 'pre-wrap' }}>{assignment.instructions}</p>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="student-response">Your Response / Notes</label>
              <textarea
                id="student-response"
                rows={5}
                placeholder="Type your response, links, or submission explanation here..."
                value={textResponse}
                onChange={(e) => setTextResponse(e.target.value)}
                className="courseware-search-input"
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="student-file">Attach Work File (PDF, DOCX, Code, Images - up to 25MB)</label>
              <input
                id="student-file"
                type="file"
                onChange={(e) => setSubmissionFile(e.target.files[0] || null)}
                className="courseware-search-input"
              />
              {assignment.my_submission?.submission_file_name && !submissionFile && (
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                  Previously uploaded: {assignment.my_submission.submission_file_name}
                </span>
              )}
            </div>
          </div>

          <div className="assignment-modal-footer">
            <button type="button" className="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="button primary" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Turn In Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
