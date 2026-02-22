import { useMemo, useState } from 'react'
import { Route, Routes, useNavigate } from 'react-router-dom'
import '@livekit/components-styles'
import LiveClassroom from './LiveClassroom'
import './App.css'
import AuthGateway from './components/AuthGateway'
import ClassroomPage from './components/ClassroomPage'
import InvitePage from './components/InvitePage'
import Layout from './components/Layout'
import StudentDashboard from './components/StudentDashboard'
import TeacherDashboard from './components/TeacherDashboard'
import { apiFetch, setSessionHint } from './components/apiClient'
import useMe from './components/useMe'

function App() {
  const [accessToken, setAccessToken] = useState('')
  const { me, loading, refresh } = useMe(accessToken, setAccessToken)
  const [logoutError, setLogoutError] = useState('')
  const navigate = useNavigate()

  const handleLogout = async () => {
    setLogoutError('')
    try {
      await apiFetch('/auth/logout/', { method: 'POST' }, { accessToken, setAccessToken, skipAuthRefresh: true })
    } catch (err) {
      setLogoutError(err.message)
    } finally {
      setAccessToken('')
      setSessionHint(false)
      await refresh()
      navigate('/')
    }
  }

  const layoutProps = useMemo(
    () => ({ me, onLogout: handleLogout }),
    [me]
  )

  return (
    <Layout {...layoutProps}>
      {logoutError && <p className="error">{logoutError}</p>}
      <Routes>
        <Route
          path="/"
          element={
            loading ? (
              <p>Loading profile…</p>
            ) : me?.authenticated ? (
              me?.role === 'teacher' ? (
                <TeacherDashboard
                  refreshMe={refresh}
                  accessToken={accessToken}
                  setAccessToken={setAccessToken}
                />
              ) : (
                <StudentDashboard accessToken={accessToken} setAccessToken={setAccessToken} />
              )
            ) : (
              <AuthGateway
                onSuccess={async (newAccessToken) => {
                  setAccessToken(newAccessToken)
                  setSessionHint(Boolean(newAccessToken))
                  await refresh()
                }}
              />
            )
          }
        />
        <Route
          path="/classrooms/:classId"
          element={<ClassroomPage accessToken={accessToken} setAccessToken={setAccessToken} />}
        />
        <Route
          path="/classrooms/:classId/live"
          element={<LiveClassroom accessToken={accessToken} />}
        />
        <Route
          path="/invite/:token"
          element={<InvitePage accessToken={accessToken} setAccessToken={setAccessToken} />}
        />
      </Routes>
    </Layout>
  )
}

export default App
