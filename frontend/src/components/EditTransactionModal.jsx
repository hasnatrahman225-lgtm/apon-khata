import { useState } from "react";
import { api } from "../api";
import { useLanguage } from "../context/LanguageContext";

export default function EditTransactionModal({ tx, onClose, onUpdated, onDeleted }) {
  const { t, getCategoryLabel } = useLanguage();

  // Parse existing date and time
  const initialDate = tx?.occurred_at
    ? tx.occurred_at.split(" ")[0].split("T")[0]
    : new Date().toISOString().split("T")[0];

  const initialTime = tx?.occurred_at?.includes(" ")
    ? tx.occurred_at.split(" ")[1]?.substring(0, 5)
    : tx?.occurred_at?.includes("T")
    ? tx.occurred_at.split("T")[1]?.substring(0, 5)
    : "12:00";

  const [direction, setDirection] = useState(tx?.direction || "gave");
  const [amount, setAmount] = useState(tx?.amount ? String(tx.amount) : "");
  const [category, setCategory] = useState(tx?.category || "general");
  const [note, setNote] = useState(tx?.note || "");
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime || "12:00");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const CATEGORIES = [
    { value: "sale", label: getCategoryLabel("sale") },
    { value: "purchase", label: getCategoryLabel("purchase") },
    { value: "expense", label: getCategoryLabel("expense") },
    { value: "due", label: getCategoryLabel("due") },
    { value: "deposit", label: getCategoryLabel("deposit") },
    { value: "general", label: getCategoryLabel("general") },
  ];

  async function handleSave(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!amount || Number(amount) < 0) {
      setError(t("invalid_amount", "সঠিক পরিমাণ দিন।"));
      return;
    }
    setBusy(true);
    setError("");

    try {
      const fullDateTime = `${date} ${time ? (time.length === 5 ? time + ":00" : time) : "12:00:00"}`;
      const res = await api.updateTransaction(tx.id, {
        direction,
        amount: Number(amount),
        category,
        note: note.trim(),
        occurredAt: fullDateTime,
      });
      if (onUpdated) onUpdated(res.transaction);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update transaction.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(t("delete_tx_confirm", "আপনি কি নিশ্চিত যে এই লেনদেনটি মুছে ফেলতে চান?"))) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.deleteTransaction(tx.id);
      if (onDeleted) onDeleted(tx.id);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to delete transaction.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header with prominent Save button right on top */}
        <div className="modal-header">
          <div className="modal-title">{t("edit_transaction_title", "লেনদেন এডিট করুন")}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={busy}
              style={{
                padding: "7px 16px",
                fontSize: "0.9rem",
                fontWeight: 700,
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                boxShadow: "0 2px 10px rgba(16, 185, 129, 0.4)",
              }}
            >
              {busy ? t("loading", "সংরক্ষণ...") : `✓ ${t("save_changes", "সংরক্ষণ করুন")}`}
            </button>
            <button type="button" className="btn-close" onClick={onClose} title={t("cancel", "বাতিল")}>
              ✕
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="modal-form-wrapper">
          <div className="modal-body" style={{ padding: "16px 20px" }}>
            {error && <div className="error-banner">{error}</div>}

            {tx?.contact_name && (
              <div className="row-sub" style={{ marginBottom: 10, fontSize: "0.88rem" }}>
                <strong style={{ color: "#f8fafc" }}>{t("col_contact", "পক্ষ / গ্রাহক")}:</strong> {tx.contact_name}
              </div>
            )}

            {/* Gave / Got Segmented Toggle */}
            <div className="segmented" style={{ marginBottom: 12 }}>
              <button
                type="button"
                className={direction === "gave" ? "active gave" : ""}
                onClick={() => setDirection("gave")}
              >
                {t("direction_gave", "দিলাম (বাকী / পাওনা)")}
              </button>
              <button
                type="button"
                className={direction === "got" ? "active got" : ""}
                onClick={() => setDirection("got")}
              >
                {t("direction_got", "পেলাম (জমা / পরিশোধ)")}
              </button>
            </div>

            {/* Compact 2-column layout */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>{t("amount", "টাকার পরিমাণ (৳)")}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                />
              </div>

              <div className="field" style={{ marginBottom: 0 }}>
                <label>{t("category", "লেনদেন / খরচের খাত")}</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="select-input"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 10, marginBottom: 10 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>{t("date", "তারিখ (পেছনের তারিখ)")}</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>{t("time", "সময়")}</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>

            <div className="field" style={{ marginBottom: 4 }}>
              <label>{t("note", "নোট / বিবরণ")}</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("note_placeholder", "যেমন: মালামাল বাবদ")}
              />
            </div>
          </div>

          {/* Modal Footer (Both Bottom & Top have Save buttons!) */}
          <div className="modal-footer" style={{ padding: "12px 20px" }}>
            <button
              type="button"
              className="btn-danger-text"
              onClick={handleDelete}
              disabled={busy}
            >
              🗑️ {t("delete_tx", "মুছে ফেলুন")}
            </button>
            <div style={{ display: "flex", gap: 10 }}>
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
                  boxShadow: "0 2px 10px rgba(16, 185, 129, 0.4)",
                  fontWeight: 700,
                }}
              >
                {busy ? t("loading", "সংরক্ষণ...") : `✓ ${t("save_changes", "সংরক্ষণ করুন")}`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
