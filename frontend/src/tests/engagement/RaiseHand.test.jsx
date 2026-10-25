import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import RaiseHandButton from '../../src-output/components/engagement/RaiseHandButton'
import TeacherHandQueueModal from '../../src-output/components/engagement/TeacherHandQueueModal'
import * as topicHook from '../../src-output/components/engagement/useLiveKitDataTopic'

describe('Raise Hand & Speaker Queue Suite', () => {
  let publishMock
  let registeredHandler
  let mockParticipant

  beforeEach(() => {
    vi.clearAllMocks()
    publishMock = vi.fn().mockResolvedValue(true)
    mockParticipant = {
      identity: 'student-123',
      name: 'Alice Student',
      setMicrophoneEnabled: vi.fn().mockResolvedValue(true),
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

  it('TC-HAND-01: student clicking Raise Hand publishes HAND_RAISE', async () => {
    render(<RaiseHandButton />)

    const btn = screen.getByRole('button', { name: /Raise hand to speak/i })
    expect(btn).toBeInTheDocument()

    fireEvent.click(btn)

    await waitFor(() => {
      expect(publishMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'HAND_RAISE',
          identity: 'student-123',
          name: 'Alice Student',
        })
      )
      expect(screen.getByText(/Hand Raised/i)).toBeInTheDocument()
    })
  })

  it('TC-HAND-02: student clicking while raised publishes HAND_LOWER', async () => {
    render(<RaiseHandButton />)

    const btn = screen.getByRole('button', { name: /Raise hand to speak/i })
    fireEvent.click(btn)
    await waitFor(() => expect(screen.getByText(/Hand Raised/i)).toBeInTheDocument())

    // Click again to lower
    fireEvent.click(btn)

    await waitFor(() => {
      expect(publishMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'HAND_LOWER',
          identity: 'student-123',
          loweredBy: 'student',
        })
      )
      expect(screen.getByText(/^Raise Hand$/i)).toBeInTheDocument()
    })
  })

  it('TC-HAND-05: student receiving GRANT_MIC auto-enables mic', async () => {
    render(<RaiseHandButton />)

    act(() => {
      registeredHandler?.({
        type: 'GRANT_MIC',
        targetIdentity: 'student-123',
      })
    })

    expect(mockParticipant.setMicrophoneEnabled).toHaveBeenCalledWith(true)
    expect(screen.getByText(/Speaking \(Floor Granted\)/i)).toBeInTheDocument()
  })

  it('TC-HAND-03 & TC-HAND-04: teacher queue displays ordered hands and grants mic', async () => {
    render(<TeacherHandQueueModal />)

    // Simulate receiving 2 raised hands
    act(() => {
      registeredHandler?.({
        type: 'HAND_RAISE',
        identity: 'student-1',
        name: 'Bob',
        raisedAt: 1000,
      })
      registeredHandler?.({
        type: 'HAND_RAISE',
        identity: 'student-2',
        name: 'Charlie',
        raisedAt: 2000,
      })
    })

    const badge = screen.getByRole('button', { name: /2 students have raised hands/i })
    expect(badge).toBeInTheDocument()

    // Open modal
    fireEvent.click(badge)

    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Charlie')).toBeInTheDocument()

    // Grant mic to Bob
    const grantBtn = screen.getByRole('button', { name: /Grant mic to Bob/i })
    fireEvent.click(grantBtn)

    await waitFor(() => {
      expect(publishMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'GRANT_MIC',
          targetIdentity: 'student-1',
        })
      )
    })
  })

  it('TC-HAND-06: teacher Lower All clears the queue', async () => {
    render(<TeacherHandQueueModal />)

    act(() => {
      registeredHandler?.({
        type: 'HAND_RAISE',
        identity: 'student-1',
        name: 'Bob',
        raisedAt: 1000,
      })
    })

    const badge = screen.getByRole('button', { name: /1 students have raised hands/i })
    fireEvent.click(badge)

    const lowerAllBtn = screen.getByRole('button', { name: /Lower All Hands/i })
    fireEvent.click(lowerAllBtn)

    await waitFor(() => {
      expect(publishMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'HAND_LOWER',
          identity: 'ALL',
        })
      )
      expect(screen.getByText(/No hands currently raised/i)).toBeInTheDocument()
    })
  })
})
