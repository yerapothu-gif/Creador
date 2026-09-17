import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./LandingPage.css";

const FEATURES = [
  {
    icon: "🎯",
    title: "Goal-Based Learning",
    desc: "Personalized 7-day plans on loans, retirement, and savings — built around your life."
  },
  {
    icon: "🏆",
    title: "Streaks & Badges",
    desc: "Earn daily streaks and unlock badges as you grow your financial knowledge."
  },
  {
    icon: "🤖",
    title: "Voice-Enabled Bot",
    desc: "Ask questions in Hindi or English, get instant answers from verified resources."
  }
];

const STEPS = [
  { n: "1", title: "Sign Up in 30 Seconds", desc: "Create your free account — just your name, email, and a password. No bank details, no ID required." },
  { n: "2", title: "Pick a Financial Goal", desc: "Choose what you want to learn: loans, savings, government schemes, or how to spot scams." },
  { n: "3", title: "Learn a Little Every Day", desc: "Complete short daily modules, build your streak, earn badges, and ask the bot anything." }
];

const CATEGORIES = [
  { icon: "💰", name: "Loans & Microfinance", key: "loans" },
  { icon: "🏦", name: "Retirement Planning", key: "retirement" },
  { icon: "📈", name: "Investment Basics", key: "investment" },
  { icon: "🧾", name: "Taxation & PAN", key: "taxation" },
  { icon: "🏛️", name: "Government Schemes", key: "schemes" },
  { icon: "🚨", name: "Scam Alerts", key: "scam_alert" }
];

export default function LandingPage() {
  const { isAuthenticated, isAdmin } = useAuth();

  return (
    <div className="landing">
      {/* ── Navbar ── */}
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="navbar-logo">🌱</div>
          Creador Foundation
        </div>
        <div className="navbar-actions">
          {isAuthenticated ? (
            <Link to={isAdmin ? "/admin" : "/dashboard"} className="btn btn-primary btn-sm">
              Go to Dashboard →
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">Login</Link>
              <Link to="/signup" className="btn btn-primary btn-sm">Get Started Free</Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-bg">
          <div className="blob blob-1" />
          <div className="blob blob-2" />
          <div className="blob blob-3" />
          <div className="hero-grid" />
        </div>
        <div className="container">
          <div className="hero-inner">
            <div className="hero-content">
              <div className="hero-eyebrow">
                <span className="hero-eyebrow-dot" />
                Creador Foundation — Multiply India
              </div>
              <h1 className="hero-title">
                Financial Freedom,<br />
                <span>One Step a Day</span>
              </h1>
              <p className="hero-subtitle">
                A gamified learning platform designed for women from low-income households.
                Build lasting financial habits through daily goals, streaks, and a regional voice assistant.
              </p>
              <div className="hero-actions">
                <Link to="/signup" className="btn btn-primary btn-lg">
                  Start Learning Free →
                </Link>
                <Link to="/login" className="btn btn-outline btn-lg">
                  I Already Have an Account
                </Link>
              </div>
              <div className="hero-stats">
                <div className="stat-item">
                  <div className="stat-number">6<span>+</span></div>
                  <div className="stat-label">Financial Topics</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">7<span>-day</span></div>
                  <div className="stat-label">Learning Plans</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">🇮🇳</div>
                  <div className="stat-label">Regional Language Bot</div>
                </div>
              </div>
            </div>

            {/* Feature Cards */}
            <div className="hero-visual">
              <div className="feat-cards-stack">
                {FEATURES.map((f, i) => (
                  <div className="feat-card" key={i} style={{ animationDelay: `${0.2 + i * 0.1}s` }}>
                    <div className="feat-icon">{f.icon}</div>
                    <div className="feat-title">{f.title}</div>
                    <div className="feat-desc">{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <div className="section-eyebrow">How It Works</div>
            <h2 className="section-title">Start learning in under 2 minutes</h2>
            <p className="section-subtitle">No jargon. No complexity. Just real knowledge that changes lives.</p>
          </div>
          <div className="steps-grid">
            {STEPS.map((s, i) => (
              <div className="step-card" key={i}>
                <div className="step-number">{s.n}</div>
                <div className="step-title">{s.title}</div>
                <div className="step-desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories ── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-header">
            <div className="section-eyebrow">What You'll Learn</div>
            <h2 className="section-title">Every topic that matters to you</h2>
            <p className="section-subtitle">Content curated by Creador Foundation, in your language.</p>
          </div>
          <div className="categories-grid">
            {CATEGORIES.map((c) => (
              <div className="cat-card" key={c.key}>
                <span className="cat-icon">{c.icon}</span>
                <span className="cat-name">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-inner">
            <h2 className="cta-title">Ready to take control of your finances?</h2>
            <p className="cta-subtitle">Join thousands of women building financial confidence — one day at a time.</p>
            <div className="cta-actions">
              <Link to="/signup" className="btn btn-primary btn-lg">Create Free Account →</Link>
              <Link to="/login" className="btn btn-outline btn-lg">Login to My Account</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="footer">
        <div className="container">
          <p>© 2026 Creador Foundation · Multiply India · All content is verified and free to use.</p>
        </div>
      </footer>
    </div>
  );
}
