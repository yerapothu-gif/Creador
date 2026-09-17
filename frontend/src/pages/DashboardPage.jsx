import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { goalsApi, contentApi } from "../services/api";
import "./DashboardPage.css";

// Curated Goal Templates (Structured Courses sorted by domain and sequence)
const GOAL_TEMPLATES = [
  {
    id: "loans_readiness",
    title: "Loan Readiness & Microfinance",
    category: "loans",
    durationDays: 7,
    difficulty: "Beginner",
    summary: "Learn how to evaluate interest rates, compare APRs, and apply for collateral-free Self-Help Group (SHG) bank credit.",
    highlights: [
      "Understanding Microloan APR & Hidden Processing Fees",
      "SHG Collateral-Free Credit Under NRLM Mission",
      "EMI Affordability & Safe Debt Repayment Planning",
    ],
    domainLabel: "Loans & Credit",
  },
  {
    id: "retirement_basics",
    title: "Retirement Basics & Pension Security",
    category: "retirement",
    durationDays: 7,
    difficulty: "Beginner",
    summary: "Secure guaranteed lifelong monthly income with Atal Pension Yojana and create an emergency household reserve.",
    highlights: [
      "Atal Pension Yojana Guaranteed Lifelong Pension",
      "Building a 3 to 6 Month Liquid Emergency Fund",
      "Bank Nominee Verification & Family Protection",
    ],
    domainLabel: "Retirement & Pensions",
  },
  {
    id: "investment_starter",
    title: "Investment Starter & Compound Growth",
    category: "investment",
    durationDays: 5,
    difficulty: "Intermediate",
    summary: "Harness compound interest with safe Recurring Deposits, Sovereign Gold Bonds, and beginner Systematic Investment Plans.",
    highlights: [
      "Guaranteed Recurring Deposits & Zero Making-Charge Gold Bonds",
      "Mutual Fund SIPs & The Mathematical Power of Compounding",
      "Inflation Protection & Long-Term Financial Autonomy",
    ],
    domainLabel: "Savings & Investments",
  },
  {
    id: "tax_essentials",
    title: "Tax & PAN Essentials",
    category: "taxation",
    durationDays: 5,
    difficulty: "Beginner",
    summary: "Demystify PAN cards, understand bank tax exemptions, and take advantage of zero-tax rebate thresholds.",
    highlights: [
      "PAN Card Purpose, KYC, and Banking Eligibility",
      "New Tax Regime Zero-Tax Thresholds up to 7 Lakh",
      "Avoiding Unnecessary TDS Deductions on Bank Interest",
    ],
    domainLabel: "Taxation & Compliance",
  },
  {
    id: "government_schemes",
    title: "Government Schemes & Subsidies Guide",
    category: "schemes",
    durationDays: 7,
    difficulty: "All Levels",
    summary: "Access zero-balance Jan Dhan banking, girl child Sukanya Samriddhi accounts, and subsidized livelihood grants.",
    highlights: [
      "Pradhan Mantri Jan Dhan Yojana with Inbuilt RuPay Insurance",
      "Sukanya Samriddhi Tax-Free High-Yield Savings for Girls",
      "National Livelihood Enterprise Subsidies for Women",
    ],
    domainLabel: "Government Schemes",
  },
  {
    id: "scam_defense",
    title: "Digital Payment Safety & Scam Defense",
    category: "scam_alert",
    durationDays: 3,
    difficulty: "Essential",
    summary: "Protect your bank accounts, recognize predatory fake lending apps, and know the golden rules of UPI & OTP safety.",
    highlights: [
      "Never Sharing OTP / UPI PIN & Lottery Scam Warnings",
      "Illegal Instant Loan App Traps & Contact Blackmail Defense",
      "Immediate Steps on the 1930 Cyber Helpline & Account Freezing",
    ],
    domainLabel: "Safety & Fraud Alert",
  },
];

