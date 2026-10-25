import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import GradebookDashboard from '../../src-output/components/gradebook/GradebookDashboard'
import * as apiClient from '../../src-output/components/apiClient'

vi.mock('../../src-output/components/apiClient', () => ({
  API_BASE: 'http://testserver/api',
  apiFetch: vi.fn(),
}))

describe('GradebookDashboard Suite', () => {
  const mockGradebookData = {
    summary: {
      total_students: 2,
      class_average_percent: 74.5,
      attendance_average_percent: 80.0,
      assignment_completion_rate: 85.0,
      at_risk_students_count: 1,
    },
    columns: [
      { key: 'attendance_pct', label: 'Attendance Rate', type: 'percentage' },
      { key: 'quiz_avg_pct', label: 'Quizzes Avg', type: 'percentage' },
      { key: 'assign_1', label: 'HW 1', max_points: 100, type: 'points' },
      { key: 'overall_pct', label: 'Overall Grade', type: 'percentage' },
    ],
    students: [
      {
        student_id: 1,
        name: 'Alice Johnson',
        email: 'alice@school.edu',
        attendance_rate: 95.0,
        quizzes_taken: 3,
        quiz_average: 92.0,
        assignments: {
          assign_1: { score: 98, status: 'graded' },
        },
        overall_percentage: 94.0,
        letter_grade: 'A',
        is_at_risk: false,
        risk_reasons: [],
      },
      {
        student_id: 2,
        name: 'Bob Miller',
        email: 'bob@school.edu',
        attendance_rate: 45.0,
        quizzes_taken: 1,
        quiz_average: 50.0,
        assignments: {
          assign_1: { score: 40, status: 'graded' },
        },
        overall_percentage: 46.5,
        letter_grade: 'F',
        is_at_risk: true,
        risk_reasons: ['Attendance below 60%', 'Overall score below 60%'],
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    apiClient.apiFetch.mockResolvedValue(mockGradebookData)
  })

  it('TC-UI-GB-01: renders summary cards with class metrics', async () => {
    render(
      <GradebookDashboard
        classId="bio101"
        accessToken="dummy-token"
        setAccessToken={vi.fn()}
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Classroom Gradebook & Analytics')).toBeInTheDocument()
      expect(screen.getByText('74.5%')).toBeInTheDocument()
      expect(screen.getByText('Class Average')).toBeInTheDocument()
      expect(screen.getByText('80%')).toBeInTheDocument()
      expect(screen.getByText('Attendance Rate')).toBeInTheDocument()
      expect(screen.getByText('At-Risk Students')).toBeInTheDocument()
    })
  })

  it('TC-UI-GB-02: search input filters student rows by name and email in real time', async () => {
    render(
      <GradebookDashboard
        classId="bio101"
        accessToken="dummy-token"
        setAccessToken={vi.fn()}
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
      expect(screen.getByText('Bob Miller')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/Search students by name or email/i)
    fireEvent.change(searchInput, { target: { value: 'bob' } })

    expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument()
    expect(screen.getByText('Bob Miller')).toBeInTheDocument()
  })

  it('TC-UI-GB-03: sorting by Overall Grade column toggles sorting order', async () => {
    render(
      <GradebookDashboard
        classId="bio101"
        accessToken="dummy-token"
        setAccessToken={vi.fn()}
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    })

    const overallHeader = screen.getByText(/Overall Grade/i)
    // Click to sort by overall_percentage ascending
    fireEvent.click(overallHeader)

    const rows = screen.getAllByRole('row')
    // bob (46.5%) should come before alice (94.0%)
    expect(rows[1]).toHaveTextContent('Bob Miller')
    expect(rows[2]).toHaveTextContent('Alice Johnson')

    // Click again to toggle descending
    fireEvent.click(overallHeader)
    const rowsDesc = screen.getAllByRole('row')
    expect(rowsDesc[1]).toHaveTextContent('Alice Johnson')
    expect(rowsDesc[2]).toHaveTextContent('Bob Miller')
  })

  it('TC-UI-GB-04: at-risk students render with descriptive warning badge and tooltip', async () => {
    render(
      <GradebookDashboard
        classId="bio101"
        accessToken="dummy-token"
        setAccessToken={vi.fn()}
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    await waitFor(() => {
      const riskBadges = screen.getAllByText('At Risk')
      expect(riskBadges.length).toBeGreaterThan(0)
      const riskElement = screen.getByLabelText(/Attendance below 60%/i)
      expect(riskElement).toBeInTheDocument()
      expect(riskElement).toHaveAttribute('title', expect.stringContaining('Attendance below 60%'))
    })
  })

  it('TC-UI-GB-05: clicking Export to CSV triggers file fetch and download', async () => {
    const mockBlob = new Blob(['Student ID,Student Name\n1,Alice'], { type: 'text/csv' })
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    })
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url')
    window.URL.revokeObjectURL = vi.fn()

    render(
      <GradebookDashboard
        classId="bio101"
        accessToken="dummy-token"
        setAccessToken={vi.fn()}
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Export to CSV/i })).toBeInTheDocument()
    })

    const exportBtn = screen.getByRole('button', { name: /Export to CSV/i })
    fireEvent.click(exportBtn)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/classrooms/bio101/gradebook/export/'),
        expect.any(Object)
      )
    })
  })
})
