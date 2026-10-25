import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ClassroomScheduleBanner from '../../src-output/components/schedule/ClassroomScheduleBanner'
import * as apiClient from '../../src-output/components/apiClient'

vi.mock('../../src-output/components/apiClient', () => ({
  API_BASE: 'http://testserver/api',
  apiFetch: vi.fn(),
}))

describe('ClassroomScheduleBanner Suite', () => {
  const mockScheduleData = {
    next_session: {
      title: 'Calculus I Lecture',
      day_name: 'Monday',
      start_time: '10:00',
      end_time: '11:30',
      timezone: 'America/New_York',
      seconds_until_start: 172800,
      human_relative: 'Monday at 10:00 AM (in 2 days)',
      is_live_now: false,
    },
    schedules: [
      {
        id: 1,
        title: 'Calculus I Lecture',
        day_of_week: 0,
        day_name: 'Monday',
        start_time: '10:00:00',
        end_time: '11:30:00',
        timezone_name: 'America/New_York',
      },
    ],
    calendar_links: {
      google: 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Calculus%20I',
      outlook: 'https://outlook.live.com/calendar/0/deeplink/compose?subject=Calculus%20I',
      ics_download_url: '/classrooms/calc101/schedule/ics/',
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    apiClient.apiFetch.mockResolvedValue(mockScheduleData)
  })

  it('TC-UI-SCHED-01: renders upcoming session with human relative time and day details', async () => {
    render(
      <ClassroomScheduleBanner
        classId="calc101"
        owned={false}
        accessToken="dummy-token"
        setAccessToken={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/Next Session: Monday at 10:00 AM \(in 2 days\)/i)).toBeInTheDocument()
    })

    expect(screen.getByText(/Calculus I Lecture · Mondays 10:00 – 11:30/i)).toBeInTheDocument()
  })

  it('TC-UI-SCHED-02: renders live now state with pulsing badge and calls onGoLive', async () => {
    apiClient.apiFetch.mockResolvedValue({
      ...mockScheduleData,
      next_session: {
        ...mockScheduleData.next_session,
        is_live_now: true,
      },
    })

    const onGoLiveMock = vi.fn()

    render(
      <ClassroomScheduleBanner
        classId="calc101"
        owned={false}
        accessToken="dummy-token"
        setAccessToken={vi.fn()}
        onGoLive={onGoLiveMock}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/Live Lecture in Progress!/i)).toBeInTheDocument()
    })

    const joinBtn = screen.getByRole('button', { name: /Join Now/i })
    expect(joinBtn).toBeInTheDocument()
    fireEvent.click(joinBtn)
    expect(onGoLiveMock).toHaveBeenCalledTimes(1)
  })

  it('TC-UI-SCHED-03: renders calendar dropdown with Google Calendar and Outlook links', async () => {
    render(
      <ClassroomScheduleBanner
        classId="calc101"
        owned={false}
        accessToken="dummy-token"
        setAccessToken={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Add to Calendar options/i })).toBeInTheDocument()
    })

    const dropdownBtn = screen.getByRole('button', { name: /Add to Calendar options/i })
    fireEvent.click(dropdownBtn)

    const googleLink = screen.getByRole('menuitem', { name: /Google Calendar/i })
    expect(googleLink).toHaveAttribute('href', mockScheduleData.calendar_links.google)

    const outlookLink = screen.getByRole('menuitem', { name: /Outlook \/ Office 365/i })
    expect(outlookLink).toHaveAttribute('href', mockScheduleData.calendar_links.outlook)
  })

  it('TC-UI-SCHED-04: teacher can trigger Manage Schedule modal', async () => {
    render(
      <ClassroomScheduleBanner
        classId="calc101"
        owned={true}
        accessToken="dummy-token"
        setAccessToken={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Manage Schedule/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Manage Schedule/i }))

    expect(screen.getByText(/Recurring Lecture Schedule/i)).toBeInTheDocument()
    expect(screen.getByText(/Active Recurring Schedule/i)).toBeInTheDocument()
  })

  it('TC-UI-SCHED-05: renders empty state when no schedules configured', async () => {
    apiClient.apiFetch.mockResolvedValue({
      next_session: null,
      schedules: [],
      calendar_links: {},
    })

    render(
      <ClassroomScheduleBanner
        classId="calc101"
        owned={false}
        accessToken="dummy-token"
        setAccessToken={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/No upcoming lectures scheduled/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/Your teacher has not set a recurring schedule yet\./i)).toBeInTheDocument()
  })
})
