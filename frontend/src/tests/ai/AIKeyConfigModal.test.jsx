import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AIKeyConfigModal from '../../src-output/components/ai/AIKeyConfigModal'
import * as apiClient from '../../src-output/components/apiClient'

vi.mock('../../src-output/components/apiClient', () => ({
  API_BASE: 'http://testserver/api',
  apiFetch: vi.fn(),
}))

describe('AIKeyConfigModal Suite', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('TC-UI-KEY-01: saves entered API key to localStorage under provider configuration', async () => {
    const onKeySavedMock = vi.fn()
    render(
      <AIKeyConfigModal
        isOpen={true}
        onClose={vi.fn()}
        accessToken="dummy-token"
        setAccessToken={vi.fn()}
        onKeySaved={onKeySavedMock}
      />
    )

    const keyInput = screen.getByLabelText(/Google Gemini API Key/i)
    fireEvent.change(keyInput, { target: { value: 'AIzaSyMyCustomGeminiKey' } })

    const saveBtn = screen.getByRole('button', { name: /Save Configuration/i })
    fireEvent.click(saveBtn)

    expect(screen.getByText(/Key settings saved locally/i)).toBeInTheDocument()
    const stored = JSON.parse(localStorage.getItem('lessonlive_ai_keys'))
    expect(stored.gemini.key).toBe('AIzaSyMyCustomGeminiKey')
    expect(onKeySavedMock).toHaveBeenCalled()
  })

  it('TC-UI-KEY-02: switching provider tab updates key label and model options', async () => {
    render(
      <AIKeyConfigModal
        isOpen={true}
        onClose={vi.fn()}
        accessToken="dummy-token"
        setAccessToken={vi.fn()}
      />
    )

    // Switch to OpenAI
    const openAITab = screen.getByRole('tab', { name: /OpenAI GPT/i })
    fireEvent.click(openAITab)

    expect(screen.getByLabelText(/OpenAI GPT API Key/i)).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /gpt-4o-mini/i })).toBeInTheDocument()

    // Switch to Grok
    const grokTab = screen.getByRole('tab', { name: /xAI Grok/i })
    fireEvent.click(grokTab)

    expect(screen.getByLabelText(/xAI Grok API Key/i)).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /grok-2/i })).toBeInTheDocument()
  })

  it('TC-UI-KEY-03: key input defaults to password and toggles visibility', async () => {
    render(
      <AIKeyConfigModal
        isOpen={true}
        onClose={vi.fn()}
        accessToken="dummy-token"
        setAccessToken={vi.fn()}
      />
    )

    const keyInput = screen.getByLabelText(/Google Gemini API Key/i)
    expect(keyInput).toHaveAttribute('type', 'password')

    const toggleBtn = screen.getByRole('button', { name: /Show API key/i })
    fireEvent.click(toggleBtn)

    expect(keyInput).toHaveAttribute('type', 'text')

    const hideBtn = screen.getByRole('button', { name: /Hide API key/i })
    fireEvent.click(hideBtn)

    expect(keyInput).toHaveAttribute('type', 'password')
  })
})
