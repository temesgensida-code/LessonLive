import React, { useState, useRef } from 'react'
import MarkdownToolbar from './MarkdownToolbar'
import MarkdownMathRenderer from './MarkdownMathRenderer'

export default function RichNoteEditor({
  id = 'teacher-note-content',
  value = '',
  onChange,
  placeholder = 'Write your lesson note with Markdown & LaTeX ($E=mc^2$)…',
  minHeight = '140px',
  rows = 5,
  required = false,
}) {
  const [mode, setMode] = useState('edit') // 'edit' | 'split' | 'preview'
  const textareaRef = useRef(null)

  const handleInsert = (before, after = '', defaultPlaceholder = '') => {
    const textarea = textareaRef.current
    if (!textarea) {
      onChange((prev) => `${prev}${before}${defaultPlaceholder}${after}`)
      return
    }

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const currentText = textarea.value
    const selectedText = currentText.substring(start, end) || defaultPlaceholder

    const replacement = `${before}${selectedText}${after}`
    const newText = currentText.substring(0, start) + replacement + currentText.substring(end)

    onChange(newText)

    // Move cursor back inside the tags
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + before.length + selectedText.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault()
      handleInsert('**', '**', 'bold text')
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault()
      handleInsert('*', '*', 'italic text')
    } else if (e.key === 'Tab') {
      e.preventDefault()
      handleInsert('  ')
    }
  }

  return (
    <div className="rich-note-editor">
      <MarkdownToolbar
        onInsert={handleInsert}
        mode={mode}
        onModeChange={setMode}
      />

      <div className="editor-panes">
        {mode !== 'preview' && (
          <textarea
            id={id}
            ref={textareaRef}
            className="editor-textarea"
            rows={rows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            required={required}
            style={{ minHeight }}
            aria-label="Note content markdown editor"
          />
        )}

        {mode !== 'edit' && (
          <div
            className="editor-preview-pane"
            style={{ minHeight }}
            aria-label="Note preview"
            role="region"
          >
            {value.trim() ? (
              <MarkdownMathRenderer content={value} />
            ) : (
              <p className="muted" style={{ fontStyle: 'italic', fontSize: '0.88rem' }}>
                Preview will appear here…
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
