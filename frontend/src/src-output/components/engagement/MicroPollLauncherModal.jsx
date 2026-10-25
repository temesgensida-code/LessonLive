import { useState, useEffect } from 'react'
import { X, BarChart2, ThumbsUp, CheckSquare, Star, Sliders } from 'lucide-react'
import useLiveKitDataTopic from './useLiveKitDataTopic'
import './engagement.css'

export const POLL_TOPIC = 'lessonlive-poll'

const PRESETS = [
  {
    id: 'thumbs',
    label: 'Thumbs Up / Down',
    icon: ThumbsUp,
    prompt: 'Does this concept make sense?',
    options: ['👍 Yes, clear', '👎 Need recap'],
  },
  {
    id: 'yes_no',
    label: 'Ready to Move On?',
    icon: CheckSquare,
    prompt: 'Are you ready to move to the next exercise?',
    options: ['✅ Yes, ready', '❌ Wait a moment'],
  },
  {
    id: 'confidence',
    label: 'Confidence 1 to 5',
    icon: Star,
    prompt: 'Rate your confidence in solving this problem:',
    options: ['1 ⭐', '2 ⭐', '3 ⭐', '4 ⭐', '5 ⭐'],
  },
]

function MicroPollLauncherModal({ isOpen, onClose, onPollLaunched }) {
  const [selectedPreset, setSelectedPreset] = useState('thumbs')
  const [prompt, setPrompt] = useState(PRESETS[0].prompt)
  const [options, setOptions] = useState(PRESETS[0].options)
  const [duration, setDuration] = useState(15)

  const { publish } = useLiveKitDataTopic(POLL_TOPIC)

  useEffect(() => {
    const preset = PRESETS.find((p) => p.id === selectedPreset)
    if (preset) {
      setPrompt(preset.prompt)
      setOptions(preset.options)
    }
  }, [selectedPreset])

  if (!isOpen) return null

  const handleLaunch = async (e) => {
    e.preventDefault()
    if (!prompt.trim() || options.length < 2) return

    const poll = {
      id: `poll-${Date.now()}`,
      prompt: prompt.trim(),
      options: options.map((opt) => opt.trim()).filter(Boolean),
      durationSeconds: Number(duration),
      startedAt: Date.now(),
      closed: false,
    }

    await publish?.({
      type: 'POLL_START',
      poll,
    })

    if (onPollLaunched) {
      onPollLaunched(poll)
    }
    onClose()
  }

  return (
    <div
      className="custom-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="micropoll-modal-title"
    >
      <div className="custom-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
        <button
          type="button"
          className="custom-modal-close"
          onClick={onClose}
          aria-label="Close poll launcher"
        >
          <X size={18} aria-hidden="true" />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
          <BarChart2 size={20} color="var(--primary)" aria-hidden="true" />
          <h3 id="micropoll-modal-title" style={{ margin: 0, fontSize: '1.1rem' }}>
            Launch 1-Click Micro-Poll
          </h3>
        </div>

        {/* Preset Selector */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
          {PRESETS.map((p) => {
            const Icon = p.icon
            const isActive = selectedPreset === p.id
            return (
              <button
                key={p.id}
                type="button"
                className={`filter-chip ${isActive ? 'active' : ''}`}
                onClick={() => setSelectedPreset(p.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '0.6rem 0.3rem',
                  borderRadius: '8px',
                  height: 'auto',
                }}
              >
                <Icon size={18} aria-hidden="true" />
                <span style={{ fontSize: '0.75rem', textAlign: 'center' }}>{p.label}</span>
              </button>
            )
          })}
        </div>

        <form onSubmit={handleLaunch} className="form">
          <div className="form-group">
            <label htmlFor="poll-prompt-input">Question Prompt</label>
            <input
              id="poll-prompt-input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Options</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {options.map((opt, idx) => (
                <span
                  key={idx}
                  style={{
                    padding: '0.25rem 0.6rem',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                  }}
                >
                  {opt}
                </span>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="poll-duration-select">Timer Duration</label>
            <select
              id="poll-duration-select"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            >
              <option value={10}>10 Seconds (Quick check)</option>
              <option value={15}>15 Seconds (Standard)</option>
              <option value={30}>30 Seconds (Extended)</option>
            </select>
          </div>

          <div className="row" style={{ justifyContent: 'flex-end', gap: '8px', marginTop: '1.25rem' }}>
            <button type="button" className="ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary">
              Broadcast Poll Now
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default MicroPollLauncherModal
