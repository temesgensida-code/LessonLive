import { Clock, CheckCircle2, AlertCircle, FileCheck, XCircle } from 'lucide-react'

export default function AssignmentStatusBadge({ status = 'pending', score = null, maxPoints = 100 }) {
  const normStatus = (status || 'pending').toLowerCase()

  if (normStatus === 'graded' && score !== null) {
    const pct = Math.round((Number(score) / (maxPoints || 100)) * 100)
    return (
      <span className="assignment-badge graded" aria-label={`Status: Graded ${pct}%`}>
        <CheckCircle2 size={13} aria-hidden="true" />
        Graded ({pct}%)
      </span>
    )
  }

  switch (normStatus) {
    case 'graded':
      return (
        <span className="assignment-badge graded" aria-label="Status: Graded">
          <CheckCircle2 size={13} aria-hidden="true" />
          Graded
        </span>
      )
    case 'submitted':
      return (
        <span className="assignment-badge submitted" aria-label="Status: Submitted">
          <FileCheck size={13} aria-hidden="true" />
          Submitted
        </span>
      )
    case 'late':
      return (
        <span className="assignment-badge late" aria-label="Status: Submitted Late">
          <Clock size={13} aria-hidden="true" />
          Late
        </span>
      )
    case 'missing':
      return (
        <span className="assignment-badge missing" aria-label="Status: Missing">
          <XCircle size={13} aria-hidden="true" />
          Missing
        </span>
      )
    case 'pending':
    default:
      return (
        <span className="assignment-badge pending" aria-label="Status: Pending">
          <AlertCircle size={13} aria-hidden="true" />
          Pending
        </span>
      )
  }
}
