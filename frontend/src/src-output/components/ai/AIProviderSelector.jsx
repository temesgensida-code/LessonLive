import { Sparkles } from 'lucide-react'

export const PROVIDERS = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    badge: 'Free Tier / Fast',
    defaultModel: 'gemini-1.5-flash',
    models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'],
  },
  {
    id: 'openai',
    name: 'OpenAI GPT',
    badge: 'GPT-4o-mini',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o'],
  },
  {
    id: 'grok',
    name: 'xAI Grok',
    badge: 'Grok-2',
    defaultModel: 'grok-2',
    models: ['grok-2', 'grok-beta'],
  },
]

export default function AIProviderSelector({ activeProvider, onSelectProvider, disabled = false }) {
  return (
    <div className="ai-provider-tabs" role="tablist" aria-label="AI Providers">
      {PROVIDERS.map((p) => {
        const isActive = activeProvider === p.id
        return (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`ai-provider-tab ${isActive ? 'active' : ''}`}
            onClick={() => onSelectProvider(p.id)}
            disabled={disabled}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {isActive && <Sparkles size={12} color="#a855f7" />}
              <span>{p.name}</span>
            </div>
            <span className="ai-provider-badge">{p.badge}</span>
          </button>
        )
      })}
    </div>
  )
}
