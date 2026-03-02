import { useState } from 'react'
import TeacherAuth from './TeacherAuth'
import StudentLogin from './StudentLogin'

function AuthGateway({ onSuccess }) {
  const [authType, setAuthType] = useState('student')

  return (
    <div className="stack auth-stack">
      <section className="card auth-card auth-box">
        <div className="auth-switch">
          <div className="tabs">
            <button
              type="button"
              className={authType === 'teacher' ? 'tab active' : 'tab'}
              onClick={() => setAuthType('teacher')}
            >
              Teacher
            </button>
            <button
              type="button"
              className={authType === 'student' ? 'tab active' : 'tab'}
              onClick={() => setAuthType('student')}
            >
              Student
            </button>
          </div>
        </div>

        {authType === 'teacher' ? <TeacherAuth onSuccess={onSuccess} /> : <StudentLogin onSuccess={onSuccess} />}
      </section>
    </div>
  )
}

export default AuthGateway
