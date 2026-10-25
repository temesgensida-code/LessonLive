import { useState, useCallback, useEffect, useRef } from 'react'
import { MessageSquare, Send, Search, HelpCircle } from 'lucide-react'
import useLiveKitDataTopic from './useLiveKitDataTopic'
import QnAQuestionItem from './QnAQuestionItem'
import PinnedLiveQuestionBanner from './PinnedLiveQuestionBanner'
import './engagement.css'

export const QNA_TOPIC = 'lessonlive-qna'

function QnABoard({ owned = false }) {
  const [questions, setQuestions] = useState([])
  const [filter, setFilter] = useState('all') // 'all', 'upvoted', 'unanswered', 'answered'
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState('')
  const [lastSubmitTime, setLastSubmitTime] = useState(0)
  const [lastQuestionText, setLastQuestionText] = useState('')
  const [warning, setWarning] = useState('')
  const listRef = useRef(null)

  const handleMessage = useCallback(
    (data, participant) => {
      if (!data || !data.type) return

      if (data.type === 'QNA_NEW') {
        setQuestions((prev) => {
          if (prev.some((q) => q.id === data.question.id)) return prev
          return [data.question, ...prev]
        })
      } else if (data.type === 'QNA_UPVOTE') {
        setQuestions((prev) =>
          prev.map((q) => {
            if (q.id !== data.questionId) return q
            const upvotes = new Set(q.upvotes || [])
            if (data.isUpvoting) {
              upvotes.add(data.identity)
            } else {
              upvotes.delete(data.identity)
            }
            return { ...q, upvotes: Array.from(upvotes) }
          })
        )
      } else if (data.type === 'QNA_STATUS_CHANGE') {
        setQuestions((prev) =>
          prev.map((q) => {
            if (q.id === data.questionId) {
              return { ...q, status: data.status }
            }
            // If someone is answering live, unpin any previously live question
            if (data.status === 'answering_live' && q.status === 'answering_live') {
              return { ...q, status: 'open' }
            }
            return q
          })
        )
      } else if (data.type === 'QNA_DELETE') {
        setQuestions((prev) => prev.filter((q) => q.id !== data.questionId))
      } else if (data.type === 'QNA_SYNC_RESPONSE') {
        if (Array.isArray(data.questions)) {
          setQuestions(data.questions)
        }
      } else if (data.type === 'QNA_SYNC_REQUEST' && owned) {
        publish?.({
          type: 'QNA_SYNC_RESPONSE',
          questions,
        })
      }
    },
    [owned, questions]
  )

  const { publish, localParticipant } = useLiveKitDataTopic(QNA_TOPIC, handleMessage)
  const localIdentity = localParticipant?.identity || ''
  const localName = localParticipant?.name || (owned ? 'Teacher' : 'Student')

  // Request sync on mount if not owner
  useEffect(() => {
    if (!owned && publish) {
      publish({ type: 'QNA_SYNC_REQUEST' })
    }
  }, [owned, publish])

  const handleSubmitQuestion = async (e) => {
    e.preventDefault()
    setWarning('')
    const trimmed = draft.trim()
    if (!trimmed) return

    // 10-second duplicate suppression
    const now = Date.now()
    if (trimmed === lastQuestionText && now - lastSubmitTime < 10000) {
      setWarning('Duplicate question detected. Please wait before asking the same question.')
      return
    }

    const newQuestion = {
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      text: trimmed,
      author: localName,
      authorIdentity: localIdentity,
      createdAt: Date.now(),
      upvotes: [localIdentity], // auto-upvote by author
      status: 'open',
    }

    await publish({
      type: 'QNA_NEW',
      question: newQuestion,
    })

    setQuestions((prev) => [newQuestion, ...prev])
    setDraft('')
    setLastSubmitTime(now)
    setLastQuestionText(trimmed)
  }

  const handleUpvote = async (questionId) => {
    const target = questions.find((q) => q.id === questionId)
    if (!target) return
    const isUpvoting = !target.upvotes?.includes(localIdentity)

    await publish({
      type: 'QNA_UPVOTE',
      questionId,
      identity: localIdentity,
      isUpvoting,
    })

    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q
        const votes = new Set(q.upvotes || [])
        if (isUpvoting) votes.add(localIdentity)
        else votes.delete(localIdentity)
        return { ...q, upvotes: Array.from(votes) }
      })
    )
  }

  const handleStatusChange = async (questionId, newStatus) => {
    await publish({
      type: 'QNA_STATUS_CHANGE',
      questionId,
      status: newStatus,
    })

    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === questionId) return { ...q, status: newStatus }
        if (newStatus === 'answering_live' && q.status === 'answering_live') {
          return { ...q, status: 'open' }
        }
        return q
      })
    )
  }

  const handleDelete = async (questionId) => {
    await publish({
      type: 'QNA_DELETE',
      questionId,
    })
    setQuestions((prev) => prev.filter((q) => q.id !== questionId))
  }

  // Active live question for sticky banner
  const liveQuestion = questions.find((q) => q.status === 'answering_live')

  // Filtering & Sorting
  const filteredQuestions = questions
    .filter((q) => {
      if (filter === 'unanswered') return q.status !== 'answered'
      if (filter === 'answered') return q.status === 'answered'
      return true
    })
    .filter((q) => {
      if (!search.trim()) return true
      const term = search.toLowerCase()
      return (
        q.text.toLowerCase().includes(term) ||
        q.author.toLowerCase().includes(term)
      )
    })
    .sort((a, b) => {
      if (filter === 'upvoted') {
        return (b.upvotes?.length || 0) - (a.upvotes?.length || 0)
      }
      return b.createdAt - a.createdAt
    })

  return (
    <div className="qna-container" data-testid="qna-board-container">
      {liveQuestion && (
        <PinnedLiveQuestionBanner
          question={liveQuestion}
          owned={owned}
          onDismiss={() => handleStatusChange(liveQuestion.id, 'answered')}
        />
      )}

      {/* Filter and Search Bar */}
      <div className="qna-filter-bar">
        <button
          type="button"
          className={`qna-filter-chip ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({questions.length})
        </button>
        <button
          type="button"
          className={`qna-filter-chip ${filter === 'upvoted' ? 'active' : ''}`}
          onClick={() => setFilter('upvoted')}
        >
          Most Upvoted
        </button>
        <button
          type="button"
          className={`qna-filter-chip ${filter === 'unanswered' ? 'active' : ''}`}
          onClick={() => setFilter('unanswered')}
        >
          Unanswered
        </button>
        <button
          type="button"
          className={`qna-filter-chip ${filter === 'answered' ? 'active' : ''}`}
          onClick={() => setFilter('answered')}
        >
          Answered
        </button>
      </div>

      <div style={{ padding: '0.4rem 0.75rem', position: 'relative' }}>
        <Search
          size={13}
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '18px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
          }}
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter questions…"
          aria-label="Filter questions"
          style={{
            width: '100%',
            padding: '0.3rem 0.5rem 0.3rem 1.8rem',
            fontSize: '0.8rem',
            borderRadius: '4px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-surface)',
            color: 'inherit',
          }}
        />
      </div>

      {/* Questions list */}
      <div className="qna-list" ref={listRef} role="feed" aria-label="Questions list">
        {filteredQuestions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <HelpCircle size={28} color="var(--text-muted)" style={{ margin: '0 auto 0.4rem' }} />
            <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
              {search || filter !== 'all' ? 'No matching questions found.' : 'No questions asked yet.'}
            </p>
          </div>
        ) : (
          filteredQuestions.map((q) => (
            <QnAQuestionItem
              key={q.id}
              question={q}
              localIdentity={localIdentity}
              owned={owned}
              onUpvote={handleUpvote}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* Question Submission Input */}
      <form
        onSubmit={handleSubmitQuestion}
        aria-label="Ask a question form"
        style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid var(--border-color)' }}
      >
        {warning && (
          <p className="error" role="alert" style={{ fontSize: '0.75rem', margin: '0 0 0.4rem' }}>
            {warning}
          </p>
        )}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask a question for the class…"
            maxLength={250}
            aria-label="Ask a question"
            style={{
              flex: 1,
              padding: '0.45rem 0.75rem',
              fontSize: '0.85rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-surface)',
              color: 'inherit',
            }}
          />
          <button
            type="submit"
            className="primary btn-sm"
            disabled={!draft.trim()}
            aria-label="Send question"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Send size={14} aria-hidden="true" />
          </button>
        </div>
        <div style={{ textAlign: 'right', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
          {draft.length}/250
        </div>
      </form>
    </div>
  )
}

export default QnABoard
