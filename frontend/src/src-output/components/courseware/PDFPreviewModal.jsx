import { useEffect } from 'react'
import { X, Download, ExternalLink } from 'lucide-react'

function PDFPreviewModal({ resource, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!resource) return null

  return (
    <div
      className="pdf-preview-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-preview-title"
    >
      <div className="pdf-preview-window" onClick={(e) => e.stopPropagation()}>
        <div className="pdf-preview-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
            <h3 id="pdf-preview-title" style={{ margin: 0, fontSize: '1rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {resource.title}
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {resource.file_url && (
              <>
                <a
                  href={resource.file_url}
                  download
                  className="ghost btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                >
                  <Download size={14} aria-hidden="true" />
                  <span>Download</span>
                </a>
                <a
                  href={resource.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ghost btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                >
                  <ExternalLink size={14} aria-hidden="true" />
                  <span>New Tab</span>
                </a>
              </>
            )}
            <button
              type="button"
              className="ghost icon-btn"
              onClick={onClose}
              aria-label="Close PDF preview"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        <iframe
          src={resource.file_url}
          title={resource.title}
          className="pdf-preview-frame"
          data-testid="pdf-preview-iframe"
        />
      </div>
    </div>
  )
}

export default PDFPreviewModal
