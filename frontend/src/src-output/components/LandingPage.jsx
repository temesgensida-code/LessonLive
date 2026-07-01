import { Link } from 'react-router-dom'
import { Radio } from 'lucide-react';
import { ChartColumnIncreasing } from 'lucide-react';
import { Lock } from 'lucide-react';
import { Users } from 'lucide-react';
import { Star } from 'lucide-react';

/* ─── Design tokens (Stitch / Lumina Academic) ─── */
const T = {
  bg: '#0b0f10',
  bgCard: 'rgba(29, 32, 34, 0.70)',
  bgCardHigh: 'rgba(39, 42, 44, 0.85)',
  bgSurface: '#191c1e',
  primary: '#4d8eff',
  primaryDim: 'rgba(77,142,255,0.12)',
  primaryGlow: 'rgba(77,142,255,0.35)',
  onPrimary: '#ffffff',
  text: '#e0e3e5',
  textSub: '#c2c6d6',
  textMuted: '#8c909f',
  outline: 'rgba(255,255,255,0.08)',
  outlineMd: 'rgba(255,255,255,0.12)',
  radius: '0.75rem',
  radiusLg: '1.25rem',
  radiusFull: '9999px',
}

const features = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: 'Live Classrooms',
    desc: 'Launch real-time sessions with live audio, shared notes, and interactive quizzes — all in one place.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    title: 'Live Quizzes',
    desc: 'Engage students with instant quizzes during sessions. Results appear in real time.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    <div style={{ width: '100%', overflowX: 'hidden', background: T.bg, fontFamily: "'Inter', sans-serif", color: T.text }}>
      {/* ── Google Fonts ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Geist:wght@400;600;700;800&display=swap');

        .ll-hero-accent {
          background: linear-gradient(135deg, #adc6ff 0%, #4d8eff 60%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .ll-cta-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0.8rem 1.75rem;
          background: #4d8eff;
          color: #fff;
          font-family: 'Geist', sans-serif;
          font-size: 0.9rem;
          font-weight: 600;
          border-radius: 0.5rem;
          border: none;
          cursor: pointer;
          box-shadow: 0 0 24px rgba(77,142,255,0.4);
          transition: box-shadow 0.2s, transform 0.2s;
          text-decoration: none;
        }
        .ll-cta-primary:hover {
          box-shadow: 0 0 36px rgba(77,142,255,0.6);
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
          color: #c2c6d6;
          font-family: 'Geist', sans-serif;
          font-size: 0.9rem;
          font-weight: 600;
          border-radius: 0.5rem;
          border: 1px solid rgba(255,255,255,0.12);
          cursor: pointer;
          backdrop-filter: blur(8px);
          transition: background 0.2s, border-color 0.2s, color 0.2s;
          text-decoration: none;
        }
        .ll-cta-ghost:hover {
          background: rgba(255,255,255,0.10);
          border-color: rgba(77,142,255,0.5);
          color: #e0e3e5;
        }
        .ll-feature-card {
          background: rgba(29,32,34,0.6);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 1.25rem;
          padding: 2rem;
          backdrop-filter: blur(12px);
          transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
        }
        .ll-feature-card:hover {
          border-color: rgba(77,142,255,0.35);
          box-shadow: 0 0 32px rgba(77,142,255,0.12);
          transform: translateY(-3px);
        }
        .ll-step-card {
          background: rgba(29,32,34,0.6);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 1.25rem;
          padding: 2rem;
          backdrop-filter: blur(12px);
          position: relative;
          transition: border-color 0.2s;
        }
        .ll-step-card:hover {
          border-color: rgba(77,142,255,0.3);
        }
        .ll-logo-badge {
          color: #8c909f;
          font-family: 'Geist', sans-serif;
          font-size: 1rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          transition: color 0.2s;
        }
        .ll-logo-badge:hover { color: #c2c6d6; }

        .ll-trust-divider {
          width: 1px;
          height: 1.2rem;
          background: rgba(255,255,255,0.12);
        }
        @media (max-width: 900px) {
          .ll-hero-layout { flex-direction: column !important; text-align: center; }
          .ll-hero-inner { max-width: 100% !important; }
          .ll-hero-cta { justify-content: center !important; }
          .ll-hero-badge { margin: 0 auto var(--space-6) !important; }
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
          background: 'radial-gradient(ellipse, rgba(77,142,255,0.13) 0%, transparent 65%)',
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
              background: 'rgba(77,142,255,0.08)',
              color: '#adc6ff',
              fontSize: '0.72rem', fontFamily: "'Geist', sans-serif",
              fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
              marginBottom: '1.5rem',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.primary, flexShrink: 0 }} />
              Built for modern classrooms
            </div>

            <h1 className="ll-hero-title" style={{
              fontFamily: "'Geist', sans-serif",
              fontSize: '3.2rem', fontWeight: 700, lineHeight: 1.1,
              letterSpacing: '-0.025em', marginBottom: '1.25rem', color: T.text,
            }}>
              Teach smarter,<br />
              <span className="ll-hero-accent">connect deeper.</span>
            </h1>

            <p style={{
              fontSize: '1.1rem', color: T.textSub, lineHeight: 1.65,
              marginBottom: '2rem', maxWidth: '460px',
            }}>
              LessonLive brings live audio, shared notes, and interactive quizzes into one
              seamless classroom experience — for teachers and students.
            </p>

            <div className="ll-hero-cta" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <Link to="/auth" className="ll-cta-primary">
                Get started free →
              </Link>
              <a href="#features" className="ll-cta-ghost">
                See how it works
              </a>
            </div>

            <p style={{ fontSize: '0.75rem', color: T.textMuted }}>
              No credit card required · Free for teachers
            </p>
          </div>

          {/* Right: floating preview card */}
          <div className="ll-preview-wrap" style={{ flexShrink: 0, width: '380px' }}>
            <div style={{
              ...glassCard,
              boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 40px rgba(77,142,255,0.10)',
            }}>
              {/* Topbar */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '0.75rem 1rem',
                background: 'rgba(15,18,20,0.8)',
                borderBottom: `1px solid ${T.outline}`,
                borderRadius: `${T.radiusLg} ${T.radiusLg} 0 0`,
              }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f87171' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#fbbf24' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#4ade80' }} />
                <span style={{ flex: 1, fontSize: '0.72rem', fontWeight: 600, color: T.textSub, textAlign: 'center', fontFamily: "'Geist', sans-serif" }}>
                  Biology 101 · Live
                </span>
                <span style={{
                  fontSize: '0.65rem', fontWeight: 700, color: '#f87171',
                  background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)',
                  borderRadius: '4px', padding: '2px 6px', letterSpacing: '0.05em',
                  fontFamily: "'Geist', sans-serif",
                }}>
                  <Radio /> LIVE
                </span>
              </div>

              {/* Body */}
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Note */}
                <div style={{
                  background: 'rgba(15,18,20,0.6)',
                  border: `1px solid ${T.outline}`,
                  borderRadius: '0.75rem', padding: '0.75rem 1rem',
                }}>
                  <strong style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: T.primary, marginBottom: '0.25rem', fontFamily: "'Geist', sans-serif", letterSpacing: '0.04em' }}>
                    Today's topic
                  </strong>
                  <p style={{ fontSize: '0.75rem', color: T.textSub, lineHeight: 1.5, margin: 0 }}>
                    Cell division and mitosis — phases, checkpoints, and regulation.
                  </p>
                </div>

                {/* Chat */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{
                    alignSelf: 'flex-start', maxWidth: '80%',
                    background: 'rgba(39,42,44,0.8)', border: `1px solid ${T.outline}`,
                    borderRadius: '0.75rem 0.75rem 0.75rem 2px',
                    padding: '0.4rem 0.75rem', fontSize: '0.72rem', color: T.textSub, lineHeight: 1.4,
                  }}>
                    How long does S phase take?
                  </div>
                  <div style={{
                    alignSelf: 'flex-end', maxWidth: '80%',
                    background: T.primary,
                    borderRadius: '0.75rem 0.75rem 2px 0.75rem',
                    padding: '0.4rem 0.75rem', fontSize: '0.72rem', color: '#fff', lineHeight: 1.4,
                  }}>
                    Great question — roughly 6-8 hours in human cells.
                  </div>
                </div>

                {/* Quiz bar */}
                <div style={{
                  background: 'rgba(77,142,255,0.08)',
                  border: '1px solid rgba(77,142,255,0.2)',
                  borderRadius: '0.5rem', padding: '0.5rem 0.75rem',
                  fontSize: '0.72rem', color: T.primary, fontWeight: 600,
                  fontFamily: "'Geist', sans-serif",
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span><ChartColumnIncreasing /> Quiz active — 18/24 answered</span>
                  <span style={{ fontSize: '0.65rem', color: T.textMuted }}>▸ ▸ ▪</span>
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
        padding: '1.5rem 3rem',
        background: 'rgba(15,18,20,0.5)',
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{
            fontSize: '0.65rem', fontFamily: "'Geist', sans-serif",
            fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: T.textMuted, marginBottom: '1rem',
          }}>
            Trusted by institutions worldwide
          </p>
          {/* <div className="ll-logos-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2.5rem' }}>
            {logos.map((l, i) => (
              <span key={l} style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
                <span className="ll-logo-badge">{l}</span>
                {i < logos.length - 1 && <span className="ll-trust-divider" />}
              </span>
            ))}
          </div> */}
        </div>
      </div>

      {/* ══════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════ */}
      <section style={{ padding: '6rem 0' }}>
        <div className="ll-section-inner" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 3rem' }}>
          <p style={{
            fontSize: '0.7rem', fontFamily: "'Geist', sans-serif",
            fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: T.primary, marginBottom: '0.75rem',
          }}>
            How it works
          </p>
          <h2 style={{
            fontFamily: "'Geist', sans-serif",
            fontSize: '2.2rem', fontWeight: 700, letterSpacing: '-0.02em',
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
                  background: T.primaryDim, border: `1px solid rgba(77,142,255,0.3)`,
                  color: T.primary, fontSize: '0.8rem', fontWeight: 800,
                  fontFamily: "'Geist', sans-serif", letterSpacing: '-0.01em',
                  marginBottom: '1.25rem',
                }}>
                  {s.step}
                </span>
                <h3 style={{
                  fontFamily: "'Geist', sans-serif",
                  fontSize: '1rem', fontWeight: 700, color: T.text, marginBottom: '0.5rem',
                }}>
                  {s.label}
                </h3>
                <p style={{ fontSize: '0.875rem', color: T.textSub, lineHeight: 1.6 }}>
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
          CTA BANNER
      ══════════════════════════════════════ */}
      <section style={{
        position: 'relative', overflow: 'hidden',
        padding: '6rem 3rem',
        background: 'rgba(15,18,20,0.6)',
        borderTop: `1px solid ${T.outline}`,
        borderBottom: `1px solid ${T.outline}`,
      }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          width: '900px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(77,142,255,0.09) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} aria-hidden="true" />

        <div style={{ maxWidth: '1280px', margin: '0 auto', position: 'relative' }}>
          {/* Inner glass card */}
          <div style={{
            ...glassCard,
            padding: '3.5rem 2rem',
            textAlign: 'center',
            maxWidth: '760px',
            margin: '0 auto',
            boxShadow: '0 0 60px rgba(77,142,255,0.08)',
          }}>
            <h2 style={{
              fontFamily: "'Geist', sans-serif",
              fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.025em',
              color: T.text, marginBottom: '0.75rem', lineHeight: 1.2,
            }}>
              Ready to transform your classroom?
            </h2>
            <p style={{ fontSize: '1rem', color: T.textSub, marginBottom: '2rem' }}>
              Join teachers already using LessonLive to deliver engaging live lessons.
            </p>
            <Link to="/auth" className="ll-cta-primary ll-cta-primary--large">
              Start teaching today →
            </Link>

            {/* Trust chips */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', marginTop: '2rem' }}>
              {[
                { icon: <Lock />, label: 'Secure Portal' },
                { icon: <Users />, label: 'Teachers are joining' },
                { icon: <Star />, label: 'Top Rated EdTech' },
              ].map(({ icon, label }) => (
                <span key={label} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  fontSize: '0.75rem', color: T.textMuted,
                  fontFamily: "'Geist', sans-serif",
                }}>
                  {icon} {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          DASHBOARD MOCKUP
      ══════════════════════════════════════ */}
      <section style={{ padding: '6rem 3rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{
            ...glassCard,
            overflow: 'hidden',
            boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 60px rgba(77,142,255,0.07)',
          }}>
            {/* Mock topbar */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '0.75rem 1.25rem',
              borderBottom: `1px solid ${T.outline}`,
              background: 'rgba(11,15,16,0.9)',
            }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f87171' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#fbbf24' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#4ade80' }} />
              <div style={{
                flex: 1, marginLeft: '0.75rem',
                background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.outline}`,
                borderRadius: '0.35rem', padding: '0.25rem 0.75rem',
                fontSize: '0.72rem', color: T.textMuted, maxWidth: '280px',
                fontFamily: "'Geist', sans-serif",
              }}>
                app.lessonlive.com/dashboard
              </div>
            </div>

            <div className="ll-dashboard-mockup" style={{
              height: '280px',
              background: 'linear-gradient(135deg, #0d1520 0%, #101820 40%, #0a1020 100%)',
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
              padding: '1.5rem', gap: '1rem',
            }}>
              {/* Chart 1 — bar */}
              <div style={{
                ...glassCard, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem',
              }}>
                <span style={{ fontSize: '0.65rem', color: T.textMuted, fontFamily: "'Geist', sans-serif", fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Weekly Engagement
                </span>
                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '6px', paddingTop: '0.5rem' }}>
                  {[55, 80, 65, 90, 72, 88, 95].map((h, i) => (
                    <div key={i} style={{
                      flex: 1, height: `${h}%`,
                      background: i === 6
                        ? `linear-gradient(to top, ${T.primary}, rgba(77,142,255,0.4))`
                        : `rgba(77,142,255,${0.15 + i * 0.04})`,
                      borderRadius: '3px 3px 0 0',
                    }} />
                  ))}
                </div>
              </div>

              {/* Chart 2 — area */}
              <div style={{
                ...glassCard, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem',
              }}>
                <span style={{ fontSize: '0.65rem', color: T.textMuted, fontFamily: "'Geist', sans-serif", fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Active Students
                </span>
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden', paddingTop: '0.5rem' }}>
                  <svg viewBox="0 0 100 60" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4d8eff" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#4d8eff" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>
                    <path d="M0,55 C10,50 20,35 30,30 C40,25 50,40 60,28 C70,16 80,10 100,5 L100,60 Z" fill="url(#areaGrad)" />
                    <path d="M0,55 C10,50 20,35 30,30 C40,25 50,40 60,28 C70,16 80,10 100,5" fill="none" stroke="#4d8eff" strokeWidth="1.5" />
                  </svg>
                </div>
              </div>

              {/* Stats */}
              <div style={{
                ...glassCard, padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: '0.65rem', color: T.textMuted, fontFamily: "'Geist', sans-serif", fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Quick Stats
                </span>
                {[
                  { label: 'Classes today', val: '4' },
                  { label: 'Students online', val: '124' },
                  { label: 'Avg. score', val: '91%' },
                ].map(({ label, val }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: T.textSub }}>{label}</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: T.text, fontFamily: "'Geist', sans-serif" }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          FEATURES
      ══════════════════════════════════════ */}
      <section id="features" style={{
        padding: '6rem 0',
        background: 'rgba(15,18,20,0.5)',
        borderTop: `1px solid ${T.outline}`,
        borderBottom: `1px solid ${T.outline}`,
      }}>
        <div className="ll-section-inner" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 3rem' }}>
          <p style={{
            fontSize: '0.7rem', fontFamily: "'Geist', sans-serif",
            fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: T.primary, marginBottom: '0.75rem',
          }}>
            Features
          </p>
          <h2 style={{
            fontFamily: "'Geist', sans-serif",
            fontSize: '2.2rem', fontWeight: 700, letterSpacing: '-0.02em',
            color: T.text, marginBottom: '3rem', lineHeight: 1.2,
          }}>
            Everything you need to run a live class
          </h2>

          <div className="ll-features-grid" style={{
            display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem',
          }}>
            {features.map((f) => (
              <div key={f.title} className="ll-feature-card">
                <div style={{
                  width: 44, height: 44, borderRadius: '0.75rem',
                  background: T.primaryDim, border: `1px solid rgba(77,142,255,0.2)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '1.25rem', flexShrink: 0,
                }}>
                  {f.icon}
                </div>
                <h3 style={{
                  fontFamily: "'Geist', sans-serif",
                  fontSize: '0.95rem', fontWeight: 700, color: T.text, marginBottom: '0.5rem',
                }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: '0.85rem', color: T.textSub, lineHeight: 1.65 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          VIDEO SECTION
      ══════════════════════════════════════ */}
      <section style={{ padding: '6rem 3rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{
            ...glassCard,
            height: '320px', position: 'relative', overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          }}>
            {/* Faux cinematic background */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(135deg, #080e18 0%, #0a121e 50%, #060d15 100%)',
            }} />
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `
                repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(77,142,255,0.04) 40px),
                repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(77,142,255,0.04) 40px)
              `,
            }} />
            {/* Overlay gradient fade */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(11,15,16,0.7) 0%, transparent 50%, rgba(11,15,16,0.5) 100%)',
            }} />

            {/* Play button */}
            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
              <button style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'rgba(77,142,255,0.15)',
                border: `1px solid rgba(77,142,255,0.4)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', margin: '0 auto 1rem',
                boxShadow: '0 0 40px rgba(77,142,255,0.3)',
                backdropFilter: 'blur(12px)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 0 60px rgba(77,142,255,0.5)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 0 40px rgba(77,142,255,0.3)'; }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill={T.primary}>
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </button>
              <p style={{
                fontSize: '0.8rem', color: T.textSub,
                fontFamily: "'Geist', sans-serif", fontWeight: 500,
              }}>
                Experience LessonLive in Action
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem',
        padding: '1.5rem 3rem',
        borderTop: `1px solid ${T.outline}`,
        maxWidth: '1280px', margin: '0 auto',
      }}>
        <div>
          <span style={{
            fontFamily: "'Geist', sans-serif", fontSize: '0.9rem', fontWeight: 700,
            letterSpacing: '-0.02em', color: T.primary,
          }}>
            LessonLive
          </span>
          <p style={{ fontSize: '0.72rem', color: T.textMuted, marginTop: '0.2rem' }}>
            Transforming the next generation of educators through real-time digital engagement.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          {['Privacy Policy', 'Terms of Service', 'Help Center', 'Contact Us'].map(l => (
            <a key={l} href="#" style={{ fontSize: '0.75rem', color: T.textMuted, textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = T.textSub}
              onMouseLeave={e => e.currentTarget.style.color = T.textMuted}>
              {l}
            </a>
          ))}
        </div>
        <span style={{ fontSize: '0.72rem', color: T.textMuted }}>
          © {new Date().getFullYear()} LessonLive. All rights reserved.
        </span>
      </footer>
    </div>
  )
}
