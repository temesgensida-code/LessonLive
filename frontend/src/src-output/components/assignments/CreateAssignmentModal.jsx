import { useState } from 'react'
import { X, Upload, Calendar, Award, FileText } from 'lucide-react'
import { apiFetch, API_BASE } from '../apiClient'

export default function CreateAssignmentModal({ classId, accessToken, setAccessToken, isOpen, onClose, onCreated }) {
  const [title, setTitle] = useState('')
  const [instructions, setInstructions] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [maxPoints, setMaxPoints] = useState(100)
  const [attachment, setAttachment] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !dueDate) {
      setError('Please provide both title and due date')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      let res
      if (attachment) {
        const formData = new FormData()
        formData.append('title', title.trim())
        formData.append('instructions', instructions.trim())
        formData.append('due_date', new Date(dueDate).toISOString())
        formData.append('max_points', maxPoints)
        formData.append('attachment', attachment)

        const authHeaders = accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
        const response = await fetch(`${API_BASE}/classrooms/${classId}/assignments/`, {
          method: 'POST',
          headers: authHeaders,
          body: formData,
        })
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.detail || 'Failed to create assignment')
        }
        res = await response.json()
      } else {
        res = await apiFetch(
          `/classrooms/${classId}/assignments/`,
          {
            method: 'POST',
            body: JSON.stringify({
              title: title.trim(),
              instructions: instructions.trim(),
              due_date: new Date(dueDate).toISOString(),
              max_points: Number(maxPoints) || 100,
            }),
          },
          { accessToken, setAccessToken }
        )
      }

      if (onCreated) {
        onCreated(res)
      }
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to create assignment')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="assignment-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="create-asg-title">
      <div className="assignment-modal">
        <div className="assignment-modal-header">
          <h4 id="create-asg-title">Create New Assignment</h4>
          <button type="button" className="ghost" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="assignment-modal-body">
            {error && <div className="error-alert" role="alert">{error}</div>}

            <div className="form-group">
              <label htmlFor="asg-title">Assignment Title *</label>
              <input
                id="asg-title"
                type="text"
                placeholder="e.g. Chapter 4 Lab Report"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="courseware-search-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="asg-instructions">Instructions &amp; Prompt</label>
              <textarea
                id="asg-instructions"
                rows={4}
                placeholder="Enter prompt, submission requirements, or rubric..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="courseware-search-input"
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label htmlFor="asg-due-date">Due Date &amp; Time *</label>
                <input
                  id="asg-due-date"
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                  className="courseware-search-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="asg-points">Maximum Points</label>
                <input
                  id="asg-points"
                  type="number"
                  min="1"
                  max="1000"
                  value={maxPoints}
                  onChange={(e) => setMaxPoints(e.target.value)}
                  className="courseware-search-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="asg-attachment">Optional Attachment (Prompt / Worksheet PDF)</label>
              <input
                id="asg-attachment"
                type="file"
                onChange={(e) => setAttachment(e.target.files[0] || null)}
                className="courseware-search-input"
              />
            </div>
          </div>

          <div className="assignment-modal-footer">
            <button type="button" className="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="button primary" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
