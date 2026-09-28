import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import EditTransactionModal from "../components/EditTransactionModal";
import { api } from "../api";
import { useLanguage } from "../context/LanguageContext";

function fmt(n) {
  return `৳${Number(n || 0).toLocaleString("en-BD", { maximumFractionDigits: 2 })}`;
}

export default function Dashboard() {
  const { t, getCategoryLabel } = useLanguage();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [editingTx, setEditingTx] = useState(null);

  function load() {
    api
      .summary()
      .then(setSummary)
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <Layout>
      {error && <div className="error-banner">{error}</div>}
      {!summary ? (
        <div className="empty-note">{t("loading", "লোড হচ্ছে...")}</div>
      ) : (
        <>
          <div className="card-grid">
            <div className="stat-card">
              <div className="label">{t("receivable_label", "পাওনা (গ্রাহকদের কাছে)")}</div>
              <div className="value debit">{fmt(summary.totalReceivable)}</div>
            </div>
            <div className="stat-card">
              <div className="label">{t("payable_label", "দেনা (সাপ্লায়ারকে)")}</div>
              <div className="value credit">{fmt(summary.totalPayable)}</div>
            </div>
            <div className="stat-card">
              <div className="label">{t("total_gave_label", "মোট দিয়েছি")}</div>
              <div className="value">{fmt(summary.totalGave)}</div>
            </div>
            <div className="stat-card">
              <div className="label">{t("total_got_label", "মোট পেয়েছি")}</div>
              <div className="value">{fmt(summary.totalGot)}</div>
            </div>
          </div>

          <div className="section-title" style={{ marginTop: 24 }}>
            {t("recent_transactions", "সাম্প্রতিক লেনদেন")}
          </div>

          {summary.recentTransactions.length === 0 ? (
            <div className="empty-note">{t("no_recent_transactions", "এখনো কোনো লেনদেন যোগ করা হয়নি।")}</div>
          ) : (
            summary.recentTransactions.map((tx) => (
              <div className="row-item" key={tx.id}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="row-title">
                      {tx.contact_name || tx.note || t("cat_general", "সাধারণ এন্ট্রি")}
                    </span>
                    <span className={`badge-cat cat-${tx.category || "general"}`}>
                      {getCategoryLabel(tx.category || "general")}
                    </span>
                  </div>
                  <div className="row-sub">
                    {tx.note && <span style={{ marginRight: 6 }}>{tx.note} · </span>}
                    📅 {new Date(tx.occurred_at).toLocaleDateString("bn-BD")} · 🕒 {new Date(tx.occurred_at).toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div className={`amount ${tx.direction === "gave" ? "debit" : "credit"}`}>
                    {tx.direction === "gave" ? "−" : "+"}
                    {fmt(tx.amount)}
                  </div>

                  <button
                    type="button"
                    className="btn-edit-small"
                    onClick={() => setEditingTx(tx)}
                    title={t("edit_tx", "এডিট করুন")}
                  >
                    ✏️ {t("edit_tx", "এডিট")}
                  </button>
                </div>
              </div>
            ))
          )}

          {editingTx && (
            <EditTransactionModal
              tx={editingTx}
              onClose={() => setEditingTx(null)}
              onUpdated={() => load()}
              onDeleted={() => load()}
            />
          )}
        </>
      )}
    </Layout>
  );
}
