import { useState } from 'react'
import TeacherAuth from './TeacherAuth'
import StudentLogin from './StudentLogin'

function AuthGateway({ onSuccess }) {
  const [authType, setAuthType] = useState('teacher')

  return (
    <div className="stack">
      <section className="card">
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
      </section>

      {authType === 'teacher' ? <TeacherAuth onSuccess={onSuccess} /> : <StudentLogin onSuccess={onSuccess} />}
    </div>
  )
}

export default AuthGateway
