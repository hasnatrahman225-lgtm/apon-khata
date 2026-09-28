import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { api } from "../api";
import { useLanguage } from "../context/LanguageContext";

function fmt(n) {
  return `৳${Number(n || 0).toLocaleString("en-BD", { maximumFractionDigits: 2 })}`;
}

export default function Contacts({ type }) {
  const { t } = useLanguage();
  const [contacts, setContacts] = useState([]);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", note: "" });
  const [busy, setBusy] = useState(false);

  const label = type === "customer" ? t("customer", "কাস্টমার") : t("supplier", "সাপ্লায়ার");
  const listTitle = type === "customer" ? t("customer_list", "কাস্টমার তালিকা") : t("supplier_list", "সাপ্লায়ার তালিকা");
  const newBtnLabel = type === "customer" ? t("new_customer", "+ নতুন কাস্টমার") : t("new_supplier", "+ নতুন সাপ্লায়ার");

  function load() {
    api
      .listContacts(type)
      .then((res) => setContacts(res.contacts))
      .catch((err) => setError(err.message));
  }

  useEffect(load, [type]);

  async function handleAdd(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.createContact({ type, ...form });
      setForm({ name: "", phone: "", note: "" });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout>
      <div className="top-actions">
        <div className="section-title" style={{ margin: 0 }}>
          {listTitle}
        </div>
        <button className="btn btn-ghost" onClick={() => setShowForm((s) => !s)}>
          {showForm ? t("cancel", "বাতিল") : newBtnLabel}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showForm && (
        <form onSubmit={handleAdd} className="entry-card" style={{ marginBottom: 18 }}>
          <div className="form-grid-entry">
            <div className="field">
              <label>{t("name", "নাম")}</label>
              <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="field">
              <label>{t("phone", "ফোন নম্বর")} ({t("optional", "ঐচ্ছিক")})</label>
              <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="field full-width">
              <label>{t("note", "নোট / বিবরণ")} ({t("optional", "ঐচ্ছিক")})</label>
              <input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
            </div>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={busy}>
            {busy ? t("loading", "যোগ হচ্ছে...") : `+ ${t("btn_add_entry", "যোগ করুন")}`}
          </button>
        </form>
      )}

      {contacts.length === 0 ? (
        <div className="empty-note">{t("no_contacts", "এখনো কোনো তালিকা নেই।")}</div>
      ) : (
        contacts.map((c) => (
          <Link className="row-item" key={c.id} to={`/contact/${c.id}`}>
            <div>
              <div className="row-title">{c.name}</div>
              <div className="row-sub">{c.phone || t("no_phone", "ফোন নম্বর নেই")}</div>
            </div>
            <div className={`amount ${c.balance > 0 ? "debit" : c.balance < 0 ? "credit" : ""}`}>
              {fmt(Math.abs(c.balance))}
              <div className="row-sub" style={{ textAlign: "right" }}>
                {c.balance > 0
                  ? t("status_receivable", "পাওনা")
                  : c.balance < 0
                  ? t("status_payable", "জমা আছে")
                  : t("status_settled", "সমান")}
              </div>
            </div>
          </Link>
        ))
      )}
    </Layout>
  );
}
