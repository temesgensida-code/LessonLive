import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ResourcesTab from '../../src-output/components/courseware/ResourcesTab'
import * as apiClient from '../../src-output/components/apiClient'

vi.mock('../../src-output/components/apiClient', () => ({
  apiFetch: vi.fn(),
}))

const mockResources = [
  {
    id: 1,
    title: 'Lecture 1 Slides',
    description: 'Introduction to Biology',
    resource_type: 'slide',
    file_url: 'http://example.com/slide1.pptx',
    link_url: null,
    file_size_bytes: 204800,
    uploaded_by: 'Teacher Alice',
    uploaded_at: '2026-10-20T10:00:00Z',
  },
  {
    id: 2,
    title: 'Cell Division Worksheet',
    description: 'Homework assignment 1',
    resource_type: 'pdf',
    file_url: 'http://example.com/worksheet.pdf',
    link_url: null,
    file_size_bytes: 512000,
    uploaded_by: 'Teacher Alice',
    uploaded_at: '2026-10-21T11:00:00Z',
  },
  {
    id: 3,
    title: 'NCBI Gene Database',
    description: 'Reference link for lab',
    resource_type: 'link',
    file_url: null,
    link_url: 'https://ncbi.nlm.nih.gov',
    file_size_bytes: 0,
    uploaded_by: 'Teacher Alice',
    uploaded_at: '2026-10-22T09:00:00Z',
  },
]

describe('ResourcesTab Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiClient.apiFetch.mockResolvedValue({ resources: mockResources })
  })

  it('fetches and renders resources list with correct badges', async () => {
    render(
      <ResourcesTab
        classId="bio101"
        owned={true}
        accessToken="dummy-token"
        setAccessToken={vi.fn()}
      />
    )

    expect(screen.getByText(/Loading materials…/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Lecture 1 Slides')).toBeInTheDocument()
      expect(screen.getByText('Cell Division Worksheet')).toBeInTheDocument()
      expect(screen.getByText('NCBI Gene Database')).toBeInTheDocument()
    })

    expect(screen.getByText('slide')).toBeInTheDocument()
    expect(screen.getByText('pdf')).toBeInTheDocument()
    expect(screen.getByText('link')).toBeInTheDocument()
  })

  it('filters resources by category chips', async () => {
    render(
      <ResourcesTab
        classId="bio101"
        owned={false}
        accessToken="dummy-token"
        setAccessToken={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Lecture 1 Slides')).toBeInTheDocument()
    })

    // Filter by Links only
    fireEvent.click(screen.getByRole('button', { name: /^Links$/i }))

    expect(screen.queryByText('Lecture 1 Slides')).not.toBeInTheDocument()
    expect(screen.queryByText('Cell Division Worksheet')).not.toBeInTheDocument()
    expect(screen.getByText('NCBI Gene Database')).toBeInTheDocument()
  })

  it('searches resources by title query', async () => {
    render(
      <ResourcesTab
        classId="bio101"
        owned={false}
        accessToken="dummy-token"
        setAccessToken={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Lecture 1 Slides')).toBeInTheDocument()
    })

    const searchInput = screen.getByLabelText(/Search resources/i)
    fireEvent.change(searchInput, { target: { value: 'worksheet' } })

    expect(screen.queryByText('Lecture 1 Slides')).not.toBeInTheDocument()
    expect(screen.getByText('Cell Division Worksheet')).toBeInTheDocument()
  })

  it('opens upload modal when teacher clicks Add Resource', async () => {
    render(
      <ResourcesTab
        classId="bio101"
        owned={true}
        accessToken="dummy-token"
        setAccessToken={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Lecture 1 Slides')).toBeInTheDocument()
    })

    const addBtn = screen.getByRole('button', { name: /Add Resource/i })
    fireEvent.click(addBtn)

    expect(screen.getByRole('heading', { name: /Add Course Resource/i })).toBeInTheDocument()
  })

  it('opens PDF preview modal when preview is clicked on PDF item', async () => {
    render(
      <ResourcesTab
        classId="bio101"
        owned={false}
        accessToken="dummy-token"
        setAccessToken={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Cell Division Worksheet')).toBeInTheDocument()
    })

    const previewBtn = screen.getByRole('button', { name: /Preview PDF: Cell Division Worksheet/i })
    fireEvent.click(previewBtn)

    expect(screen.getByTestId('pdf-preview-iframe')).toBeInTheDocument()
    expect(screen.getByTestId('pdf-preview-iframe')).toHaveAttribute('src', 'http://example.com/worksheet.pdf')
  })
})
