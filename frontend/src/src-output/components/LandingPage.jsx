import { Link } from 'react-router-dom'
import { Radio, ChartColumnIncreasing, Lock, Users, Star, Play } from 'lucide-react'

/* ─── Harmonized Design tokens ─── */
const T = {
  bg: '#06090f',
  bgCard: 'rgba(15, 23, 40, 0.75)',
  bgCardHigh: 'rgba(19, 30, 49, 0.85)',
  bgSurface: '#0b1120',
  primary: '#3b82f6',
  primaryDim: 'rgba(59, 130, 246, 0.12)',
  primaryGlow: 'rgba(59, 130, 246, 0.35)',
  onPrimary: '#ffffff',
  text: '#f1f5f9',
  textSub: '#cbd5e1',
  textMuted: '#8fa4be',
  outline: 'rgba(255, 255, 255, 0.08)',
  outlineMd: 'rgba(255, 255, 255, 0.14)',
  radius: '0.75rem',
  radiusLg: '1.25rem',
  radiusFull: '9999px',
}

const features = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: 'Live Classrooms',
    desc: 'Launch real-time sessions with live audio, shared notes, and interactive quizzes — all in one place.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    title: 'Smart Notes',
    desc: 'Teachers create and display lesson notes instantly. Students follow along on any device.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    title: 'Live Quizzes',
    desc: 'Engage students with instant quizzes during sessions. Results appear in real time.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
    title: 'Easy Invites',
    desc: 'Share a link and students join your classroom in seconds — no app download needed.',
  },
]

const steps = [
  { step: '01', label: 'Create an account', desc: 'Sign up as a teacher in under a minute.' },
  { step: '02', label: 'Set up your classroom', desc: 'Name it, invite students via link or CSV.' },
  { step: '03', label: 'Go live', desc: 'Start a session and teach with real-time tools.' },
]

const logos = ['Stanford', 'MIT', 'Harvard', 'Oxford']

/* ─── Reusable glass card style ─── */
const glassCard = {
  background: T.bgCard,
  border: `1px solid ${T.outline}`,
  borderRadius: T.radiusLg,
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
}

