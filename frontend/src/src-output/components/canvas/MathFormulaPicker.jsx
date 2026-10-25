import React from 'react'
import { X, Sigma } from 'lucide-react'

const FORMULA_CATEGORIES = [
  {
    title: 'Fractions & Roots',
    items: [
      { label: 'Fraction', snippet: '\\frac{a}{b}' },
      { label: 'Square Root', snippet: '\\sqrt{x}' },
      { label: 'Nth Root', snippet: '\\sqrt[n]{x}' },
    ],
  },
  {
    title: 'Exponents & Subscripts',
    items: [
      { label: 'Exponent', snippet: 'x^{2}' },
      { label: 'Subscript', snippet: 'x_{i}' },
      { label: 'Sub & Sup', snippet: 'A_{i}^{2}' },
    ],
  },
  {
    title: 'Calculus & Sums',
    items: [
      { label: 'Derivative', snippet: '\\frac{df}{dx}' },
      { label: 'Definite Integral', snippet: '\\int_{a}^{b} f(x) \\, dx' },
      { label: 'Summation', snippet: '\\sum_{i=1}^{n} x_i' },
      { label: 'Limit', snippet: '\\lim_{x \\to 0} f(x)' },
    ],
  },
  {
    title: 'Common STEM Formulas',
    items: [
      { label: 'Quadratic Formula', snippet: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
      { label: 'Einstein Energy', snippet: 'E = mc^2' },
      { label: 'Pythagorean', snippet: 'a^2 + b^2 = c^2' },
    ],
  },
  {
    title: 'Greek Symbols',
    items: [
      { label: 'Alpha, Beta', snippet: '\\alpha, \\beta' },
      { label: 'Theta, Pi', snippet: '\\theta, \\pi' },
      { label: 'Delta, Lambda', snippet: '\\Delta, \\lambda' },
      { label: 'Sigma, Omega', snippet: '\\Sigma, \\Omega' },
    ],
  },
]

export default function MathFormulaPicker({ onSelectFormula, onClose }) {
  return (
    <>
      <div className="formula-picker-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="formula-picker-popover" role="dialog" aria-label="STEM Formula Templates">
        <div className="formula-picker-header">
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700 }}>
            <Sigma size={16} color="var(--primary)" aria-hidden="true" /> Formula Templates
          </span>
          <button
            type="button"
            className="toolbar-btn"
            onClick={onClose}
            aria-label="Close formula picker"
            style={{ width: '24px', height: '24px' }}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>

        {FORMULA_CATEGORIES.map((cat) => (
          <div key={cat.title} className="formula-category">
            <div className="formula-category-title">{cat.title}</div>
            <div className="formula-grid">
              {cat.items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className="formula-item-btn"
                  onClick={() => {
                    onSelectFormula(`$${item.snippet}$`)
                    onClose()
                  }}
                  title={item.snippet}
                >
                  <span>{item.label}</span>
                  <code className="formula-preview-latex">{item.snippet.slice(0, 12)}…</code>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
