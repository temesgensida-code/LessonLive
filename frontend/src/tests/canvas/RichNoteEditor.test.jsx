import React, { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import RichNoteEditor from '../../src-output/components/canvas/RichNoteEditor'

describe('RichNoteEditor component', () => {
  it('renders textarea with given initial value and accessible labels', () => {
    const handleChange = vi.fn()
    render(
      <RichNoteEditor
        id="test-note-content"
        value="Initial note content"
        onChange={handleChange}
      />
    )

    const textarea = screen.getByLabelText(/note content markdown editor/i)
    expect(textarea).toBeInTheDocument()
    expect(textarea.value).toBe('Initial note content')
  })

  it('switches between edit, split, and preview modes', () => {
    function ControlledEditor() {
      const [val, setVal] = useState('## Sample Heading')
      return <RichNoteEditor value={val} onChange={setVal} />
    }

    render(<ControlledEditor />)

    // Initially in edit mode
    expect(screen.getByLabelText(/note content markdown editor/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/note preview/i)).not.toBeInTheDocument()

    // Switch to split mode
    const splitBtn = screen.getByRole('button', { name: /split/i })
    fireEvent.click(splitBtn)
    expect(screen.getByLabelText(/note content markdown editor/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/note preview/i)).toBeInTheDocument()

    // Switch to preview mode
    const previewBtn = screen.getByRole('button', { name: /preview/i })
    fireEvent.click(previewBtn)
    expect(screen.queryByLabelText(/note content markdown editor/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/note preview/i)).toBeInTheDocument()
  })

  it('inserts markdown bold tags when bold button is clicked', () => {
    const handleChange = vi.fn()
    render(
      <RichNoteEditor
        id="test-editor"
        value=""
        onChange={handleChange}
      />
    )

    const boldBtn = screen.getByRole('button', { name: /format bold/i })
    fireEvent.click(boldBtn)
    expect(handleChange).toHaveBeenCalledWith('**bold text**')
  })

  it('opens and inserts formula from MathFormulaPicker', () => {
    const handleChange = vi.fn()
    render(
      <RichNoteEditor
        id="test-formula-editor"
        value=""
        onChange={handleChange}
      />
    )

    const formulaBtn = screen.getByRole('button', { name: /insert math formula/i })
    fireEvent.click(formulaBtn)

    // Formula dialog should open
    const picker = screen.getByRole('dialog', { name: /stem formula templates/i })
    expect(picker).toBeInTheDocument()

    // Click Quadratic Formula template
    const quadBtn = screen.getByText('Quadratic Formula')
    fireEvent.click(quadBtn)

    expect(handleChange).toHaveBeenCalledWith(expect.stringContaining('\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}'))
  })
})
