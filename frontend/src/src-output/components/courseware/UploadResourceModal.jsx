import { useState, useEffect } from 'react'
import { X, Upload, Link as LinkIcon, AlertCircle } from 'lucide-react'

const MAX_BYTES = 25 * 1024 * 1024 // 25 MB

function UploadResourceModal({ isOpen, onClose, onUpload, isSubmitting }) {
  const [activeTab, setActiveTab] = useState('file') // 'file' or 'link'
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [resourceType, setResourceType] = useState('pdf')
  const [selectedFile, setSelectedFile] = useState(null)
  const [linkUrl, setLinkUrl] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_BYTES) {
      setError(`File size exceeds 25 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`)
      setSelectedFile(null)
      return
    }

    setError('')
    setSelectedFile(file)
    if (!title) {
      // Auto-populate title with cleaned file name
      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
      setTitle(nameWithoutExt)
    }

    // Auto-detect type
    const lowerName = file.name.toLowerCase()
    if (lowerName.endsWith('.pdf')) {
      setResourceType('pdf')
    } else if (lowerName.endsWith('.ppt') || lowerName.endsWith('.pptx')) {
      setResourceType('slide')
    } else {
      setResourceType('document')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!title.trim()) {
      setError('Please provide a title.')
      return
    }

    if (activeTab === 'file') {
      if (!selectedFile) {
        setError('Please select a file to upload.')
        return
      }
      try {
        await onUpload({
          title: title.trim(),
          description: description.trim(),
          resource_type: resourceType,
          file: selectedFile,
        })
        onClose()
      } catch (err) {
        setError(err.message || 'Failed to upload file.')
      }
    } else {
      if (!linkUrl.trim()) {
        setError('Please provide a link URL.')
        return
      }
      if (!linkUrl.startsWith('http://') && !linkUrl.startsWith('https://')) {
        setError('URL must start with http:// or https://')
        return
      }
      try {
        await onUpload({
          title: title.trim(),
          description: description.trim(),
          resource_type: 'link',
          link_url: linkUrl.trim(),
        })
        onClose()
      } catch (err) {
        setError(err.message || 'Failed to save link.')
      }
    }
  }

  return (
    <div
      className="custom-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
    >
      <div className="custom-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <button
          type="button"
          className="custom-modal-close"
          onClick={onClose}
          aria-label="Close upload modal"
        >
          <X size={18} aria-hidden="true" />
        </button>

        <h3 id="upload-modal-title" style={{ marginTop: 0, marginBottom: '1rem' }}>
          Add Course Resource
        </h3>

        <div className="upload-modal-type-tabs">
          <button
            type="button"
            className={`upload-type-tab-btn ${activeTab === 'file' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('file')
              setError('')
            }}
          >
            <Upload size={14} style={{ display: 'inline', marginRight: '6px' }} aria-hidden="true" />
            Upload File
          </button>
          <button
            type="button"
            className={`upload-type-tab-btn ${activeTab === 'link' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('link')
              setResourceType('link')
              setError('')
            }}
          >
            <LinkIcon size={14} style={{ display: 'inline', marginRight: '6px' }} aria-hidden="true" />
            External Link
          </button>
        </div>

        {error && (
          <div className="error" role="alert" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1rem' }}>
            <AlertCircle size={16} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label htmlFor="resource-title-input">Title *</label>
            <input
              id="resource-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chapter 4 Lecture Slides"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="resource-desc-input">Description (optional)</label>
            <textarea
              id="resource-desc-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief context or instructions for students…"
            />
          </div>

          {activeTab === 'file' ? (
            <>
              <div className="form-group">
                <label htmlFor="resource-category-select">Resource Type</label>
                <select
                  id="resource-category-select"
                  value={resourceType}
                  onChange={(e) => setResourceType(e.target.value)}
                >
                  <option value="pdf">PDF Document (.pdf)</option>
                  <option value="slide">Presentation Slide (.ppt, .pptx)</option>
                  <option value="document">Other Document (.docx, .txt, etc.)</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="resource-file-input">Select File (max 25 MB)</label>
                <input
                  id="resource-file-input"
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.ppt,.pptx,.doc,.docx,.txt,.zip,.png,.jpg,.jpeg"
                  required
                />
              </div>
            </>
          ) : (
            <div className="form-group">
              <label htmlFor="resource-link-input">Link URL *</label>
              <input
                id="resource-link-input"
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com/materials"
                required
              />
            </div>
          )}

          <div className="row" style={{ marginTop: '1rem', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Uploading…' : activeTab === 'file' ? 'Upload Resource' : 'Save Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default UploadResourceModal
