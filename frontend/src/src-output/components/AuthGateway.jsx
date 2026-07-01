import { useState } from 'react'
import { Link } from 'react-router-dom'
import TeacherAuth from './TeacherAuth'
import StudentLogin from './StudentLogin'

function AuthGateway({ onSuccess }) {
  const [authType, setAuthType] = useState('student')

  return (
    <div className="auth-page">
      {/* <div className="auth-left">
        <Link to="/" className="auth-back-link">← Back to home</Link>
        <div className="auth-left-inner">
          <span className="auth-logo-mark">⬡</span>
          <h1 className="auth-brand">LessonLive</h1>
          <p className="auth-tagline">
            Real-time classrooms for teachers and students.
          </p>
          <ul className="auth-feature-list">
            <li><span>✓</span> Live audio sessions</li>
            <li><span>✓</span> Shared notes board</li>
            <li><span>✓</span> Interactive quizzes</li>
            <li><span>✓</span> Student invite links</li>
          </ul>
        </div>
      </div> */}

      <div className="auth-right">
        <section className="card auth-card auth-box">
          {/* Header */}
          <div className="auth-card-header">
            <h2>Sign in to your account</h2>
            <p className="muted">
              New here?{' '}
              <span style={{ color: 'var(--text-link)', cursor: 'pointer' }}
                onClick={() => setAuthType('teacher')}>
                Register as a teacher
              </span>
            </p>
          </div>

          {/* Role switcher */}
          <div className="tabs">
            <button
              type="button"
              className={authType === 'student' ? 'tab active' : 'tab'}
              onClick={() => setAuthType('student')}
            >
              🎓 Student
            </button>
            <button
              type="button"
              className={authType === 'teacher' ? 'tab active' : 'tab'}
              onClick={() => setAuthType('teacher')}
            >
              👨‍🏫 Teacher
            </button>
          </div>

          {authType === 'teacher'
            ? <TeacherAuth onSuccess={onSuccess} />
            : <StudentLogin onSuccess={onSuccess} />}

          <p className="auth-terms">
            By signing in you agree to our{' '}
            <span style={{ color: 'var(--text-link)', cursor: 'pointer' }}>Terms of Service</span>{' '}
            and{' '}
            <span style={{ color: 'var(--text-link)', cursor: 'pointer' }}>Privacy Policy</span>
          </p>
        </section>
      </div>
    </div>
  )
}

export default AuthGateway
