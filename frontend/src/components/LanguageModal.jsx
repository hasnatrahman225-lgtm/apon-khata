import { useState } from "react";
import { useLanguage } from "../context/LanguageContext";

export default function LanguageModal({ onClose }) {
  const {
    t,
    currentLang,
    setCurrentLang,
    downloadLanguageTemplate,
    importCustomLanguage,
    removeCustomLanguage,
    availableLanguages,
  } = useLanguage();

  const [uploadError, setUploadError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  function handleFileUpload(e) {
    setUploadError("");
    setSuccessMsg("");
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (!json || typeof json !== "object") {
          throw new Error("Invalid JSON file.");
        }
        const pack = importCustomLanguage(json);
        setSuccessMsg(`"${pack.lang_name}" ভাষা সফলভাবে যোগ করা হয়েছে!`);
      } catch (err) {
        setUploadError("ফাইলটি সঠিক JSON নয় বা ফরম্যাটে সমস্যা আছে: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{t("lang_modal_title", "ভাষা সেটিংস ও ভাষা প্যাক")}</div>
          <button type="button" className="btn-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {successMsg && <div className="success-banner">{successMsg}</div>}
          {uploadError && <div className="error-banner">{uploadError}</div>}

          <div style={{ marginBottom: 20 }}>
            <label className="field-label" style={{ marginBottom: 8, display: "block", fontWeight: 600 }}>
              বর্তমান ভাষা নির্বাচন করুন:
            </label>
            <div className="lang-chips">
              {availableLanguages.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  className={lang-chip }
                  onClick={() => setCurrentLang(lang.code)}
                >
                  <span style={{ fontSize: "1.2rem" }}>{lang.flag}</span>
                  <span>{lang.name}</span>
                </button>
              ))}
            </div>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid var(--paper-line)", margin: "16px 0" }} />

          <div style={{ marginBottom: 20 }}>
            <h4 style={{ margin: "0 0 6px", color: "var(--cover-maroon)" }}>
              ১. ভাষা টেমপ্লেট ডাউনলোড (Download Template)
            </h4>
            <p className="row-sub" style={{ margin: "0 0 10px" }}>
              {t(
                "download_template_desc",
                "এই ফাইলটি ডাউনলোড করে যেকোনো ভাষায় অনুবাদ করে আবার আপলোড করতে পারবেন।"
              )}
            </p>
            <button type="button" className="btn btn-ghost" onClick={downloadLanguageTemplate}>
              📥 {t("download_template_btn", "ভাষা টেমপ্লেট ডাউনলোড করুন (.JSON)")}
            </button>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid var(--paper-line)", margin: "16px 0" }} />

          <div style={{ marginBottom: 20 }}>
            <h4 style={{ margin: "0 0 6px", color: "var(--cover-maroon)" }}>
              ২. অনূদিত ভাষা প্যাক যোগ করুন (Upload Language)
            </h4>
            <p className="row-sub" style={{ margin: "0 0 10px" }}>
              {t("upload_lang_prompt", "অনূদিত JSON ফাইলটি নির্বাচন করুন:")}
            </p>
            <label className="btn btn-primary" style={{ display: "inline-block", cursor: "pointer" }}>
              📤 {t("upload_lang_btn", "নতুন ভাষা ফাইল আপলোড করুন")}
              <input
                type="file"
                accept=".json,application/json"
                style={{ display: "none" }}
                onChange={handleFileUpload}
              />
            </label>
          </div>

          {availableLanguages.some((l) => l.isCustom) && (
            <div style={{ marginTop: 20 }}>
              <label className="field-label" style={{ marginBottom: 8, display: "block", fontWeight: 600 }}>
                {t("installed_custom_langs", "ইনস্টল করা কাস্টম ভাষা:")}
              </label>
              {availableLanguages
                .filter((l) => l.isCustom)
                .map((l) => (
                  <div className="custom-lang-item" key={l.code}>
                    <span>
                      {l.flag} {l.name} ({l.code})
                    </span>
                    <button
                      type="button"
                      className="btn-danger-text"
                      style={{ fontSize: "0.85rem" }}
                      onClick={() => removeCustomLanguage(l.code)}
                    >
                      {t("delete_lang", "মুছে দিন")}
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t("cancel", "বন্ধ করুন")}
          </button>
        </div>
      </div>
    </div>
  );
}
