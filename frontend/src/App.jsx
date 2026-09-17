import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { RequireAuth, RequireAdmin, GuestOnly } from "./components/RouteGuards";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DashboardPage from "./pages/DashboardPage";
import AdminPage from "./pages/AdminPage";

import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />

          {/* Guest only (redirect logged-in users to their dashboard) */}
          <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
          <Route path="/signup" element={<GuestOnly><SignupPage /></GuestOnly>} />

          {/* Protected — any authenticated user */}
          <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />

          {/* Protected — admin only */}
          <Route path="/admin" element={<RequireAdmin><AdminPage /></RequireAdmin>} />

          {/* 404 fallback */}
          <Route path="*" element={
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "16px" }}>
              <div style={{ fontSize: "56px" }}>🌿</div>
              <h1 style={{ fontSize: "24px", fontWeight: 800 }}>Page not found</h1>
              <a href="/" className="btn btn-primary">← Go Home</a>
            </div>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
