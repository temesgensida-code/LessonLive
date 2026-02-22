const API_BASE = '/api'
const SESSION_HINT_KEY = 'lessonlive_has_session'
const LIVEKIT_SERVER_URL = 'wss://lessonlivemain-i0wqfwh8.livekit.cloud'

function getNotesWebSocketUrl(classId, accessToken) {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const backendHost = import.meta.env.DEV
    ? `${window.location.hostname}:8000`
    : window.location.host
  return `${protocol}://${backendHost}/ws/classrooms/${classId}/notes/?token=${encodeURIComponent(
    accessToken
  )}`
}

function getSessionHint() {
  return window.localStorage.getItem(SESSION_HINT_KEY) === '1'
}

function setSessionHint(hasSession) {
  if (hasSession) {
    window.localStorage.setItem(SESSION_HINT_KEY, '1')
  } else {
    window.localStorage.removeItem(SESSION_HINT_KEY)
  }
}

async function requestAccessTokenRefresh(setAccessToken, options = {}) {
  const { requireSessionHint = false } = options

  if (requireSessionHint && !getSessionHint()) {
    return ''
  }

  const response = await fetch(`${API_BASE}/auth/token/refresh/`, {
    method: 'POST',
    credentials: 'include',
  })

  if (!response.ok) {
    setAccessToken('')
    if (response.status === 401) {
      setSessionHint(false)
    }
    return ''
  }

  const data = await response.json()
  const access = data?.access || ''
  setAccessToken(access)
  setSessionHint(Boolean(access))
  return access
}

async function apiFetch(path, options = {}, auth = {}) {
  const { accessToken = '', setAccessToken, skipAuthRefresh = false } = auth

  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  })

  if (response.status === 401 && !skipAuthRefresh && typeof setAccessToken === 'function') {
    const refreshedAccess = await requestAccessTokenRefresh(setAccessToken, { requireSessionHint: true })
    if (refreshedAccess) {
      return apiFetch(path, options, {
        accessToken: refreshedAccess,
        setAccessToken,
        skipAuthRefresh: true,
      })
    }
  }

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await response.json() : null

  if (!response.ok) {
    const message = data?.detail || data?.error || 'Request failed'
    const error = new Error(message)
    error.data = data
    throw error
  }

  return data
}

export {
  API_BASE,
  LIVEKIT_SERVER_URL,
  getNotesWebSocketUrl,
  getSessionHint,
  setSessionHint,
  requestAccessTokenRefresh,
  apiFetch,
}