export default function LandingPage() {
  return (
    <div style={{ width: '100%', overflowX: 'hidden', background: T.bg, fontFamily: "var(--font-family, sans-serif)", color: T.text }}>
      <style>{`
        .ll-hero-accent {
          background: linear-gradient(135deg, #93c5fd 0%, #3b82f6 60%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .ll-cta-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0.8rem 1.75rem;
          background: var(--primary, #3b82f6);
          color: #fff;
          font-size: 0.95rem;
          font-weight: 600;
          border-radius: 0.5rem;
          border: none;
          cursor: pointer;
          box-shadow: 0 0 24px rgba(59,130,246,0.35);
          transition: box-shadow 0.2s, transform 0.2s;
          text-decoration: none;
          min-height: 44px;
        }
        .ll-cta-primary:hover {
          box-shadow: 0 0 36px rgba(59,130,246,0.6);
          transform: translateY(-1px);
        }
        .ll-cta-primary--large {
          padding: 0.95rem 2.25rem;
          font-size: 1rem;
        }
        .ll-cta-ghost {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0.8rem 1.5rem;
          background: rgba(255,255,255,0.06);
          color: var(--text-primary, #f1f5f9);
          font-size: 0.95rem;
          font-weight: 600;
          border-radius: 0.5rem;
          border: 1px solid rgba(255,255,255,0.14);
          cursor: pointer;
          backdrop-filter: blur(8px);
          transition: background 0.2s, border-color 0.2s, color 0.2s;
          text-decoration: none;
          min-height: 44px;
        }
        .ll-cta-ghost:hover {
          background: rgba(255,255,255,0.12);
          border-color: rgba(59,130,246,0.5);
          color: #ffffff;
        }
        .ll-feature-card {
          background: var(--bg-card, #0f1728);
          border: 1px solid var(--border, #1e2d44);
          border-radius: 1.25rem;
          padding: 2rem;
          backdrop-filter: blur(12px);
          transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
        }
        .ll-feature-card:hover {
          border-color: rgba(59,130,246,0.4);
          box-shadow: 0 0 32px rgba(59,130,246,0.15);
          transform: translateY(-3px);
        }
        .ll-step-card {
          background: var(--bg-card, #0f1728);
          border: 1px solid var(--border, #1e2d44);
          border-radius: 1.25rem;
          padding: 2rem;
          backdrop-filter: blur(12px);
          position: relative;
          transition: border-color 0.2s;
        }
        .ll-step-card:hover {
          border-color: rgba(59,130,246,0.4);
        }
        .ll-play-btn {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: rgba(59,130,246,0.18);
          border: 2px solid rgba(59,130,246,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          margin: 0 auto 1rem;
          box-shadow: 0 0 40px rgba(59,130,246,0.35);
          backdrop-filter: blur(12px);
          transition: transform 0.2s, box-shadow 0.2s;
          color: #ffffff;
        }
        .ll-play-btn:hover {
          transform: scale(1.08);
          box-shadow: 0 0 60px rgba(59,130,246,0.6);
        }
        .ll-logo-badge {
          color: var(--text-muted, #8fa4be);
          font-size: 1.05rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          transition: color 0.2s;
        }
        .ll-logo-badge:hover { color: var(--text-primary, #f1f5f9); }
        .ll-trust-divider {
          width: 1px;
          height: 1.2rem;
          background: rgba(255,255,255,0.16);
        }
        @media (max-width: 900px) {
          .ll-hero-layout { flex-direction: column !important; text-align: center; }
          .ll-hero-inner { max-width: 100% !important; }
          .ll-hero-cta { justify-content: center !important; }
          .ll-hero-badge { margin: 0 auto 1.5rem !important; }
          .ll-preview-wrap { width: 100% !important; max-width: 380px; margin: 0 auto; }
          .ll-features-grid { grid-template-columns: repeat(2,1fr) !important; }
          .ll-steps-row { grid-template-columns: 1fr !important; }
          .ll-section-inner { padding: 0 1rem !important; }
          .ll-hero-title { font-size: 2.25rem !important; }
          .ll-logos-row { flex-wrap: wrap; gap: 1rem 1.5rem !important; }
          .ll-dashboard-mockup { height: 180px !important; }
        }
        @media (max-width: 480px) {
          .ll-hero-title { font-size: 1.85rem !important; }
          .ll-features-grid { grid-template-columns: 1fr !important; }
          .ll-hero-cta { flex-direction: column; align-items: stretch !important; }
        }
      `}</style>

      {/* ══════════════════════════════════════
          HERO
      ══════════════════════════════════════ */}
      <section style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Ambient glow */}
        <div style={{
          position: 'absolute', top: '-200px', left: '50%', transform: 'translateX(-50%)',
          width: '900px', height: '600px', borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(59,130,246,0.12) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} aria-hidden="true" />

        <div className="ll-hero-layout" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '3rem', padding: '6rem 3rem 5rem',
          maxWidth: '1280px', margin: '0 auto', position: 'relative',
        }}>
          {/* Left copy */}
          <div className="ll-hero-inner" style={{ flex: 1, maxWidth: '560px' }}>
            {/* Badge */}
            <div className="ll-hero-badge" style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '0.35rem 0.9rem',
              border: `1px solid ${T.outlineMd}`,
              borderRadius: T.radiusFull,
              background: 'rgba(59,130,246,0.08)',
              color: '#93c5fd',
              fontSize: '0.75rem',
              fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
              marginBottom: '1.5rem',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.primary, flexShrink: 0 }} aria-hidden="true" />
              Built for modern classrooms
            </div>

            <h1 className="ll-hero-title" style={{
              fontSize: '3.25rem', fontWeight: 800,
              letterSpacing: '-0.03em', lineHeight: 1.15,
              color: T.text, marginBottom: '1.25rem',
            }}>
              Interactive learning <br />
              <span className="ll-hero-accent">in real time.</span>
            </h1>

            <p style={{
              fontSize: '1.1rem', color: T.textSub,
              lineHeight: 1.65, marginBottom: '2.5rem',
            }}>
              Audio streaming, instant quizzes, and shared lecture notes — designed for teachers who demand active student engagement.
            </p>

            <div className="ll-hero-cta" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <Link to="/auth" className="ll-cta-primary ll-cta-primary--large">
                Get started free <span aria-hidden="true">→</span>
              </Link>
              <a href="#features" className="ll-cta-ghost">
                Explore features
              </a>
            </div>

            <p style={{ fontSize: '0.8rem', color: T.textMuted }}>
              No credit card required · Free for individual teachers
            </p>
          </div>

          {/* Right preview card */}
          <div className="ll-preview-wrap" style={{ flex: '0 0 420px' }}>
            <div style={{
              ...glassCard,
              padding: '1.5rem',
              boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 40px rgba(59,130,246,0.1)',
            }}>
              {/* Header of card */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingBottom: '1rem', borderBottom: `1px solid ${T.outline}`,
                marginBottom: '1rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#22c55e', display: 'inline-block',
                  }} aria-hidden="true" />
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: T.text }}>
                    Live Session
                  </span>
                </div>
                <span style={{
                  fontSize: '0.72rem', padding: '0.2rem 0.55rem',
                  background: 'rgba(239,68,68,0.15)', color: '#f87171',
                  borderRadius: T.radiusFull, fontWeight: 700,
                  border: '1px solid rgba(239,68,68,0.3)',
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}>
                  <Radio size={14} aria-hidden="true" /> LIVE
                </span>
              </div>

              {/* Classroom name */}
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.72rem', color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>
                  Current Class
                </p>
                <p style={{ fontSize: '1.05rem', fontWeight: 700, color: T.text }}>
                  AP Biology · Period 3
                </p>
                <p style={{ fontSize: '0.8rem', color: T.textSub }}>
                  Teacher: Dr. Aris Thorne
                </p>
              </div>

              {/* Active note preview */}
              <div style={{
                background: 'rgba(59,130,246,0.06)',
                border: '1px solid rgba(59,130,246,0.2)',
                borderRadius: T.radius,
                padding: '0.9rem', marginBottom: '1rem',
              }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: T.primary, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.35rem' }}>
                  Shared Note
                </span>
                <p style={{ fontSize: '0.85rem', color: T.text, lineHeight: 1.5, margin: 0 }}>
                  "Key concept: Cellular respiration occurs in three main stages — glycolysis, Krebs cycle, and oxidative phosphorylation."
                </p>
              </div>

              {/* Live Quiz preview */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${T.outline}`,
                borderRadius: T.radius,
                padding: '0.9rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: T.text }}>
                    Quick Poll · Question 1
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 600 }}>
                    18s left
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {['A. Cytoplasm (38%)', 'B. Mitochondria (54%)', 'C. Nucleus (8%)'].map((opt, i) => (
                    <div key={opt} style={{
                      padding: '0.35rem 0.65rem',
                      borderRadius: '0.35rem',
                      background: i === 1 ? 'rgba(59,130,246,0.18)' : 'rgba(255,255,255,0.04)',
                      border: i === 1 ? `1px solid rgba(59,130,246,0.4)` : `1px solid ${T.outline}`,
                      fontSize: '0.78rem',
                      color: i === 1 ? '#93c5fd' : T.textSub,
                      fontWeight: i === 1 ? 600 : 400,
                    }}>
                      {opt}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          TRUST LOGOS
      ══════════════════════════════════════ */}
      <div style={{
        borderTop: `1px solid ${T.outline}`,
        borderBottom: `1px solid ${T.outline}`,
        padding: '1.75rem 3rem',
        background: 'rgba(11,17,32,0.6)',
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{
            fontSize: '0.72rem',
            fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: T.textMuted, marginBottom: '1.25rem',
          }}>
            Trusted by modern educators and learning institutions worldwide
          </p>
          <div className="ll-logos-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3rem' }}>
            {logos.map((l, i) => (
              <span key={l} style={{ display: 'flex', alignItems: 'center', gap: '3rem' }}>
                <span className="ll-logo-badge">{l}</span>
                {i < logos.length - 1 && <span className="ll-trust-divider" aria-hidden="true" />}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          FEATURES
      ══════════════════════════════════════ */}
      <section id="features" style={{ padding: '6rem 0' }}>
        <div className="ll-section-inner" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 3rem' }}>
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 4rem' }}>
            <p style={{
              fontSize: '0.75rem',
              fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: T.primary, marginBottom: '0.75rem',
            }}>
              Features Built for Education
            </p>
            <h2 style={{
              fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.025em',
              color: T.text, lineHeight: 1.2,
            }}>
              Everything you need to deliver engaging live lessons
            </h2>
          </div>

          <div className="ll-features-grid" style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem',
          }}>
            {features.map((f) => (
              <div key={f.title} className="ll-feature-card">
                <div style={{
                  width: 44, height: 44, borderRadius: '0.5rem',
                  background: T.primaryDim, border: `1px solid rgba(59,130,246,0.3)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '1.25rem',
                }}>
                  {f.icon}
                </div>
                <h3 style={{
                  fontSize: '1.1rem', fontWeight: 700, color: T.text, marginBottom: '0.5rem',
                }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: '0.9rem', color: T.textSub, lineHeight: 1.6 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════ */}
      <section style={{ padding: '6rem 0', background: 'rgba(11,17,32,0.4)' }}>
        <div className="ll-section-inner" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 3rem' }}>
          <p style={{
            fontSize: '0.75rem',
            fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: T.primary, marginBottom: '0.75rem',
          }}>
            How it works
          </p>
          <h2 style={{
            fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.02em',
            color: T.text, marginBottom: '3rem', lineHeight: 1.2,
          }}>
            Up and running in minutes
          </h2>

          <div className="ll-steps-row" style={{
            display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.5rem',
          }}>
            {steps.map((s, i) => (
              <div key={s.step} className="ll-step-card">
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 40, height: 40, borderRadius: '0.5rem',
                  background: T.primaryDim, border: `1px solid rgba(59,130,246,0.3)`,
                  color: T.primary, fontSize: '0.85rem', fontWeight: 800,
                  marginBottom: '1.25rem',
                }}>
                  {s.step}
                </span>
                <h3 style={{
                  fontSize: '1.1rem', fontWeight: 700, color: T.text, marginBottom: '0.5rem',
                }}>
                  {s.label}
                </h3>
                <p style={{ fontSize: '0.9rem', color: T.textSub, lineHeight: 1.6 }}>
                  {s.desc}
                </p>
                {i < steps.length - 1 && (
                  <span style={{
                    position: 'absolute', right: '-1.2rem', top: '2.25rem',
                    color: T.textMuted, fontSize: '1.1rem', pointerEvents: 'none', zIndex: 1,
                  }} aria-hidden="true">→</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          VIDEO / INTERACTIVE PREVIEW
      ══════════════════════════════════════ */}
      <section style={{ padding: '6rem 3rem' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            position: 'relative',
            borderRadius: '1.5rem',
            overflow: 'hidden',
            border: `1px solid ${T.outlineMd}`,
            boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 50px rgba(59,130,246,0.15)',
            padding: '5rem 2rem',
            background: 'linear-gradient(135deg, #0b1120 0%, #0f1728 100%)',
          }}>
            {/* Play button */}
            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
              <button
                type="button"
                className="ll-play-btn"
                aria-label="Preview LessonLive classroom interactive demo"
              >
                <Play fill="#ffffff" size={26} aria-hidden="true" style={{ marginLeft: 4 }} />
              </button>
              <p style={{
                fontSize: '0.95rem', color: T.textSub, fontWeight: 600,
              }}>
                Experience LessonLive in Action
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          CTA BANNER
      ══════════════════════════════════════ */}
      <section style={{
        position: 'relative', overflow: 'hidden',
        padding: '6rem 3rem',
        background: 'rgba(11,17,32,0.7)',
        borderTop: `1px solid ${T.outline}`,
      }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{
            fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.025em',
            color: T.text, marginBottom: '0.75rem', lineHeight: 1.2,
          }}>
            Ready to transform your classroom?
          </h2>
          <p style={{ fontSize: '1.05rem', color: T.textSub, marginBottom: '2rem' }}>
            Join teachers and students already using LessonLive to deliver engaging live lessons.
          </p>
          <Link to="/auth" className="ll-cta-primary ll-cta-primary--large">
            Start teaching today →
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', marginTop: '2.5rem' }}>
            {[
              { icon: <Lock size={16} aria-hidden="true" />, label: 'Secure Portal' },
              { icon: <Users size={16} aria-hidden="true" />, label: 'Teachers are joining' },
              { icon: <Star size={16} aria-hidden="true" />, label: 'Top Rated EdTech' },
            ].map(({ icon, label }) => (
              <span key={label} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                fontSize: '0.82rem', color: T.textMuted,
              }}>
                {icon} {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
        padding: '2rem 3rem',
        borderTop: `1px solid ${T.outline}`,
        background: '#06090f',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 800, color: T.text, fontSize: '1.05rem' }}>LessonLive</span>
          <span style={{ fontSize: '0.8rem', color: T.textMuted }}>© {new Date().getFullYear()} LessonLive. All rights reserved.</span>
        </div>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <a href="#features" style={{ fontSize: '0.85rem', color: T.textMuted, transition: 'color 0.2s' }}>Features</a>
          <Link to="/auth" style={{ fontSize: '0.85rem', color: T.textMuted, transition: 'color 0.2s' }}>Sign In</Link>
        </div>
      </footer>
    </div>
  )
}
