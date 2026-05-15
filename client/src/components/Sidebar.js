import React from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";

const LogoutIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M10 3H5.8C5.35817 3 5 3.35817 5 3.8V20.2C5 20.6418 5.35817 21 5.8 21H10"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M13 8L19 12L13 16"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9 12H19"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function Sidebar({
  user,
  onLogout,
  currentView,
  onViewChange,
  isOpen,
  onClose,
  isCollapsed,
  onToggleCollapse,
}) {
  const navigate = useNavigate();
  const { theme, toggleTheme, uiScale, setUiScale } = useTheme();

  const isActive = (view) => {
    return currentView === view;
  };


  const adminMenuItems = [
    { path: "/admin", label: "Dashboard", shortLabel: "DB", view: "dashboard" },
    { path: "/admin", label: "Inventory", shortLabel: "ST", view: "inventory" },
    { path: "/admin", label: "Reports", shortLabel: "RP", view: "reports" },
  ];

  const cashierMenuItems = [
    { path: "/cashier", label: "Sales Counter", shortLabel: "SC" },
  ];

  const menuItems = user?.role === "admin" ? adminMenuItems : cashierMenuItems;

  const handleNavClick = (item) => {
    if (onViewChange) {
      onViewChange(item.view);
    } else {
      navigate(item.path);
    }
    // Close sidebar on mobile after navigation
    if (window.innerWidth <= 768 && onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      
      <div className={`sidebar ${isOpen ? "open" : ""} ${isCollapsed ? "collapsed" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon">
              <img 
                src="/images/zawkhinLogo.PNG" 
                alt="ZAW KHIN Logo" 
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>
            <div>
              <div className="logo-kicker">Store terminal</div>
              <div className="logo-title">Zaw Khin Market POS</div>
              <div className="logo-subtitle">
                {user?.fullName || user?.username} • {user?.role === "admin" ? "Administrator" : "Cashier"}
              </div>
            </div>
          </div>
          {/* Mobile Close Button */}
          <button className="sidebar-close-btn" onClick={onClose}>
            ✕
          </button>
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "Open menu" : "Collapse menu"}
          >
            {isCollapsed ? ">" : "<"}
          </button>
        </div>

      <div className="sidebar-status-card">
        <div className="sidebar-status-label">Current station</div>
        <div className="sidebar-status-value">
          {user?.role === "admin" ? "Back office" : "Front counter"}
        </div>
        <div className="sidebar-status-meta">
          {theme === "light" ? "Day view" : "Night view"}
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.view || item.path}
            className={`sidebar-nav-item ${isActive(item.view || item.path) ? "active" : ""}`}
            onClick={() => handleNavClick(item)}
          >
            <span className="nav-icon nav-icon-badge">{item.shortLabel}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-note">
          Keep the counter running smoothly with quick stock checks and clear order flow.
        </div>
        <div className="sidebar-scale-block">
          <div className="sidebar-scale-label">Text size</div>
          <div className="sidebar-scale-options">
            <button
              type="button"
              className={`sidebar-scale-btn ${uiScale === "compact" ? "active" : ""}`}
              onClick={() => setUiScale("compact")}
            >
              S
            </button>
            <button
              type="button"
              className={`sidebar-scale-btn ${uiScale === "normal" ? "active" : ""}`}
              onClick={() => setUiScale("normal")}
            >
              M
            </button>
            <button
              type="button"
              className={`sidebar-scale-btn ${uiScale === "large" ? "active" : ""}`}
              onClick={() => setUiScale("large")}
            >
              L
            </button>
          </div>
        </div>
        <div className="sidebar-scale-block">
          <div className="sidebar-scale-label">Theme</div>
        </div>
        <div className="sidebar-action-stack">
          <button 
            className="sidebar-theme-btn" 
            onClick={toggleTheme}
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            <span className="sidebar-theme-icon">
              {theme === "light" ? "MOON" : "SUN"}
            </span>
            <span className="sidebar-theme-copy">
              <strong>{theme === "light" ? "Night view" : "Day view"}</strong>
              <small>
                {theme === "light"
                  ? "Dim the workspace"
                  : "Brighten the workspace"}
              </small>
            </span>
          </button>
          <button
            className="sidebar-logout-btn"
            onClick={onLogout}
            title="Logout"
            aria-label="Logout"
          >
            <span aria-hidden="true">
              <LogoutIcon />
            </span>
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

export default Sidebar;

