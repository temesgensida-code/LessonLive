import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import QnABoard from '../../src-output/components/engagement/QnABoard'
import * as topicHook from '../../src-output/components/engagement/useLiveKitDataTopic'

describe('Q&A Board Suite', () => {
  let publishMock
  let registeredHandler
  let mockParticipant

  beforeEach(() => {
    vi.clearAllMocks()
    publishMock = vi.fn().mockResolvedValue(true)
    mockParticipant = {
      identity: 'student-456',
      name: 'David',
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

  it('TC-QNA-01: submitting question publishes QNA_NEW and renders question in feed', async () => {
    render(<QnABoard owned={false} />)

    const input = screen.getByLabelText(/Ask a question$/i)
    fireEvent.change(input, { target: { value: 'Can you explain mitosis again?' } })

    const form = screen.getByRole('form', { name: /Ask a question form/i })
    fireEvent.submit(form)

    await waitFor(() => {
      expect(publishMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'QNA_NEW',
          question: expect.objectContaining({
            text: 'Can you explain mitosis again?',
            author: 'David',
          }),
        })
      )
      expect(screen.getByText('Can you explain mitosis again?')).toBeInTheDocument()
    })
  })

  it('TC-QNA-02: clicking upvote increments vote count and publishes QNA_UPVOTE', async () => {
    render(<QnABoard owned={false} />)

    // Receive a question from peer
    act(() => {
      registeredHandler?.({
        type: 'QNA_NEW',
        question: {
          id: 'q-1',
          text: 'What is the homework deadline?',
          author: 'Alice',
          authorIdentity: 'peer-1',
          createdAt: Date.now(),
          upvotes: ['peer-1'],
          status: 'open',
        },
      })
    })

    expect(screen.getByText('What is the homework deadline?')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()

    // Upvote
    const upvoteBtn = screen.getByLabelText(/Upvote question by Alice/i)
    fireEvent.click(upvoteBtn)

    await waitFor(() => {
      expect(publishMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'QNA_UPVOTE',
          questionId: 'q-1',
          identity: 'student-456',
          isUpvoting: true,
        })
      )
      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })

  it('TC-QNA-03: filter by Most Upvoted sorts questions by votes descending', async () => {
    render(<QnABoard owned={false} />)

    act(() => {
      registeredHandler?.({
        type: 'QNA_NEW',
        question: {
          id: 'q-low',
          text: 'Low voted question',
          author: 'Alice',
          createdAt: 1000,
          upvotes: ['alice'],
          status: 'open',
        },
      })
      registeredHandler?.({
        type: 'QNA_NEW',
        question: {
          id: 'q-high',
          text: 'Highly voted question',
          author: 'Bob',
          createdAt: 2000,
          upvotes: ['alice', 'bob', 'charlie'],
          status: 'open',
        },
      })
    })

    const filterUpvotedBtn = screen.getByRole('button', { name: /^Most Upvoted$/i })
    fireEvent.click(filterUpvotedBtn)

    const items = screen.getAllByTestId(/qna-item-/i)
    expect(items[0]).toHaveTextContent('Highly voted question')
    expect(items[1]).toHaveTextContent('Low voted question')
  })

  it('TC-QNA-05: teacher clicking Answer Live publishes status change and displays pinned banner', async () => {
    render(<QnABoard owned={true} />)

    act(() => {
      registeredHandler?.({
        type: 'QNA_NEW',
        question: {
          id: 'q-stage',
          text: 'Is this formula on the midterm?',
          author: 'Sam',
          authorIdentity: 'sam-1',
          createdAt: Date.now(),
          upvotes: [],
          status: 'open',
        },
      })
    })

    const answerLiveBtn = screen.getByRole('button', { name: /^Answer Live$/i })
    fireEvent.click(answerLiveBtn)

    await waitFor(() => {
      expect(publishMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'QNA_STATUS_CHANGE',
          questionId: 'q-stage',
          status: 'answering_live',
        })
      )
      const banner = screen.getByRole('status')
      expect(banner).toBeInTheDocument()
      expect(banner).toHaveTextContent(/Live Q&A/i)
      expect(banner).toHaveTextContent(/Is this formula on the midterm\?/i)
    })
  })

  it('TC-QNA-06: duplicate question submitted within 10 seconds shows warning', async () => {
    render(<QnABoard owned={false} />)

    const input = screen.getByLabelText(/Ask a question$/i)
    const form = screen.getByRole('form', { name: /Ask a question form/i })

    fireEvent.change(input, { target: { value: 'Repeat question?' } })
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('Repeat question?')).toBeInTheDocument()
    })

    // Submit identical immediately
    fireEvent.change(input, { target: { value: 'Repeat question?' } })
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText(/Duplicate question detected/i)).toBeInTheDocument()
    })
  })
})
