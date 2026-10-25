import {
  Edit3,
  Highlighter,
  Eraser,
  Square,
  Circle,
  ArrowRight,
  Type,
  RotateCcw,
  RotateCw,
  Trash2,
  Grid,
  Save,
  Users,
} from 'lucide-react'

const COLOR_SWATCHES = [
  '#f8fafc', // White / Light
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#10b981', // Green
  '#f59e0b', // Yellow / Amber
  '#a855f7', // Purple
]

const WIDTHS = [
  { label: 'Thin', value: 2 },
  { label: 'Medium', value: 4 },
  { label: 'Thick', value: 8 },
]

function WhiteboardToolbar({
  activeTool,
  setActiveTool,
  activeColor,
  setActiveColor,
  strokeWidth,
  setStrokeWidth,
  gridType,
  setGridType,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  onSaveAsNote,
  isSavingNote,
  owned,
  collabMode,
  onToggleCollab,
  canDraw,
}) {
  const tools = [
    { id: 'pen', label: 'Pen', icon: Edit3 },
    { id: 'highlighter', label: 'Highlighter', icon: Highlighter },
    { id: 'eraser', label: 'Eraser', icon: Eraser },
    { id: 'rect', label: 'Rectangle', icon: Square },
    { id: 'circle', label: 'Circle', icon: Circle },
    { id: 'arrow', label: 'Arrow', icon: ArrowRight },
  ]

  const nextGrid = () => {
    if (gridType === 'none') setGridType('dots')
    else if (gridType === 'dots') setGridType('lines')
    else setGridType('none')
  }

  return (
    <div className="whiteboard-toolbar" role="toolbar" aria-label="Whiteboard drawing tools">
      {/* Tool items */}
      <div className="whiteboard-tools-group">
        {tools.map((t) => {
          const Icon = t.icon
          const isActive = activeTool === t.id
          return (
            <button
              key={t.id}
              type="button"
              className={`whiteboard-tool-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTool(t.id)}
              disabled={!canDraw}
              title={t.label}
              aria-label={t.label}
              aria-pressed={isActive}
            >
              <Icon size={16} aria-hidden="true" />
            </button>
          )
        })}

        <div style={{ width: '1px', height: '20px', background: 'var(--border)', margin: '0 4px' }} />

        {/* Color swatches */}
        {COLOR_SWATCHES.map((color) => (
          <button
            key={color}
            type="button"
            className={`whiteboard-color-swatch ${activeColor === color ? 'active' : ''}`}
            style={{ backgroundColor: color }}
            onClick={() => setActiveColor(color)}
            disabled={!canDraw}
            aria-label={`Select color ${color}`}
          />
        ))}

        <div style={{ width: '1px', height: '20px', background: 'var(--border)', margin: '0 4px' }} />

        {/* Width picker */}
        <select
          value={strokeWidth}
          onChange={(e) => setStrokeWidth(Number(e.target.value))}
          disabled={!canDraw}
          aria-label="Brush thickness"
          style={{
            fontSize: '0.75rem',
            padding: '2px 4px',
            background: 'var(--bg-card)',
            color: 'inherit',
            border: '1px solid var(--border)',
            borderRadius: '4px',
          }}
        >
          {WIDTHS.map((w) => (
            <option key={w.value} value={w.value}>
              {w.label}
            </option>
          ))}
        </select>
      </div>

      {/* Grid and History controls */}
      <div className="whiteboard-tools-group">
        <button
          type="button"
          className="whiteboard-tool-btn"
          onClick={nextGrid}
          title={`Background Grid: ${gridType}`}
          aria-label={`Switch grid style, currently ${gridType}`}
        >
          <Grid size={16} aria-hidden="true" />
        </button>

        <button
          type="button"
          className="whiteboard-tool-btn"
          onClick={onUndo}
          disabled={!canUndo || !canDraw}
          title="Undo"
          aria-label="Undo last stroke"
        >
          <RotateCcw size={16} aria-hidden="true" />
        </button>

        <button
          type="button"
          className="whiteboard-tool-btn"
          onClick={onRedo}
          disabled={!canRedo || !canDraw}
          title="Redo"
          aria-label="Redo stroke"
        >
          <RotateCw size={16} aria-hidden="true" />
        </button>

        <button
          type="button"
          className="whiteboard-tool-btn"
          onClick={onClear}
          disabled={!canDraw}
          title="Clear canvas"
          aria-label="Clear all drawings"
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>

        {owned && (
          <>
            <button
              type="button"
              className={`whiteboard-tool-btn ${collabMode === 'collaborative' ? 'active' : ''}`}
              onClick={onToggleCollab}
              title={
                collabMode === 'collaborative'
                  ? 'Collaborative Mode (Students can draw)'
                  : 'Teacher Only Mode (Students view only)'
              }
              aria-label="Toggle student drawing permission"
            >
              <Users size={16} aria-hidden="true" />
            </button>

            <button
              type="button"
              className="primary btn-sm"
              onClick={onSaveAsNote}
              disabled={isSavingNote}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}
              title="Save Whiteboard Snapshot as Lesson Note"
            >
              <Save size={14} aria-hidden="true" />
              <span>{isSavingNote ? 'Saving…' : 'Save as Note'}</span>
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default WhiteboardToolbar
