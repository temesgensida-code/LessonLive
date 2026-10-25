import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Copy, Check } from 'lucide-react'
import './canvas.css'

function CodeBlock({ children, className }) {
  const [copied, setCopied] = useState(false)
  const language = className ? className.replace('language-', '') : 'code'

  const handleCopy = () => {
    const text = String(children).replace(/\n$/, '')
    navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="code-block-container">
      <div className="code-block-header">
        <span>{language}</span>
        <button
          type="button"
          className="code-copy-btn"
          onClick={handleCopy}
          aria-label={copied ? 'Code copied' : 'Copy code'}
        >
          {copied ? (
            <>
              <Check size={12} aria-hidden="true" color="var(--success, #22c55e)" /> Copied
            </>
          ) : (
            <>
              <Copy size={12} aria-hidden="true" /> Copy
            </>
          )}
        </button>
      </div>
      <pre>
        <code>{children}</code>
      </pre>
    </div>
  )
}

class MathErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('KaTeX rendering error caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <span className="math-error-fallback" title={this.state.error?.message}>
          {this.props.fallbackText || 'Formula rendering error'}
        </span>
      )
    }
    return this.props.children
  }
}

export default function MarkdownMathRenderer({ content, className = '' }) {
  if (!content) return null

  return (
    <div className={`markdown-math-content ${className}`}>
      <MathErrorBoundary fallbackText={content}>
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
          components={{
            code({ inline, className, children, ...props }) {
              if (inline) {
                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                )
              }
              return (
                <CodeBlock className={className}>
                  {children}
                </CodeBlock>
              )
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </MathErrorBoundary>
    </div>
  )
}
