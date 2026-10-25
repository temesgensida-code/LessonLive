import { useState, useEffect, useMemo } from 'react'
import { X, Download, Search, GraduationCap, RefreshCw } from 'lucide-react'
import { apiFetch, API_BASE } from '../apiClient'
import GradebookSummaryCards from './GradebookSummaryCards'
import GradebookTable from './GradebookTable'
import './gradebook.css'

export default function GradebookDashboard({ classId, accessToken, setAccessToken, isOpen, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')

  useEffect(() => {
    if (!isOpen) return
    let active = true

    const fetchGradebook = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await apiFetch(
          `/classrooms/${classId}/gradebook/`,
          {},
          { accessToken, setAccessToken }
        )
        if (active) {
          setData(res)
        }
      } catch (err) {
        if (active) setError(err.message || 'Failed to load gradebook')
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchGradebook()
    return () => { active = false }
  }, [classId, isOpen, accessToken, setAccessToken])

  const handleExportCSV = async () => {
    try {
      const authHeaders = accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
      const res = await fetch(`${API_BASE}/classrooms/${classId}/gradebook/export/`, {
        headers: authHeaders,
      })
      if (!res.ok) throw new Error('Failed to export CSV')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${classId}_gradebook.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert(err.message || 'Export failed')
    }
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const filteredAndSortedStudents = useMemo(() => {
    if (!data?.students) return []
    let list = [...data.students]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
      )
    }

    list.sort((a, b) => {
      let valA = a[sortField]
      let valB = b[sortField]

      if (typeof valA === 'string') {
        valA = valA.toLowerCase()
        valB = (valB || '').toLowerCase()
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
      }

      valA = valA ?? 0
      valB = valB ?? 0
      return sortDirection === 'asc' ? valA - valB : valB - valA
    })

    return list
  }, [data, searchQuery, sortField, sortDirection])

  if (!isOpen) return null

  return (
    <div className="gradebook-overlay" role="dialog" aria-modal="true" aria-labelledby="gradebook-title">
      <div className="gradebook-modal">
        <div className="gradebook-header">
          <div className="gradebook-header-left">
            <GraduationCap size={24} color="#38bdf8" />
            <h3 id="gradebook-title">Classroom Gradebook &amp; Analytics</h3>
          </div>

          <div className="gradebook-header-actions">
            <button
              type="button"
              className="button"
              onClick={handleExportCSV}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            >
              <Download size={15} /> Export to CSV
            </button>
            <button type="button" className="ghost" onClick={onClose} aria-label="Close gradebook">
              <X size={20} />
            </button>
          </div>
        </div>

        {error && <div className="error-alert" role="alert" style={{ margin: '1rem' }}>{error}</div>}

        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            <p>Loading classroom gradebook metrics...</p>
          </div>
        ) : data ? (
          <>
            <GradebookSummaryCards summary={data.summary} />

            <div className="gradebook-controls">
              <div style={{ position: 'relative', width: '300px' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search students by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="courseware-search-input"
                  style={{ paddingLeft: '34px', width: '100%' }}
                />
              </div>

              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Showing {filteredAndSortedStudents.length} of {data.students.length} students
              </div>
            </div>

            <GradebookTable
              columns={data.columns}
              students={filteredAndSortedStudents}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
          </>
        ) : null}
      </div>
    </div>
  )
}
