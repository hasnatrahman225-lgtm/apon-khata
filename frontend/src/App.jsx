import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LanguageProvider, useLanguage } from "./context/LanguageContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Contacts from "./pages/Contacts";
import ContactDetail from "./pages/ContactDetail";
import Stock from "./pages/Stock";
import Reports from "./pages/Reports";

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  if (loading) {
    return (
      <div className="app-shell">
        <div className="center-note" style={{ color: "#fff", marginTop: 60 }}>
          {t("loading", "লোড হচ্ছে...")}
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RedirectIfAuthed({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
      <Router>
        <Routes>
          <Route
            path="/login"
            element={
              <RedirectIfAuthed>
                <Login />
              </RedirectIfAuthed>
            }
          />
          <Route
            path="/"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/customers"
            element={
              <RequireAuth>
                <Contacts type="customer" />
              </RequireAuth>
            }
          />
          <Route
            path="/suppliers"
            element={
              <RequireAuth>
                <Contacts type="supplier" />
              </RequireAuth>
            }
          />
          <Route
            path="/contact/:id"
            element={
              <RequireAuth>
                <ContactDetail />
              </RequireAuth>
            }
          />
          <Route
            path="/stock"
            element={
              <RequireAuth>
                <Stock />
              </RequireAuth>
            }
          />
          <Route
            path="/reports"
            element={
              <RequireAuth>
                <Reports />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
    </LanguageProvider>
  );
}
