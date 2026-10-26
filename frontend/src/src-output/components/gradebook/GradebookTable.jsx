import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import StudentRiskBadge from './StudentRiskBadge'

export default function GradebookTable({ columns = [], students = [], sortField = 'name', sortDirection = 'asc', onSort }) {
  const getSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown size={12} style={{ opacity: 0.4, marginLeft: '0.35rem' }} />
    }
    return sortDirection === 'asc' ? (
      <ArrowUp size={12} style={{ color: '#38bdf8', marginLeft: '0.35rem' }} />
    ) : (
      <ArrowDown size={12} style={{ color: '#38bdf8', marginLeft: '0.35rem' }} />
    )
  }

  const getGradeClass = (letter) => {
    switch ((letter || '').toUpperCase()) {
      case 'A': return 'a'
      case 'B': return 'b'
      case 'C': return 'c'
      case 'D': return 'd'
      default: return 'f'
    }
  }

  return (
    <div className="gradebook-table-container">
      <table className="gradebook-table" aria-label="Classroom Gradebook">
        <thead>
          <tr>
            <th onClick={() => onSort('name')} scope="col" className="gradebook-sticky-col">
              Student {getSortIcon('name')}
            </th>
            <th onClick={() => onSort('attendance_rate')} scope="col">
              Attendance {getSortIcon('attendance_rate')}
            </th>
            <th onClick={() => onSort('quiz_average')} scope="col">
              Quiz Avg {getSortIcon('quiz_average')}
            </th>
            {columns.filter((c) => c.type === 'points').map((c) => (
              <th key={c.key} scope="col">
                {c.label} ({c.max_points} pts)
              </th>
            ))}
            <th onClick={() => onSort('overall_percentage')} scope="col">
              Overall Grade {getSortIcon('overall_percentage')}
            </th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {students.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 3} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                No student records found matching your filters.
              </td>
            </tr>
          ) : (
            students.map((student) => (
              <tr key={student.student_id}>
                <td className="gradebook-sticky-col">
                  <div style={{ fontWeight: 600, color: '#f8fafc' }}>{student.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{student.email}</div>
                </td>
                <td>{student.attendance_rate}%</td>
                <td>
                  {student.quizzes_taken > 0 ? `${student.quiz_average}%` : <span style={{ color: '#64748b' }}>None</span>}
                </td>

                {/* Assignment columns */}
                {columns.filter((c) => c.type === 'points').map((c) => {
                  const asg = student.assignments?.[c.key]
                  if (!asg) {
                    return <td key={c.key} style={{ color: '#64748b' }}>—</td>
                  }
                  if (asg.score !== null && asg.score !== undefined) {
                    return (
                      <td key={c.key} style={{ fontWeight: 600, color: '#e2e8f0' }}>
                        {asg.score}
                      </td>
                    )
                  }
                  return (
                    <td key={c.key}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          textTransform: 'capitalize',
                          color: asg.status === 'missing' ? '#f87171' : '#fbbf24',
                        }}
                      >
                        {asg.status}
                      </span>
                    </td>
                  )
                })}

                <td>
                  <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{student.overall_percentage}%</span>
                    <span className={`grade-letter ${getGradeClass(student.letter_grade)}`}>
                      {student.letter_grade}
                    </span>
                  </div>
                </td>

                <td>
                  <StudentRiskBadge isAtRisk={student.is_at_risk} reasons={student.risk_reasons} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
