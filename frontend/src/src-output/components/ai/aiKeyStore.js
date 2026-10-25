const STORAGE_KEY = 'lessonlive_ai_keys'

export const DEFAULT_AI_CONFIG = {
  activeProvider: 'gemini',
  gemini: {
    key: '',
    model: 'gemini-1.5-flash',
  },
  openai: {
    key: '',
    model: 'gpt-4o-mini',
  },
  grok: {
    key: '',
    model: 'grok-2',
  },
}

export function getAIConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_AI_CONFIG }
    const parsed = JSON.parse(raw)
    return {
      activeProvider: parsed.activeProvider || 'gemini',
      gemini: { ...DEFAULT_AI_CONFIG.gemini, ...(parsed.gemini || {}) },
      openai: { ...DEFAULT_AI_CONFIG.openai, ...(parsed.openai || {}) },
      grok: { ...DEFAULT_AI_CONFIG.grok, ...(parsed.grok || {}) },
    }
  } catch {
    return { ...DEFAULT_AI_CONFIG }
  }
}

export function saveAIConfig(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {
    // Graceful fallback if storage unavailable
  }
}

export function getActiveProviderCredentials() {
  const config = getAIConfig()
  const provider = config.activeProvider || 'gemini'
  const creds = config[provider] || {}
  return {
    provider,
    key: (creds.key || '').trim(),
    model: creds.model || '',
  }
}

export function hasActiveAIKey() {
  const { key } = getActiveProviderCredentials()
  return Boolean(key)
}
