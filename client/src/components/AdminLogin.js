import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const usernameRef = useRef(null);

  useEffect(() => {
    setTimeout(() => {
      usernameRef.current?.focus();
    }, 100);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Please enter your username");
      usernameRef.current?.focus();
      return;
    }

    if (!password.trim()) {
      setError("Please enter your password");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        username: username.trim(),
        password: password.trim(),
      });

      if (response.data.user.role !== "admin") {
        setError("Access denied. Admin privileges required.");
        setLoading(false);
        setPassword("");
        return;
      }

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      setUsername("");
      setPassword("");
      navigate("/admin");
    } catch (err) {
      const errorMessage =
        err.response?.data?.error || "Login failed. Please check your credentials.";
      setError(errorMessage);
      setPassword("");
      usernameRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page login-page-admin">
      <div className="login-shell">
        <aside className="login-brand-panel">
          <div className="login-brand-badge">Back office</div>
          <h1 className="login-brand-title">Run inventory, pricing, and reports from one desk.</h1>
          <p className="login-brand-copy">
            The admin side is set up for stock review, category cleanup, and transaction control without noisy dashboard chrome.
          </p>
          <div className="login-brand-meta">
            <div className="login-brand-meta-card">
              <span className="login-brand-meta-label">Workspace</span>
              <strong>Inventory office</strong>
            </div>
            <div className="login-brand-meta-card">
              <span className="login-brand-meta-label">Access</span>
              <strong>Administrator only</strong>
            </div>
          </div>
        </aside>

        <section className="login-form-panel">
          <div className="login-form-header">
            <div className="login-form-kicker">Admin login</div>
            <h2>Sign in to the control desk</h2>
            <p>Use your administrator account to manage stock, reports, and system records.</p>
          </div>

          {error && <div className="alert alert-error login-alert">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label>Username</label>
              <input
                ref={usernameRef}
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError("");
                }}
                required
                autoComplete="username"
                placeholder="Administrator username"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="login-password-row">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  required
                  autoComplete="current-password"
                  placeholder="Password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="login-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary login-submit-btn"
              disabled={loading || !username.trim() || !password.trim()}
            >
              {loading ? "Signing in..." : "Open admin workspace"}
            </button>
          </form>

          <div className="login-switch-row">
            <span>Need the cashier screen instead?</span>
            <button
              type="button"
              className="btn btn-secondary login-switch-btn"
              onClick={() => navigate("/login")}
              disabled={loading}
            >
              Go to cashier login
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default AdminLogin;
