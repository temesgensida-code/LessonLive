import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import MarkdownMathRenderer from '../../src-output/components/canvas/MarkdownMathRenderer'

describe('MarkdownMathRenderer component', () => {
  it('renders standard markdown elements (headers, lists, bold, blockquotes)', () => {
    const markdown = `# Title Heading\n\n**Bold Statement** and *Italic note*.\n\n- Point One\n- Point Two\n\n> Important quote`
    const { container } = render(<MarkdownMathRenderer content={markdown} />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Title Heading')
    expect(screen.getByText('Bold Statement')).toBeInTheDocument()
    expect(screen.getByText('Point One')).toBeInTheDocument()
    expect(container.querySelector('blockquote')).toHaveTextContent('Important quote')
  })

  it('renders inline and block KaTeX math formulas', () => {
    const mathContent = 'The famous equation is $E=mc^2$.\n\n$$\n\\frac{1}{2}\n$$'
    const { container } = render(<MarkdownMathRenderer content={mathContent} />)

    // KaTeX outputs elements with class .katex
    const katexElements = container.querySelectorAll('.katex')
    expect(katexElements.length).toBeGreaterThan(0)
    // Check for display math class or katex elements
    const displayMath = container.querySelector('.katex-display') || container.querySelector('.katex')
    expect(displayMath).toBeInTheDocument()
  })

  it('renders code blocks with language header and copy button', () => {
    const codeContent = '```python\ndef solve():\n    return 42\n```'
    render(<MarkdownMathRenderer content={codeContent} />)

    expect(screen.getByText('python')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /copy code/i })).toBeInTheDocument()
    expect(screen.getByText(/return 42/)).toBeInTheDocument()
  })

  it('handles empty or null content gracefully without crashing', () => {
    const { container } = render(<MarkdownMathRenderer content="" />)
    expect(container.firstChild).toBeNull()
  })
})
