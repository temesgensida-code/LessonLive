/**
 * LiveQuizCard.jsx
 *
 * Drop-in quiz panel for the LessonLive classroom.
 * Place it inside ClassroomPage's left notes-canvas area.
 *
 * Teacher flow:  Setup → Launch → Live results → End
 * Student flow:  Waiting → Answering → Submitted / Reveal
 *
 * Communicates over the LiveKit data channel (topic: 'lessonlive-quiz').
 * Falls back gracefully when not inside a LiveKitRoom.
 *
 * Props
 * ──────
 *   owned          {boolean}  true = teacher view
 *   classId        {string}   classroom id used for examination endpoints
 *   sessionLabel   {string}   e.g. "Philosophy 101"  (optional)
 *   studentCount   {number}   total participants shown in header badge
 *   accessToken    {string}   JWT access token for API calls
 *   setAccessToken {function} access token setter for refresh
 *
 * Usage inside ClassroomPage (left canvas):
 *   <LiveQuizCard owned={owned} classId={classId} sessionLabel="Biology 101" studentCount={participants.length} />
 */

import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { apiFetch } from './apiClient'
import './LiveQuizCard.css'

/* ────────── constants ────────── */
const QUIZ_TOPIC   = 'lessonlive-quiz'
const LETTERS      = ['A', 'B', 'C', 'D']
const DEFAULT_TIME = 60   // seconds

/* ────────── helpers ────────── */
function pad(n) { return String(n).padStart(2, '0') }
function fmt(secs) { return `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}` }
function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)) }

function blankQuestion() {
  return {
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    serverId: null,
    serverAnswerIds: [],
    text: '',
    options: ['', '', '', ''],
    correct: 0,            // index 0-3
    contextNote: '',       // hint shown during the question
  }
}

function buildQuestionPayload(question) {
  return {
    prompt: question.text.trim(),
    answers: question.options.map((opt) => opt.trim()),
    correct_index: question.correct,
  }
}

function normalizeServerQuestion(serverQuestion, fallback) {
  if (!serverQuestion) {
    return fallback
  }

  const answers = Array.isArray(serverQuestion.answers) ? serverQuestion.answers : []
  const options = answers.map((answer) => answer.text)
  const correctIndex = answers.findIndex((answer) => answer.is_correct)

  return {
    ...fallback,
    serverId: serverQuestion.id,
    serverAnswerIds: answers.map((answer) => answer.id),
    text: serverQuestion.prompt || fallback.text,
    options: options.length ? options : fallback.options,
    correct: correctIndex >= 0 ? correctIndex : fallback.correct,
  }
}

function toBroadcastQuestion(question) {
  return {
    id: question.serverId ?? question.id,
    text: question.text,
    options: question.options,
    correct: question.correct,
    contextNote: question.contextNote,
  }
}

/* ────────── LiveKit data helpers (soft-import) ────────── */
let _DataPacket_Kind = null
let _RoomEvent      = null
let _useRoomContext  = null

try {
  const lk    = await import('livekit-client')
  const lkr   = await import('@livekit/components-react')
  _DataPacket_Kind = lk.DataPacket_Kind
  _RoomEvent       = lk.RoomEvent
  _useRoomContext  = lkr.useRoomContext
} catch {
  /* not inside a LiveKitRoom — preview mode */
}

function useRoom() {
  try {
    return _useRoomContext ? _useRoomContext() : null
  } catch {
    return null
  }
}

function useParticipantCount() {
  const room = useRoom()
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!room) return
    const update = () => setCount(room.remoteParticipants.size + 1)
    update()
    room.on('participantConnected', update)
    room.on('participantDisconnected', update)
    return () => {
      room.off('participantConnected', update)
      room.off('participantDisconnected', update)
    }
  }, [room])
  return count
}

/* ────────── Quiz state reducer ────────── */
const INIT = {
  phase:           'idle',      // idle | setup | live | result | ended
  quizMeta: {
    title:           '',
    subject:         '',
    timePerQuestion: DEFAULT_TIME,
  },
  questions:       [blankQuestion()],
  currentQIndex:   0,
  selectedAnswer:  null,        // student's chosen option index
  submitted:       false,
  revealCorrect:   false,
  responseCounts:  {},          // { qId: { A:0, B:0, C:0, D:0 } }
  responseCount:   0,           // total respondents for current Q
  timeLeft:        DEFAULT_TIME,
}

