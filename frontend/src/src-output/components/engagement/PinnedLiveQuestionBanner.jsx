import { Radio, X } from 'lucide-react'

function PinnedLiveQuestionBanner({ question, owned, onDismiss }) {
  if (!question) return null

  return (
    <div className="pinned-live-banner" role="status" aria-live="polite">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
        <span className="pinned-live-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <Radio size={12} aria-hidden="true" /> Live Q&amp;A
        </span>
        <div style={{ overflow: 'hidden' }}>
          <p
            style={{
              margin: 0,
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
            }}
          >
            "{question.text}"
          </p>
          <span className="muted" style={{ fontSize: '0.72rem' }}>
            Asked by {question.author}
          </span>
        </div>
      </div>

      {owned && onDismiss && (
        <button
          type="button"
          className="ghost icon-btn"
          onClick={() => onDismiss(question.id)}
          aria-label="Dismiss pinned question"
          style={{ flexShrink: 0 }}
        >
          <X size={15} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

export default PinnedLiveQuestionBanner
