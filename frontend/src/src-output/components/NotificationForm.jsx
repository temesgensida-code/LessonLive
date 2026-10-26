import { Megaphone } from 'lucide-react';

function NotificationForm({
  notifMessage,
  setNotifMessage,
  notifMinutes,
  setNotifMinutes,
  notifError,
  notifSuccess,
  onSubmit,
}) {
  return (
    <div className="notification-form-section">
      <h4 className="notification-form-title"><Megaphone /> Send Notification</h4>
      <form className="notification-form" onSubmit={onSubmit}>
        <label>
          Message
          <input
            type="text"
            value={notifMessage}
            onChange={(e) => setNotifMessage(e.target.value)}
            placeholder='e.g. "Exam starts in..."'
            required
          />
        </label>
        <label>
          Countdown (minutes)
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem', marginBottom: '0.35rem' }}>
            {[5, 15, 30, 60].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setNotifMinutes(m)}
                style={{
                  padding: '0.2rem 0.55rem',
                  fontSize: '0.75rem',
                  borderRadius: 'var(--radius-full)',
                  background: notifMinutes === m ? 'var(--primary)' : 'var(--bg-input)',
                  color: notifMinutes === m ? '#ffffff' : 'var(--text-secondary)',
                  border: `1px solid ${notifMinutes === m ? 'var(--primary)' : 'var(--border)'}`,
                  cursor: 'pointer',
                  fontWeight: notifMinutes === m ? 600 : 500,
                  transition: 'all 0.15s ease',
                }}
              >
                {m}m
              </button>
            ))}
          </div>
          <input
            type="number"
            min="1"
            max="180"
            value={notifMinutes}
            onChange={(e) => setNotifMinutes(Number(e.target.value))}
            required
          />
        </label>
        {notifError && <p className="error">{notifError}</p>}
        {notifSuccess && <p className="success">{notifSuccess}</p>}
        <button type="submit" className="primary notification-send-btn">
          <Megaphone /> Send to Students
        </button>
      </form>
    </div>
  )
}

export default NotificationForm
