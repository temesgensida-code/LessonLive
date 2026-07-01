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
