import { ChevronUp, Check, Radio, Trash2 } from 'lucide-react'

function QnAQuestionItem({ question, localIdentity, owned, onUpvote, onStatusChange, onDelete }) {
  const hasVoted = question.upvotes?.includes(localIdentity)
  const isAuthor = question.authorIdentity === localIdentity
  const isAnsweringLive = question.status === 'answering_live'
  const isAnswered = question.status === 'answered'

  const formattedTime = question.createdAt
    ? new Date(question.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <div
      className={`qna-item ${isAnsweringLive ? 'live-stage' : ''} ${isAnswered ? 'answered' : ''}`}
      data-testid={`qna-item-${question.id}`}
    >
      <div className="qna-upvote-box">
        <button
          type="button"
          className={`qna-upvote-btn ${hasVoted ? 'has-voted' : ''}`}
          onClick={() => onUpvote(question.id)}
          aria-label={`Upvote question by ${question.author}. Current upvotes: ${question.upvotes?.length || 0}`}
          aria-pressed={hasVoted}
        >
          <ChevronUp size={18} aria-hidden="true" />
        </button>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: hasVoted ? 'var(--primary)' : 'inherit' }}>
          {question.upvotes?.length || 0}
        </span>
      </div>

      <div className="qna-content">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isAnsweringLive && (
            <span className="pinned-live-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Radio size={12} aria-hidden="true" /> Answering Live
            </span>
          )}
          {isAnswered && (
            <span
              style={{
                fontSize: '0.7rem',
                color: '#10b981',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
              }}
            >
              <Check size={12} aria-hidden="true" /> Answered
            </span>
          )}
        </div>

        <p className="qna-text">{question.text}</p>

        <div className="qna-meta">
          <span>
            {question.author} {isAuthor && <strong style={{ color: 'var(--primary)' }}>(You)</strong>}
          </span>
          {formattedTime && <span>{formattedTime}</span>}
        </div>

        {owned && (
          <div className="qna-actions">
            {!isAnswered && (
              <button
                type="button"
                className={`ghost btn-sm ${isAnsweringLive ? 'danger' : ''}`}
                onClick={() =>
                  onStatusChange(question.id, isAnsweringLive ? 'open' : 'answering_live')
                }
                style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem' }}
              >
                {isAnsweringLive ? 'Stop Answering Live' : 'Answer Live'}
              </button>
            )}

            <button
              type="button"
              className="ghost btn-sm"
              onClick={() =>
                onStatusChange(question.id, isAnswered ? 'open' : 'answered')
              }
              style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem' }}
            >
              {isAnswered ? 'Re-open' : 'Mark Answered'}
            </button>

            {onDelete && (
              <button
                type="button"
                className="ghost danger btn-sm icon-btn"
                onClick={() => onDelete(question.id)}
                title="Delete question"
                aria-label="Delete question"
                style={{ marginLeft: 'auto' }}
              >
                <Trash2 size={13} aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default QnAQuestionItem
