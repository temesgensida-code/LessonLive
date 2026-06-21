import { createContext, useContext, useState, useCallback } from 'react'

const NotificationContext = createContext({
  notifications: [],
  hasUnread: false,
  activeCountdown: null,
  setNotificationData: () => {},
  setActiveCountdown: () => {},
  markRead: () => {},
})

function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])
  const [hasUnread, setHasUnread] = useState(false)
  const [activeCountdown, setActiveCountdown] = useState(null)

  const setNotificationData = useCallback((notifs, unread) => {
    setNotifications(notifs)
    setHasUnread(unread)
  }, [])

  const markRead = useCallback(() => {
    setHasUnread(false)
  }, [])

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        hasUnread,
        activeCountdown,
        setNotificationData,
        setActiveCountdown,
        markRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

function useNotificationContext() {
  return useContext(NotificationContext)
}

export { NotificationProvider, useNotificationContext }
