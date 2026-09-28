import { useState } from "react";
import { api } from "../api";
import { useLanguage } from "../context/LanguageContext";

export default function ChangePasswordModal({ onClose }) {
  const { t } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!newPassword || newPassword.length < 6) {
      setError(t("password_min_6", "নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("passwords_dont_match", "নতুন পাসওয়ার্ড ও কনফার্ম পাসওয়ার্ড মেলেনি।"));
      return;
    }

    setBusy(true);
    try {
      const res = await api.changePassword({ currentPassword, newPassword });
      setSuccess(res.message || "পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে।");
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || "পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে।");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">🔒 {t("change_password_title", "পাসওয়ার্ড পরিবর্তন করুন")}</div>
          <button type="button" className="btn-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form-wrapper">
          <div className="modal-body" style={{ padding: "20px" }}>
            {error && <div className="error-banner">{error}</div>}
            {success && <div className="success-banner">{success}</div>}

            <div className="field">
              <label>{t("current_password", "বর্তমান পাসওয়ার্ড")}</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="field">
              <label>{t("new_password", "নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)")}</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="field" style={{ marginBottom: 4 }}>
              <label>{t("confirm_password", "নতুন পাসওয়ার্ড নিশ্চিত করুন")}</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="modal-footer" style={{ padding: "14px 20px" }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
              {t("cancel", "বাতিল")}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={busy}
              style={{
                minWidth: 140,
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                fontWeight: 700,
              }}
            >
              {busy ? t("loading", "সংরক্ষণ...") : `✓ ${t("save_changes", "পাসওয়ার্ড পরিবর্তন")}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
