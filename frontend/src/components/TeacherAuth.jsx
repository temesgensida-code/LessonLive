import { useState } from 'react'
import { apiFetch } from './apiClient'

function TeacherAuth({ onSuccess }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      let data
      if (mode === 'signup') {
        data = await apiFetch('/auth/teacher-signup/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        }, { skipAuthRefresh: true })
      } else {
        data = await apiFetch('/auth/login/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email, password: form.password }),
        }, { skipAuthRefresh: true })
      }
      onSuccess(data?.access || '')
    } catch (err) {
      if (mode === 'signup' && /already exists/i.test(err.message || '')) {
        setMode('login')
        setError('Account already exists. Please log in with the same email/password.')
        return
      }
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card auth-card">
      <h2>{mode === 'signup' ? 'Teacher Register' : 'Teacher Login'}</h2>

      <form onSubmit={handleSubmit} className="form">
        {mode === 'signup' && (
          <div className="grid">
            <label>
              First name
              <input name="first_name" value={form.first_name} onChange={handleChange} />
            </label>
            <label>
              Last name
              <input name="last_name" value={form.last_name} onChange={handleChange} />
            </label>
          </div>
        )}
        <label>
          Email
          <input name="email" type="email" value={form.email} onChange={handleChange} required />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="primary" disabled={loading}>
          {loading ? 'Please wait…' : mode === 'signup' ? 'Create teacher account' : 'Log in'}
        </button>
        {mode === 'login' ? (
          <button type="button" className="link-button" onClick={() => setMode('signup')}>
            Don&apos;t have account yet? Register
          </button>
        ) : (
          <button type="button" className="link-button" onClick={() => setMode('login')}>
            Already have an account? Log in
          </button>
        )}
      </form>
    </div>
  )
}

export default TeacherAuth
