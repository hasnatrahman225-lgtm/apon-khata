import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import EditTransactionModal from "../components/EditTransactionModal";
import { api } from "../api";
import { useLanguage } from "../context/LanguageContext";

function fmt(n) {
  return `৳${Number(n || 0).toLocaleString("en-BD", { maximumFractionDigits: 2 })}`;
}

export default function ContactDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, getCategoryLabel } = useLanguage();

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [direction, setDirection] = useState("gave");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("general");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [busy, setBusy] = useState(false);
  const [editingTx, setEditingTx] = useState(null);

  function load() {
    api
      .getContact(id)
      .then(setData)
      .catch((err) => setError(err.message));
  }

  useEffect(load, [id]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!amount) return;
    setBusy(true);
    setError("");
    try {
      await api.createTransaction({
        contactId: id,
        direction,
        amount: Number(amount),
        category: category || (direction === "gave" ? "due" : "deposit"),
        note: note.trim(),
        occurredAt: date,
      });
      setAmount("");
      setNote("");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteContact() {
    if (!confirm(`${data.contact.name} ${t("delete_contact_confirm", "মুছে ফেলতে চান? সব লেনদেনও মুছে যাবে।")}`)) return;
    await api.deleteContact(id);
    navigate(data.contact.type === "customer" ? "/customers" : "/suppliers");
  }

  if (!data) {
    return (
      <Layout>
        {error ? <div className="error-banner">{error}</div> : <div className="empty-note">{t("loading", "লোড হচ্ছে...")}</div>}
      </Layout>
    );
  }

  const { contact, transactions } = data;

  const CATEGORIES = [
    { value: "sale", label: getCategoryLabel("sale") },
    { value: "purchase", label: getCategoryLabel("purchase") },
    { value: "expense", label: getCategoryLabel("expense") },
    { value: "due", label: getCategoryLabel("due") },
    { value: "deposit", label: getCategoryLabel("deposit") },
    { value: "general", label: getCategoryLabel("general") },
  ];

  return (
    <Layout>
      <div className="top-actions">
        <div>
          <div className="section-title" style={{ margin: 0 }}>
            {contact.name}
          </div>
          <div className="row-sub">{contact.phone || t("no_phone", "ফোন নম্বর নেই")}</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: "6px 12px", fontSize: "0.85rem" }}
            onClick={() => navigate(`/reports?contactId=${id}`)}
            title="এই গ্রাহকের পূর্ণাঙ্গ খাতা রিপোর্ট, স্টেটমেন্ট ও PDF দেখুন"
          >
            📄 {t("reports_title", "রিপোর্ট ও PDF")}
          </button>
          <span className="pill">
            {contact.type === "customer" ? t("customer", "কাস্টমার") : t("supplier", "সাপ্লায়ার")}
          </span>
        </div>
      </div>

      <div className="card-grid" style={{ marginTop: 14 }}>
        <div className="stat-card">
          <div className="label">
            {contact.balance >= 0 ? t("has_receivable", "পাওনা আছে") : t("has_deposit", "জমা আছে")}
          </div>
          <div className={`value ${contact.balance >= 0 ? "debit" : "credit"}`}>
            {fmt(Math.abs(contact.balance))}
          </div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form onSubmit={handleAdd} className="entry-card" style={{ marginTop: 16 }}>
        <div className="segmented" style={{ marginBottom: 14 }}>
          <button
            type="button"
            className={direction === "gave" ? "active gave" : ""}
            onClick={() => {
              setDirection("gave");
              if (category === "deposit") setCategory("due");
            }}
          >
            {t("direction_gave", "দিলাম (বাকী / পাওনা)")}
          </button>
          <button
            type="button"
            className={direction === "got" ? "active got" : ""}
            onClick={() => {
              setDirection("got");
              if (category === "due") setCategory("deposit");
            }}
          >
            {t("direction_got", "পেলাম (জমা / পরিশোধ)")}
          </button>
        </div>

        <div className="form-grid-entry">
          <div className="field">
            <label>{t("amount", "টাকার পরিমাণ (৳)")}</label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="field">
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

          <div className="field">
            <label>{t("date", "তারিখ (পেছনের তারিখ সম্ভব)")}</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              title={t("select_date", "তারিখ নির্বাচন করুন")}
            />
          </div>

          <div className="field full-width">
            <label>{t("note", "নোট / বিবরণ (ঐচ্ছিক)")}</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("note_placeholder", "যেমন: মালামাল বাবদ")}
            />
          </div>
        </div>

        <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={busy}>
          {busy ? t("loading", "যোগ হচ্ছে...") : `+ ${t("btn_add_entry", "এন্ট্রি যোগ করুন")}`}
        </button>
      </form>

      <div className="section-title" style={{ marginTop: 24 }}>
        {t("tx_history", "লেনদেনের ইতিহাস")}
      </div>

      {transactions.length === 0 ? (
        <div className="empty-note">{t("no_tx", "এখনো কোনো এন্ট্রি নেই।")}</div>
      ) : (
        transactions.map((tRow) => (
          <div className="row-item" key={tRow.id}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="row-title">
                  {tRow.note || (tRow.direction === "gave" ? t("dir_short_gave", "দিলাম") : t("dir_short_got", "পেলাম"))}
                </span>
                <span className={`badge-cat cat-${tRow.category || "general"}`}>
                  {getCategoryLabel(tRow.category || "general")}
                </span>
              </div>
              <div className="row-sub">
                📅 {new Date(tRow.occurred_at).toLocaleDateString("bn-BD")} · 🕒 {new Date(tRow.occurred_at).toLocaleTimeString("bn-BD", { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div className={`amount ${tRow.direction === "gave" ? "debit" : "credit"}`}>
                {tRow.direction === "gave" ? "−" : "+"}
                {fmt(tRow.amount)}
              </div>

              <button
                type="button"
                className="btn-edit-small"
                onClick={() => setEditingTx(tRow)}
                title={t("edit_tx", "এডিট করুন")}
              >
                ✏️ {t("edit_tx", "এডিট")}
              </button>
            </div>
          </div>
        ))
      )}

      <button className="btn-danger-text" style={{ marginTop: 28 }} onClick={handleDeleteContact}>
        {t("delete_contact_btn", "এই খাতা মুছে ফেলুন")}
      </button>

      {editingTx && (
        <EditTransactionModal
          tx={editingTx}
          onClose={() => setEditingTx(null)}
          onUpdated={() => load()}
          onDeleted={() => load()}
        />
      )}
    </Layout>
  );
}
