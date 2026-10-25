import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AIStudyGuideModal from '../../src-output/components/ai/AIStudyGuideModal'
import * as apiClient from '../../src-output/components/apiClient'
import { saveAIConfig } from '../../src-output/components/ai/aiKeyStore'

vi.mock('../../src-output/components/apiClient', () => ({
  API_BASE: 'http://testserver/api',
  apiFetch: vi.fn(),
}))

describe('AIStudyGuideModal Suite', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    saveAIConfig({
      activeProvider: 'gemini',
      gemini: { key: 'test-key-gemini', model: 'gemini-1.5-flash' },
      openai: { key: '', model: 'gpt-4o-mini' },
      grok: { key: '', model: 'grok-2' },
    })
  })

  it('renders modal with title and triggers study guide generation and preview', async () => {
    const mockMarkdown = '# Executive Summary\nCell respiration generates ATP.\n\n## Vocabulary Glossary\n| Term | Def |\n|---|---|'
    apiClient.apiFetch.mockResolvedValueOnce({
      provider: 'gemini',
      summary_markdown: mockMarkdown,
    })

    render(
      <AIStudyGuideModal
        classId="bio101"
        classroomName="AP Biology"
        notes={[{ id: 1, title: 'Glycolysis' }]}
        isOpen={true}
        onClose={vi.fn()}
        accessToken="dummy-token"
        setAccessToken={vi.fn()}
      />
    )

    expect(screen.getByText(/AI Lecture Summary & Study Guide/i)).toBeInTheDocument()

    const generateBtn = screen.getByRole('button', { name: /Generate Study Guide ✨/i })
    fireEvent.click(generateBtn)

    await waitFor(() => {
      expect(screen.getByText(/Generated Study Guide Preview/i)).toBeInTheDocument()
    })

    expect(screen.getByText(/Executive Summary/i)).toBeInTheDocument()
    expect(screen.getByText(/Cell respiration generates ATP\./i)).toBeInTheDocument()
  })

  it('publishes generated study guide to classroom resources', async () => {
    const mockMarkdown = '# Executive Summary\nCell respiration generates ATP.'
    apiClient.apiFetch
      .mockResolvedValueOnce({
        provider: 'gemini',
        summary_markdown: mockMarkdown,
      })
      .mockResolvedValueOnce({
        provider: 'gemini',
        summary_markdown: mockMarkdown,
        resource: {
          id: 55,
          title: 'Study Guide - AP Biology',
          resource_type: 'document',
        },
      })

    const onResourceCreatedMock = vi.fn()

    render(
      <AIStudyGuideModal
        classId="bio101"
        classroomName="AP Biology"
        notes={[{ id: 1, title: 'Glycolysis' }]}
        isOpen={true}
        onClose={vi.fn()}
        accessToken="dummy-token"
        setAccessToken={vi.fn()}
        onResourceCreated={onResourceCreatedMock}
      />
    )

    const generateBtn = screen.getByRole('button', { name: /Generate Study Guide ✨/i })
    fireEvent.click(generateBtn)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Publish as Classroom Resource/i })).toBeInTheDocument()
    })

    const publishBtn = screen.getByRole('button', { name: /Publish as Classroom Resource/i })
    fireEvent.click(publishBtn)

    await waitFor(() => {
      expect(screen.getByText(/Successfully published to Classroom Resources/i)).toBeInTheDocument()
    })

    expect(onResourceCreatedMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 55, title: 'Study Guide - AP Biology' })
    )
  })
})
