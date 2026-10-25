import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AIQuestionReviewDrawer from '../../src-output/components/ai/AIQuestionReviewDrawer'

describe('AIQuestionReviewDrawer Suite', () => {
  const mockQuestions = [
    {
      id: 'q1',
      text: 'What is the powerhouse of the cell?',
      options: ['Mitochondria', 'Ribosome', 'Nucleus', 'Chloroplast'],
      correct: 0,
      contextNote: 'Produces cellular ATP',
    },
    {
      id: 'q2',
      text: 'What molecule carries genetic instructions?',
      options: ['Protein', 'Lipid', 'DNA', 'Glucose'],
      correct: 2,
      contextNote: 'Double helix structure',
    },
  ]

  it('TC-UI-REV-01: modifying question prompt updates draft state', () => {
    render(
      <AIQuestionReviewDrawer
        isOpen={true}
        questions={mockQuestions}
        onClose={vi.fn()}
        onAddQuestions={vi.fn()}
      />
    )

    const input = screen.getByDisplayValue('What is the powerhouse of the cell?')
    fireEvent.change(input, { target: { value: 'Which organelle generates ATP via cellular respiration?' } })

    expect(screen.getByDisplayValue('Which organelle generates ATP via cellular respiration?')).toBeInTheDocument()
  })

  it('TC-UI-REV-02: clicking trash icon removes question from draft list', () => {
    render(
      <AIQuestionReviewDrawer
        isOpen={true}
        questions={mockQuestions}
        onClose={vi.fn()}
        onAddQuestions={vi.fn()}
      />
    )

    expect(screen.getByText(/Review AI Questions \(2\)/i)).toBeInTheDocument()

    const deleteBtn = screen.getByRole('button', { name: /Delete question 1/i })
    fireEvent.click(deleteBtn)

    expect(screen.getByText(/Review AI Questions \(1\)/i)).toBeInTheDocument()
    expect(screen.queryByDisplayValue('What is the powerhouse of the cell?')).not.toBeInTheDocument()
  })

  it('TC-UI-REV-03: clicking Add to Quiz calls onAddQuestions with formatted objects', () => {
    const onAddQuestionsMock = vi.fn()
    const onCloseMock = vi.fn()

    render(
      <AIQuestionReviewDrawer
        isOpen={true}
        questions={mockQuestions}
        onClose={onCloseMock}
        onAddQuestions={onAddQuestionsMock}
      />
    )

    const addBtn = screen.getByRole('button', { name: /Add Selected \(2\) to Quiz/i })
    fireEvent.click(addBtn)

    expect(onAddQuestionsMock).toHaveBeenCalledTimes(1)
    const passedQuestions = onAddQuestionsMock.mock.calls[0][0]
    expect(passedQuestions.length).toBe(2)
    expect(passedQuestions[0].text).toBe('What is the powerhouse of the cell?')
    expect(passedQuestions[0].options[0]).toBe('Mitochondria')
    expect(passedQuestions[0].correct).toBe(0)
    expect(onCloseMock).toHaveBeenCalled()
  })
})
