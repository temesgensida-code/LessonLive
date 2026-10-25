import React, { useState } from 'react'
import {
  Bold,
  Italic,
  Heading2,
  List,
  ListOrdered,
  Code,
  Table,
  Quote,
  Sigma,
} from 'lucide-react'
import MathFormulaPicker from './MathFormulaPicker'

export default function MarkdownToolbar({ onInsert, mode, onModeChange }) {
  const [showFormulaPicker, setShowFormulaPicker] = useState(false)

  return (
    <div className="rich-toolbar" role="toolbar" aria-label="Markdown formatting toolbar">
      <div className="toolbar-group">
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => onInsert('**', '**', 'bold text')}
          title="Bold (Ctrl+B)"
          aria-label="Format Bold"
        >
          <Bold size={15} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => onInsert('*', '*', 'italic text')}
          title="Italic (Ctrl+I)"
          aria-label="Format Italic"
        >
          <Italic size={15} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => onInsert('### ', '', 'Heading')}
          title="Heading"
          aria-label="Format Heading"
        >
          <Heading2 size={15} aria-hidden="true" />
        </button>
      </div>

      <div className="toolbar-divider" aria-hidden="true" />

      <div className="toolbar-group">
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => onInsert('- ', '', 'List item')}
          title="Bulleted List"
          aria-label="Insert Bullet List"
        >
          <List size={15} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => onInsert('1. ', '', 'Numbered item')}
          title="Numbered List"
          aria-label="Insert Numbered List"
        >
          <ListOrdered size={15} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => onInsert('> ', '', 'Quote text')}
          title="Quote"
          aria-label="Insert Blockquote"
        >
          <Quote size={15} aria-hidden="true" />
        </button>
      </div>

      <div className="toolbar-divider" aria-hidden="true" />

      <div className="toolbar-group" style={{ position: 'relative' }}>
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => onInsert('```js\n', '\n```', 'console.log("hello");')}
          title="Code Block"
          aria-label="Insert Code Block"
        >
          <Code size={15} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => onInsert('\n| Concept | Description |\n| :--- | :--- |\n| Term | Definition |\n', '', '')}
          title="Table"
          aria-label="Insert Markdown Table"
        >
          <Table size={15} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={`toolbar-btn ${showFormulaPicker ? 'active' : ''}`}
          onClick={() => setShowFormulaPicker((prev) => !prev)}
          title="Insert Math Formula (LaTeX)"
          aria-label="Insert Math Formula"
          aria-expanded={showFormulaPicker}
        >
          <Sigma size={15} aria-hidden="true" />
        </button>

        {showFormulaPicker && (
          <MathFormulaPicker
            onSelectFormula={(snippet) => onInsert(snippet, '', '')}
            onClose={() => setShowFormulaPicker(false)}
          />
        )}
      </div>

      {onModeChange && (
        <div className="toolbar-mode-switch" role="group" aria-label="Editor view mode">
          <button
            type="button"
            className={`toolbar-mode-btn ${mode === 'edit' ? 'active' : ''}`}
            onClick={() => onModeChange('edit')}
            aria-pressed={mode === 'edit'}
          >
            Edit
          </button>
          <button
            type="button"
            className={`toolbar-mode-btn ${mode === 'split' ? 'active' : ''}`}
            onClick={() => onModeChange('split')}
            aria-pressed={mode === 'split'}
          >
            Split
          </button>
          <button
            type="button"
            className={`toolbar-mode-btn ${mode === 'preview' ? 'active' : ''}`}
            onClick={() => onModeChange('preview')}
            aria-pressed={mode === 'preview'}
          >
            Preview
          </button>
        </div>
      )}
    </div>
  )
}
