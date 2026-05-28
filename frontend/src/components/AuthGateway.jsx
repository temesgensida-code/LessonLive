import { useState } from 'react'
import TeacherAuth from './TeacherAuth'
import StudentLogin from './StudentLogin'

function AuthGateway({ onSuccess }) {
  const [authType, setAuthType] = useState('student')

  return (
    <div className="stack auth-stack">
      <section className="card auth-card auth-box">
        {/* Header */}
        <div style={{ marginBottom: 'var(--space-2)' }}>
          <h2>Welcome back</h2>
          <p className="muted" style={{ marginTop: 'var(--space-1)', fontSize: 'var(--font-size-sm)' }}>
            Sign in to your LessonLive account
          </p>
        </div>

        {/* Role switcher */}
        <div className="tabs">
          <button
            type="button"
            className={authType === 'student' ? 'tab active' : 'tab'}
            onClick={() => setAuthType('student')}
          >
            Student
          </button>
          <button
            type="button"
            className={authType === 'teacher' ? 'tab active' : 'tab'}
            onClick={() => setAuthType('teacher')}
          >
            Teacher
          </button>
        </div>

        {authType === 'teacher'
          ? <TeacherAuth onSuccess={onSuccess} />
          : <StudentLogin onSuccess={onSuccess} />}

        <p
          className="muted"
          style={{
            marginTop: 'var(--space-5)',
            paddingTop: 'var(--space-5)',
            borderTop: '1px solid var(--border)',
            textAlign: 'center',
            fontSize: 'var(--font-size-xs)',
          }}
        >
          By signing in you agree to our{' '}
          <span style={{ color: 'var(--text-link)', cursor: 'pointer' }}>Terms of Service</span>{' '}
          and{' '}
          <span style={{ color: 'var(--text-link)', cursor: 'pointer' }}>Privacy Policy</span>
        </p>
      </section>
    </div>
  )
}

export default AuthGateway
