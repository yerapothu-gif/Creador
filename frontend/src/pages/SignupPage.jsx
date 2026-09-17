import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const CATEGORIES = [
  { icon: "💰", name: "Loans & Microfinance", key: "loans" },
  { icon: "🏦", name: "Retirement Planning", key: "retirement" },
  { icon: "📈", name: "Investment Basics", key: "investment" },
  { icon: "🧾", name: "Taxation & PAN", key: "taxation" },
  { icon: "🏛️", name: "Government Schemes", key: "schemes" },
  { icon: "🚨", name: "Scam Alerts", key: "scam_alert" }
];

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // step 1 = credentials, step 2 = goal category
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [interestCategory, setInterestCategory] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function validateStep1() {
    const errors = {};
    if (!name.trim()) errors.name = "Full name is required";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.email = "Please enter a valid email address";
    if (password.length < 6) errors.password = "Password must be at least 6 characters";
    if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match";
    return errors;
  }

  function handleStep1(e) {
    e.preventDefault();
    setError("");
    const errors = validateStep1();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setStep(2);
  }

  async function handleSignup() {
    setError("");
    setLoading(true);
    try {
      await signup({ name: name.trim(), email: email.trim(), password });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Signup failed. Please try again.");
      setStep(1);
    } finally {
      setLoading(false);
    }
  }

  function handleStep2(e) {
    e.preventDefault();
    handleSignup();
  }

  const PANEL_CONTENT = {
    tagline: "Your path to financial confidence starts today.",
    desc: "Free, verified financial education designed for women in India — in your language.",
    features: [
      "Free personalized daily learning plans",
      "Earn streaks & badges for consistency",
      "Ask the voice bot anything in Hindi or English",
      "Verified content from Creador Foundation"
    ]
  };

  return (
    <div className="auth-page">
      {/* ── Left Panel ── */}
      <div className="auth-panel-left">
        <div className="auth-left-content">
          <div className="auth-left-logo">
            <div className="auth-left-logo-icon">🌱</div>
            <span className="auth-left-logo-text">Creador Foundation</span>
          </div>
          <h2 className="auth-left-tagline">
            <span>{PANEL_CONTENT.tagline.split(" ").slice(0, -1).join(" ")}</span>{" "}
            {PANEL_CONTENT.tagline.split(" ").slice(-1)}
          </h2>
          <p className="auth-left-desc">{PANEL_CONTENT.desc}</p>
          <div className="auth-features">
            {PANEL_CONTENT.features.map((f) => (
              <div className="auth-feature" key={f}>
                <div className="auth-feature-check">✓</div>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className="auth-panel-right">
        <div className="auth-form-box">
          <Link to="/" className="auth-back">← Back to Home</Link>

          {/* Step 1: Credentials */}
          {step === 1 && (
            <>
              <div className="auth-form-header">
                <h1 className="auth-form-title">Create your account ✨</h1>
                <p className="auth-form-subtitle">Free forever · No credit card required</p>
              </div>

              <div className="admin-notice" style={{ marginBottom: "16px", background: "var(--brand-subtle)", borderColor: "var(--border)", color: "var(--brand-light)" }}>
                🌱 <span>Signing up creates a free <strong>Learner</strong> account. Admin accounts are created by Creador Foundation staff only.</span>
              </div>

              {error && <div className="alert alert-error" style={{ marginBottom: "16px" }}>{error}</div>}

              <form className="auth-form" onSubmit={handleStep1} noValidate>
                <div className="form-group">
                  <label className="form-label" htmlFor="fullname">Full Name</label>
                  <input
                    id="fullname"
                    type="text"
                    className={`form-input${fieldErrors.name ? " error" : ""}`}
                    placeholder="Priya Sharma"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  {fieldErrors.name && <span className="form-error">{fieldErrors.name}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    className={`form-input${fieldErrors.email ? " error" : ""}`}
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  {fieldErrors.email && <span className="form-error">{fieldErrors.email}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="password">Password</label>
                  <div className="input-wrapper">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      className={`form-input${fieldErrors.password ? " error" : ""}`}
                      placeholder="Minimum 6 characters"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="input-toggle"
                      onClick={() => setShowPassword((p) => !p)}
                      aria-label="Toggle password"
                    >
                      {showPassword ? "🙈" : "👁️"}
                    </button>
                  </div>
                  {fieldErrors.password && <span className="form-error">{fieldErrors.password}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="confirm-password">Confirm Password</label>
                  <input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    className={`form-input${fieldErrors.confirmPassword ? " error" : ""}`}
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  {fieldErrors.confirmPassword && <span className="form-error">{fieldErrors.confirmPassword}</span>}
                </div>

                <button
                  id="signup-next"
                  type="submit"
                  className="btn btn-primary btn-full"
                  disabled={loading}
                >
                  {loading ? "Creating account…" : "Continue →"}
                </button>
              </form>

              <div className="auth-footer-link" style={{ marginTop: "24px" }}>
                Already have an account? <Link to="/login">Sign in →</Link>
              </div>
            </>
          )}

          {/* Step 2: Goal Category (Learner only) */}
          {step === 2 && (
            <>
              <div className="auth-form-header">
                <h1 className="auth-form-title">What's your main goal? 🎯</h1>
                <p className="auth-form-subtitle">We'll personalise your learning plan around this. You can change it later.</p>
              </div>

              {error && <div className="alert alert-error" style={{ marginBottom: "16px" }}>{error}</div>}

              <form onSubmit={handleStep2}>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
                  {CATEGORIES.map((c) => (
                    <button
                      type="button"
                      key={c.key}
                      id={`category-${c.key}`}
                      className={`role-option${interestCategory === c.key ? " active" : ""}`}
                      style={{ justifyContent: "flex-start", padding: "14px 16px" }}
                      onClick={() => setInterestCategory(c.key)}
                    >
                      <span className="role-option-icon">{c.icon}</span>
                      <span className="role-option-label">{c.name}</span>
                    </button>
                  ))}
                </div>

                <button
                  id="signup-finish"
                  type="submit"
                  className="btn btn-primary btn-full"
                  disabled={loading}
                >
                  {loading ? "Creating account…" : "Finish & Start Learning 🚀"}
                </button>

                <button
                  type="button"
                  className="btn btn-ghost btn-full"
                  style={{ marginTop: "10px" }}
                  onClick={() => handleSignup()}
                  disabled={loading}
                >
                  Skip for now
                </button>
              </form>

              <button
                type="button"
                className="auth-back"
                style={{ marginTop: "16px" }}
                onClick={() => setStep(1)}
              >
                ← Back to account details
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
