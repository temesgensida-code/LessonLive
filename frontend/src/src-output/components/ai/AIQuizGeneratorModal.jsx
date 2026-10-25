import { useState, useEffect } from 'react'
import { X, Sparkles, Key, BookOpen, AlertCircle, RefreshCw } from 'lucide-react'
import { apiFetch } from '../apiClient'
import { getAIConfig, hasActiveAIKey, getActiveProviderCredentials } from './aiKeyStore'
import AIProviderSelector from './AIProviderSelector'
import AIKeyConfigModal from './AIKeyConfigModal'
import AIQuestionReviewDrawer from './AIQuestionReviewDrawer'
import './ai.css'

export default function AIQuizGeneratorModal({
  classId,
  isOpen,
  onClose,
  notes = [],
  accessToken,
  setAccessToken,
  onAddQuestions,
}) {
  const [config, setConfig] = useState(getAIConfig())
  const [activeProvider, setActiveProvider] = useState(config.activeProvider || 'gemini')
  const [prompt, setPrompt] = useState('')
  const [selectedNoteIds, setSelectedNoteIds] = useState([])
  const [questionCount, setQuestionCount] = useState(5)
  const [difficulty, setDifficulty] = useState('medium')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState(null)

  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)
  const [reviewQuestions, setReviewQuestions] = useState(null) // Array when open

  useEffect(() => {
    if (isOpen) {
      const cfg = getAIConfig()
      setConfig(cfg)
      setActiveProvider(cfg.activeProvider || 'gemini')
      setError(null)
      // Default to selecting all notes if available
      if (notes.length > 0) {
        setSelectedNoteIds(notes.map((n) => n.id))
      }
    }
  }, [isOpen, notes])

  if (!isOpen) return null

  const currentCreds = config[activeProvider] || {}
  const hasKey = Boolean((currentCreds.key || '').trim())

  const handleToggleNote = (noteId) => {
    setSelectedNoteIds((prev) =>
      prev.includes(noteId) ? prev.filter((id) => id !== noteId) : [...prev, noteId]
    )
  }

  const handleGenerate = async (e) => {
    e.preventDefault()
    if (!hasKey) {
      setIsConfigModalOpen(true)
      return
    }

    try {
      setIsGenerating(true)
      setError(null)

      const payload = {
        class_id: classId,
        prompt: prompt.trim(),
        note_ids: selectedNoteIds,
        question_count: questionCount,
        difficulty,
      }

      const res = await apiFetch(
        '/ai/quiz/generate/',
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

      const questions = res?.questions || []
      if (questions.length === 0) {
        setError('No questions could be generated from the given context. Try adding more notes or adjusting your prompt.')
        return
      }

      setReviewQuestions(questions)
    } catch (err) {
      setError(err.message || 'Failed to generate quiz questions.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <>
      <div className="ai-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="ai-quiz-gen-title">
        <div className="ai-modal large">
          <div className="ai-modal-header">
            <h3 id="ai-quiz-gen-title" className="ai-modal-title">
              <Sparkles size={20} color="#a855f7" />
              Generate Quiz with AI
            </h3>
            <button type="button" className="ghost" onClick={onClose} aria-label="Close generator modal">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleGenerate} className="ai-modal-body">
            {error && (
              <div className="error-alert" role="alert" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Provider Picker */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 500 }}>AI Provider</span>
                <button
                  type="button"
                  className="ghost"
                  style={{ fontSize: '0.8rem', color: '#a855f7', display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '2px 6px' }}
                  onClick={() => setIsConfigModalOpen(true)}
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

            {!hasKey && (
              <div
                style={{
                  background: 'rgba(234, 179, 8, 0.1)',
                  border: '1px solid rgba(234, 179, 8, 0.3)',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                }}
              >
                <div style={{ fontSize: '0.85rem', color: '#fef08a' }}>
                  No API key configured for <strong>{activeProvider}</strong>. Please provide your BYOK key to proceed.
                </div>
                <button
                  type="button"
                  className="button"
                  style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }}
                  onClick={() => setIsConfigModalOpen(true)}
                >
                  Set Key
                </button>
              </div>
            )}

            {/* Topic Prompt */}
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="ai-quiz-prompt" style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 500 }}>
                Topic / Custom Prompt
              </label>
              <textarea
                id="ai-quiz-prompt"
                rows={2}
                className="courseware-search-input"
                style={{ width: '100%', resize: 'vertical' }}
                placeholder="e.g. 5 tricky questions on Photosynthesis vs Cellular Respiration..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            {/* Notes Selector */}
            {notes.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <BookOpen size={15} color="#38bdf8" /> Include Classroom Notes as Context ({selectedNoteIds.length} selected)
                </span>
                <div style={{ maxHeight: '120px', overflowY: 'auto', background: 'rgba(15, 23, 42, 0.5)', padding: '0.5rem', borderRadius: '6px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {notes.map((n) => (
                    <label key={n.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#e2e8f0', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={selectedNoteIds.includes(n.id)}
                        onChange={() => handleToggleNote(n.id)}
                      />
                      <span>{n.title || `Note #${n.note_index}`}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Settings Row: Count & Difficulty */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="ai-question-count" style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 500 }}>
                  Question Count: {questionCount}
                </label>
                <input
                  id="ai-question-count"
                  type="range"
                  min="1"
                  max="10"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="ai-difficulty-select" style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 500 }}>
                  Difficulty
                </label>
                <select
                  id="ai-difficulty-select"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="courseware-search-input"
                  style={{ width: '100%' }}
                >
                  <option value="easy">Easy (Foundational)</option>
                  <option value="medium">Medium (Standard)</option>
                  <option value="hard">Hard (Advanced / AP)</option>
                </select>
              </div>
            </div>

            {isGenerating && (
              <div className="ai-generating-loader" role="status" aria-label="Generating questions">
                <div className="ai-shimmer-ring" aria-hidden="true" />
                <span style={{ fontSize: '0.9rem', color: '#c7d2fe', fontWeight: 500 }}>
                  Generating {questionCount} questions with {activeProvider.toUpperCase()}...
                </span>
              </div>
            )}

            <div className="ai-modal-footer" style={{ margin: '1rem -1.25rem -1.25rem -1.25rem' }}>
              <button type="button" className="button" onClick={onClose} disabled={isGenerating}>
                Cancel
              </button>
              <button
                type="submit"
                className="ai-sparkle-btn"
                disabled={isGenerating || (!prompt.trim() && selectedNoteIds.length === 0)}
              >
                <Sparkles size={16} />
                {isGenerating ? 'Drafting Questions...' : `Generate ${questionCount} Questions ✨`}
              </button>
            </div>
          </form>
        </div>
      </div>

      {isConfigModalOpen && (
        <AIKeyConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => {
            setIsConfigModalOpen(false)
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

      {reviewQuestions && (
        <AIQuestionReviewDrawer
          isOpen={Boolean(reviewQuestions)}
          questions={reviewQuestions}
          onClose={() => {
            setReviewQuestions(null)
            onClose()
          }}
          onAddQuestions={(finalQuestions) => {
            if (onAddQuestions) {
              onAddQuestions(finalQuestions)
            }
            setReviewQuestions(null)
            onClose()
          }}
        />
      )}
    </>
  )
}
