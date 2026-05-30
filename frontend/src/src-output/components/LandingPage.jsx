import { Link } from 'react-router-dom'

const features = [
  {
    icon: '🎓',
    title: 'Live Classrooms',
    desc: 'Launch real-time sessions with live audio, shared notes, and interactive quizzes — all in one place.',
  },
  {
    icon: '📋',
    title: 'Smart Notes',
    desc: 'Teachers create and display lesson notes instantly. Students follow along on any device.',
  },
  {
    icon: '⚡',
    title: 'Live Quizzes',
    desc: 'Engage students with instant quizzes during sessions. Results appear in real time.',
  },
  {
    icon: '🔗',
    title: 'Easy Invites',
    desc: 'Share a link and students join your classroom in seconds — no app download needed.',
  },
]

const steps = [
  { step: '01', label: 'Create an account', desc: 'Sign up as a teacher in under a minute.' },
  { step: '02', label: 'Set up your classroom', desc: 'Name it, invite students via link or CSV.' },
  { step: '03', label: 'Go live', desc: 'Start a session and teach with real-time tools.' },
]

export default function LandingPage() {
  return (
    <div className="landing">
      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-inner">
          <span className="hero-badge">✦ Built for modern classrooms</span>
          <h1 className="hero-title">
            Teach smarter,<br />
            <span className="hero-accent">connect deeper.</span>
          </h1>
          <p className="hero-sub">
            LessonLive brings live audio, shared notes, and interactive quizzes into one
            seamless classroom experience — for teachers and students.
          </p>
          <div className="hero-cta">
            <Link to="/auth" className="cta-primary">
              Get started free →
            </Link>
            <a href="#features" className="cta-ghost">
              See how it works
            </a>
          </div>
          <p className="hero-note">No credit card required · Free for teachers</p>
        </div>

        {/* ── Floating card preview ── */}
        <div className="hero-preview" aria-hidden="true">
          <div className="preview-card">
            <div className="preview-topbar">
              <span className="preview-dot red" />
              <span className="preview-dot yellow" />
              <span className="preview-dot green" />
              <span className="preview-title">Biology 101 · Live</span>
              <span className="preview-live-badge">🔴 LIVE</span>
            </div>
            <div className="preview-body">
              <div className="preview-note">
                <strong>Today's topic</strong>
                <p>Cell division and mitosis — phases, checkpoints, and regulation.</p>
              </div>
              <div className="preview-chat">
                <div className="preview-bubble other">How long does S phase take?</div>
                <div className="preview-bubble self">Great question — roughly 6-8 hours in human cells.</div>
              </div>
              <div className="preview-quiz-bar">
                <span>📊 Quiz active — 18/24 answered</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="features-section" id="features">
        <div className="section-inner">
          <p className="section-label">Features</p>
          <h2 className="section-title">Everything you need to run a live class</h2>
          <div className="features-grid">
            {features.map((f) => (
              <div className="feature-card" key={f.title}>
                <span className="feature-icon">{f.icon}</span>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="how-section">
        <div className="section-inner">
          <p className="section-label">How it works</p>
          <h2 className="section-title">Up and running in minutes</h2>
          <div className="steps-row">
            {steps.map((s, i) => (
              <div className="step-card" key={s.step}>
                <span className="step-num">{s.step}</span>
                <h3>{s.label}</h3>
                <p>{s.desc}</p>
                {i < steps.length - 1 && <span className="step-arrow" aria-hidden="true">→</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="cta-banner">
        <div className="cta-banner-glow" aria-hidden="true" />
        <div className="section-inner cta-banner-inner">
          <h2>Ready to transform your classroom?</h2>
          <p>Join teachers already using LessonLive to deliver engaging live lessons.</p>
          <Link to="/auth" className="cta-primary cta-primary--large">
            Start teaching today →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <span className="brand-sm">LessonLive</span>
        <span className="footer-copy">© {new Date().getFullYear()} · Built for educators</span>
      </footer>
    </div>
  )
}
