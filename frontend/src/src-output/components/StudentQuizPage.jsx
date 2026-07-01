/**
 * StudentQuizPage.jsx
 *
 * Full-screen student-facing quiz page for LessonLive.
 * Mirrors the visual language of LiveQuizCard (teacher side).
 *
 * Student flow:
 *   waiting → answering → submitted → reveal → (next Q) → ended
 *
 * Communicates over the LiveKit data channel (topic: 'lessonlive-quiz').
 * Falls back gracefully to demo/preview mode when outside a LiveKitRoom.
 *
 * Props
 * ──────
 *   studentName   {string}   displayed in header
 *   sessionLabel  {string}   e.g. "Philosophy 101"
 *   classId       {string}   classroom id for examination endpoints
 *   accessToken   {string}   JWT access token for API calls
 *   setAccessToken {function} access token setter for refresh
 *   onQuizVisibilityChange {function} called with true when quiz is active
 *
 * Usage:
 *   <StudentQuizPage studentName="Alex" sessionLabel="Biology 101" />
 */

import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { apiFetch } from './apiClient'
import './StudentQuizPage.css'
import { FileQuestionMark, Star } from 'lucide-react';
import { PartyPopper } from 'lucide-react';
import { Lightbulb } from 'lucide-react';
import { Trophy } from 'lucide-react';
import { Star } from 'lucide-react';
import { ThumbsUp } from 'lucide-react';
import { LibraryBig } from 'lucide-react';

/* ────────── constants ────────── */
const QUIZ_TOPIC = 'lessonlive-quiz'
const LETTERS = ['A', 'B', 'C', 'D']
const DEFAULT_TIME = 60

/* ────────── helpers ────────── */
function pad(n) { return String(n).padStart(2, '0') }
function fmt(secs) { return `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}` }

/* ────────── LiveKit soft-import ────────── */
let _DataPacket_Kind = null
let _RoomEvent = null
let _useRoomContext = null

try {
  const lk = await import('livekit-client')
  const lkr = await import('@livekit/components-react')
  _DataPacket_Kind = lk.DataPacket_Kind
  _RoomEvent = lk.RoomEvent
  _useRoomContext = lkr.useRoomContext
} catch { /* preview mode */ }

function useRoom() {
  try { return _useRoomContext ? _useRoomContext() : null } catch { return null }
}

/* ────────── State reducer ────────── */
const INIT = {
  phase: 'waiting',   // waiting | answering | submitted | reveal | ended
  quizMeta: {
    title: '',
    subject: '',
    timePerQuestion: DEFAULT_TIME,
  },
  questions: [],          // hydrated from QUIZ_START broadcast
  currentQIndex: 0,
  selectedAnswer: null,        // index 0-3
  submitted: false,
  revealCounts: null,        // { A, B, C, D } from teacher
  revealTotal: 0,
  timeLeft: DEFAULT_TIME,
  score: 0,           // correct answers tally
  answersByQuestion: {},
  correctByQuestion: {},
}

function reducer(state, action) {
  switch (action.type) {

    case 'QUIZ_START':
      return {
        ...INIT,
        phase: 'answering',
        quizMeta: action.quizMeta || INIT.quizMeta,
        questions: action.questions || [],
        timeLeft: (action.quizMeta?.timePerQuestion) || DEFAULT_TIME,
        answersByQuestion: {},
        correctByQuestion: {},
      }

    case 'NEXT_QUESTION':
      return {
        ...state,
        phase: 'answering',
        currentQIndex: action.index,
        selectedAnswer: null,
        submitted: false,
        revealCounts: null,
        revealTotal: 0,
        timeLeft: state.quizMeta.timePerQuestion || DEFAULT_TIME,
      }

    case 'SELECT_ANSWER':
      if (state.submitted) return state
      return { ...state, selectedAnswer: action.index }

    case 'SUBMIT': {
      const nextAnswers = action.answerEntry
        ? { ...state.answersByQuestion, [action.answerEntry.questionKey]: action.answerEntry }
        : state.answersByQuestion
      return { ...state, submitted: true, phase: 'submitted', answersByQuestion: nextAnswers }
    }

    case 'TICK':
      return { ...state, timeLeft: Math.max(0, state.timeLeft - 1) }

    case 'REVEAL': {
      const q = state.questions[state.currentQIndex]
      const correctIndex = Number.isInteger(action.correctIndex)
        ? action.correctIndex
        : q?.correct
      const wasCorrect = q && Number.isInteger(correctIndex)
        ? state.selectedAnswer === correctIndex
        : false
      const questionKey = q?.id ?? state.currentQIndex
      return {
        ...state,
        phase: 'reveal',
        revealCounts: action.counts,
        revealTotal: action.total,
        score: wasCorrect ? state.score + 1 : state.score,
        correctByQuestion: {
          ...state.correctByQuestion,
          [questionKey]: correctIndex,
        },
      }
    }

    case 'END':
      return { ...state, phase: 'ended' }

    case 'RESET':
      return { ...INIT }

    default:
      return state
  }
}

