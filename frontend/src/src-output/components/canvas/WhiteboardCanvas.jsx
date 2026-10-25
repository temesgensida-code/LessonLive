import { useState, useRef, useEffect, useCallback } from 'react'
import WhiteboardToolbar from './WhiteboardToolbar'
import { useWhiteboardSync } from './useWhiteboardSync'
import { apiFetch } from '../apiClient'
import './canvas.css'

function drawElement(ctx, elem) {
  ctx.save()

  if (elem.tool === 'highlighter') {
    ctx.strokeStyle = elem.color
    ctx.fillStyle = elem.color
    ctx.lineWidth = elem.strokeWidth * 3
    ctx.lineCap = 'square'
    ctx.lineJoin = 'miter'
    ctx.globalAlpha = 0.35
  } else if (elem.tool === 'eraser') {
    ctx.strokeStyle = '#0f172a' // Background color
    ctx.lineWidth = elem.strokeWidth * 4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  } else {
    ctx.strokeStyle = elem.color
    ctx.fillStyle = elem.color
    ctx.lineWidth = elem.strokeWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalAlpha = 1.0
  }

  if (elem.tool === 'rect') {
    const x = Math.min(elem.startX, elem.endX)
    const y = Math.min(elem.startY, elem.endY)
    const w = Math.abs(elem.endX - elem.startX)
    const h = Math.abs(elem.endY - elem.startY)
    ctx.strokeRect(x, y, w, h)
  } else if (elem.tool === 'circle') {
    ctx.beginPath()
    ctx.arc(elem.startX, elem.startY, elem.radius, 0, Math.PI * 2)
    ctx.stroke()
  } else if (elem.tool === 'arrow') {
    // Draw line
    ctx.beginPath()
    ctx.moveTo(elem.startX, elem.startY)
    ctx.lineTo(elem.endX, elem.endY)
    ctx.stroke()

    // Draw arrowhead
    const angle = Math.atan2(elem.endY - elem.startY, elem.endX - elem.startX)
    const headLen = elem.strokeWidth * 3.5
    ctx.beginPath()
    ctx.moveTo(elem.endX, elem.endY)
    ctx.lineTo(
      elem.endX - headLen * Math.cos(angle - Math.PI / 6),
      elem.endY - headLen * Math.sin(angle - Math.PI / 6)
    )
    ctx.moveTo(elem.endX, elem.endY)
    ctx.lineTo(
      elem.endX - headLen * Math.cos(angle + Math.PI / 6),
      elem.endY - headLen * Math.sin(angle + Math.PI / 6)
    )
    ctx.stroke()
  } else if (elem.points && elem.points.length > 0) {
    // Smooth pen / highlighter stroke using quadratic curves
    ctx.beginPath()
    ctx.moveTo(elem.points[0].x, elem.points[0].y)

    for (let i = 1; i < elem.points.length; i++) {
      const p1 = elem.points[i - 1]
      const p2 = elem.points[i]
      const midX = (p1.x + p2.x) / 2
      const midY = (p1.y + p2.y) / 2
      ctx.quadraticCurveTo(p1.x, p1.y, midX, midY)
    }

    if (elem.points.length === 1) {
      ctx.arc(elem.points[0].x, elem.points[0].y, elem.strokeWidth / 2, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.stroke()
    }
  }

  ctx.restore()
}

function WhiteboardCanvas({
  classId,
  owned = false,
  accessToken,
  setAccessToken,
  onNoteCreated,
}) {
  const [elements, setElements] = useState([])
  const [redoStack, setRedoStack] = useState([])
  const [activeTool, setActiveTool] = useState('pen')
  const [activeColor, setActiveColor] = useState('#f8fafc')
  const [strokeWidth, setStrokeWidth] = useState(4)
  const [gridType, setGridType] = useState('dots')
  const [collabMode, setCollabMode] = useState('teacher_only')
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [currentDrawing, setCurrentDrawing] = useState(null)

  const canvasRef = useRef(null)
  const wrapperRef = useRef(null)

  // Remote Sync
  const onRemoteElement = useCallback((elem) => {
    setElements((prev) => [...prev, elem])
  }, [])

  const onRemoteClear = useCallback(() => {
    setElements([])
    setRedoStack([])
  }, [])

  const onRemoteSnapshot = useCallback((remoteElements) => {
    setElements(remoteElements)
  }, [])

  const onRemotePermissions = useCallback((mode) => {
    setCollabMode(mode)
  }, [])

  const { broadcastStroke, broadcastClear, broadcastPermissions } = useWhiteboardSync({
    owned,
    elements,
    onRemoteElement,
    onRemoteClear,
    onRemoteSnapshot,
    onRemotePermissions,
  })

  const canDraw = owned || collabMode === 'collaborative'

  // Redraw canvas
  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Render historical elements
    elements.forEach((elem) => drawElement(ctx, elem))

    // Render current in-progress stroke / shape
    if (currentDrawing) {
      drawElement(ctx, currentDrawing)
    }
  }, [elements, currentDrawing])

  useEffect(() => {
    redraw()
  }, [redraw])

  // Canvas resize listener
  useEffect(() => {
    const updateSize = () => {
      const wrapper = wrapperRef.current
      const canvas = canvasRef.current
      if (wrapper && canvas) {
        const rect = wrapper.getBoundingClientRect()
        // Maintain resolution
        if (canvas.width !== rect.width || canvas.height !== rect.height) {
          canvas.width = rect.width
          canvas.height = rect.height
          redraw()
        }
      }
    }

    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [redraw])

  // Pointer interactions
  const getCoordinates = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  const handlePointerDown = (e) => {
    if (!canDraw) return
    const { x, y } = getCoordinates(e)

    if (activeTool === 'rect' || activeTool === 'circle' || activeTool === 'arrow') {
      setCurrentDrawing({
        id: `shape-${Date.now()}`,
        tool: activeTool,
        color: activeColor,
        strokeWidth,
        startX: x,
        startY: y,
        endX: x,
        endY: y,
        radius: 0,
      })
    } else {
      // Pen, highlighter, eraser
      setCurrentDrawing({
        id: `stroke-${Date.now()}`,
        tool: activeTool,
        color: activeColor,
        strokeWidth,
        points: [{ x, y }],
      })
    }
  }

  const handlePointerMove = (e) => {
    if (!currentDrawing) return
    const { x, y } = getCoordinates(e)

    if (activeTool === 'rect' || activeTool === 'arrow') {
      setCurrentDrawing((prev) => ({
        ...prev,
        endX: x,
        endY: y,
      }))
    } else if (activeTool === 'circle') {
      const dx = x - currentDrawing.startX
      const dy = y - currentDrawing.startY
      const radius = Math.sqrt(dx * dx + dy * dy)
      setCurrentDrawing((prev) => ({
        ...prev,
        radius,
      }))
    } else {
      // Pen, highlighter, eraser
      setCurrentDrawing((prev) => ({
        ...prev,
        points: [...prev.points, { x, y }],
      }))
    }
  }

  const handlePointerUp = () => {
    if (!currentDrawing) return

    setElements((prev) => [...prev, currentDrawing])
    setRedoStack([])
    broadcastStroke(currentDrawing)
    setCurrentDrawing(null)
  }

  // History controls
  const handleUndo = () => {
    if (elements.length === 0) return
    const last = elements[elements.length - 1]
    setRedoStack((prev) => [last, ...prev])
    setElements((prev) => prev.slice(0, prev.length - 1))
  }

  const handleRedo = () => {
    if (redoStack.length === 0) return
    const next = redoStack[0]
    setRedoStack((prev) => prev.slice(1))
    setElements((prev) => [...prev, next])
  }

  const handleClear = () => {
    if (!window.confirm('Clear all drawings on the whiteboard?')) return
    setElements([])
    setRedoStack([])
    broadcastClear()
  }

  const handleToggleCollab = () => {
    const nextMode = collabMode === 'teacher_only' ? 'collaborative' : 'teacher_only'
    setCollabMode(nextMode)
    broadcastPermissions(nextMode)
  }

  // 1-Click "Save as Classroom Note"
  const handleSaveAsNote = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    setIsSavingNote(true)
    try {
      const dataUrl = canvas.toDataURL('image/png')
      const noteTitle = `Whiteboard Snapshot — ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      const noteContent = `![${noteTitle}](${dataUrl})`

      const res = await apiFetch(
        `/classrooms/${classId}/notes/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: noteTitle, content: noteContent }),
        },
        { accessToken, setAccessToken }
      )

      if (onNoteCreated) {
        onNoteCreated(res.note)
      }
      alert('Snapshot saved successfully to Classroom Notes!')
    } catch (err) {
      alert(`Failed to save note: ${err.message}`)
    } finally {
      setIsSavingNote(false)
    }
  }

  return (
    <div className="whiteboard-shell" data-testid="whiteboard-shell">
      <WhiteboardToolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        activeColor={activeColor}
        setActiveColor={setActiveColor}
        strokeWidth={strokeWidth}
        setStrokeWidth={setStrokeWidth}
        gridType={gridType}
        setGridType={setGridType}
        canUndo={elements.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        onSaveAsNote={handleSaveAsNote}
        isSavingNote={isSavingNote}
        owned={owned}
        collabMode={collabMode}
        onToggleCollab={handleToggleCollab}
        canDraw={canDraw}
      />

      <div
        ref={wrapperRef}
        className={`whiteboard-canvas-wrapper grid-${gridType}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <canvas
          ref={canvasRef}
          className="whiteboard-canvas-element"
          data-testid="whiteboard-canvas"
        />
      </div>
    </div>
  )
}

export default WhiteboardCanvas
