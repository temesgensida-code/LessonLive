import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import AttendanceDashboard from '../src-output/components/classroom-components/AttendanceDashboard'
import * as apiClient from '../src-output/components/apiClient'

describe('AttendanceDashboard component', () => {
  const sampleData = {
    summary: {
      total_enrolled: 25,
      total_attended: 20,
      active_now: 15,
      attendance_rate: 80,
      avg_duration_minutes: 42,
    },
    students: [
      {
        student_id: 1,
        full_name: 'Alice Johnson',
        email: 'alice@example.com',
        username: 'alice',
        status: 'Active Now',
        joined_at: '2025-01-01T10:00:00Z',
        left_at: null,
        total_duration_minutes: 45,
        joined_topic: 'Intro to Cells',
        engagement: 'High',
      },
      {
        student_id: 2,
        full_name: 'Bob Smith',
        email: 'bob@example.com',
        username: 'bob',
        status: 'Left',
        joined_at: '2025-01-01T10:05:00Z',
        left_at: '2025-01-01T10:20:00Z',
        total_duration_minutes: 15,
        joined_topic: 'Intro to Cells',
        engagement: 'Moderate',
      },
    ],
    sessions: [
      { id: 'sess-1', title: 'Morning Lecture' },
    ],
  }

  it('renders modal with role="dialog" and table headers with scope="col"', async () => {
    vi.spyOn(apiClient, 'apiFetch').mockResolvedValue(sampleData)

    render(
      <AttendanceDashboard
        classId="class-123"
        accessToken="test-token"
        setAccessToken={vi.fn()}
        onClose={vi.fn()}
      />
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveAttribute('aria-modal', 'true')

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
      expect(screen.getByText('Bob Smith')).toBeInTheDocument()
    })

    const headers = screen.getAllByRole('columnheader')
    expect(headers.length).toBe(7)
    headers.forEach((th) => {
      expect(th).toHaveAttribute('scope', 'col')
    })
  })

  it('closes when Escape key is pressed', async () => {
    vi.spyOn(apiClient, 'apiFetch').mockResolvedValue(sampleData)
    const handleClose = vi.fn()

    render(
      <AttendanceDashboard
        classId="class-123"
        accessToken="test-token"
        setAccessToken={vi.fn()}
        onClose={handleClose}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    })

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(handleClose).toHaveBeenCalledTimes(1)
  })
})
