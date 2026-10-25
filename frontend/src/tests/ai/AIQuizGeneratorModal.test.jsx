import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AIQuizGeneratorModal from '../../src-output/components/ai/AIQuizGeneratorModal'
import * as apiClient from '../../src-output/components/apiClient'
import { saveAIConfig } from '../../src-output/components/ai/aiKeyStore'

vi.mock('../../src-output/components/apiClient', () => ({
  API_BASE: 'http://testserver/api',
  apiFetch: vi.fn(),
}))

describe('AIQuizGeneratorModal Suite', () => {
  const mockNotes = [
    { id: 10, title: 'Cellular Respiration', note_index: 1 },
    { id: 11, title: 'Krebs Cycle Steps', note_index: 2 },
  ]

  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    // Configure default test key for Gemini
    saveAIConfig({
      activeProvider: 'gemini',
      gemini: { key: 'test-gemini-key', model: 'gemini-1.5-flash' },
      openai: { key: '', model: 'gpt-4o-mini' },
      grok: { key: '', model: 'grok-2' },
    })
  })

  it('TC-UI-GEN-01: renders modal with prompt input and classroom notes', () => {
    render(
      <AIQuizGeneratorModal
        classId="bio101"
        isOpen={true}
        onClose={vi.fn()}
        notes={mockNotes}
        accessToken="dummy-token"
        setAccessToken={vi.fn()}
      />
    )

    expect(screen.getByText(/Generate Quiz with AI/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Topic \/ Custom Prompt/i)).toBeInTheDocument()
    expect(screen.getByText(/Cellular Respiration/i)).toBeInTheDocument()
    expect(screen.getByText(/Krebs Cycle Steps/i)).toBeInTheDocument()
  })

  it('TC-UI-GEN-02: clicking generate displays animated loading state', async () => {
    // Return promise that does not resolve immediately
    let resolveApi
    apiClient.apiFetch.mockReturnValue(
      new Promise((resolve) => {
        resolveApi = resolve
      })
    )

    render(
      <AIQuizGeneratorModal
        classId="bio101"
        isOpen={true}
        onClose={vi.fn()}
        notes={mockNotes}
        accessToken="dummy-token"
        setAccessToken={vi.fn()}
      />
    )

    const promptInput = screen.getByLabelText(/Topic \/ Custom Prompt/i)
    fireEvent.change(promptInput, { target: { value: 'Cell respiration quiz' } })

    const generateBtn = screen.getByRole('button', { name: /Generate 5 Questions ✨/i })
    fireEvent.click(generateBtn)

    expect(screen.getByRole('status', { name: /Generating questions/i })).toBeInTheDocument()
    expect(screen.getByText(/Generating 5 questions with GEMINI/i)).toBeInTheDocument()

    // Resolve API call
    resolveApi({
      questions: [
        {
          text: 'Where does glycolysis occur?',
          options: ['Cytoplasm', 'Matrix', 'Cristae', 'Stroma'],
          correct: 0,
          contextNote: 'Occurs in the cytosol',
        },
      ],
    })

    await waitFor(() => {
      expect(screen.queryByRole('status', { name: /Generating questions/i })).not.toBeInTheDocument()
    })
  })

  it('TC-UI-GEN-03: successful generation opens review drawer with returned questions', async () => {
    apiClient.apiFetch.mockResolvedValue({
      provider: 'gemini',
      questions: [
        {
          text: 'How many net ATP are made in glycolysis?',
          options: ['2', '4', '36', '38'],
          correct: 0,
          contextNote: 'Gross 4, net 2',
        },
      ],
    })

    const onAddQuestionsMock = vi.fn()

    render(
      <AIQuizGeneratorModal
        classId="bio101"
        isOpen={true}
        onClose={vi.fn()}
        notes={mockNotes}
        accessToken="dummy-token"
        setAccessToken={vi.fn()}
        onAddQuestions={onAddQuestionsMock}
      />
    )

    const promptInput = screen.getByLabelText(/Topic \/ Custom Prompt/i)
    fireEvent.change(promptInput, { target: { value: 'ATP synthesis' } })

    const generateBtn = screen.getByRole('button', { name: /Generate 5 Questions ✨/i })
    fireEvent.click(generateBtn)

    await waitFor(() => {
      expect(screen.getByText(/Review AI Questions \(1\)/i)).toBeInTheDocument()
    })

    expect(screen.getByDisplayValue('How many net ATP are made in glycolysis?')).toBeInTheDocument()
  })
})
