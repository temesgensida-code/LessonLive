import { AlertTriangle, CheckCircle } from 'lucide-react'

export default function StudentRiskBadge({ isAtRisk, reasons = [] }) {
  if (!isAtRisk) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          fontSize: '0.75rem',
          color: '#4ade80',
          background: 'rgba(34, 197, 94, 0.1)',
          padding: '0.15rem 0.5rem',
          borderRadius: '9999px',
        }}
      >
        <CheckCircle size={12} aria-hidden="true" />
        On Track
      </span>
    )
  }

  const tooltipText = reasons.length > 0 ? reasons.join(' • ') : 'Academic intervention suggested'

  return (
    <span
      className="risk-badge"
      title={tooltipText}
      aria-label={`At Risk: ${tooltipText}`}
      role="status"
    >
      <AlertTriangle size={12} aria-hidden="true" />
      At Risk
    </span>
  )
}
