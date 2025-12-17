import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import Admin from "./components/Admin";
import Cashier from "./components/Cashier";
import CashierLogin from "./components/CashierLogin";
import AdminLogin from "./components/AdminLogin";
import MobileScanner from "./components/MobileScanner";
import ProtectedRoute from "./components/ProtectedRoute";
import "./App.css";

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="App">
          <Routes>
          <Route path="/login" element={<CashierLogin />} />
          <Route path="/admin-login" element={<AdminLogin />} />
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
