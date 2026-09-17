import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

export default function DashboardPlaceholder() {
  const { user, logout } = useAuth();
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "24px" }}>
      <div style={{ fontSize: "48px" }}>🎉</div>
      <h1 style={{ fontSize: "28px", fontWeight: 800 }}>Welcome, {user?.name}!</h1>
      <p style={{ color: "var(--text-muted)", fontSize: "15px" }}>
        Your learning dashboard is being built by Person B. Check back soon!
      </p>
      <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
        <Link to="/" className="btn btn-outline">← Home</Link>
        <button className="btn btn-ghost" onClick={logout}>Logout</button>
      </div>
    </div>
  );
}