function reducer(state, action) {
  switch (action.type) {

    case 'SET_META':
      return { ...state, quizMeta: { ...state.quizMeta, ...action.payload } }

    case 'SET_QUESTION': {
      const qs = [...state.questions]
      qs[action.index] = { ...qs[action.index], ...action.payload }
      return { ...state, questions: qs }
    }

    case 'ADD_QUESTION':
      return { ...state, questions: [...state.questions, blankQuestion()] }

    case 'REMOVE_QUESTION': {
      if (state.questions.length === 1) return state
      const qs = state.questions.filter((_, i) => i !== action.index)
      return { ...state, questions: qs }
    }

    case 'SET_OPTION': {
      const qs = [...state.questions]
      const opts = [...qs[action.qIndex].options]
      opts[action.optIndex] = action.value
      qs[action.qIndex] = { ...qs[action.qIndex], options: opts }
      return { ...state, questions: qs }
    }

    case 'BEGIN_SETUP':
      return { ...state, phase: 'setup' }

    case 'LAUNCH':
      return {
        ...state,
        phase:          'live',
        currentQIndex:  0,
        selectedAnswer: null,
        submitted:      false,
        revealCorrect:  false,
        timeLeft:       state.quizMeta.timePerQuestion,
        responseCounts: {},
        responseCount:  0,
      }

    case 'NEXT_QUESTION':
      return {
        ...state,
        currentQIndex:  action.index,
        selectedAnswer: null,
        submitted:      false,
        revealCorrect:  false,
        timeLeft:       state.quizMeta.timePerQuestion,
        responseCount:  0,
      }

    case 'SELECT_ANSWER':
      if (state.submitted) return state
      return { ...state, selectedAnswer: action.index }

    case 'SUBMIT':
      return { ...state, submitted: true }

    case 'TICK':
      return { ...state, timeLeft: Math.max(0, state.timeLeft - 1) }

    case 'REVEAL': {
      const q = state.questions[state.currentQIndex]
      const counts = {
        ...state.responseCounts,
        [q.id]: action.counts,
      }
      return { ...state, revealCorrect: true, responseCounts: counts, responseCount: action.total }
    }

    case 'STUDENT_INCOMING': {
      const q = state.questions[state.currentQIndex]
      if (!q) return state
      const existing = state.responseCounts[q.id] || { A: 0, B: 0, C: 0, D: 0 }
      const letter = LETTERS[action.answerIndex]
      return {
        ...state,
        responseCount: state.responseCount + 1,
        responseCounts: {
          ...state.responseCounts,
          [q.id]: { ...existing, [letter]: (existing[letter] || 0) + 1 },
        },
      }
    }

    case 'END':
      return { ...state, phase: 'ended' }

    case 'RESET':
      return { ...INIT, questions: [blankQuestion()] }

    default:
      return state
  }
}

/* ════════════════════════════════════════════════════════════
   LiveQuizCard
   ════════════════════════════════════════════════════════════ */