/* ════════════════════════════════════════════════════════════
   StudentQuizPage
   ════════════════════════════════════════════════════════════ */
export default function StudentQuizPage({
  studentName = 'Student',
  sessionLabel = '',
  classId = '',
  accessToken,
  setAccessToken,
  onQuizVisibilityChange,
}) {
  const [state, dispatch] = useReducer(reducer, INIT)
  const room = useRoom()
  const timerRef = useRef(null)
  const attemptSubmittedRef = useRef(false)
  const [attemptResult, setAttemptResult] = useState(null)
  const [attemptError, setAttemptError] = useState('')
  const [attemptSaving, setAttemptSaving] = useState(false)

  const currentQ = state.questions[state.currentQIndex]
  const currentQuestionKey = currentQ?.id ?? state.currentQIndex
  const currentCorrectIndex = Number.isInteger(state.correctByQuestion[currentQuestionKey])
    ? state.correctByQuestion[currentQuestionKey]
    : currentQ?.correct
  const totalQs = state.questions.length
  const progressPct = totalQs > 0
    ? Math.round(((state.currentQIndex + (state.phase === 'ended' ? 1 : 0)) / totalQs) * 100)
    : 0
  const timerWarn = state.timeLeft > 0 && state.timeLeft <= 10
  const timerStr = fmt(state.timeLeft)

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

  const loadQuestionsFromBackend = useCallback(async (quizMeta) => {
    if (!classId) return
    try {
      const data = await apiFetch(`/examinations/classrooms/${classId}/questions/`, {}, {
        accessToken,
        setAccessToken,
      })
      const questions = (data?.questions || []).map((question) => ({
        id: question.id,
        text: question.prompt,
        options: (question.answers || []).map((answer) => answer.text),
        answerIds: (question.answers || []).map((answer) => answer.id),
        contextNote: '',
      }))
      dispatch({ type: 'QUIZ_START', quizMeta, questions })
    } catch {
      return
    }
  }, [classId, accessToken, setAccessToken])

  /* ── receive messages from teacher ── */
  useEffect(() => {
    if (!room || !_RoomEvent) return
    const handle = (payload, _p, kind, topic) => {
      if (kind !== _DataPacket_Kind.RELIABLE || topic !== QUIZ_TOPIC) return
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload))

        if (msg.type === 'QUIZ_START') {
          attemptSubmittedRef.current = false
          setAttemptResult(null)
          setAttemptError('')
          if (Array.isArray(msg.questions) && msg.questions.length) {
            dispatch({ type: 'QUIZ_START', quizMeta: msg.quizMeta, questions: msg.questions })
          } else {
            loadQuestionsFromBackend(msg.quizMeta)
          }
        }
        if (msg.type === 'QUIZ_QUESTION') {
          dispatch({ type: 'NEXT_QUESTION', index: msg.questionIndex })
        }
        if (msg.type === 'QUIZ_REVEAL') {
          dispatch({ type: 'REVEAL', counts: msg.counts, total: msg.total, correctIndex: msg.correctIndex })
        }
        if (msg.type === 'QUIZ_END') {
          dispatch({ type: 'END' })
        }
      } catch { /* ignore */ }
    }
    room.on(_RoomEvent.DataReceived, handle)
    return () => room.off(_RoomEvent.DataReceived, handle)
  }, [room, loadQuestionsFromBackend])

  /* ── countdown timer ── */
  useEffect(() => {
    clearInterval(timerRef.current)
    if (state.phase !== 'answering') return
    timerRef.current = setInterval(() => dispatch({ type: 'TICK' }), 1000)
    return () => clearInterval(timerRef.current)
  }, [state.phase, state.currentQIndex])

  /* ── auto-submit on timeout ── */
  useEffect(() => {
    if (state.phase === 'answering' && state.timeLeft === 0 && !state.submitted) {
      handleSubmit()
    }
  }, [state.timeLeft])

  /* ── submit handler ── */
  const handleSubmit = () => {
    const answerIndex = state.selectedAnswer
    const questionId = Number.isFinite(Number(currentQ?.id)) ? Number(currentQ.id) : null
    const answerId = Number.isFinite(Number(currentQ?.answerIds?.[answerIndex]))
      ? Number(currentQ.answerIds[answerIndex])
      : null
    const answerEntry = {
      questionKey: currentQuestionKey,
      questionId,
      answerId,
      answerIndex,
    }

    dispatch({ type: 'SUBMIT', answerEntry })
    if (answerIndex !== null) {
      publish({
        type: 'QUIZ_ANSWER',
        questionIndex: state.currentQIndex,
        answerIndex,
      })
    }
  }

  const submitAttempt = useCallback(async () => {
    if (!classId || attemptSubmittedRef.current) return

    const entries = Object.values(state.answersByQuestion)
      .filter((entry) => Number.isFinite(entry.questionId) && Number.isFinite(entry.answerId))
      .map((entry) => ({
        question_id: entry.questionId,
        answer_id: entry.answerId,
      }))

    if (!entries.length) return

    setAttemptSaving(true)
    setAttemptError('')
    try {
      const data = await apiFetch(`/examinations/classrooms/${classId}/attempts/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: entries }),
      }, { accessToken, setAccessToken })

      attemptSubmittedRef.current = true
      setAttemptResult(data)
    } catch (err) {
      setAttemptError(err.message)
    } finally {
      setAttemptSaving(false)
    }
  }, [classId, accessToken, setAccessToken, state.answersByQuestion])

  useEffect(() => {
    if (state.phase === 'ended') {
      submitAttempt()
    }
  }, [state.phase, submitAttempt])

  useEffect(() => {
    if (typeof onQuizVisibilityChange === 'function') {
      onQuizVisibilityChange(state.phase !== 'waiting')
    }
  }, [state.phase, onQuizVisibilityChange])

  /* ════════ RENDER ════════ */

  /* ── Persistent header ── */
  function renderHeader() {
    const showTimer = state.phase === 'answering' || state.phase === 'submitted'
    return (
      <header className="sq-header">
        <div className="sq-header-left">
          {(state.phase === 'answering' || state.phase === 'submitted' || state.phase === 'reveal') && (
            <div className="sq-live-dot" aria-label="Quiz live" />
          )}
          <span className="sq-header-title">
            {state.phase === 'waiting' ? 'Quiz' : (state.quizMeta.title || 'Quiz')}
          </span>
          {(state.quizMeta.subject || sessionLabel) && state.phase !== 'waiting' && (
            <span className="sq-header-subject">
              · {state.quizMeta.subject || sessionLabel}
            </span>
          )}
        </div>

        <div className="sq-header-right">
          {showTimer && (
            <div className={`sq-timer${timerWarn ? ' warn' : ''}`} aria-label={`${state.timeLeft} seconds remaining`}>
              <span aria-hidden="true">⏱</span>
              <span>{timerStr}</span>
            </div>
          )}
          <div className="sq-student-badge">
            <span aria-hidden="true">🎓</span>
            <span>{studentName}</span>
          </div>
        </div>
      </header>
    )
  }

  /* ── WAITING phase ── */
  if (state.phase === 'waiting') {
    return (
      <div className="sq-page">
        {renderHeader()}
        <main className="sq-main">
          <div className="sq-waiting">
            <div className="sq-waiting-pulse" aria-hidden="true">
              <div className="sq-waiting-icon"><FileQuestionMark /></div>
            </div>
            <h2 className="sq-waiting-title">Waiting for quiz to start…</h2>
            <p className="sq-waiting-sub">
              Your teacher is setting up the quiz. Stay on this page — it will begin automatically.
            </p>
            <div className="sq-waiting-dots" aria-hidden="true">
              <span /><span /><span />
            </div>
          </div>
        </main>
      </div>
    )
  }

  /* ── ANSWERING / SUBMITTED / REVEAL phase ── */
  if (['answering', 'submitted', 'reveal'].includes(state.phase)) {
    const counts = state.revealCounts || {}
    const total = state.revealTotal || 0
    const isReveal = state.phase === 'reveal'

    return (
      <div className="sq-page">
        {renderHeader()}

        {/* Progress track */}
        <div className="sq-progress-track" aria-hidden="true">
          <div className="sq-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>

        <main className="sq-main">

          {/* Meta bar */}
          <div className="sq-meta-bar">
            <div className="sq-q-pill">
              Q{state.currentQIndex + 1}
              <span> / {totalQs}</span>
            </div>

            {state.phase === 'submitted' && !isReveal && (
              <div className="sq-submitted-badge">
                <span aria-hidden="true">✓</span> Answer submitted — waiting for results
              </div>
            )}

            {isReveal && (
              <div className={`sq-reveal-badge ${state.selectedAnswer === currentCorrectIndex ? 'correct' : 'incorrect'}`}>
                {state.selectedAnswer === currentCorrectIndex
                  ? <><PartyPopper />Correct</>
                  : `✗ The answer was ${LETTERS[currentCorrectIndex ?? 0]}`}
              </div>
            )}
          </div>

          {/* Question card */}
          <div className="sq-question-card">
            <div className="sq-question-card-header">
              <span className="sq-question-label">Question {state.currentQIndex + 1}</span>
              {currentQ?.contextNote && (
                <div className="sq-context-inline">
                  <span aria-hidden="true"><LightBulb /></span>
                  <span>{currentQ.contextNote}</span>
                </div>
              )}
            </div>
            <p className="sq-question-text">{currentQ?.text}</p>
          </div>

          {/* Options */}
          <div className="sq-options" role="radiogroup" aria-label="Answer options">
            {currentQ?.options.map((opt, oi) => {
              const letter = LETTERS[oi]
              const isSelected = state.selectedAnswer === oi
              const isCorrect = oi === currentCorrectIndex
              const count = counts[letter] || 0
              const pct = total > 0 ? Math.round((count / total) * 100) : 0

              let cls = 'sq-option'
              if (isReveal) {
                if (isCorrect) cls += ' correct'
                else if (isSelected) cls += ' incorrect'
              } else {
                if (isSelected) cls += ' selected'
              }

              return (
                <button
                  key={oi}
                  type="button"
                  className={cls}
                  onClick={() => state.phase === 'answering' && dispatch({ type: 'SELECT_ANSWER', index: oi })}
                  disabled={state.phase !== 'answering'}
                  aria-pressed={isSelected}
                  aria-label={`Option ${letter}: ${opt}`}
                >
                  <span className="sq-option-letter">{letter}</span>
                  <span className="sq-option-text">{opt}</span>

                  {/* Result bar overlay shown on reveal */}
                  {isReveal && (
                    <div className="sq-option-bar-wrap" aria-hidden="true">
                      <div
                        className={`sq-option-bar${isCorrect ? ' correct' : ''}`}
                        style={{ width: `${pct}%` }}
                      />
                      <span className="sq-option-pct">{pct}%</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Score chip on reveal */}
          {isReveal && (
            <div className="sq-score-row">
              <div className="sq-score-chip">
                <span className="sq-score-label">Your score</span>
                <span className="sq-score-value">{state.score} / {state.currentQIndex + 1}</span>
              </div>
              <p className="sq-reveal-note">
                {total} student{total !== 1 ? 's' : ''} answered · waiting for next question…
              </p>
            </div>
          )}

        </main>

        {/* Footer */}
        <footer className="sq-footer">
          <button
            type="button"
            className="sq-btn primary"
            disabled={state.selectedAnswer === null || state.phase !== 'answering'}
            onClick={handleSubmit}
          >
            {state.phase === 'submitted' ? '✓ Submitted' : state.phase === 'reveal' ? '✓ Submitted' : 'Submit answer'}
          </button>
        </footer>
      </div>
    )
  }

  /* ── ENDED phase ── */
  if (state.phase === 'ended') {
    const scorePercent = totalQs > 0 ? Math.round((state.score / totalQs) * 100) : 0
    const attempt = attemptResult?.attempt
    const attemptAnswers = Array.isArray(attemptResult?.answers) ? attemptResult.answers : []
    const grade =
      scorePercent >= 90 ? { label: 'Outstanding', emoji: <Trophy />, cls: 'gold' } :
        scorePercent >= 75 ? { label: 'Great job!', emoji: <Star />, cls: 'blue' } :
          scorePercent >= 50 ? { label: 'Good effort', emoji: <ThumbsUp />, cls: 'green' } :
            { label: 'Keep practising', emoji: <LibraryBig />, cls: 'muted' }

    return (
      <div className="sq-page">
        {renderHeader()}
        <main className="sq-main">

          {/* Score hero */}
          <div className={`sq-result-hero ${grade.cls}`}>
            <div className="sq-result-emoji" aria-hidden="true">{grade.emoji}</div>
            <h2 className="sq-result-label">{grade.label}</h2>
            <div className="sq-result-score">
              <span className="sq-result-score-num">{state.score}</span>
              <span className="sq-result-score-denom"> / {totalQs}</span>
            </div>
            <p className="sq-result-pct">{scorePercent}% correct</p>

            {/* Arc ring */}
            <svg className="sq-result-ring" viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="52" className="sq-ring-track" />
              <circle
                cx="60" cy="60" r="52"
                className="sq-ring-fill"
                strokeDasharray={`${(scorePercent / 100) * 327} 327`}
              />
            </svg>
          </div>

          {/* Stats strip */}
          <div className="sq-end-stats">
            <div className="sq-end-stat">
              <span className="sq-end-stat-label">Questions</span>
              <span className="sq-end-stat-value">{totalQs}</span>
            </div>
            <div className="sq-end-stat">
              <span className="sq-end-stat-label">Correct</span>
              <span className="sq-end-stat-value accent">{state.score}</span>
            </div>
            <div className="sq-end-stat">
              <span className="sq-end-stat-label">Score</span>
              <span className="sq-end-stat-value">{scorePercent}%</span>
            </div>
          </div>

          {attemptSaving && <p className="muted">Saving your attempt…</p>}
          {attemptError && <p className="error">{attemptError}</p>}
          {attempt && (
            <div className="sq-end-stats">
              <div className="sq-end-stat">
                <span className="sq-end-stat-label">Attempt</span>
                <span className="sq-end-stat-value">#{attempt.id}</span>
              </div>
              <div className="sq-end-stat">
                <span className="sq-end-stat-label">Answered</span>
                <span className="sq-end-stat-value">{attempt.answered_count}</span>
              </div>
              <div className="sq-end-stat">
                <span className="sq-end-stat-label">Score</span>
                <span className="sq-end-stat-value">{attempt.score_percent}%</span>
              </div>
            </div>
          )}

          {/* Per-question review */}
          <div className="sq-review-section">
            <p className="sq-review-heading">Question review</p>
            {(attemptAnswers.length ? attemptAnswers : state.questions).map((item, qi) => {
              const isAttemptAnswer = Boolean(item.question_id || item.question_prompt)
              if (isAttemptAnswer) {
                const answerIndex = state.answersByQuestion[item.question_id]?.answerIndex
                const letter = Number.isInteger(answerIndex) ? LETTERS[answerIndex] : '-'
                return (
                  <div key={item.id || item.question_id || qi} className="sq-review-card">
                    <div className="sq-review-card-header">
                      <span className="sq-review-label">Q{qi + 1}</span>
                      <span className="sq-review-qtext">{item.question_prompt}</span>
                    </div>
                    <div className="sq-review-answer">
                      <span className="sq-review-answer-letter">{letter}</span>
                      <span className="sq-review-answer-text">{item.selected_answer_text}</span>
                      <span className={`sq-review-tag ${item.is_correct ? 'correct' : 'incorrect'}`}>
                        {item.is_correct ? 'Correct' : 'Incorrect'}
                      </span>
                    </div>
                  </div>
                )
              }

              const q = item
              const correctIndex = Number.isInteger(state.correctByQuestion[q.id ?? qi])
                ? state.correctByQuestion[q.id ?? qi]
                : q.correct
              const isCorrect = Number.isInteger(correctIndex)
              const answerText = isCorrect ? q.options[correctIndex] : 'Answer unavailable'

              return (
                <div key={q.id || qi} className="sq-review-card">
                  <div className="sq-review-card-header">
                    <span className="sq-review-label">Q{qi + 1}</span>
                    <span className="sq-review-qtext">{q.text}</span>
                  </div>
                  <div className="sq-review-answer">
                    <span className="sq-review-answer-letter">
                      {isCorrect ? LETTERS[correctIndex] : '-'}
                    </span>
                    <span className="sq-review-answer-text">{answerText}</span>
                    <span className={`sq-review-tag ${isCorrect ? 'correct' : 'incorrect'}`}>
                      {isCorrect ? 'Correct answer' : 'Correct answer unavailable'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

        </main>

        <footer className="sq-footer">
          <p className="sq-footer-note">Quiz complete · {state.quizMeta.subject || sessionLabel}</p>
        </footer>
      </div>
    )
  }

  return null
}
