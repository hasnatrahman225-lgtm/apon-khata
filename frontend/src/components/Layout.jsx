import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import LanguageModal from "./LanguageModal";
import ChangePasswordModal from "./ChangePasswordModal";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { t, currentLang, setCurrentLang, availableLanguages } = useLanguage();
  const [showLangModal, setShowLangModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  return (
    <div className="app-shell">
      <div className="ledger-page">
        <div className="ledger-inner">
          <div className="brand-row">
            <div>
              <div className="brand-mark">
                <span className="stitch" />
                {t("app_title", "আপন খাতা")}
              </div>
              <div className="brand-sub">
                {user?.businessName || t("business", "আপনার ব্যবসা")} · {user?.email}
              </div>
            </div>
            
            <div className="header-actions">
              <div className="lang-dropdown-wrapper">
                <select
                  className="lang-select"
                  value={currentLang}
                  onChange={(e) => {
                    if (e.target.value === "__manage__") {
                      setShowLangModal(true);
                    } else {
                      setCurrentLang(e.target.value);
                    }
                  }}
                  title={t("manage_languages", "ভাষা পরিবর্তন")}
                >
                  {availableLanguages.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.flag} {l.name}
                    </option>
                  ))}
                  <option value="__manage__">⚙️ {t("manage_languages", "ভাষা যোগ / টেমপ্লেট...")}</option>
                </select>
              </div>

              <button
                type="button"
                className="btn-icon"
                onClick={() => setShowLangModal(true)}
                title={t("manage_languages", "ভাষা সেটিংস ও প্যাক ডাউনলোড/আপলোড")}
              >
                🌐
              </button>

              <button
                type="button"
                className="btn-icon"
                onClick={() => setShowPasswordModal(true)}
                title={t("change_password_title", "পাসওয়ার্ড পরিবর্তন")}
              >
                🔒
              </button>

              <button type="button" className="btn-danger-text" onClick={logout}>
                {t("btn_logout", "লগআউট")}
              </button>
            </div>
          </div>

          <nav className="tab-row">
            <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
              {t("nav_dashboard", "ড্যাশবোর্ড")}
            </NavLink>
            <NavLink to="/customers" className={({ isActive }) => (isActive ? "active" : "")}>
              {t("nav_customers", "কাস্টমার")}
            </NavLink>
            <NavLink to="/suppliers" className={({ isActive }) => (isActive ? "active" : "")}>
              {t("nav_suppliers", "সাপ্লায়ার")}
            </NavLink>
            <NavLink to="/stock" className={({ isActive }) => (isActive ? "active" : "")}>
              {t("nav_stock", "স্টক")}
            </NavLink>
            <NavLink to="/reports" className={({ isActive }) => (isActive ? "active" : "")}>
              {t("nav_reports", "রিপোর্ট")}
            </NavLink>
          </nav>

          {children}

          {showLangModal && <LanguageModal onClose={() => setShowLangModal(false)} />}
          {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
        </div>
      </div>
    </div>
  );
}
