import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import WhiteboardCanvas from '../../src-output/components/canvas/WhiteboardCanvas'
import CanvasViewSwitcher from '../../src-output/components/canvas/CanvasViewSwitcher'
import * as topicHook from '../../src-output/components/engagement/useLiveKitDataTopic'
import * as apiClient from '../../src-output/components/apiClient'

vi.mock('../../src-output/components/apiClient', () => ({
  apiFetch: vi.fn(),
}))

describe('Interactive Whiteboard Canvas Suite', () => {
  let publishMock
  let registeredHandler
  let mockParticipant

  beforeEach(() => {
    vi.clearAllMocks()
    publishMock = vi.fn().mockResolvedValue(true)
    mockParticipant = {
      identity: 'teacher-101',
      name: 'Professor Snape',
    }

    vi.spyOn(topicHook, 'default').mockImplementation((topic, onMessage) => {
      registeredHandler = onMessage
      return {
        publish: publishMock,
        localParticipant: mockParticipant,
        room: {},
      }
    })

    // Mock HTML5 Canvas 2D context methods
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      save: vi.fn(),
      restore: vi.fn(),
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      arc: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      strokeRect: vi.fn(),
    })
    HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,mockpngdata')
  })

  it('renders whiteboard toolbar and canvas with drawing tools', () => {
    render(
      <WhiteboardCanvas
        classId="chem101"
        owned={true}
        accessToken="dummy-token"
        setAccessToken={vi.fn()}
      />
    )

    expect(screen.getByRole('toolbar', { name: /Whiteboard drawing tools/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Pen$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Rectangle$/i })).toBeInTheDocument()
    expect(screen.getByTestId('whiteboard-canvas')).toBeInTheDocument()
  })

  it('TC-WB-01 & TC-SYNC-01: pointer drawing records stroke and broadcasts over LiveKit', async () => {
    render(
      <WhiteboardCanvas
        classId="chem101"
        owned={true}
        accessToken="dummy-token"
        setAccessToken={vi.fn()}
      />
    )

    const wrapper = screen.getByTestId('whiteboard-canvas').parentElement
    expect(wrapper).toBeInTheDocument()

    // Simulate drawing stroke
    fireEvent.pointerDown(wrapper, { clientX: 10, clientY: 10 })
    fireEvent.pointerMove(wrapper, { clientX: 30, clientY: 40 })
    fireEvent.pointerUp(wrapper)

    await waitFor(() => {
      expect(publishMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'WB_STROKE_END',
          element: expect.objectContaining({
            tool: 'pen',
            points: expect.arrayContaining([
              expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
            ]),
          }),
        })
      )
    })
  })

  it('TC-WB-04: undo and redo updates history stack', async () => {
    render(
      <WhiteboardCanvas
        classId="chem101"
        owned={true}
        accessToken="dummy-token"
        setAccessToken={vi.fn()}
      />
    )

    const wrapper = screen.getByTestId('whiteboard-canvas').parentElement

    // Draw first stroke
    fireEvent.pointerDown(wrapper, { clientX: 10, clientY: 10 })
    fireEvent.pointerUp(wrapper)

    const undoBtn = screen.getByRole('button', { name: /Undo last stroke/i })
    expect(undoBtn).not.toBeDisabled()

    // Undo stroke
    fireEvent.click(undoBtn)

    const redoBtn = screen.getByRole('button', { name: /Redo stroke/i })
    expect(redoBtn).not.toBeDisabled()

    // Redo stroke
    fireEvent.click(redoBtn)
    expect(undoBtn).not.toBeDisabled()
  })

  it('TC-SYNC-02: receiving remote stroke element draws on student canvas', async () => {
    render(
      <WhiteboardCanvas
        classId="chem101"
        owned={false}
        accessToken="dummy-token"
        setAccessToken={vi.fn()}
      />
    )

    act(() => {
      registeredHandler?.({
        type: 'WB_STROKE_END',
        element: {
          id: 'remote-1',
          tool: 'rect',
          color: '#ef4444',
          strokeWidth: 4,
          startX: 50,
          startY: 50,
          endX: 150,
          endY: 150,
        },
      })
    })

    const canvas = screen.getByTestId('whiteboard-canvas')
    const ctx = canvas.getContext('2d')
    expect(ctx.strokeRect).toHaveBeenCalledWith(50, 50, 100, 100)
  })

  it('TC-WB-06: 1-click Save as Note exports canvas and calls classroom notes API', async () => {
    apiClient.apiFetch.mockResolvedValue({
      note: { id: 88, index: 3, title: 'Whiteboard Snapshot' },
    })
    window.alert = vi.fn()

    render(
      <WhiteboardCanvas
        classId="chem101"
        owned={true}
        accessToken="dummy-token"
        setAccessToken={vi.fn()}
      />
    )

    const saveBtn = screen.getByRole('button', { name: /Save as Note/i })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(apiClient.apiFetch).toHaveBeenCalledWith(
        '/classrooms/chem101/notes/',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Whiteboard Snapshot'),
        }),
        expect.any(Object)
      )
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Snapshot saved successfully'))
    })
  })

  it('CanvasViewSwitcher toggles between Notes and Whiteboard views', () => {
    const handleViewChange = vi.fn()

    render(
      <CanvasViewSwitcher
        activeView="notes"
        onViewChange={handleViewChange}
        hasScreenShare={true}
      />
    )

    const wbBtn = screen.getByRole('tab', { name: /^Whiteboard$/i })
    fireEvent.click(wbBtn)

    expect(handleViewChange).toHaveBeenCalledWith('whiteboard')
  })
})
