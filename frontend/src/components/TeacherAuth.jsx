import { useState } from 'react'
import { apiFetch } from './apiClient'

function TeacherAuth({ onSuccess }) {
  const [mode, setMode] = useState('signup')
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
    <div className="card">
      <div className="tabs">
        <button
          type="button"
          className={mode === 'signup' ? 'tab active' : 'tab'}
          onClick={() => setMode('signup')}
        >
          Teacher Sign Up
        </button>
        <button
          type="button"
          className={mode === 'login' ? 'tab active' : 'tab'}
          onClick={() => setMode('login')}
        >
          Log In
        </button>
      </div>

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
      </form>
    </div>
  )
}

export default TeacherAuth
