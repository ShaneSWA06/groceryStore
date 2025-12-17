import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

function CashierLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const usernameRef = useRef(null);

  useEffect(() => {
    // Auto-focus username field on mount
    setTimeout(() => {
      usernameRef.current?.focus();
    }, 100);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Basic validation
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

      // Store token and user info
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));

      // Clear form
      setUsername("");
      setPassword("");

      // Redirect to cashier page
      navigate("/cashier");
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Login failed. Please check your credentials.";
      setError(errorMessage);
      setPassword("");
      usernameRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSubmit(e);
    }
  };

  return (
    <>
      <style>
        {`
          input::placeholder {
            color: #64748b !important;
            opacity: 1;
          }
        `}
      </style>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          background: "linear-gradient(135deg, #1a365d 0%, #0f2439 100%)",
          padding: "20px",
        }}
      >
      <div className="card" style={{ maxWidth: "420px", width: "100%", boxShadow: "0 10px 40px rgba(0,0,0,0.2)", background: "#1e293b", border: "1px solid #334155" }}>
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <div
            style={{
              width: "120px",
              height: "120px",
              margin: "0 auto 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src="/images/zawkhinLogoTrans.png"
              alt="POS System Logo"
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
              }}
            />
          </div>
          <h1
            style={{
              marginBottom: "8px",
              color: "#ffffff",
              fontSize: "28px",
              fontWeight: "700",
              letterSpacing: "-0.5px",
            }}
          >
            POS System
          </h1>
          <h2
            style={{
              marginBottom: "0",
              fontSize: "18px",
              fontWeight: "500",
              color: "#cbd5e1",
            }}
          >
            Cashier Access
          </h2>
        </div>

        {error && (
          <div
            className="alert alert-error"
            style={{
              marginBottom: "20px",
              padding: "12px 16px",
              borderRadius: "8px",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label style={{ marginBottom: "8px", fontWeight: "600", color: "#e2e8f0" }}>
              Username
            </label>
            <input
              ref={usernameRef}
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError("");
              }}
              onKeyPress={handleKeyPress}
              required
              autoComplete="username"
              placeholder="Enter your username"
              style={{
                padding: "12px 16px",
                fontSize: "15px",
                border: error ? "2px solid #dc2626" : "1px solid #475569",
                background: "#0f172a",
                color: "#ffffff",
              }}
              disabled={loading}
            />
          </div>

          <div className="form-group" style={{ position: "relative" }}>
            <label style={{ marginBottom: "8px", fontWeight: "600", color: "#e2e8f0" }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                onKeyPress={handleKeyPress}
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                style={{
                  padding: "12px 45px 12px 16px",
                  fontSize: "15px",
                  width: "100%",
                  border: error ? "2px solid #dc2626" : "1px solid #475569",
                  background: "#0f172a",
                  color: "#ffffff",
                }}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  color: "#cbd5e1",
                  fontSize: "18px",
                }}
                tabIndex={-1}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: "100%",
              marginTop: "10px",
              padding: "14px",
              fontSize: "16px",
              fontWeight: "600",
            }}
            disabled={loading || !username.trim() || !password.trim()}
          >
            {loading ? (
              <span>
                <span style={{ marginRight: "8px" }}>⏳</span>
                Authenticating...
              </span>
            ) : (
              "Sign In as Cashier"
            )}
          </button>
        </form>

        <div
          style={{
            marginTop: "24px",
            paddingTop: "24px",
            borderTop: "1px solid var(--border-color)",
            textAlign: "center",
          }}
        >
          <button
            className="btn btn-secondary"
            onClick={() => navigate("/admin-login")}
            style={{
              width: "100%",
              fontSize: "14px",
              padding: "10px",
              background: "transparent",
              color: "#cbd5e1",
              border: "1px solid #475569",
            }}
            disabled={loading}
          >
            ← Switch to Admin Login
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

export default CashierLogin;

