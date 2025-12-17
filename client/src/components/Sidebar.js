import React from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";

function Sidebar({ user, onLogout, currentView, onViewChange, isOpen, onClose }) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const isActive = (view) => {
    return currentView === view;
  };


  const adminMenuItems = [
    { path: "/admin", label: "Dashboard", icon: "📊", view: "dashboard" },
    { path: "/admin", label: "Inventory", icon: "📦", view: "inventory" },
    { path: "/admin", label: "Reports", icon: "📈", view: "reports" },
  ];

  const cashierMenuItems = [
    { path: "/cashier", label: "Sales", icon: "💳" },
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
      
      <div className={`sidebar ${isOpen ? "open" : ""}`}>
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
              <div className="logo-title">GroceryPOS</div>
              <div className="logo-subtitle">
                {user?.role === "admin" ? "Admin" : "Cashier"}: {user?.fullName || user?.username}
              </div>
            </div>
          </div>
          {/* Mobile Close Button */}
          <button className="sidebar-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.view || item.path}
            className={`sidebar-nav-item ${isActive(item.view || item.path) ? "active" : ""}`}
            onClick={() => handleNavClick(item)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
          <button 
            className="sidebar-theme-btn" 
            onClick={toggleTheme}
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            <span>{theme === 'light' ? '🌙' : '☀️'}</span>
            <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
          </button>
          <button className="sidebar-logout-btn" onClick={onLogout}>
            <span>→</span> Logout
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

export default Sidebar;

