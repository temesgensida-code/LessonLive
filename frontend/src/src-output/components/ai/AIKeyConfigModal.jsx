import { useState, useEffect } from 'react'
import { X, Key, Eye, EyeOff, CheckCircle2, AlertCircle, Sparkles, ExternalLink } from 'lucide-react'
import { apiFetch } from '../apiClient'
import { getAIConfig, saveAIConfig } from './aiKeyStore'
import AIProviderSelector, { PROVIDERS } from './AIProviderSelector'
import './ai.css'

export default function AIKeyConfigModal({ isOpen, onClose, accessToken, setAccessToken, onKeySaved }) {
  const [config, setConfig] = useState(getAIConfig())
  const [showKey, setShowKey] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState(null) // { success: bool, message: string }
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setConfig(getAIConfig())
      setShowKey(false)
      setTestResult(null)
      setIsSaved(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const activeProvider = config.activeProvider || 'gemini'
  const activeProviderDef = PROVIDERS.find((p) => p.id === activeProvider) || PROVIDERS[0]
  const currentCreds = config[activeProvider] || { key: '', model: activeProviderDef.defaultModel }

  const handleProviderChange = (providerId) => {
    setConfig((prev) => ({
      ...prev,
      activeProvider: providerId,
    }))
    setTestResult(null)
    setIsSaved(false)
  }

  const handleKeyChange = (val) => {
    setConfig((prev) => ({
      ...prev,
      [activeProvider]: {
        ...(prev[activeProvider] || {}),
        key: val,
      },
    }))
    setTestResult(null)
    setIsSaved(false)
  }

  const handleModelChange = (val) => {
    setConfig((prev) => ({
      ...prev,
      [activeProvider]: {
        ...(prev[activeProvider] || {}),
        model: val,
      },
    }))
    setTestResult(null)
    setIsSaved(false)
  }

  const handleSave = () => {
    saveAIConfig(config)
    setIsSaved(true)
    if (onKeySaved) {
      onKeySaved(config)
    }
  }

  const handleTestKey = async () => {
    const keyToTest = (currentCreds.key || '').trim()
    if (!keyToTest) {
      setTestResult({ success: false, message: 'Please enter an API key to test.' })
      return
    }

    try {
      setIsTesting(true)
      setTestResult(null)

      const res = await apiFetch(
        '/ai/validate-key/',
        {
          method: 'POST',
          headers: {
            'X-AI-Provider': activeProvider,
            'X-AI-Key': keyToTest,
            'X-AI-Model': currentCreds.model || activeProviderDef.defaultModel,
          },
        },
        { accessToken, setAccessToken }
      )

      setTestResult({ success: true, message: res.message || 'API key validated successfully!' })
      // Auto-save on successful test
      saveAIConfig(config)
      setIsSaved(true)
    } catch (err) {
      setTestResult({ success: false, message: err.message || 'Key validation failed.' })
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="ai-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="ai-key-config-title">
      <div className="ai-modal">
        <div className="ai-modal-header">
          <h3 id="ai-key-config-title" className="ai-modal-title">
            <Key size={20} color="#a855f7" />
            AI API Key Configuration (BYOK)
          </h3>
          <button type="button" className="ghost" onClick={onClose} aria-label="Close settings">
            <X size={18} />
          </button>
        </div>

        <div className="ai-modal-body">
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
            Bring Your Own Key (BYOK) allows you to generate quizzes and lecture study guides with zero subscription fees. Keys are stored safely in your browser and are never saved to our database.
          </p>

          <AIProviderSelector
            activeProvider={activeProvider}
            onSelectProvider={handleProviderChange}
            disabled={isTesting}
          />

          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor="ai-key-input" style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 500 }}>
              {activeProviderDef.name} API Key
            </label>
            <div className="ai-key-input-wrap">
              <input
                id="ai-key-input"
                type={showKey ? 'text' : 'password'}
                className="courseware-search-input"
                style={{ width: '100%', fontFamily: showKey ? 'monospace' : 'inherit' }}
                placeholder={`Enter your ${activeProviderDef.name} key...`}
                value={currentCreds.key || ''}
                onChange={(e) => handleKeyChange(e.target.value)}
              />
              <button
                type="button"
                className="ai-key-toggle-btn"
                onClick={() => setShowKey(!showKey)}
                aria-label={showKey ? 'Hide API key' : 'Show API key'}
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor="ai-model-select" style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 500 }}>
              Model Selection
            </label>
            <select
              id="ai-model-select"
              value={currentCreds.model || activeProviderDef.defaultModel}
              onChange={(e) => handleModelChange(e.target.value)}
              className="courseware-search-input"
              style={{ width: '100%' }}
            >
              {activeProviderDef.models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {testResult && (
            <div
              className={testResult.success ? 'success-alert' : 'error-alert'}
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.85rem',
                background: testResult.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: testResult.success ? '1px solid #10b981' : '1px solid #ef4444',
                color: testResult.success ? '#34d399' : '#f87171',
              }}
            >
              {testResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{testResult.message}</span>
            </div>
          )}

          {isSaved && !testResult && (
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={15} /> Key settings saved locally.
            </p>
          )}
        </div>

        <div className="ai-modal-footer">
          <button
            type="button"
            className="button"
            onClick={handleTestKey}
            disabled={isTesting || !currentCreds.key}
            style={{ fontSize: '0.85rem', padding: '0.45rem 0.85rem' }}
          >
            {isTesting ? 'Testing Key...' : 'Test Key'}
          </button>
          <button
            type="button"
            className="ai-sparkle-btn"
            onClick={handleSave}
            disabled={isTesting}
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  )
}
