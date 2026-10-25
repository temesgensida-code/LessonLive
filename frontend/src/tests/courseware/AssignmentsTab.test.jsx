import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AssignmentsTab from '../../src-output/components/assignments/AssignmentsTab'
import * as apiClient from '../../src-output/components/apiClient'

vi.mock('../../src-output/components/apiClient', () => ({
  API_BASE: 'http://testserver/api',
  apiFetch: vi.fn(),
}))

describe('AssignmentsTab Suite', () => {
  const mockAssignments = [
    {
      id: 1,
      title: 'Lab Report 1: Osmosis',
      instructions: 'Submit lab findings and diagrams.',
      due_date: '2026-11-01T12:00:00Z',
      max_points: 100,
      attachment_url: 'http://testserver/media/prompt.pdf',
      attachment_name: 'prompt.pdf',
      is_past_due: false,
      submissions_count: 3,
      my_status: 'pending',
      my_submission: null,
    },
    {
      id: 2,
      title: 'Problem Set 2',
      instructions: 'Solve problems 1-10.',
      due_date: '2026-10-20T12:00:00Z',
      max_points: 50,
      attachment_url: null,
      attachment_name: null,
      is_past_due: true,
      submissions_count: 5,
      my_status: 'graded',
      my_submission: {
        id: 102,
        score: 45,
        status: 'graded',
        feedback: 'Great derivations!',
      },
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    apiClient.apiFetch.mockResolvedValue({ assignments: mockAssignments })
  })

  it('TC-UI-ASG-01: renders assignments list with titles, due dates, and status badges', async () => {
    render(
      <AssignmentsTab
        classId="bio101"
        owned={false}
        accessToken="dummy-token"
        setAccessToken={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Lab Report 1: Osmosis')).toBeInTheDocument()
      expect(screen.getAllByText(/Due:/i).length).toBe(2)
      expect(screen.getByLabelText(/Status: Pending/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Status: Graded 90%/i)).toBeInTheDocument()
    })
  })

  it('TC-UI-ASG-02: student submit button opens submission modal with text response input', async () => {
    render(
      <AssignmentsTab
        classId="bio101"
        owned={false}
        accessToken="dummy-token"
        setAccessToken={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Lab Report 1: Osmosis')).toBeInTheDocument()
    })

    const submitBtns = screen.getAllByRole('button', { name: /Submit Assignment/i })
    fireEvent.click(submitBtns[0])

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/Submit: Lab Report 1: Osmosis/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Your Response \/ Notes/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Attach Work File/i)).toBeInTheDocument()
  })

  it('TC-UI-ASG-03: teacher sees View Submissions button leading to grading view', async () => {
    render(
      <AssignmentsTab
        classId="bio101"
        owned={true}
        accessToken="dummy-token"
        setAccessToken={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Lab Report 1: Osmosis')).toBeInTheDocument()
    })

    const viewSubBtns = screen.getAllByRole('button', { name: /View Submissions/i })
    expect(viewSubBtns.length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /Create Assignment/i })).toBeInTheDocument()
  })

  it('TC-UI-ASG-04: teacher grading modal renders submissions and validates score', async () => {
    apiClient.apiFetch.mockImplementation((url) => {
      if (url.includes('/submissions/')) {
        return Promise.resolve({
          submissions: [
            {
              id: 50,
              student_id: 11,
              student_name: 'Alice Student',
              student_email: 'alice@school.edu',
              text_response: 'Here are my calculated Osmosis values.',
              submission_file_url: null,
              submission_file_name: null,
              submitted_at: '2026-10-24T10:00:00Z',
              status: 'submitted',
              score: null,
              feedback: '',
              is_late: false,
            },
          ],
        })
      }
      return Promise.resolve({ assignments: mockAssignments })
    })

    render(
      <AssignmentsTab
        classId="bio101"
        owned={true}
        accessToken="dummy-token"
        setAccessToken={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Lab Report 1: Osmosis')).toBeInTheDocument()
    })

    const viewSubBtns = screen.getAllByRole('button', { name: /View Submissions/i })
    fireEvent.click(viewSubBtns[0])

    await waitFor(() => {
      expect(screen.getByText('Alice Student')).toBeInTheDocument()
      expect(screen.getByText('Here are my calculated Osmosis values.')).toBeInTheDocument()
    })

    const scoreInput = screen.getByLabelText(/Score:/i)
    fireEvent.change(scoreInput, { target: { value: '98' } })

    const gradeBtn = screen.getByRole('button', { name: /^Grade$/i })
    fireEvent.click(gradeBtn)

    await waitFor(() => {
      expect(apiClient.apiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/submissions/50/grade/'),
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('"score":98'),
        }),
        expect.any(Object)
      )
    })
  })
})
