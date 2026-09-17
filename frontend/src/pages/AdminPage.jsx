import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { contentApi, adminApi } from "../services/api";
import "./AdminPage.css";

const CATEGORIES = [
  { key: "loans", label: "Loans & Microfinance", icon: "💰" },
  { key: "retirement", label: "Retirement Planning", icon: "🏦" },
  { key: "investment", label: "Investment Basics", icon: "📈" },
  { key: "taxation", label: "Taxation & PAN", icon: "🧾" },
  { key: "schemes", label: "Government Schemes", icon: "🏛️" },
  { key: "scam_alert", label: "Scam Alerts", icon: "🚨" },
];

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi (हिंदी)" },
  { code: "mr", label: "Marathi (मराठी)" },
  { code: "ta", label: "Tamil (தமிழ்)" },
  { code: "te", label: "Telugu (తెలుగు)" },
  { code: "bn", label: "Bengali (বাংলা)" },
];

const INITIAL_FORM = {
  title: "",
  category: "loans",
  body: "",
  mediaUrl: "",
  tags: "",
  language: "en",
};

export default function AdminPage() {
  const { user, logout } = useAuth();

  // Content library state
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  // Filters & search
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLang, setSelectedLang] = useState("all");

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);

  // Form state
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Toast notifications
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 3500);
  }, []);

  // Fetch content library
  const loadContent = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    try {
      // Fetch all content items via existing contentApi
      const data = await contentApi.getAll();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load content library:", err);
      setFetchError(err.message || "Failed to load content library.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  // Client-side filtering & search
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Category filter
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }
      // Language filter
      if (selectedLang !== "all" && item.language !== selectedLang) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = item.title?.toLowerCase().includes(q);
        const matchesBody = item.body?.toLowerCase().includes(q);
        const matchesTags = Array.isArray(item.tags) && item.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesBody && !matchesTags) return false;
      }
      return true;
    });
  }, [items, selectedCategory, selectedLang, searchQuery]);

  // Metrics summary
  const metrics = useMemo(() => {
    const counts = { total: items.length };
    CATEGORIES.forEach((cat) => {
      counts[cat.key] = items.filter((i) => i.category === cat.key).length;
    });
    return counts;
  }, [items]);

  // Open Add Modal
  function openAddModal() {
    setFormData(INITIAL_FORM);
    setFormErrors({});
    setSubmitError("");
    setIsAddOpen(true);
  }

  // Open Edit Modal
  function openEditModal(item) {
    setEditingItem(item);
    setFormData({
      title: item.title || "",
      category: item.category || "loans",
      body: item.body || "",
      mediaUrl: item.mediaUrl || "",
      tags: Array.isArray(item.tags) ? item.tags.join(", ") : "",
      language: item.language || "en",
    });
    setFormErrors({});
    setSubmitError("");
  }

  // Form Validation
  function validateForm() {
    const errs = {};
    if (!formData.title.trim()) {
      errs.title = "Title is required";
    }
    if (!formData.body.trim()) {
      errs.body = "Body content is required";
    }
    const validCats = CATEGORIES.map((c) => c.key);
    if (!validCats.includes(formData.category)) {
      errs.category = "Invalid category selected";
    }
    return errs;
  }

  // Handle Add Submit
  async function handleAddSubmit(e) {
    e.preventDefault();
    setSubmitError("");
    const errs = validateForm();
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      const payload = {
        title: formData.title.trim(),
        category: formData.category,
        body: formData.body.trim(),
        mediaUrl: formData.mediaUrl.trim(),
        language: formData.language,
        tags: formData.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      };

      const newItem = await adminApi.createContent(payload);
      setItems((prev) => [newItem, ...prev]);
      setIsAddOpen(false);
      showToast(`✔ "${newItem.title}" published successfully!`);
    } catch (err) {
      console.error("Failed to create content:", err);
      setSubmitError(err.message || "Failed to publish content.");
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Edit Submit
  async function handleEditSubmit(e) {
    e.preventDefault();
    if (!editingItem) return;
    setSubmitError("");
    const errs = validateForm();
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      const payload = {
        title: formData.title.trim(),
        category: formData.category,
        body: formData.body.trim(),
        mediaUrl: formData.mediaUrl.trim(),
        language: formData.language,
        tags: formData.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      };

      const updatedItem = await adminApi.updateContent(editingItem._id, payload);
      setItems((prev) =>
        prev.map((it) => (it._id === editingItem._id ? updatedItem : it))
      );
      setEditingItem(null);
      showToast(`✔ Updated "${updatedItem.title}" successfully!`);
    } catch (err) {
      console.error("Failed to update content:", err);
      setSubmitError(err.message || "Failed to update content item.");
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Delete
  async function handleDeleteConfirm() {
    if (!deletingItem) return;
    setSubmitting(true);
    try {
      await adminApi.deleteContent(deletingItem._id);
      setItems((prev) => prev.filter((it) => it._id !== deletingItem._id));
      const deletedTitle = deletingItem.title;
      setDeletingItem(null);
      showToast(`🗑️ "${deletedTitle}" deleted successfully.`);
    } catch (err) {
      console.error("Failed to delete content:", err);
      showToast(err.message || "Failed to delete item.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="admin-dashboard">
      {/* ── Top Navbar ── */}
      <header className="admin-navbar">
        <div className="admin-nav-inner">
          <div className="admin-brand">
            <div className="admin-brand-icon">🌱</div>
            <div>
              <span className="admin-brand-title">Creador Foundation</span>
              <span className="admin-role-badge">Admin Portal</span>
            </div>
          </div>

          <div className="admin-nav-actions">
            <div className="admin-user-info">
              <span>👤 {user?.name || "Administrator"}</span>
            </div>
            <Link to="/" className="btn btn-ghost" style={{ fontSize: "0.85rem", padding: "6px 12px" }}>
              Public Site
            </Link>
            <button
              onClick={logout}
              className="btn btn-outline"
              style={{ fontSize: "0.85rem", padding: "6px 14px", borderColor: "rgba(239, 68, 68, 0.4)", color: "#F87171" }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Container ── */}
      <main className="admin-container">
        {/* Header Title & Actions */}
        <div className="admin-header">
          <div>
            <h1 className="admin-header-title">Financial Literacy Content Library</h1>
            <p className="admin-header-subtitle">
              Manage educational articles, audio/video guides, and verified knowledge items for learners and the regional bot.
            </p>
          </div>
          <button id="btn-add-content" className="btn-add-content" onClick={openAddModal}>
            <span style={{ fontSize: "18px", fontWeight: "bold" }}>+</span> Add New Content
          </button>
        </div>

        {/* ── Metrics Summary ── */}
        <div className="admin-metrics">
          <div className="metric-card">
            <div className="metric-icon">📚</div>
            <div>
              <div className="metric-value">{metrics.total}</div>
              <div className="metric-label">Total Published Resources</div>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">💰</div>
            <div>
              <div className="metric-value">{metrics.loans || 0}</div>
              <div className="metric-label">Loans & Microfinance</div>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">🏛️</div>
            <div>
              <div className="metric-value">{(metrics.schemes || 0) + (metrics.retirement || 0)}</div>
              <div className="metric-label">Schemes & Pensions</div>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">🚨</div>
            <div>
              <div className="metric-value">{metrics.scam_alert || 0}</div>
              <div className="metric-label">Scam Awareness Guides</div>
            </div>
          </div>
        </div>

        {/* ── Search & Filter Toolbar ── */}
        <div className="admin-toolbar">
          <div className="toolbar-top">
            <div className="search-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="search-input"
                placeholder="Search by title, keyword, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="filter-selects">
              <select
                className="filter-select"
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value)}
                aria-label="Filter by language"
              >
                <option value="all">All Languages</option>
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>

              <button
                className="btn btn-ghost"
                onClick={loadContent}
                title="Refresh Content Library"
                style={{ padding: "10px 14px", border: "1px solid var(--border-color)", borderRadius: "10px" }}
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="category-pills">
            <button
              className={`cat-pill${selectedCategory === "all" ? " active" : ""}`}
              onClick={() => setSelectedCategory("all")}
            >
              All ({items.length})
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                className={`cat-pill${selectedCategory === cat.key ? " active" : ""}`}
                onClick={() => setSelectedCategory(cat.key)}
              >
                <span>{cat.icon}</span> {cat.label} ({metrics[cat.key] || 0})
              </button>
            ))}
          </div>
        </div>

        {/* ── Content Grid / List ── */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <div className="spinner" style={{ margin: "0 auto 16px" }} />
            <p style={{ color: "var(--text-muted)" }}>Loading Content Library...</p>
          </div>
        ) : fetchError ? (
          <div className="empty-state">
            <div className="empty-state-icon">⚠️</div>
            <h2 className="empty-state-title">Error Loading Content</h2>
            <p className="empty-state-desc">{fetchError}</p>
            <button className="btn btn-primary" onClick={loadContent}>
              Try Again
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <h2 className="empty-state-title">No resources found</h2>
            <p className="empty-state-desc">
              {searchQuery || selectedCategory !== "all" || selectedLang !== "all"
                ? "Try adjusting your search query or filters to find what you need."
                : "Your content library is empty. Start by adding your first financial literacy guide!"}
            </p>
            <button className="btn btn-primary" onClick={openAddModal}>
              + Add New Resource
            </button>
          </div>
        ) : (
          <div className="content-grid">
            {filteredItems.map((item) => {
              const catObj = CATEGORIES.find((c) => c.key === item.category);
              return (
                <article className="content-card" key={item._id}>
                  <div className="content-card-top">
                    <div className="content-badges">
                      <span className={`badge-category badge-${item.category}`}>
                        {catObj?.icon} {catObj?.label || item.category}
                      </span>
                      <span className="badge-lang">{item.language || "en"}</span>
                    </div>

                    <h2 className="content-card-title">{item.title}</h2>

                    <p className="content-card-body">{item.body}</p>

                    {item.mediaUrl && (
                      <a
                        href={item.mediaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="content-media-link"
                      >
                        🔗 {item.mediaUrl.length > 42 ? item.mediaUrl.substring(0, 42) + "…" : item.mediaUrl}
                      </a>
                    )}

                    {Array.isArray(item.tags) && item.tags.length > 0 && (
                      <div className="content-tags">
                        {item.tags.map((tag) => (
                          <span className="content-tag" key={tag}>
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="content-card-footer">
                    <span className="content-card-date">
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "Published"}
                    </span>

                    <div className="content-card-actions">
                      <button
                        className="btn-card-action"
                        onClick={() => setPreviewItem(item)}
                        title="View Full Content"
                      >
                        👁️ View
                      </button>
                      <button
                        className="btn-card-action edit"
                        onClick={() => openEditModal(item)}
                        title="Edit Resource"
                        id={`edit-${item._id}`}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="btn-card-action delete"
                        onClick={() => setDeletingItem(item)}
                        title="Delete Resource"
                        id={`delete-${item._id}`}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* ── MODAL: Add New Content ── */}
      {isAddOpen && (
        <div className="modal-overlay" onClick={() => !submitting && setIsAddOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <span>➕</span> Publish New Content
              </div>
              <button
                className="modal-close"
                onClick={() => setIsAddOpen(false)}
                disabled={submitting}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="modal-form-wrapper">
              <div className="modal-body">
                {submitError && (
                  <div className="alert alert-error" style={{ marginBottom: "16px" }}>
                    {submitError}
                  </div>
                )}

                <div className="modal-form">
                  <div>
                    <label className="modal-input-label">
                      Title <span>*</span>
                    </label>
                    <input
                      type="text"
                      className="modal-input"
                      placeholder="e.g. Understanding PM Mudra Loan Scheme"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                    {formErrors.title && (
                      <div style={{ color: "#EF4444", fontSize: "0.8rem", marginTop: "4px" }}>
                        {formErrors.title}
                      </div>
                    )}
                  </div>

                  <div className="form-row">
                    <div>
                      <label className="modal-input-label">
                        Category <span>*</span>
                      </label>
                      <select
                        className="modal-select"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat.key} value={cat.key}>
                            {cat.icon} {cat.label}
                          </option>
                        ))}
                      </select>
                      {formErrors.category && (
                        <div style={{ color: "#EF4444", fontSize: "0.8rem", marginTop: "4px" }}>
                          {formErrors.category}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="modal-input-label">Language</label>
                      <select
                        className="modal-select"
                        value={formData.language}
                        onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                      >
                        {LANGUAGES.map((l) => (
                          <option key={l.code} value={l.code}>
                            {l.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="modal-input-label">Media / Reference URL (Optional)</label>
                    <input
                      type="url"
                      className="modal-input"
                      placeholder="https://example.com/video-or-article"
                      value={formData.mediaUrl}
                      onChange={(e) => setFormData({ ...formData, mediaUrl: e.target.value })}
                    />
                    <div className="input-hint">Links to video explainers, official portal, or PDFs</div>
                  </div>

                  <div>
                    <label className="modal-input-label">Tags (Comma-separated)</label>
                    <input
                      type="text"
                      className="modal-input"
                      placeholder="loans, mudra, government, collateral-free"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    />
                    <div className="input-hint">Helps the AI bot and search retrieve this module quickly</div>
                  </div>

                  <div>
                    <label className="modal-input-label">
                      Content Body <span>*</span>
                    </label>
                    <textarea
                      className="modal-textarea"
                      placeholder="Provide clear, jargon-free explanation written for women learners..."
                      value={formData.body}
                      onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                      required
                    />
                    {formErrors.body && (
                      <div style={{ color: "#EF4444", fontSize: "0.8rem", marginTop: "4px" }}>
                        {formErrors.body}
                      </div>
                    )}
                  </div>

                  {/* Inline Submit Action inside scrollable body */}
                  <div style={{ paddingTop: "12px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setIsAddOpen(false)}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      id="btn-inline-submit-add"
                      className="btn btn-primary"
                      disabled={submitting}
                      style={{ fontWeight: 700, padding: "10px 20px" }}
                    >
                      {submitting ? "Publishing…" : "🚀 Publish Content"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setIsAddOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-submit-add-content"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ fontWeight: 700, padding: "10px 24px" }}
                >
                  {submitting ? "Publishing…" : "🚀 Publish Content"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Edit Content ── */}
      {editingItem && (
        <div className="modal-overlay" onClick={() => !submitting && setEditingItem(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <span>✏️</span> Edit Content Resource
              </div>
              <button
                className="modal-close"
                onClick={() => setEditingItem(null)}
                disabled={submitting}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="modal-form-wrapper">
              <div className="modal-body">
                {submitError && (
                  <div className="alert alert-error" style={{ marginBottom: "16px" }}>
                    {submitError}
                  </div>
                )}

                <div className="modal-form">
                  <div>
                    <label className="modal-input-label">
                      Title <span>*</span>
                    </label>
                    <input
                      type="text"
                      className="modal-input"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                    {formErrors.title && (
                      <div style={{ color: "#EF4444", fontSize: "0.8rem", marginTop: "4px" }}>
                        {formErrors.title}
                      </div>
                    )}
                  </div>

                  <div className="form-row">
                    <div>
                      <label className="modal-input-label">
                        Category <span>*</span>
                      </label>
                      <select
                        className="modal-select"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat.key} value={cat.key}>
                            {cat.icon} {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="modal-input-label">Language</label>
                      <select
                        className="modal-select"
                        value={formData.language}
                        onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                      >
                        {LANGUAGES.map((l) => (
                          <option key={l.code} value={l.code}>
                            {l.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="modal-input-label">Media / Reference URL</label>
                    <input
                      type="url"
                      className="modal-input"
                      placeholder="https://..."
                      value={formData.mediaUrl}
                      onChange={(e) => setFormData({ ...formData, mediaUrl: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="modal-input-label">Tags (Comma-separated)</label>
                    <input
                      type="text"
                      className="modal-input"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="modal-input-label">
                      Content Body <span>*</span>
                    </label>
                    <textarea
                      className="modal-textarea"
                      value={formData.body}
                      onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                      required
                    />
                    {formErrors.body && (
                      <div style={{ color: "#EF4444", fontSize: "0.8rem", marginTop: "4px" }}>
                        {formErrors.body}
                      </div>
                    )}
                  </div>

                  {/* Inline Submit Action inside scrollable body */}
                  <div style={{ paddingTop: "12px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setEditingItem(null)}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      id="btn-inline-submit-edit"
                      className="btn btn-primary"
                      disabled={submitting}
                      style={{ fontWeight: 700, padding: "10px 20px" }}
                    >
                      {submitting ? "Saving Changes…" : "💾 Save Changes"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setEditingItem(null)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-submit-edit-content"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ fontWeight: 700, padding: "10px 24px" }}
                >
                  {submitting ? "Saving Changes…" : "💾 Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Delete Confirmation ── */}
      {deletingItem && (
        <div className="modal-overlay" onClick={() => !submitting && setDeletingItem(null)}>
          <div className="modal-dialog" style={{ maxWidth: "480px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title" style={{ color: "#F87171" }}>
                <span>⚠️</span> Confirm Deletion
              </div>
              <button
                className="modal-close"
                onClick={() => setDeletingItem(null)}
                disabled={submitting}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p style={{ color: "var(--text-primary)", fontSize: "1rem", lineHeight: 1.5, marginBottom: "12px" }}>
                Are you sure you want to permanently delete:
              </p>
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  fontWeight: 700,
                  color: "#FCA5A5",
                  marginBottom: "16px",
                }}
              >
                {deletingItem.title}
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                ⚠️ This item will be removed immediately from the content library and will no longer be available for user learning plans or regional bot answers.
              </p>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setDeletingItem(null)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                style={{ background: "#DC2626", color: "#fff" }}
                onClick={handleDeleteConfirm}
                disabled={submitting}
              >
                {submitting ? "Deleting…" : "Delete Resource"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: View Full Content Preview ── */}
      {previewItem && (
        <div className="modal-overlay" onClick={() => setPreviewItem(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <span>📖</span> Resource Preview
              </div>
              <button className="modal-close" onClick={() => setPreviewItem(null)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="content-badges" style={{ marginBottom: "16px" }}>
                <span className={`badge-category badge-${previewItem.category}`}>
                  {CATEGORIES.find((c) => c.key === previewItem.category)?.icon}{" "}
                  {CATEGORIES.find((c) => c.key === previewItem.category)?.label || previewItem.category}
                </span>
                <span className="badge-lang">{previewItem.language || "en"}</span>
              </div>

              <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "16px", color: "var(--text-primary)" }}>
                {previewItem.title}
              </h2>

              <div
                style={{
                  fontSize: "1rem",
                  lineHeight: 1.7,
                  color: "var(--text-secondary)",
                  whiteSpace: "pre-line",
                  marginBottom: "20px",
                }}
              >
                {previewItem.body}
              </div>

              {previewItem.mediaUrl && (
                <div style={{ marginBottom: "16px" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Media Link: </span>
                  <a
                    href={previewItem.mediaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="content-media-link"
                  >
                    🔗 {previewItem.mediaUrl}
                  </a>
                </div>
              )}

              {Array.isArray(previewItem.tags) && previewItem.tags.length > 0 && (
                <div className="content-tags">
                  {previewItem.tags.map((t) => (
                    <span className="content-tag" key={t}>
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-primary"
                onClick={() => {
                  const item = previewItem;
                  setPreviewItem(null);
                  openEditModal(item);
                }}
              >
                ✏️ Edit This Resource
              </button>
              <button className="btn btn-ghost" onClick={() => setPreviewItem(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Floating Toast Notification ── */}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