export default function DashboardPage() {
  const { user, logout } = useAuth();

  // Active Goal & Progress state
  const [goal, setGoal] = useState(null);
  const [progress, setProgress] = useState({ streakCount: 0, badges: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Goal Setup state
  const [showSetup, setShowSetup] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("loans_readiness");
  const [selectedDuration, setSelectedDuration] = useState(7);
  const [previewContent, setPreviewContent] = useState([]);
  const [creatingGoal, setCreatingGoal] = useState(false);

  // Module completion loading state
  const [completingDay, setCompletingDay] = useState(null);

  // Toast feedback state
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 3500);
  }, []);

  // Selected template object
  const activeTemplate = useMemo(() => {
    return (
      GOAL_TEMPLATES.find((t) => t.id === selectedTemplateId) ||
      GOAL_TEMPLATES[0]
    );
  }, [selectedTemplateId]);

  // Sync duration with template default on template change
  useEffect(() => {
    if (activeTemplate) {
      setSelectedDuration(activeTemplate.durationDays);
    }
  }, [activeTemplate]);

  // Fetch active goal
  const fetchActiveGoal = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await goalsApi.getMe();
      if (data.goal) {
        setGoal(data.goal);
        setShowSetup(false);
      } else {
        setGoal(null);
        setShowSetup(true);
      }
      if (data.progress) {
        setProgress(data.progress);
      }
    } catch (err) {
      console.error("Failed to load user goal:", err);
      setError(err.message || "Failed to load learning goal");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveGoal();
  }, [fetchActiveGoal]);

  // Fetch preview content when in setup mode
  useEffect(() => {
    if (showSetup && activeTemplate) {
      contentApi
        .getAll({ category: activeTemplate.category })
        .then((items) => {
          setPreviewContent(Array.isArray(items) ? items : []);
        })
        .catch(() => setPreviewContent([]));
    }
  }, [showSetup, activeTemplate]);

  // Create learning plan from selected goal template
  async function handleCreateGoalFromTemplate(e) {
    e.preventDefault();
    if (!activeTemplate) return;
    setCreatingGoal(true);
    setError("");

    try {
      const payload = {
        category: activeTemplate.category,
        title: activeTemplate.title,
        durationDays: parseInt(selectedDuration, 10) || activeTemplate.durationDays,
      };

      const created = await goalsApi.create(payload);
      setGoal(created);
      setShowSetup(false);
      showToast(`Enrolled in "${activeTemplate.title}" successfully!`);
    } catch (err) {
      console.error("Error creating goal:", err);
      showToast(err.message || "Failed to create learning goal", "error");
    } finally {
      setCreatingGoal(false);
    }
  }

  // Complete module handler
  async function handleCompleteModule(dayNumber) {
    if (!goal || completingDay) return;
    setCompletingDay(dayNumber);
    try {
      const result = await goalsApi.completeModule(goal._id, dayNumber);
      setGoal(result.goal);
      if (result.progress) {
        setProgress(result.progress);
      }
      showToast(`Day ${dayNumber} completed! Keep building your streak.`);
    } catch (err) {
      console.error("Error completing module:", err);
      showToast(err.message || "Failed to mark module complete", "error");
    } finally {
      setCompletingDay(null);
    }
  }

  // Calculate completion stats
  const stats = useMemo(() => {
    if (!goal || !Array.isArray(goal.modules)) {
      return { total: 0, completed: 0, percentage: 0, isAllDone: false };
    }
    const total = goal.modules.length;
    const completed = goal.modules.filter((m) => m.completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    const isAllDone = total > 0 && completed === total;
    return { total, completed, percentage, isAllDone };
  }, [goal]);

  return (
    <div className="dashboard-root">
      {/* ── Top Navigation Bar ── */}
      <header className="dash-navbar">
        <div className="dash-nav-inner">
          <Link to="/" className="dash-brand">
            <div className="dash-brand-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <span className="dash-brand-title">Creador Foundation</span>
            </div>
          </Link>

          <div className="dash-nav-actions">
            <div className="dash-user-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>{user?.name || "Learner"}</span>
            </div>

            {goal && !showSetup && (
              <button
                className="btn btn-outline"
                style={{ fontSize: "0.85rem", padding: "6px 12px" }}
                onClick={() => setShowSetup(true)}
              >
                Choose Another Course
              </button>
            )}

            <button
              onClick={logout}
              className="btn btn-ghost"
              style={{ fontSize: "0.85rem", padding: "6px 12px" }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Dashboard Container ── */}
      <main className="dash-container">
        {loading ? (
          <div style={{ textAlign: "center", padding: "100px 20px" }}>
            <div className="spinner" style={{ margin: "0 auto 16px" }} />
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>Loading your learning dashboard...</p>
          </div>
        ) : showSetup ? (
          /* ── STRUCTURED GOAL & COURSE SELECTION SCREEN ── */
          <div className="goal-setup-wrapper">
            <div className="goal-setup-header">
              <h1 className="goal-setup-title">Curated Financial Learning Courses</h1>
              <p className="goal-setup-subtitle">
                Select a goal-oriented course curated by Creador Foundation educators. Each course provides a structured day-by-day sequence of articles, video guides, and checks.
              </p>
            </div>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: "20px" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreateGoalFromTemplate}>
              {/* Dropdown Quick Selector */}
              <div style={{ marginBottom: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                  <label className="duration-label" htmlFor="template-dropdown" style={{ margin: 0 }}>
                    Select Course
                  </label>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    Category Domain: <strong style={{ color: "#2DD4BF" }}>{activeTemplate.domainLabel}</strong>
                  </span>
                </div>

                <select
                  id="template-dropdown"
                  className="form-input"
                  style={{ width: "100%", padding: "12px 16px", fontSize: "0.95rem", cursor: "pointer" }}
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                >
                  {GOAL_TEMPLATES.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.title} ({tpl.durationDays} Days, {tpl.difficulty})
                    </option>
                  ))}
                </select>
              </div>

              {/* Goal Template Cards Grid */}
              <div className="category-selection-grid">
                {GOAL_TEMPLATES.map((tpl) => {
                  const isSelected = selectedTemplateId === tpl.id;
                  return (
                    <button
                      type="button"
                      key={tpl.id}
                      className={`category-choice-card${isSelected ? " selected" : ""}`}
                      onClick={() => setSelectedTemplateId(tpl.id)}
                      id={`template-card-${tpl.id}`}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 800,
                            padding: "3px 8px",
                            borderRadius: "6px",
                            background: "rgba(20, 184, 166, 0.2)",
                            color: "#2DD4BF",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {tpl.domainLabel}
                        </span>

                        <div className={`choice-radio-indicator${isSelected ? " active" : ""}`}>
                          {isSelected && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                      </div>

                      <div style={{ width: "100%" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "6px" }}>
                          <h3 className="cat-choice-title">{tpl.title}</h3>
                          {isSelected && <span className="cat-selected-badge">Active</span>}
                        </div>
                        <p className="cat-choice-desc">{tpl.summary}</p>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "auto", paddingTop: "12px", borderTop: "1px solid var(--border-color)", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        <span>Duration: <strong style={{ color: "var(--text-primary)" }}>{tpl.durationDays} Days</strong></span>
                        <span>Level: <strong style={{ color: "var(--text-primary)" }}>{tpl.difficulty}</strong></span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Course Curriculum Preview */}
              <div
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "16px",
                  padding: "24px",
                  marginBottom: "28px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                  <div>
                    <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-primary)" }}>
                      Curriculum Preview: {activeTemplate.title}
                    </h3>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "2px" }}>
                      Curated educational resources ordered by sequence position (Day 1, Day 2...)
                    </p>
                  </div>
                  <span style={{ fontSize: "0.85rem", color: "#2DD4BF", fontWeight: 700 }}>
                    {previewContent.length} Curated Modules Available
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {previewContent.length > 0 ? (
                    previewContent.map((item, idx) => (
                      <div
                        key={item._id || idx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 14px",
                          borderRadius: "10px",
                          background: "rgba(255, 255, 255, 0.03)",
                          border: "1px solid var(--border-color)",
                          fontSize: "0.9rem",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 800,
                              color: "#2DD4BF",
                              background: "rgba(20, 184, 166, 0.15)",
                              padding: "2px 8px",
                              borderRadius: "6px",
                            }}
                          >
                            Day {item.sequence || idx + 1}
                          </span>
                          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.title}</span>
                        </div>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            textTransform: "uppercase",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            background: "rgba(255, 255, 255, 0.06)",
                            color: "var(--text-muted)",
                            fontWeight: 700,
                          }}
                        >
                          {item.format || "article"}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      Loading curriculum outline...
                    </div>
                  )}
                </div>
              </div>

              {/* Duration Customization */}
              <div className="duration-selector-box">
                <label className="duration-label">Learning Plan Duration</label>
                <div className="duration-options">
                  {[
                    { days: 3, label: "3 Days", sub: "Fast-Track" },
                    { days: 5, label: "5 Days", sub: "Standard Pace" },
                    { days: 7, label: "7 Days", sub: "Comprehensive" },
                  ].map((d) => (
                    <button
                      type="button"
                      key={d.days}
                      className={`duration-pill${selectedDuration === d.days ? " active" : ""}`}
                      onClick={() => setSelectedDuration(d.days)}
                    >
                      {d.label}
                      <span className="duration-sub">{d.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                {goal && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setShowSetup(false)}
                    disabled={creatingGoal}
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  id="btn-generate-plan"
                  className="btn-start-plan"
                  disabled={creatingGoal}
                >
                  {creatingGoal ? "Generating Learning Plan..." : "Enroll & Start Learning Plan"}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* ── ACTIVE LEARNING PLAN & DASHBOARD ── */
          <div>
            {/* Header Greeting */}
            <div className="dash-header">
              <div>
                <h1 className="dash-title">Welcome back, {user?.name || "Learner"}</h1>
                <p className="dash-subtitle">
                  Track your daily progress, complete financial literacy modules, and build your savings confidence.
                </p>
              </div>
            </div>

            {/* ── Gamified Progress & Streak Bar ── */}
            <div className="progress-overview-grid">
              {/* Streak Card */}
              <div className="overview-card">
                <div className="overview-icon-box streak">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 23c-4.418 0-8-3.582-8-8 0-3.992 2.625-7.37 6.326-8.489a1 1 0 0 1 1.258 1.155c-.244 1.222.185 2.508 1.127 3.313 1.054.901 1.666 2.228 1.666 3.633 0 .736-.2 1.428-.547 2.025a1 1 0 0 0 1.547 1.252C16.398 16.822 17 15.485 17 14c0-.604-.114-1.185-.325-1.722a1 1 0 0 1 1.516-1.168C19.348 12.392 20 14.116 20 16c0 3.866-3.582 7-8 7z" />
                  </svg>
                </div>
                <div>
                  <div className="overview-number">{progress.streakCount || 0}</div>
                  <div className="overview-label">Day Streak</div>
                </div>
              </div>

              {/* Progress Card */}
              <div className="overview-card">
                <div className="overview-icon-box progress">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="overview-number">{stats.percentage}%</div>
                  <div className="overview-label">
                    {stats.completed} of {stats.total} Modules Completed
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${stats.percentage}%` }} />
                  </div>
                </div>
              </div>

              {/* Badges Card */}
              <div className="overview-card">
                <div className="overview-icon-box badges">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="8" r="7" />
                    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                  </svg>
                </div>
                <div>
                  <div className="overview-number">{progress.badges?.length || 0}</div>
                  <div className="overview-label">Badges Unlocked</div>
                  {progress.badges && progress.badges.length > 0 && (
                    <div className="badges-container">
                      {progress.badges.map((b) => (
                        <span className="badge-chip" key={b}>
                          {b}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Celebration Card when All Modules Completed */}
            {stats.isAllDone && (
              <div className="goal-celebration">
                <div className="celebration-title">Course Completed Successfully</div>
                <p className="celebration-desc">
                  Congratulations! You have completed all {stats.total} days of this financial literacy course. Keep your streak alive by starting your next milestone.
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowSetup(true)}
                  style={{ padding: "12px 28px", fontWeight: 700 }}
                >
                  Start Another Course
                </button>
              </div>
            )}

            {/* Active Goal Header Banner */}
            <div className="active-goal-card">
              <div>
                <div className="goal-meta-badges">
                  <span className="goal-category-badge">{goal.category}</span>
                  <span className="goal-duration-badge">{goal.durationDays} Days Duration</span>
                </div>
                <h2 className="goal-main-title">{goal.title}</h2>
              </div>
              <button
                className="btn btn-outline"
                style={{ fontSize: "0.85rem" }}
                onClick={() => setShowSetup(true)}
              >
                Change Course
              </button>
            </div>

            {/* ── Day-by-Day Learning Roadmap ── */}
            <div className="section-header">
              <h2 className="section-title">Your Day-by-Day Learning Roadmap</h2>
            </div>

            <div className="modules-timeline">
              {goal.modules.map((mod) => {
                const isCompleted = mod.completed;
                const content = mod.contentId;
                const isCurrent =
                  !isCompleted &&
                  goal.modules.findIndex((m) => !m.completed) === mod.day - 1;

                return (
                  <article
                    key={mod.day}
                    className={`module-card${isCompleted ? " completed" : ""}${isCurrent ? " current" : ""}`}
                    id={`module-day-${mod.day}`}
                  >
                    <div className="module-header">
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span className="module-day-badge">Day {mod.day}</span>
                        {content?.format && (
                          <span
                            style={{
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: "6px",
                              background: "rgba(255, 255, 255, 0.08)",
                              color: "var(--text-secondary)",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            {content.format}
                          </span>
                        )}
                        {isCurrent && (
                          <span
                            style={{
                              fontSize: "0.72rem",
                              fontWeight: 800,
                              padding: "2px 8px",
                              borderRadius: "6px",
                              background: "rgba(20, 184, 166, 0.2)",
                              color: "#2DD4BF",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            Active Step
                          </span>
                        )}
                      </div>

                      <div className={`module-status-indicator ${isCompleted ? "done" : "pending"}`}>
                        {isCompleted ? (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <span>Completed</span>
                          </>
                        ) : (
                          <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                            <span>Pending</span>
                          </>
                        )}
                      </div>
                    </div>

                    <h3 className="module-title">
                      {content?.title || `Day ${mod.day} Financial Resource`}
                    </h3>

                    {content?.body && (
                      <p className="module-body">{content.body}</p>
                    )}

                    {content?.mediaUrl && (
                      <a
                        href={content.mediaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="module-media-box"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                        <span>
                          {content.format === "video"
                            ? "Watch Video Explainer"
                            : "Open Educational Reference Guide"}
                        </span>
                      </a>
                    )}

                    <div className="module-footer">
                      {Array.isArray(content?.tags) && content.tags.length > 0 ? (
                        <div className="module-tags">
                          {content.tags.map((tag) => (
                            <span className="module-tag" key={tag}>
                              #{tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div />
                      )}

                      {!isCompleted ? (
                        <button
                          className="btn-complete-module"
                          disabled={completingDay === mod.day}
                          onClick={() => handleCompleteModule(mod.day)}
                          id={`btn-complete-${mod.day}`}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>{completingDay === mod.day ? "Saving..." : "Mark as Complete"}</span>
                        </button>
                      ) : (
                        <div
                          style={{
                            fontSize: "0.85rem",
                            fontWeight: 700,
                            color: "#34D399",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                          </svg>
                          <span>Finished</span>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* ── Toast Notifications ── */}
      {toast && (
        <div className="dash-toast-container">
          <div className={`dash-toast ${toast.type}`}>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
