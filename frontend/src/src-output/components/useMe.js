import { useEffect, useState } from 'react'
import { apiFetch, requestAccessTokenRefresh, setSessionHint } from './apiClient'

function useMe(accessToken, setAccessToken) {
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    try {
      let token = accessToken
      if (!token) {
        token = await requestAccessTokenRefresh(setAccessToken, { requireSessionHint: true })
      }

      if (!token) {
        setMe(null)
        return
      }

      const data = await apiFetch('/auth/me/', {}, { accessToken: token, setAccessToken })
      setMe(data?.authenticated ? data : null)
      setSessionHint(Boolean(data?.authenticated))
    } catch {
      setMe(null)
      setSessionHint(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [accessToken, setAccessToken])

  return { me, loading, refresh }
}

export default useMe
