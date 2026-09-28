import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api } from "../api";
import { useLanguage } from "../context/LanguageContext";

function fmt(n) {
  return `৳${Number(n || 0).toLocaleString("en-BD", { maximumFractionDigits: 2 })}`;
}

export default function Stock() {
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", unit: "pcs", quantity: "", unitPrice: "" });
  const [busy, setBusy] = useState(false);

  function load() {
    api
      .listStock()
      .then((res) => setItems(res.items))
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function handleAdd(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.createStock(form);
      setForm({ name: "", unit: "pcs", quantity: "", unitPrice: "" });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm(t("delete_stock_confirm", "এই পণ্যটি মুছে ফেলতে চান?"))) return;
    await api.deleteStock(id);
    load();
  }

  return (
    <Layout>
      <div className="top-actions">
        <div className="section-title" style={{ margin: 0 }}>
          {t("stock_title", "স্টক / পণ্যের তালিকা")}
        </div>
        <button className="btn btn-ghost" onClick={() => setShowForm((s) => !s)}>
          {showForm ? t("cancel", "বাতিল") : t("new_stock", "+ নতুন পণ্য")}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showForm && (
        <form onSubmit={handleAdd} className="entry-card" style={{ marginBottom: 18 }}>
          <div className="form-grid-entry">
            <div className="field">
              <label>{t("stock_name", "পণ্যের নাম")}</label>
              <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="field">
              <label>{t("stock_unit", "একক")}</label>
              <input value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} placeholder="pcs, kg" />
            </div>
            <div className="field">
              <label>{t("stock_qty", "পরিমাণ")}</label>
              <input
                type="number"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div className="field">
              <label>{t("stock_price", "একক মূল্য (৳)")}</label>
              <input
                type="number"
                value={form.unitPrice}
                onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))}
                placeholder="0.00"
              />
            </div>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={busy}>
            {busy ? t("loading", "যোগ হচ্ছে...") : `+ ${t("btn_add_entry", "যোগ করুন")}`}
          </button>
        </form>
      )}

      {items.length === 0 ? (
        <div className="empty-note">{t("no_contacts", "এখনো কোনো পণ্য যোগ করা হয়নি।")}</div>
      ) : (
        items.map((item) => (
          <div className="row-item" key={item.id}>
            <div>
              <div className="row-title">{item.name}</div>
              <div className="row-sub">
                {item.quantity} {item.unit} · {t("stock_price", "একক দাম")} {fmt(item.unit_price)}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className="amount">{fmt(item.quantity * item.unit_price)}</div>
              <button className="btn-danger-text" onClick={() => handleDelete(item.id)}>
                {t("delete_tx", "মুছুন")}
              </button>
            </div>
          </div>
        ))
      )}
    </Layout>
  );
}
