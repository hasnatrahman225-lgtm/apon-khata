import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import LanguageModal from "../components/LanguageModal";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export default function Login() {
  const { login, register, resetPassword, loginWithGoogle } = useAuth();
  const { t, currentLang, setCurrentLang, availableLanguages } = useLanguage();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // 'login' | 'register' | 'forgot'
  const [form, setForm] = useState({ email: "", password: "", name: "", businessName: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  const googleBtnRef = useRef(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !window.google) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response) => {
        setError("");
        setBusy(true);
        try {
          await loginWithGoogle(response.credential);
          navigate("/");
        } catch (err) {
          setError(err.message);
        } finally {
          setBusy(false);
        }
      },
    });
    if (googleBtnRef.current) {
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        width: 320,
        text: "continue_with",
      });
    }
  }, [loginWithGoogle, navigate]);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
        navigate("/");
      } else if (mode === "register") {
        await register(form);
        navigate("/");
      } else if (mode === "forgot") {
        await resetPassword(form.email, form.password);
        setSuccess("পাসওয়ার্ড সফলভাবে রিসেট হয়েছে! ড্যাশবোর্ডে নিয়ে যাওয়া হচ্ছে...");
        setTimeout(() => navigate("/"), 1200);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="ledger-page" style={{ maxWidth: 460, marginTop: 30 }}>
        <div className="ledger-inner">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div className="brand-mark">
              <span className="stitch" />
              {t("app_title", "আপন খাতা")}
            </div>

            <div className="header-actions">
              <select
                className="lang-select"
                value={currentLang}
                onChange={(e) => {
                  if (e.target.value === "__manage__") setShowLangModal(true);
                  else setCurrentLang(e.target.value);
                }}
              >
                {availableLanguages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.flag} {l.name}
                  </option>
                ))}
                <option value="__manage__">⚙️ ...</option>
              </select>
            </div>
          </div>

          <div className="brand-sub" style={{ marginBottom: 20 }}>
            {mode === "forgot"
              ? "আপনার অ্যাকাউন্টের ইমেইল ও নতুন পাসওয়ার্ড দিয়ে রিসেট করুন"
              : t("tagline", "পেমেন্ট নয়, শুধু হিসাব — আপনার ইমেইলেই নিরাপদ")}
          </div>

          {error && <div className="error-banner">{error}</div>}
          {success && <div className="success-banner">{success}</div>}

          {mode !== "forgot" && GOOGLE_CLIENT_ID ? (
            <>
              <div ref={googleBtnRef} style={{ display: "flex", justifyContent: "center", marginBottom: 16 }} />
              <div className="center-note" style={{ margin: "12px 0" }}>অথবা ইমেইল দিয়ে</div>
            </>
          ) : null}

          <form onSubmit={handleSubmit}>
            {mode === "register" && (
              <>
                <div className="field">
                  <label>{t("name", "আপনার নাম")}</label>
                  <input value={form.name} onChange={update("name")} placeholder="যেমন: মতিউর রহমান" />
                </div>
                <div className="field">
                  <label>দোকান/ব্যবসার নাম</label>
                  <input value={form.businessName} onChange={update("businessName")} placeholder="যেমন: রহিম স্টোর" />
                </div>
              </>
            )}

            <div className="field">
              <label>{t("email", "ইমেইল")}</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={update("email")}
                placeholder="you@gmail.com"
                autoFocus
              />
            </div>

            <div className="field">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ margin: 0 }}>
                  {mode === "forgot" ? "নতুন পাসওয়ার্ড" : t("password", "পাসওয়ার্ড")}
                </label>
                {mode === "login" && (
                  <button
                    type="button"
                    className="link-btn"
                    style={{ fontSize: "0.82rem", fontWeight: 500 }}
                    onClick={() => {
                      setError("");
                      setSuccess("");
                      setMode("forgot");
                    }}
                  >
                    পাসওয়ার্ড ভুলে গেছেন?
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={update("password")}
                placeholder="কমপক্ষে ৬ অক্ষর"
                style={{ marginTop: 6 }}
              />
            </div>

            <button
              className="btn btn-primary btn-block"
              disabled={busy}
              style={{ marginTop: 16 }}
            >
              {busy
                ? t("loading", "অপেক্ষা করুন...")
                : mode === "login"
                ? "লগইন করুন"
                : mode === "register"
                ? "অ্যাকাউন্ট তৈরি করুন"
                : "পাসওয়ার্ড রিসেট ও লগইন করুন"}
            </button>
          </form>

          <div className="center-note" style={{ marginTop: 18 }}>
            {mode === "login" ? (
              <>
                নতুন ব্যবহারকারী?{" "}
                <button className="link-btn" onClick={() => { setError(""); setMode("register"); }}>
                  অ্যাকাউন্ট তৈরি করুন
                </button>
              </>
            ) : mode === "register" ? (
              <>
                আগে থেকে অ্যাকাউন্ট আছে?{" "}
                <button className="link-btn" onClick={() => { setError(""); setMode("login"); }}>
                  লগইন করুন
                </button>
              </>
            ) : (
              <>
                মনে পড়েছে?{" "}
                <button className="link-btn" onClick={() => { setError(""); setMode("login"); }}>
                  লগইন এ ফিরে যান
                </button>
              </>
            )}
          </div>

          <div className="center-note" style={{ fontSize: "0.8rem", opacity: 0.75, marginTop: 12 }}>
            যেকোনো ফোন বা ব্রাউজারে এই একই ইমেইল দিয়ে লগইন করলে আপনার সব হিসাব ফিরে পাবেন।
          </div>

          {showLangModal && <LanguageModal onClose={() => setShowLangModal(false)} />}
        </div>
      </div>
    </div>
  );
}