export default function LiveQuizCard({
  owned = false,
  classId = '',
  sessionLabel = '',
  studentCount,
  accessToken,
  setAccessToken,
}) {
  const [state, dispatch] = useReducer(reducer, INIT)
  const [backendError, setBackendError] = useState('')
  const [savingQuestions, setSavingQuestions] = useState(false)
  const [participantsCount, setParticipantsCount] = useState(null)
  const room       = useRoom()
  const lkCount    = useParticipantCount()
  const timerRef   = useRef(null)
  const liveCount  = studentCount ?? lkCount

  const currentQ = state.questions[state.currentQIndex]

  /* ── publish helper ── */
  const publish = useCallback(async (payload) => {
    if (!room?.localParticipant || !_DataPacket_Kind) return
    try {
      await room.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify(payload)),
        { reliable: true, topic: QUIZ_TOPIC }
      )
    } catch { /* ignore */ }
  }, [room])

  /* ── receive messages ── */
  useEffect(() => {
    if (!room || !_RoomEvent) return
    const handle = (payload, _participant, kind, topic) => {
      if (kind !== _DataPacket_Kind.RELIABLE || topic !== QUIZ_TOPIC) return
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload))

        if (msg.type === 'QUIZ_START' && !owned) {
          dispatch({ type: 'LAUNCH' })
          // hydrate questions from broadcast
          if (msg.quizMeta)  dispatch({ type: 'SET_META',  payload: msg.quizMeta })
        }

        if (msg.type === 'QUIZ_QUESTION' && !owned) {
          dispatch({ type: 'NEXT_QUESTION', index: msg.questionIndex })
        }

        if (msg.type === 'QUIZ_ANSWER' && owned) {
          dispatch({ type: 'STUDENT_INCOMING', answerIndex: msg.answerIndex })
        }

        if (msg.type === 'QUIZ_REVEAL' && !owned) {
          dispatch({ type: 'REVEAL', counts: msg.counts, total: msg.total })
        }

        if (msg.type === 'QUIZ_END' && !owned) {
          dispatch({ type: 'END' })
        }
      } catch { /* ignore */ }
    }
    room.on(_RoomEvent.DataReceived, handle)
    return () => room.off(_RoomEvent.DataReceived, handle)
  }, [room, owned])

  /* ── countdown timer ── */
  useEffect(() => {
    clearInterval(timerRef.current)
    if (state.phase !== 'live' || state.submitted) return
    timerRef.current = setInterval(() => {
      dispatch({ type: 'TICK' })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [state.phase, state.currentQIndex, state.submitted])

  /* ── backend participants count (teacher) ── */
  useEffect(() => {
    if (!owned || !classId) return undefined

    let isActive = true

    const loadParticipants = async () => {
      try {
        const data = await apiFetch(`/examinations/classrooms/${classId}/participants/`, {}, {
          accessToken,
          setAccessToken,
        })
        if (!isActive) return
        const count = Number.isFinite(data?.participants_count) ? data.participants_count : 0
        setParticipantsCount(count)
      } catch {
        if (!isActive) return
      }
    }

    loadParticipants()
    const intervalId = window.setInterval(loadParticipants, 15000)
    return () => {
      isActive = false
      window.clearInterval(intervalId)
    }
  }, [owned, classId, accessToken, setAccessToken])

  /* ── auto-submit on timeout ── */
  useEffect(() => {
    if (state.phase === 'live' && state.timeLeft === 0 && !state.submitted && !owned) {
      dispatch({ type: 'SUBMIT' })
    }
  }, [state.timeLeft, state.phase, state.submitted, owned])

  /* ── teacher: launch quiz ── */
  const handleLaunch = async () => {
    if (savingQuestions) return
    setBackendError('')
    // validate
    if (!state.quizMeta.title.trim()) return
    const valid = state.questions.every(q =>
      q.text.trim() && q.options.every(o => o.trim())
    )
    if (!valid) return

    let launchQuestions = state.questions

    if (owned && classId) {
      setSavingQuestions(true)
      try {
        const savedQuestions = []
        for (const [index, question] of state.questions.entries()) {
          const payload = buildQuestionPayload(question)
          const data = await apiFetch(`/examinations/classrooms/${classId}/questions/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }, {
            accessToken,
            setAccessToken,
          })

          const normalized = normalizeServerQuestion(data?.question, question)
          savedQuestions.push(normalized)
          dispatch({ type: 'SET_QUESTION', index, payload: normalized })
        }

        launchQuestions = savedQuestions
      } catch (err) {
        setBackendError(err.message || 'Failed to save quiz questions.')
        setSavingQuestions(false)
        return
      }
      setSavingQuestions(false)
    }

    dispatch({ type: 'LAUNCH' })
    publish({
      type: 'QUIZ_START',
      quizMeta: state.quizMeta,
      questions: launchQuestions.map(toBroadcastQuestion),
    })
  }

  /* ── teacher: next question ── */
  const handleNextQuestion = () => {
    const next = state.currentQIndex + 1
    if (next >= state.questions.length) {
      dispatch({ type: 'END' })
      publish({ type: 'QUIZ_END' })
      return
    }
    dispatch({ type: 'NEXT_QUESTION', index: next })
    publish({ type: 'QUIZ_QUESTION', questionIndex: next })
  }

  /* ── teacher: reveal results ── */
  const handleReveal = () => {
    const q     = currentQ
    const counts = state.responseCounts[q.id] || { A: 0, B: 0, C: 0, D: 0 }
    const total  = Object.values(counts).reduce((a, b) => a + b, 0)
    dispatch({ type: 'REVEAL', counts, total })
    publish({ type: 'QUIZ_REVEAL', counts, total })
  }

  /* ── student: submit ── */
  const handleStudentSubmit = () => {
    if (state.selectedAnswer === null) return
    dispatch({ type: 'SUBMIT' })
    publish({
      type:        'QUIZ_ANSWER',
      questionIndex: state.currentQIndex,
      answerIndex:   state.selectedAnswer,
    })
  }

  /* ── progress pct ── */
  const progressPct = state.questions.length > 0
    ? Math.round(((state.currentQIndex + (state.phase === 'ended' ? 1 : 0)) / state.questions.length) * 100)
    : 0

  /* ── timer state ── */
  const timerWarn = state.timeLeft > 0 && state.timeLeft <= 10
  const timerStr  = fmt(state.timeLeft)

  /* ════════ RENDER HELPERS ════════ */

  function renderHeader() {
    const showTimer = state.phase === 'live'
    return (
      <div className="quiz-header">
        <div className="quiz-header-left">
          {state.phase === 'live' && <div className="quiz-live-dot" aria-label="Live" />}
          <span className="quiz-header-title">
            {state.phase === 'idle'   ? 'Quiz'           : null}
            {state.phase === 'setup'  ? 'Quiz Setup'      : null}
            {state.phase === 'live'   ? (state.quizMeta.title || 'Quiz') : null}
            {state.phase === 'ended'  ? 'Quiz — Results'  : null}
          </span>
          {sessionLabel && state.phase !== 'setup' && (
            <span style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--text-muted)',
              fontFamily: "'JetBrains Mono', monospace",
              marginLeft: 'var(--space-1)',
            }}>
              · {sessionLabel}
            </span>
          )}
        </div>

        <div className="quiz-header-right">
          {showTimer && (
            <div className={`quiz-timer${timerWarn ? ' warn' : ''}`}>
              <span aria-hidden="true">⏱</span>
              <span aria-label={`${state.timeLeft} seconds remaining`}>{timerStr}</span>
            </div>
          )}

          <div className="quiz-students-badge" aria-label={`${liveCount} students live`}>
            <span aria-hidden="true">👥</span>
            <span>{liveCount}</span>
            <span style={{ opacity: 0.65, fontFamily: 'var(--font-family)' }}>live</span>
          </div>
        </div>
      </div>
    )
  }

  /* ── IDLE phase ── */
  if (state.phase === 'idle') {
    return (
      <div className="quiz-card">
        {renderHeader()}
        <div className="quiz-empty">
          <div className="quiz-empty-icon" aria-hidden="true">📋</div>
          <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--text-secondary)', fontWeight: 600 }}>
            No active quiz
          </p>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
            {owned
              ? 'Create a quiz to challenge your students in real time.'
              : 'The teacher hasn\'t started a quiz yet.'}
          </p>
          {owned && (
            <button
              className="primary"
              onClick={() => {
                setBackendError('')
                dispatch({ type: 'BEGIN_SETUP' })
              }}
              style={{ marginTop: 'var(--space-2)' }}
            >
              + Create quiz
            </button>
          )}
        </div>
      </div>
    )
  }

  /* ── SETUP phase (teacher only) ── */
  if (state.phase === 'setup') {
    return (
      <div className="quiz-card">
        {renderHeader()}
        <div className="quiz-body">
          <div className="quiz-setup">

            {/* Quiz metadata */}
            <div>
              <p className="quiz-setup-section-title">Quiz details</p>
              <div className="form" style={{ gap: 'var(--space-3)' }}>
                <label>
                  Quiz title
                  <input
                    value={state.quizMeta.title}
                    onChange={e => dispatch({ type: 'SET_META', payload: { title: e.target.value } })}
                    placeholder="e.g. Consciousness &amp; Qualia"
                  />
                </label>
                <label>
                  Subject / course tag
                  <input
                    value={state.quizMeta.subject}
                    onChange={e => dispatch({ type: 'SET_META', payload: { subject: e.target.value } })}
                    placeholder="e.g. Philosophy 101"
                  />
                </label>
                <label>
                  Time per question (seconds)
                  <input
                    type="number"
                    min={10}
                    max={300}
                    value={state.quizMeta.timePerQuestion}
                    onChange={e => dispatch({ type: 'SET_META', payload: { timePerQuestion: clamp(Number(e.target.value), 10, 300) } })}
                  />
                </label>
              </div>
            </div>

            {/* Questions */}
            {state.questions.map((q, qi) => (
              <div
                key={q.id}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-4)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--primary)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}>
                    Q{qi + 1}
                  </span>
                  {state.questions.length > 1 && (
                    <button
                      type="button"
                      className="ghost danger"
                      style={{ padding: '0.25rem 0.6rem', fontSize: 'var(--font-size-xs)' }}
                      onClick={() => dispatch({ type: 'REMOVE_QUESTION', index: qi })}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="form" style={{ gap: 'var(--space-2)' }}>
                  <label>
                    Question text
                    <textarea
                      rows={2}
                      value={q.text}
                      onChange={e => dispatch({ type: 'SET_QUESTION', index: qi, payload: { text: e.target.value } })}
                      placeholder="Type your question here…"
                    />
                  </label>

                  {/* Options */}
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', fontWeight: 600, marginTop: 'var(--space-1)' }}>
                    Answer options — mark the correct one ✓
                  </p>
                  {q.options.map((opt, oi) => (
                    <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <button
                        type="button"
                        onClick={() => dispatch({ type: 'SET_QUESTION', index: qi, payload: { correct: oi } })}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 'var(--radius-sm)',
                          border: '2px solid',
                          borderColor: q.correct === oi ? 'var(--success)' : 'var(--border-bright)',
                          background: q.correct === oi ? 'var(--success-bg)' : 'var(--bg-card)',
                          color: q.correct === oi ? 'var(--success)' : 'var(--text-muted)',
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 'var(--font-size-xs)',
                          fontWeight: 700,
                          flexShrink: 0,
                          cursor: 'pointer',
                        }}
                        aria-label={`Mark option ${LETTERS[oi]} as correct`}
                      >
                        {LETTERS[oi]}
                      </button>
                      <input
                        value={opt}
                        onChange={e => dispatch({ type: 'SET_OPTION', qIndex: qi, optIndex: oi, value: e.target.value })}
                        placeholder={`Option ${LETTERS[oi]}…`}
                        style={{ flex: 1 }}
                      />
                    </div>
                  ))}

                  {/* Context note */}
                  <label style={{ marginTop: 'var(--space-1)' }}>
                    Context note (hint for students)
                    <input
                      value={q.contextNote}
                      onChange={e => dispatch({ type: 'SET_QUESTION', index: qi, payload: { contextNote: e.target.value } })}
                      placeholder="Refer to your lecture notes on…"
                    />
                  </label>
                </div>
              </div>
            ))}

            <button
              type="button"
              className="ghost"
              onClick={() => dispatch({ type: 'ADD_QUESTION' })}
              style={{ alignSelf: 'flex-start' }}
            >
              + Add question
            </button>
          </div>

          {backendError && (
            <p className="error" style={{ marginTop: 'var(--space-2)' }}>
              {backendError}
            </p>
          )}
        </div>

        <div className="quiz-footer">
          <button
            type="button"
            className="ghost"
            onClick={() => {
              setBackendError('')
              dispatch({ type: 'RESET' })
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="primary"
            onClick={handleLaunch}
            disabled={
              savingQuestions ||
              !state.quizMeta.title.trim() ||
              state.questions.some(q => !q.text.trim() || q.options.some(o => !o.trim()))
            }
          >
            {savingQuestions
              ? 'Saving...'
              : `Launch quiz (${state.questions.length} Q${state.questions.length !== 1 ? 's' : ''})`}
          </button>
        </div>
      </div>
    )
  }

  /* ── LIVE phase ── */
  if (state.phase === 'live') {
    const totalResponses = state.responseCount
    const responseCounts = state.responseCounts[currentQ?.id] || {}
    const maxCount       = Math.max(1, ...Object.values(responseCounts))

    return (
      <div className="quiz-card">
        {renderHeader()}
        <div className="quiz-body">

          {/* Meta row: subject + progress */}
          <div className="quiz-meta-row">
            <div>
              {(state.quizMeta.subject || sessionLabel) && (
                <p className="quiz-subject-tag">
                  {state.quizMeta.subject || sessionLabel}
                </p>
              )}
              <h2 className="quiz-title-text">{state.quizMeta.title}</h2>
            </div>
            <div className="quiz-progress-group">
              <div className="quiz-q-counter">
                {state.currentQIndex + 1}
                <span> / {state.questions.length}</span>
              </div>
              <div className="quiz-progress-bar" aria-hidden="true">
                <div
                  className="quiz-progress-fill"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Stats row (teacher only) */}
          {owned && (
            <div className="quiz-stats-row">
              <div className="quiz-stat-cell">
                <span className="quiz-stat-label">Students live</span>
                <span className="quiz-stat-value accent">{liveCount}</span>
              </div>
              <div className="quiz-stat-cell">
                <span className="quiz-stat-label">Involved</span>
                <span className="quiz-stat-value">
                  {participantsCount === null ? '-' : participantsCount}
                </span>
              </div>
              <div className="quiz-stat-cell">
                <span className="quiz-stat-label">Responded</span>
                <span className="quiz-stat-value">{totalResponses}</span>
              </div>
              <div className="quiz-stat-cell">
                <span className="quiz-stat-label">Time left</span>
                <span className={`quiz-stat-value${timerWarn ? ' accent' : ''}`}>
                  {timerStr}
                </span>
              </div>
            </div>
          )}

          {/* Active question card */}
          <div className="quiz-question-card">
            <div className="quiz-question-card-header">
              <span className="quiz-question-label">Active question</span>
              {!owned && state.submitted && (
                <div className="quiz-submitted-banner">
                  <span aria-hidden="true">✓</span> Answer submitted
                </div>
              )}
            </div>
            <p className="quiz-question-text">{currentQ?.text}</p>

            {/* Options */}
            <div className="quiz-options">
              {currentQ?.options.map((opt, oi) => {
                const letter    = LETTERS[oi]
                const isCorrect = oi === currentQ.correct
                const isSelected = state.selectedAnswer === oi

                // student: show selection + optional reveal
                // teacher: show result bars after reveal
                if (owned && state.revealCorrect) {
                  const count = responseCounts[letter] || 0
                  const pct   = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0
                  return (
                    <div
                      key={oi}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                        padding: 'var(--space-2) 0',
                      }}
                    >
                      <span
                        className="quiz-option-letter"
                        style={{
                          borderColor: isCorrect ? 'var(--success)' : 'var(--border-bright)',
                          background:  isCorrect ? 'var(--success-bg)' : 'var(--bg-card)',
                          color:       isCorrect ? 'var(--success)' : 'var(--text-secondary)',
                          flexShrink: 0,
                        }}
                      >
                        {letter}
                      </span>
                      <div className="quiz-result-bar-wrap">
                        <div className="quiz-result-label">
                          <span style={{ color: isCorrect ? 'var(--success)' : 'var(--text-secondary)' }}>{opt}</span>
                          <span>{count} ({pct}%)</span>
                        </div>
                        <div className="quiz-result-bar-track">
                          <div
                            className={`quiz-result-bar-fill${isCorrect ? ' is-correct' : ''}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                }

                // student answer options
                let optClass = 'quiz-option'
                if (!owned) {
                  if (state.revealCorrect) {
                    if (isCorrect)  optClass += ' correct'
                    else if (isSelected) optClass += ' incorrect'
                  } else {
                    if (isSelected) optClass += ' selected'
                  }
                } else {
                  // teacher preview — highlight correct
                  if (isCorrect && !state.revealCorrect) optClass += ' selected'
                }

                return (
                  <button
                    key={oi}
                    type="button"
                    className={optClass}
                    onClick={() => !owned && dispatch({ type: 'SELECT_ANSWER', index: oi })}
                    disabled={owned || state.submitted}
                    aria-pressed={isSelected}
                  >
                    <span className="quiz-option-letter">{letter}</span>
                    <span className="quiz-option-text">{opt}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Context note */}
          {currentQ?.contextNote && (
            <div className="quiz-context">
              <span className="quiz-context-icon" aria-hidden="true">💡</span>
              <p className="quiz-context-text">{currentQ.contextNote}</p>
            </div>
          )}

        </div>

        {/* Footer actions */}
        <div className="quiz-footer">
          {owned ? (
            <>
              {!state.revealCorrect && (
                <button type="button" className="ghost" onClick={handleReveal}>
                  Show results
                </button>
              )}
              <button type="button" className="primary" onClick={handleNextQuestion}>
                {state.currentQIndex + 1 >= state.questions.length ? 'End quiz' : 'Next question →'}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="primary"
              disabled={state.selectedAnswer === null || state.submitted}
              onClick={handleStudentSubmit}
            >
              {state.submitted ? '✓ Submitted' : 'Submit answer'}
            </button>
          )}
        </div>
      </div>
    )
  }

  /* ── ENDED phase ── */
  if (state.phase === 'ended') {
    const totalQs = state.questions.length
    return (
      <div className="quiz-card">
        {renderHeader()}
        <div className="quiz-body">
          <div className="quiz-meta-row">
            <div>
              {(state.quizMeta.subject || sessionLabel) && (
                <p className="quiz-subject-tag">{state.quizMeta.subject || sessionLabel}</p>
              )}
              <h2 className="quiz-title-text">{state.quizMeta.title}</h2>
            </div>
          </div>

          <div className="quiz-stats-row">
            <div className="quiz-stat-cell">
              <span className="quiz-stat-label">Questions</span>
              <span className="quiz-stat-value accent">{totalQs}</span>
            </div>
            <div className="quiz-stat-cell">
              <span className="quiz-stat-label">Students</span>
              <span className="quiz-stat-value">{liveCount}</span>
            </div>
            <div className="quiz-stat-cell">
              <span className="quiz-stat-label">Status</span>
              <span className="quiz-stat-value success" style={{ fontSize: 'var(--font-size-base)' }}>Complete</span>
            </div>
          </div>

          {/* Per-question result summary */}
          {state.questions.map((q, qi) => {
            const counts = state.responseCounts[q.id] || {}
            const total  = Object.values(counts).reduce((a, b) => a + b, 0)
            return (
              <div key={q.id} className="quiz-question-card">
                <div className="quiz-question-card-header">
                  <span className="quiz-question-label">Q{qi + 1}</span>
                  <span style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--text-muted)',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {total} response{total !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="quiz-question-text" style={{ fontSize: 'var(--font-size-sm)', paddingBottom: 'var(--space-3)' }}>
                  {q.text}
                </p>
                <div className="quiz-options" style={{ paddingTop: 0 }}>
                  {q.options.map((opt, oi) => {
                    const letter    = LETTERS[oi]
                    const isCorrect = oi === q.correct
                    const count     = counts[letter] || 0
                    const pct       = total > 0 ? Math.round((count / total) * 100) : 0
                    return (
                      <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-1) 0' }}>
                        <span
                          className="quiz-option-letter"
                          style={{
                            borderColor: isCorrect ? 'var(--success)' : 'var(--border-bright)',
                            background:  isCorrect ? 'var(--success-bg)' : 'var(--bg-card)',
                            color:       isCorrect ? 'var(--success)' : 'var(--text-secondary)',
                          }}
                        >
                          {letter}
                        </span>
                        <div className="quiz-result-bar-wrap">
                          <div className="quiz-result-label">
                            <span style={{ color: isCorrect ? 'var(--success)' : 'var(--text-secondary)' }}>{opt}</span>
                            <span>{count} ({pct}%)</span>
                          </div>
                          <div className="quiz-result-bar-track">
                            <div
                              className={`quiz-result-bar-fill${isCorrect ? ' is-correct' : ''}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {owned && (
          <div className="quiz-footer">
            <button type="button" className="ghost" onClick={() => dispatch({ type: 'RESET' })}>
              Clear quiz
            </button>
            <button type="button" className="primary" onClick={() => dispatch({ type: 'BEGIN_SETUP' })}>
              + New quiz
            </button>
          </div>
        )}
      </div>
    )
  }

  return null
}
