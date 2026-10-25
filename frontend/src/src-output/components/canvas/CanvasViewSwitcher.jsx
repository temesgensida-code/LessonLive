import { FileText, Edit3, Monitor } from 'lucide-react'

function CanvasViewSwitcher({ activeView, onViewChange, hasScreenShare }) {
  return (
    <nav className="canvas-view-switcher" role="tablist" aria-label="Visual stage view selector">
      <button
        type="button"
        role="tab"
        id="view-tab-notes"
        aria-selected={activeView === 'notes'}
        aria-controls="stage-view-notes"
        className={`canvas-view-btn ${activeView === 'notes' ? 'active' : ''}`}
        onClick={() => onViewChange('notes')}
      >
        <FileText size={15} aria-hidden="true" />
        <span>Notes</span>
      </button>

      <button
        type="button"
        role="tab"
        id="view-tab-whiteboard"
        aria-selected={activeView === 'whiteboard'}
        aria-controls="stage-view-whiteboard"
        className={`canvas-view-btn ${activeView === 'whiteboard' ? 'active' : ''}`}
        onClick={() => onViewChange('whiteboard')}
      >
        <Edit3 size={15} aria-hidden="true" />
        <span>Whiteboard</span>
      </button>

      {hasScreenShare && (
        <button
          type="button"
          role="tab"
          id="view-tab-screen"
          aria-selected={activeView === 'screen'}
          aria-controls="stage-view-screen"
          className={`canvas-view-btn ${activeView === 'screen' ? 'active' : ''}`}
          onClick={() => onViewChange('screen')}
        >
          <Monitor size={15} aria-hidden="true" />
          <span>Screen Share</span>
        </button>
      )}
    </nav>
  )
}

export default CanvasViewSwitcher
