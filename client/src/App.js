import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import Admin from "./components/Admin";
import Cashier from "./components/Cashier";
import Login from "./components/CashierLogin";
import MobileScanner from "./components/MobileScanner";
import ProtectedRoute from "./components/ProtectedRoute";
import { playAppReady, unlockAudio } from "./utils/sounds";
import "./App.css";

function App() {
  useEffect(() => {
    // Register audio unlock on first user gesture (fixes async scan sound on mobile)
    unlockAudio();
    // Play startup chime after a short delay (audio elements need a moment to load)
    const t = setTimeout(() => playAppReady(), 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <ThemeProvider>
      <Router>
        <div className="App">
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/admin-login" element={<Navigate to="/login" replace />} />
          <Route path="/mobile-scanner" element={<MobileScanner />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cashier"
            element={
              <ProtectedRoute>
                <Cashier />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
