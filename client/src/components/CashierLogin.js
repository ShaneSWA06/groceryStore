import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const usernameRef = useRef(null);

  useEffect(() => {
    // If already logged in, redirect based on role
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (token && user) {
      navigate(user.role === "admin" ? "/admin" : "/cashier", { replace: true });
    }
    setTimeout(() => usernameRef.current?.focus(), 100);
  }, [navigate]);

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

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));

      const role = response.data.user.role;
      navigate(role === "admin" ? "/admin" : "/cashier", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Please check your credentials.");
      setPassword("");
      usernameRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-shell">
        <aside className="login-brand-panel">
          <div className="login-brand-badge">Grocery Store POS</div>
          <h1 className="login-brand-title">Point of sale for real daily shop work.</h1>
          <p className="login-brand-copy">
            Built for quick barcode entry, clear totals, and fast checkout without the dashboard fluff.
          </p>
          <div className="login-brand-meta">
            <div className="login-brand-meta-card">
              <span className="login-brand-meta-label">Station</span>
              <strong>All terminals</strong>
            </div>
            <div className="login-brand-meta-card">
              <span className="login-brand-meta-label">Mode</span>
              <strong>Role-based access</strong>
            </div>
          </div>
        </aside>

        <section className="login-form-panel">
          <div className="login-form-header">
            <div className="login-form-kicker">Sign in</div>
            <h2>Welcome back</h2>
            <p>Enter your credentials. You'll be sent to the right screen based on your role.</p>
          </div>

          {error && <div className="alert alert-error login-alert">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label>Username</label>
              <input
                ref={usernameRef}
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(""); }}
                required
                autoComplete="username"
                placeholder="Your username"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="login-password-row">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
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
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

export default Login;
