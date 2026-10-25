import { FileText, Presentation, File, ExternalLink, Download, Trash2, Eye } from 'lucide-react'

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return ''
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function ResourceCard({ resource, owned, onDelete, onPreviewPdf }) {
  const isPdf = resource.resource_type === 'pdf'
  const isSlide = resource.resource_type === 'slide'
  const isLink = resource.resource_type === 'link'

  const renderIcon = () => {
    if (isPdf) return <File size={16} aria-hidden="true" />
    if (isSlide) return <Presentation size={16} aria-hidden="true" />
    if (isLink) return <ExternalLink size={16} aria-hidden="true" />
    return <FileText size={16} aria-hidden="true" />
  }

  const formattedDate = resource.uploaded_at
    ? new Date(resource.uploaded_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : ''

  return (
    <li className="resource-card" data-testid={`resource-card-${resource.id}`}>
      <div className="resource-top-row">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div className="resource-meta">
            <span className={`resource-type-badge ${resource.resource_type}`}>
              {renderIcon()}
              {resource.resource_type}
            </span>
            {resource.file_size_bytes > 0 && (
              <span className="muted" style={{ fontSize: '0.75rem' }}>
                {formatBytes(resource.file_size_bytes)}
              </span>
            )}
          </div>
          <h4 className="resource-title">{resource.title}</h4>
        </div>

        <div className="resource-actions">
          {isPdf && resource.file_url && (
            <button
              type="button"
              className="ghost btn-sm"
              onClick={() => onPreviewPdf(resource)}
              title="Preview PDF"
              aria-label={`Preview PDF: ${resource.title}`}
            >
              <Eye size={15} aria-hidden="true" />
              <span>Preview</span>
            </button>
          )}

          {isLink && resource.link_url && (
            <a
              href={resource.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
              title="Open external link"
              aria-label={`Open link: ${resource.title}`}
            >
              <ExternalLink size={14} aria-hidden="true" />
              <span>Open</span>
            </a>
          )}

          {!isLink && resource.file_url && (
            <a
              href={resource.file_url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="ghost btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
              title="Download file"
              aria-label={`Download file: ${resource.title}`}
            >
              <Download size={14} aria-hidden="true" />
              <span>Download</span>
            </a>
          )}

          {owned && onDelete && (
            <button
              type="button"
              className="ghost danger btn-sm icon-btn"
              onClick={() => onDelete(resource.id)}
              title="Delete resource"
              aria-label={`Delete resource: ${resource.title}`}
            >
              <Trash2 size={15} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {resource.description && (
        <p className="resource-desc">{resource.description}</p>
      )}

      <div className="resource-footer">
        <span>Uploaded by {resource.uploaded_by || 'Teacher'}</span>
        {formattedDate && <span>{formattedDate}</span>}
      </div>
    </li>
  )
}

export default ResourceCard
