import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || null;

  const [role, setRole] = useState("user");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const data = await login({ email: email.trim(), password });

      if (role === "admin" && data.user.role !== "admin") {
        logout();
        setError("Access denied: This account does not have administrator privileges. Please sign in as a Learner.");
        return;
      }

      // Redirect: honour location.state, then by role
      if (from && from !== "/login" && from !== "/signup") {
        navigate(from, { replace: true });
      } else {
        navigate(data.user.role === "admin" ? "/admin" : "/dashboard", { replace: true });
      }
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

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
            Your journey to <span>financial freedom</span> continues here.
          </h2>
          <p className="auth-left-desc">
            Pick up where you left off. Your learning plan, streak, and badges are waiting for you.
          </p>
          <div className="auth-features">
            {[
              "Continue your active learning plan",
              "Check your daily streak & badges",
              "Ask the voice bot any question",
              "Access all financial literacy resources"
            ].map((f) => (
              <div className="auth-feature" key={f}>
                <div className="auth-feature-check">✓</div>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Panel (Form) ── */}
      <div className="auth-panel-right">
        <div className="auth-form-box">
          <Link to="/" className="auth-back">← Back to Home</Link>

          <div className="auth-form-header">
            <h1 className="auth-form-title">Welcome back 👋</h1>
            <p className="auth-form-subtitle">Sign in to continue your learning journey</p>
          </div>

          {/* Role Selector */}
          <div className="auth-role-selector" style={{ marginBottom: "24px" }}>
            <button
              type="button"
              className={`role-option${role === "user" ? " active" : ""}`}
              onClick={() => setRole("user")}
              id="role-user"
            >
              <span className="role-option-icon">👩</span>
              <span className="role-option-label">Learner</span>
            </button>
            <button
              type="button"
              className={`role-option${role === "admin" ? " active" : ""}`}
              onClick={() => setRole("admin")}
              id="role-admin"
            >
              <span className="role-option-icon">🛡️</span>
              <span className="role-option-label">Admin</span>
            </button>
          </div>

          {role === "admin" && (
            <div className="admin-notice" style={{ marginBottom: "20px" }}>
              <div>🛡️ <strong>Staff Portal:</strong> Restricted to authorized administrators.</div>
              <div style={{ marginTop: "4px", fontSize: "0.8rem", opacity: 0.9 }}>
                Demo credentials: <code>admin@creador.org</code> | <code>Admin@1234</code>
                <button
                  type="button"
                  onClick={() => { setEmail("admin@creador.org"); setPassword("Admin@1234"); }}
                  style={{ marginLeft: "8px", textDecoration: "underline", background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0, fontWeight: 600 }}
                >
                  Auto-fill
                </button>
              </div>
            </div>
          )}

          {error && <div className="alert alert-error" style={{ marginBottom: "16px" }}>{error}</div>}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div className="input-wrapper">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="input-toggle"
                  onClick={() => setShowPassword((p) => !p)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading}
            >
              {loading ? "Signing in…" : `Sign in as ${role === "admin" ? "Admin" : "Learner"} →`}
            </button>
          </form>

          <div className="auth-footer-link" style={{ marginTop: "24px" }}>
            Don't have an account?{" "}
            <Link to="/signup">Create one free →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
