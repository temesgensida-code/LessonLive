import { useState, useEffect, useCallback } from 'react'
import { Folder, Plus, Search, FileText } from 'lucide-react'
import { apiFetch } from '../apiClient'
import ResourceCard from './ResourceCard'
import UploadResourceModal from './UploadResourceModal'
import PDFPreviewModal from './PDFPreviewModal'
import './courseware.css'

function ResourcesTab({ classId, owned, accessToken, setAccessToken }) {
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [previewPdfResource, setPreviewPdfResource] = useState(null)

  const fetchResources = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const data = await apiFetch(
        `/classrooms/${classId}/resources/`,
        {},
        { accessToken, setAccessToken }
      )
      setResources(data.resources || [])
    } catch (err) {
      setError(err.message || 'Failed to load classroom resources')
    } finally {
      setLoading(false)
    }
  }, [classId, accessToken, setAccessToken])

  useEffect(() => {
    fetchResources()
  }, [fetchResources])

  const handleUpload = async ({ title, description, resource_type, file, link_url }) => {
    setIsSubmitting(true)
    try {
      let createdResource
      if (resource_type === 'link') {
        createdResource = await apiFetch(
          `/classrooms/${classId}/resources/`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description, resource_type, link_url }),
          },
          { accessToken, setAccessToken }
        )
      } else {
        const formData = new FormData()
        formData.append('title', title)
        formData.append('description', description)
        formData.append('resource_type', resource_type)
        if (file) {
          formData.append('file', file)
        }
        createdResource = await apiFetch(
          `/classrooms/${classId}/resources/`,
          {
            method: 'POST',
            body: formData,
          },
          { accessToken, setAccessToken }
        )
      }

      setResources((prev) => [createdResource, ...prev])
      return createdResource
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (resourceId) => {
    if (!window.confirm('Are you sure you want to delete this resource?')) {
      return
    }

    try {
      await apiFetch(
        `/classrooms/${classId}/resources/${resourceId}/`,
        { method: 'DELETE' },
        { accessToken, setAccessToken }
      )
      setResources((prev) => prev.filter((r) => r.id !== resourceId))
    } catch (err) {
      alert(err.message || 'Failed to delete resource')
    }
  }

  // Filter & Search logic
  const filteredResources = resources.filter((res) => {
    const matchesFilter =
      selectedFilter === 'all' || res.resource_type === selectedFilter

    const q = searchQuery.toLowerCase().trim()
    const matchesSearch =
      !q ||
      res.title.toLowerCase().includes(q) ||
      (res.description && res.description.toLowerCase().includes(q))

    return matchesFilter && matchesSearch
  })

  return (
    <div className="courseware-container" data-testid="resources-tab-container">
      <div className="courseware-header">
        <div className="courseware-title-group">
          <Folder size={20} color="var(--primary, #3b82f6)" aria-hidden="true" />
          <h3 style={{ margin: 0 }}>Course Materials</h3>
        </div>

        {owned && (
          <button
            type="button"
            className="primary btn-sm"
            onClick={() => setIsUploadModalOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <Plus size={15} aria-hidden="true" />
            <span>Add Resource</span>
          </button>
        )}
      </div>

      <div className="courseware-filters">
        <div style={{ position: 'relative', flex: '1 1 180px' }}>
          <Search
            size={14}
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted, #94a3b8)',
            }}
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search resources…"
            className="courseware-search-input"
            style={{ paddingLeft: '28px', width: '100%' }}
            aria-label="Search resources"
          />
        </div>

        <button
          type="button"
          className={`filter-chip ${selectedFilter === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedFilter('all')}
        >
          All ({resources.length})
        </button>
        <button
          type="button"
          className={`filter-chip ${selectedFilter === 'pdf' ? 'active' : ''}`}
          onClick={() => setSelectedFilter('pdf')}
        >
          PDFs
        </button>
        <button
          type="button"
          className={`filter-chip ${selectedFilter === 'slide' ? 'active' : ''}`}
          onClick={() => setSelectedFilter('slide')}
        >
          Slides
        </button>
        <button
          type="button"
          className={`filter-chip ${selectedFilter === 'document' ? 'active' : ''}`}
          onClick={() => setSelectedFilter('document')}
        >
          Docs
        </button>
        <button
          type="button"
          className={`filter-chip ${selectedFilter === 'link' ? 'active' : ''}`}
          onClick={() => setSelectedFilter('link')}
        >
          Links
        </button>
      </div>

      {error && <p className="error" role="alert">{error}</p>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div className="loading-spinner-sm" style={{ margin: '0 auto 0.5rem' }} />
          <p className="muted">Loading materials…</p>
        </div>
      ) : filteredResources.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '2.5rem 1rem',
            border: '1px dashed var(--border-color, #334155)',
            borderRadius: '8px',
          }}
        >
          <FileText size={32} color="var(--text-muted, #64748b)" style={{ margin: '0 auto 0.5rem' }} />
          <p className="muted" style={{ margin: 0 }}>
            {searchQuery || selectedFilter !== 'all'
              ? 'No matching resources found.'
              : 'No materials uploaded for this classroom yet.'}
          </p>
          {owned && !searchQuery && selectedFilter === 'all' && (
            <button
              type="button"
              className="ghost btn-sm"
              style={{ marginTop: '0.75rem' }}
              onClick={() => setIsUploadModalOpen(true)}
            >
              Upload your first lecture slide or syllabus
            </button>
          )}
        </div>
      ) : (
        <ul className="resources-list" aria-label="Course materials list">
          {filteredResources.map((res) => (
            <ResourceCard
              key={res.id}
              resource={res}
              owned={owned}
              onDelete={handleDelete}
              onPreviewPdf={setPreviewPdfResource}
            />
          ))}
        </ul>
      )}

      {isUploadModalOpen && (
        <UploadResourceModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onUpload={handleUpload}
          isSubmitting={isSubmitting}
        />
      )}

      {previewPdfResource && (
        <PDFPreviewModal
          resource={previewPdfResource}
          onClose={() => setPreviewPdfResource(null)}
        />
      )}
    </div>
  )
}

export default ResourcesTab
