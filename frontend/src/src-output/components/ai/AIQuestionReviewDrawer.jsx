import { useState } from 'react'
import { X, Trash2, Plus, Sparkles, Check, HelpCircle } from 'lucide-react'
import './ai.css'

const OPTION_LABELS = ['A', 'B', 'C', 'D']

export default function AIQuestionReviewDrawer({ isOpen, questions = [], onClose, onAddQuestions }) {
  const [draftQuestions, setDraftQuestions] = useState(() =>
    questions.map((q, idx) => ({
      id: q.id || `ai-q-${Date.now()}-${idx}`,
      serverId: null,
      serverAnswerIds: [],
      text: q.text || '',
      options: Array.isArray(q.options) && q.options.length === 4 ? [...q.options] : ['Option A', 'Option B', 'Option C', 'Option D'],
      correct: typeof q.correct === 'number' && q.correct >= 0 && q.correct < 4 ? q.correct : 0,
      contextNote: q.contextNote || '',
    }))
  )

  if (!isOpen) return null

  const handleUpdateText = (id, newText) => {
    setDraftQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, text: newText } : q))
    )
  }

  const handleUpdateOption = (id, optIndex, newOptText) => {
    setDraftQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q
        const nextOpts = [...q.options]
        nextOpts[optIndex] = newOptText
        return { ...q, options: nextOpts }
      })
    )
  }

  const handleSelectCorrect = (id, optIndex) => {
    setDraftQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, correct: optIndex } : q))
    )
  }

  const handleUpdateHint = (id, newHint) => {
    setDraftQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, contextNote: newHint } : q))
    )
  }

  const handleDelete = (id) => {
    setDraftQuestions((prev) => prev.filter((q) => q.id !== id))
  }

  const handleConfirmAdd = () => {
    if (onAddQuestions && draftQuestions.length > 0) {
      onAddQuestions(draftQuestions)
    }
    onClose()
  }

  return (
    <div className="ai-modal-overlay ai-review-overlay" role="dialog" aria-modal="true" aria-labelledby="review-drawer-title">
      <div className="ai-modal large">
        <div className="ai-modal-header">
          <h3 id="review-drawer-title" className="ai-modal-title">
            <Sparkles size={20} color="#a855f7" />
            Review AI Questions ({draftQuestions.length})
          </h3>
          <button type="button" className="ghost" onClick={onClose} aria-label="Close review drawer">
            <X size={18} />
          </button>
        </div>

        <div className="ai-modal-body">
          {draftQuestions.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', padding: '2rem 0' }}>
              No questions remaining in this draft.
            </p>
          ) : (
            draftQuestions.map((q, idx) => (
              <div key={q.id} className="ai-question-card">
                <div className="ai-question-header">
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#a855f7' }}>
                    Question {idx + 1}
                  </span>
                  <button
                    type="button"
                    className="ghost danger"
                    style={{ padding: '0.2rem 0.4rem', color: '#f87171' }}
                    onClick={() => handleDelete(q.id)}
                    aria-label={`Delete question ${idx + 1}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor={`q-text-${q.id}`} style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Prompt</label>
                  <input
                    id={`q-text-${q.id}`}
                    type="text"
                    className="courseware-search-input"
                    style={{ width: '100%' }}
                    value={q.text}
                    onChange={(e) => handleUpdateText(q.id, e.target.value)}
                    placeholder="Enter question text..."
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Answer Options (select correct):</span>
                  {q.options.map((opt, optIdx) => (
                    <div key={optIdx} className="ai-choice-row">
                      <input
                        type="radio"
                        id={`opt-radio-${q.id}-${optIdx}`}
                        name={`correct-${q.id}`}
                        className="ai-choice-radio"
                        checked={q.correct === optIdx}
                        onChange={() => handleSelectCorrect(q.id, optIdx)}
                        aria-label={`Mark option ${OPTION_LABELS[optIdx]} as correct`}
                      />
                      <label htmlFor={`opt-radio-${q.id}-${optIdx}`} className="ai-choice-label">
                        {OPTION_LABELS[optIdx]}.
                      </label>
                      <input
                        type="text"
                        className="courseware-search-input"
                        style={{ flex: 1 }}
                        value={opt}
                        onChange={(e) => handleUpdateOption(q.id, optIdx, e.target.value)}
                        placeholder={`Option ${OPTION_LABELS[optIdx]}`}
                      />
                    </div>
                  ))}
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor={`q-hint-${q.id}`} style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <HelpCircle size={13} /> Hint / Explanation (Optional)
                  </label>
                  <input
                    id={`q-hint-${q.id}`}
                    type="text"
                    className="courseware-search-input"
                    style={{ width: '100%', fontSize: '0.8rem' }}
                    value={q.contextNote}
                    onChange={(e) => handleUpdateHint(q.id, e.target.value)}
                    placeholder="Provide a helpful hint for students..."
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="ai-modal-footer">
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="ai-sparkle-btn"
            disabled={draftQuestions.length === 0}
            onClick={handleConfirmAdd}
          >
            Add Selected ({draftQuestions.length}) to Quiz
          </button>
        </div>
      </div>
    </div>
  )
}
