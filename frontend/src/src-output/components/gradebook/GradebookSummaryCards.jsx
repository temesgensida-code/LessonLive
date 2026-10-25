import { Users, Award, Calendar, AlertTriangle, CheckSquare } from 'lucide-react'

export default function GradebookSummaryCards({ summary = {} }) {
  const {
    total_students = 0,
    class_average_percent = 0,
    attendance_average_percent = 0,
    assignment_completion_rate = 0,
    at_risk_students_count = 0,
  } = summary

  return (
    <div className="gradebook-summary-grid">
      <div className="summary-card">
        <div className="summary-card-icon blue">
          <Users size={22} aria-hidden="true" />
        </div>
        <div>
          <div className="summary-card-value">{total_students}</div>
          <div className="summary-card-label">Enrolled Students</div>
        </div>
      </div>

      <div className="summary-card">
        <div className="summary-card-icon green">
          <Award size={22} aria-hidden="true" />
        </div>
        <div>
          <div className="summary-card-value">{class_average_percent}%</div>
          <div className="summary-card-label">Class Average</div>
        </div>
      </div>

      <div className="summary-card">
        <div className="summary-card-icon purple">
          <Calendar size={22} aria-hidden="true" />
        </div>
        <div>
          <div className="summary-card-value">{attendance_average_percent}%</div>
          <div className="summary-card-label">Attendance Rate</div>
        </div>
      </div>

      <div className="summary-card">
        <div className="summary-card-icon amber">
          <CheckSquare size={22} aria-hidden="true" />
        </div>
        <div>
          <div className="summary-card-value">{assignment_completion_rate}%</div>
          <div className="summary-card-label">Submission Rate</div>
        </div>
      </div>

      <div className="summary-card">
        <div className={`summary-card-icon ${at_risk_students_count > 0 ? 'red' : 'green'}`}>
          <AlertTriangle size={22} aria-hidden="true" />
        </div>
        <div>
          <div className="summary-card-value" style={{ color: at_risk_students_count > 0 ? '#f87171' : '#4ade80' }}>
            {at_risk_students_count}
          </div>
          <div className="summary-card-label">At-Risk Students</div>
        </div>
      </div>
    </div>
  )
}
