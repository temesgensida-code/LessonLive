import { useState, useEffect } from 'react'
import { X, Sparkles, BookOpen, Download, CheckCircle, AlertCircle, Key } from 'lucide-react'
import { apiFetch } from '../apiClient'
import { getAIConfig } from './aiKeyStore'
import AIProviderSelector from './AIProviderSelector'
import AIKeyConfigModal from './AIKeyConfigModal'
import MarkdownMathRenderer from '../canvas/MarkdownMathRenderer'
import './ai.css'

export default function AIStudyGuideModal({
  classId,
  classroomName = 'Course',
  notes = [],
  isOpen,
  onClose,
  accessToken,
  setAccessToken,
  onResourceCreated,
}) {
  const [config, setConfig] = useState(getAIConfig())
  const [activeProvider, setActiveProvider] = useState(config.activeProvider || 'gemini')
  const [title, setTitle] = useState(`Study Guide - ${classroomName}`)
  const [markdown, setMarkdown] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)
  const [savedResource, setSavedResource] = useState(null)
  const [isConfigOpen, setIsConfigOpen] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const cfg = getAIConfig()
      setConfig(cfg)
      setActiveProvider(cfg.activeProvider || 'gemini')
      setTitle(`Study Guide - ${classroomName}`)
      setMarkdown('')
      setError(null)
      setSavedResource(null)
    }
  }, [isOpen, classroomName])

  if (!isOpen) return null

  const currentCreds = config[activeProvider] || {}
  const hasKey = Boolean((currentCreds.key || '').trim())

  const handleGenerate = async () => {
    if (!hasKey) {
      setIsConfigOpen(true)
      return
    }

    try {
      setIsGenerating(true)
      setError(null)

      const payload = {
        class_id: classId,
        title: title.trim(),
        auto_save_resource: false,
      }

      const res = await apiFetch(
        '/ai/summary/generate/',
        {
          method: 'POST',
          headers: {
            'X-AI-Provider': activeProvider,
            'X-AI-Key': currentCreds.key.trim(),
            'X-AI-Model': currentCreds.model || '',
          },
          body: JSON.stringify(payload),
        },
        { accessToken, setAccessToken }
      )

      setMarkdown(res?.summary_markdown || '')
    } catch (err) {
      setError(err.message || 'Failed to generate study guide.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePublishResource = async () => {
    if (!markdown.trim()) return

    try {
      setIsSaving(true)
      setError(null)

      const payload = {
        class_id: classId,
        title: title.trim(),
        auto_save_resource: true,
      }

      const res = await apiFetch(
        '/ai/summary/generate/',
        {
          method: 'POST',
          headers: {
            'X-AI-Provider': activeProvider,
            'X-AI-Key': currentCreds.key.trim(),
            'X-AI-Model': currentCreds.model || '',
          },
          body: JSON.stringify(payload),
        },
        { accessToken, setAccessToken }
      )

      setSavedResource(res?.resource)
      if (onResourceCreated) {
        onResourceCreated(res?.resource)
      }
    } catch (err) {
      setError(err.message || 'Failed to publish study guide as resource.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <div className="ai-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="ai-study-guide-title">
        <div className="ai-modal large" style={{ maxHeight: '92vh' }}>
          <div className="ai-modal-header">
            <h3 id="ai-study-guide-title" className="ai-modal-title">
              <BookOpen size={20} color="#a855f7" />
              AI Lecture Summary & Study Guide
            </h3>
            <button type="button" className="ghost" onClick={onClose} aria-label="Close study guide modal">
              <X size={18} />
            </button>
          </div>

          <div className="ai-modal-body">
            {error && (
              <div className="error-alert" role="alert" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {savedResource && (
              <div className="success-alert" role="status" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#34d399' }}>
                <CheckCircle size={16} />
                <span>Successfully published to Classroom Resources for all enrolled students!</span>
              </div>
            )}

            {!markdown && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 500 }}>Provider</span>
                    <button
                      type="button"
                      className="ghost"
                      style={{ fontSize: '0.8rem', color: '#a855f7', display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '2px 6px' }}
                      onClick={() => setIsConfigOpen(true)}
                    >
                      <Key size={13} /> {hasKey ? 'Manage API Key' : 'Configure API Key'}
                    </button>
                  </div>
                  <AIProviderSelector
                    activeProvider={activeProvider}
                    onSelectProvider={(p) => setActiveProvider(p)}
                    disabled={isGenerating}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="study-guide-title" style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 500 }}>
                    Study Guide Document Title
                  </label>
                  <input
                    id="study-guide-title"
                    type="text"
                    className="courseware-search-input"
                    style={{ width: '100%' }}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                    AI will synthesize all displayed lesson notes and discussions into:
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                    <li>Executive Summary & Takeaways</li>
                    <li>Key Concepts & Mathematical/Scientific formulas</li>
                    <li>Vocabulary Glossary Table</li>
                    <li>5 Self-Assessment Review Questions</li>
                  </ul>
                </div>

                {isGenerating && (
                  <div className="ai-generating-loader" role="status" aria-label="Generating study guide">
                    <div className="ai-shimmer-ring" aria-hidden="true" />
                    <span style={{ fontSize: '0.9rem', color: '#c7d2fe', fontWeight: 500 }}>
                      Synthesizing lecture notes with {activeProvider.toUpperCase()}...
                    </span>
                  </div>
                )}
              </>
            )}

            {markdown && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '0.95rem' }}>
                    Generated Study Guide Preview
                  </h4>
                  <button
                    type="button"
                    className="button"
                    style={{ fontSize: '0.8rem', padding: '0.3rem 0.65rem' }}
                    onClick={() => setMarkdown('')}
                  >
                    Regenerate
                  </button>
                </div>

                <div style={{ maxHeight: '420px', overflowY: 'auto', background: '#020617', padding: '1.25rem', borderRadius: '8px', border: '1px solid #334155' }}>
                  <MarkdownMathRenderer content={markdown} />
                </div>
              </div>
            )}
          </div>

          <div className="ai-modal-footer">
            <button type="button" className="button" onClick={onClose}>
              Done
            </button>
            {!markdown ? (
              <button
                type="button"
                className="ai-sparkle-btn"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                <Sparkles size={16} />
                {isGenerating ? 'Generating...' : 'Generate Study Guide ✨'}
              </button>
            ) : (
              <button
                type="button"
                className="ai-sparkle-btn"
                onClick={handlePublishResource}
                disabled={isSaving || Boolean(savedResource)}
              >
                <Download size={16} />
                {isSaving ? 'Publishing...' : savedResource ? 'Published to Resources' : 'Publish as Classroom Resource'}
              </button>
            )}
          </div>
        </div>
      </div>

      {isConfigOpen && (
        <AIKeyConfigModal
          isOpen={isConfigOpen}
          onClose={() => {
            setIsConfigOpen(false)
            setConfig(getAIConfig())
          }}
          accessToken={accessToken}
          setAccessToken={setAccessToken}
          onKeySaved={(newConfig) => {
            setConfig(newConfig)
            setActiveProvider(newConfig.activeProvider || activeProvider)
          }}
        />
      )}
    </>
  )
}
