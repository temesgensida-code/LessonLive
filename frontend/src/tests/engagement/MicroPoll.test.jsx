import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import MicroPollLauncherModal from '../../src-output/components/engagement/MicroPollLauncherModal'
import StudentMicroPollToast from '../../src-output/components/engagement/StudentMicroPollToast'
import TeacherMicroPollResults from '../../src-output/components/engagement/TeacherMicroPollResults'
import * as topicHook from '../../src-output/components/engagement/useLiveKitDataTopic'

describe('Quick Micro-Poll Suite', () => {
  let publishMock
  let registeredHandler
  let mockParticipant

  beforeEach(() => {
    vi.clearAllMocks()
    publishMock = vi.fn().mockResolvedValue(true)
    mockParticipant = {
      identity: 'student-999',
      name: 'Emma',
    }

    vi.spyOn(topicHook, 'default').mockImplementation((topic, onMessage) => {
      registeredHandler = onMessage
      return {
        publish: publishMock,
        localParticipant: mockParticipant,
        room: {},
      }
    })
  })

  it('TC-POLL-01: teacher launching Thumbs template publishes POLL_START', async () => {
    const handleClose = vi.fn()
    const handleLaunched = vi.fn()

    render(
      <MicroPollLauncherModal
        isOpen={true}
        onClose={handleClose}
        onPollLaunched={handleLaunched}
      />
    )

    const broadcastBtn = screen.getByRole('button', { name: /Broadcast Poll Now/i })
    await fireEvent.click(broadcastBtn)

    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'POLL_START',
        poll: expect.objectContaining({
          prompt: 'Does this concept make sense?',
          durationSeconds: 15,
        }),
      })
    )
    expect(handleLaunched).toHaveBeenCalled()
    expect(handleClose).toHaveBeenCalled()
  })

  it('TC-POLL-02 & TC-POLL-03: student toast displays prompt and records vote', async () => {
    render(<StudentMicroPollToast />)

    // Receive poll start
    act(() => {
      registeredHandler?.({
        type: 'POLL_START',
        poll: {
          id: 'poll-123',
          prompt: 'Do you need another example?',
          options: ['👍 All good', '👎 One more please'],
          durationSeconds: 15,
          startedAt: Date.now(),
        },
      })
    })

    expect(screen.getByText('Do you need another example?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '👍 All good' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '👎 One more please' })).toBeInTheDocument()

    // Student votes option 0
    const voteBtn = screen.getByRole('button', { name: '👍 All good' })
    await fireEvent.click(voteBtn)

    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'POLL_VOTE',
        pollId: 'poll-123',
        voterIdentity: 'student-999',
        optionIndex: 0,
      })
    )

    expect(screen.getByText(/Response recorded!/i)).toBeInTheDocument()
  })

  it('TC-POLL-05: teacher results tallies incoming votes and calculates percentages', async () => {
    const mockPoll = {
      id: 'poll-live',
      prompt: 'Is the volume loud enough?',
      options: ['Yes', 'No'],
      durationSeconds: 15,
      startedAt: Date.now(),
    }

    render(<TeacherMicroPollResults activePoll={mockPoll} onClose={vi.fn()} />)

    expect(screen.getByText('0 responses')).toBeInTheDocument()

    // Simulate 3 students voting: 2 "Yes" (index 0) and 1 "No" (index 1)
    act(() => {
      registeredHandler?.({
        type: 'POLL_VOTE',
        pollId: 'poll-live',
        voterIdentity: 'student-1',
        optionIndex: 0,
      })
      registeredHandler?.({
        type: 'POLL_VOTE',
        pollId: 'poll-live',
        voterIdentity: 'student-2',
        optionIndex: 0,
      })
      registeredHandler?.({
        type: 'POLL_VOTE',
        pollId: 'poll-live',
        voterIdentity: 'student-3',
        optionIndex: 1,
      })
    })

    expect(screen.getByText('3 responses')).toBeInTheDocument()
    expect(screen.getByText('2 (67%)')).toBeInTheDocument()
    expect(screen.getByText('1 (33%)')).toBeInTheDocument()
  })
})
