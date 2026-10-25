import { useState } from 'react'
import TeacherAuth from './TeacherAuth'
import StudentLogin from './StudentLogin'
import { GraduationCap, School } from 'lucide-react'

function AuthGateway({ onSuccess }) {
  const [authType, setAuthType] = useState('student')

  return (
    <div className="auth-page">
      <div className="auth-right">
        <section className="card auth-card auth-box" aria-labelledby="auth-heading">
          {/* Header */}
          <div className="auth-card-header">
            <h2 id="auth-heading">Sign in to your account</h2>
            <p className="muted">
              {authType === 'student' ? 'New teacher? ' : 'Already registered? '}
              <button
                type="button"
                className="inline-link-btn"
                onClick={() => setAuthType(authType === 'student' ? 'teacher' : 'student')}
              >
                {authType === 'student' ? 'Register or sign in as a teacher' : 'Sign in as a student'}
              </button>
            </p>
          </div>

          {/* Role switcher tabs */}
          <div className="tabs" role="tablist" aria-label="Sign in role selection">
            <button
              id="tab-student"
              role="tab"
              type="button"
              className={authType === 'student' ? 'tab active' : 'tab'}
              aria-selected={authType === 'student'}
              aria-controls="tabpanel-student"
              onClick={() => setAuthType('student')}
            >
              <GraduationCap size={18} aria-hidden="true" /> Student
            </button>
            <button
              id="tab-teacher"
              role="tab"
              type="button"
              className={authType === 'teacher' ? 'tab active' : 'tab'}
              aria-selected={authType === 'teacher'}
              aria-controls="tabpanel-teacher"
              onClick={() => setAuthType('teacher')}
            >
              <School size={18} aria-hidden="true" /> Teacher
            </button>
          </div>

          <div
            id={authType === 'student' ? 'tabpanel-student' : 'tabpanel-teacher'}
            role="tabpanel"
            aria-labelledby={authType === 'student' ? 'tab-student' : 'tab-teacher'}
          >
            {authType === 'teacher' ? (
              <TeacherAuth onSuccess={onSuccess} />
            ) : (
              <StudentLogin onSuccess={onSuccess} />
            )}
          </div>

          <p className="auth-terms">
            By signing in you agree to our{' '}
            <span className="auth-terms-link">Terms of Service</span>{' '}
            and{' '}
            <span className="auth-terms-link">Privacy Policy</span>.
          </p>
        </section>
      </div>
    </div>
  )
}

export default AuthGateway
