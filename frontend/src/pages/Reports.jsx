import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import Layout from "../components/Layout";
import EditTransactionModal from "../components/EditTransactionModal";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

function fmt(n) {
  return `৳${Number(n || 0).toLocaleString("en-BD", { maximumFractionDigits: 2 })}`;
}

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

function getYesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function get7DaysAgoStr() {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return d.toISOString().split("T")[0];
}

function getMonthStartStr() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split("T")[0];
}

export default function Reports() {
  const { user } = useAuth();
  const { t, getCategoryLabel } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlContactId = searchParams.get("contactId") || "";

  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const [selectedContactId, setSelectedContactId] = useState(urlContactId);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [activeDatePreset, setActiveDatePreset] = useState("all");
  const [editingTx, setEditingTx] = useState(null);
  const [hideContactCol, setHideContactCol] = useState(null);

  const reportContentRef = useRef(null);

  // Sync state if URL search param changes
  useEffect(() => {
    setSelectedContactId(urlContactId);
  }, [urlContactId]);

  // Load contacts list for dropdown
  useEffect(() => {
    api
      .listContacts()
      .then((res) => setContacts(res.contacts || []))
      .catch(() => {});
  }, []);

  const CATEGORIES = [
    { value: "", label: t("filter_all_categories", "সকল খাত") },
    { value: "expense", label: `🔴 ${getCategoryLabel("expense")}` },
    { value: "sale", label: `🟢 ${getCategoryLabel("sale")}` },
    { value: "purchase", label: getCategoryLabel("purchase") },
    { value: "due", label: getCategoryLabel("due") },
    { value: "deposit", label: getCategoryLabel("deposit") },
    { value: "general", label: getCategoryLabel("general") },
  ];

  function loadData() {
    setLoading(true);
    setError("");

    const params = {};
    if (fromDate) params.from = fromDate;
    if (toDate) params.to = toDate;
    if (categoryFilter) params.category = categoryFilter;
    if (selectedContactId) params.contactId = selectedContactId;

    Promise.all([api.summary(), api.listTransactions(params)])
      .then(([sumRes, txRes]) => {
        setSummary(sumRes);
        setTransactions(txRes.transactions || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, [selectedContactId, fromDate, toDate, categoryFilter]);

  function handleContactChange(newId) {
    setSelectedContactId(newId);
    if (newId) {
      setSearchParams({ contactId: newId });
    } else {
      setSearchParams({});
    }
  }

  function applyDatePreset(preset) {
    setActiveDatePreset(preset);
    if (preset === "today") {
      const today = getTodayStr();
      setFromDate(today);
      setToDate(today);
    } else if (preset === "yesterday") {
      const yest = getYesterdayStr();
      setFromDate(yest);
      setToDate(yest);
    } else if (preset === "7days") {
      setFromDate(get7DaysAgoStr());
      setToDate(getTodayStr());
    } else if (preset === "month") {
      setFromDate(getMonthStartStr());
      setToDate(getTodayStr());
    } else {
      setFromDate("");
      setToDate("");
    }
  }

  function handleResetFilters() {
    setSelectedContactId("");
    setSearchParams({});
    setFromDate("");
    setToDate("");
    setCategoryFilter("");
    setActiveDatePreset("all");
  }

  // Detect if all transactions belong to a single contact
  const uniqueContactIds = Array.from(
    new Set(transactions.map((tx) => tx.contact_id).filter(Boolean))
  );
  const uniqueContactNames = Array.from(
    new Set(transactions.map((tx) => tx.contact_name).filter(Boolean))
  );
  const isSingleContactInTx =
    transactions.length > 0 &&
    (uniqueContactIds.length === 1 || uniqueContactNames.length === 1);

  const autoDetectedContact =
    isSingleContactInTx
      ? contacts.find((c) => String(c.id) === String(uniqueContactIds[0])) || {
          id: uniqueContactIds[0] || "",
          name: uniqueContactNames[0] || transactions[0]?.contact_name,
          type: transactions[0]?.contact_type || "customer",
          phone: transactions[0]?.contact_phone || "",
        }
      : null;

  // Find selected contact details if any or fallback to auto detected single contact
  const selectedContact =
    contacts.find((c) => String(c.id) === String(selectedContactId)) ||
    (selectedContactId && transactions.length > 0 && String(transactions[0].contact_id) === String(selectedContactId)
      ? {
          id: selectedContactId,
          name: transactions[0].contact_name,
          type: transactions[0].contact_type,
          phone: transactions[0].contact_phone,
        }
      : null);

  const effectiveContact = selectedContact || autoDetectedContact;

  // If user explicitly toggled, use that. Otherwise automatically hide if a contact is effective.
  const isContactColHidden =
    hideContactCol !== null ? hideContactCol : Boolean(effectiveContact);

  // Calculate filtered stats
  const totalFilteredGave = transactions
    .filter((tRow) => tRow.direction === "gave")
    .reduce((s, tRow) => s + Number(tRow.amount || 0), 0);

  const totalFilteredGot = transactions
    .filter((tRow) => tRow.direction === "got")
    .reduce((s, tRow) => s + Number(tRow.amount || 0), 0);

  const totalExpenseOnly = transactions
    .filter((tRow) => tRow.category === "expense")
    .reduce((s, tRow) => s + Number(tRow.amount || 0), 0);

  const contactNetBalance = totalFilteredGave - totalFilteredGot;

  function downloadCSV() {
    const headers = [
      t("col_date", "তারিখ ও সময়"),
      ...(!isContactColHidden ? [t("col_contact", "পক্ষ / গ্রাহক / সাপ্লায়ার")] : []),
      t("col_direction", "প্রকৃতি (পাওনা / দেনা)"),
      t("col_category", "খরচের / লেনদেনের খাত"),
      t("col_amount", "টাকার পরিমাণ (৳)"),
      t("col_note", "বিবরণ / নোট"),
    ];

    const rows = [];
    if (effectiveContact) {
      rows.push([`"গ্রাহক / সাপ্লায়ার: ${effectiveContact.name} (${effectiveContact.type === "customer" ? "কাস্টমার" : "সাপ্লায়ার"})"`]);
      if (effectiveContact.phone) rows.push([`"ফোন নম্বর: ${effectiveContact.phone}"`]);
      rows.push([`"মোট দিলাম: ${totalFilteredGave}", "মোট পেলাম: ${totalFilteredGot}", "বর্তমান ব্যালেন্স: ${contactNetBalance}"`]);
      rows.push([]);
    }
    rows.push(headers);

    transactions.forEach((tx) => {
      const dateStr = new Date(tx.occurred_at).toLocaleString("bn-BD");
      const contactStr = tx.contact_name
        ? `${tx.contact_name} (${tx.contact_type === "customer" ? t("customer", "কাস্টমার") : t("supplier", "সাপ্লায়ার")})`
        : t("cat_general", "সাধারণ লেনদেন");
      const directionStr =
        tx.direction === "gave"
          ? `${t("dir_short_gave", "দিলাম")} (${t("status_receivable", "পাওনা")})`
          : `${t("dir_short_got", "পেলাম")} (${t("status_payable", "দেনা পরিশোধ/জমা")})`;
      const categoryStr = getCategoryLabel(tx.category || "general");
      const amountStr = Number(tx.amount || 0).toFixed(2);
      const noteStr = (tx.note || "").replace(/"/g, '""');

      rows.push([
        `"${dateStr}"`,
        ...(!isContactColHidden ? [`"${contactStr}"`] : []),
        `"${directionStr}"`,
        `"${categoryStr}"`,
        `"${amountStr}"`,
        `"${noteStr}"`,
      ]);
    });

    const csvContent = rows.map((r) => r.join(",")).join("\r\n");
    // Prepend UTF-8 BOM (\uFEFF) to ensure Microsoft Excel opens Bengali fonts correctly
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const dateStamp = new Date().toISOString().split("T")[0];
    const prefix = effectiveContact ? `khata-${effectiveContact.name.replace(/\s+/g, "_")}` : "khata-report";
    a.download = `${prefix}-${dateStamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadPDF() {
    if (!reportContentRef.current) return;
    setGeneratingPdf(true);
    try {
      const element = reportContentRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#111827",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const imgWidth = pdfWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight <= pdfHeight - margin * 2) {
        pdf.addImage(imgData, "PNG", margin, margin, imgWidth, imgHeight);
      } else {
        let heightLeft = imgHeight;
        let position = margin;

        pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - margin * 2);

        while (heightLeft > 0) {
          position = heightLeft - imgHeight + margin;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
          heightLeft -= (pdfHeight - margin * 2);
        }
      }

      const dateStamp = new Date().toISOString().split("T")[0];
      const prefix = effectiveContact ? `khata-${effectiveContact.name.replace(/\s+/g, "_")}` : "khata-report";
      pdf.save(`${prefix}-${dateStamp}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("PDF তৈরি করতে সমস্যা হয়েছে: " + err.message);
    } finally {
      setGeneratingPdf(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <Layout>
      <div className="top-actions print-hide">
        <div className="section-title" style={{ margin: 0 }}>
          {effectiveContact
            ? `${effectiveContact.name} - ${effectiveContact.type === "customer" ? t("customer", "কাস্টমার") : t("supplier", "সাপ্লায়ার")} রিপোর্ট`
            : t("reports_title", "হিসাব ও খরচের খাতের রিপোর্ট")}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setHideContactCol(!isContactColHidden)}
            title={isContactColHidden ? "কাস্টমার কলাম যুক্ত করুন" : "কাস্টমার কলাম বাদ দিন"}
            style={{
              borderColor: isContactColHidden ? "var(--accent-cyan)" : undefined,
              color: isContactColHidden ? "#38bdf8" : undefined,
              fontWeight: 600,
            }}
          >
            {isContactColHidden ? "👁️ কাস্টমার কলাম দেখান" : "👁️ কাস্টমার কলাম লুকান"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={handlePrint} title="প্রিন্ট প্রিভিউ">
            🖨️ {t("print_report", "প্রিন্ট")}
          </button>
          <button type="button" className="btn btn-ghost" onClick={downloadCSV} title="এক্সেলে দেখার জন্য CSV ডাউনলোড">
            📥 {t("download_csv", "CSV ডাউনলোড")}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={downloadPDF}
            disabled={generatingPdf}
            title="পিডিএফ ফাইল ডাউনলোড করুন"
            style={{
              background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
              boxShadow: "0 2px 10px rgba(6, 182, 212, 0.4)",
              fontWeight: 700,
            }}
          >
            {generatingPdf ? "📄 তৈরি হচ্ছে..." : "📄 PDF ডাউনলোড"}
          </button>
        </div>
      </div>

      {error && <div className="error-banner print-hide">{error}</div>}

      {/* Filter Box with Contact Selector & Day-wise Quick Filters */}
      <div className="filter-card print-hide" style={{ margin: "10px 0 14px" }}>
        {/* Quick Day-wise Presets */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>
            📅 ডে-ওয়াইজ ফিল্টার:
          </span>
          <button
            type="button"
            className={`btn-filter-preset ${activeDatePreset === "today" ? "active" : ""}`}
            onClick={() => applyDatePreset("today")}
          >
            আজ (Today)
          </button>
          <button
            type="button"
            className={`btn-filter-preset ${activeDatePreset === "yesterday" ? "active" : ""}`}
            onClick={() => applyDatePreset("yesterday")}
          >
            গতকাল (Yesterday)
          </button>
          <button
            type="button"
            className={`btn-filter-preset ${activeDatePreset === "7days" ? "active" : ""}`}
            onClick={() => applyDatePreset("7days")}
          >
            গত ৭ দিন
          </button>
          <button
            type="button"
            className={`btn-filter-preset ${activeDatePreset === "month" ? "active" : ""}`}
            onClick={() => applyDatePreset("month")}
          >
            চলতি মাস
          </button>
          <button
            type="button"
            className={`btn-filter-preset ${activeDatePreset === "all" ? "active" : ""}`}
            onClick={() => applyDatePreset("all")}
          >
            সকল সময় (All)
          </button>
        </div>

        <div className="filter-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
          {/* Contact Selector */}
          <div className="field">
            <label style={{ color: "#38bdf8", fontWeight: 700 }}>
              👤 কাস্টমার / সাপ্লায়ার নির্বাচন:
            </label>
            <select
              value={selectedContactId}
              onChange={(e) => handleContactChange(e.target.value)}
              className="select-input"
              style={{ borderColor: selectedContactId ? "var(--accent-cyan)" : undefined }}
            >
              <option value="">সকল পক্ষ (কাস্টমার ও সাপ্লায়ার)</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type === "customer" ? t("customer", "কাস্টমার") : t("supplier", "সাপ্লায়ার")})
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>{t("category", "খরচের / লেনদেনের খাত")}</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
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
            <label>{t("filter_from_date", "শুরু তারিখ")}</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setActiveDatePreset("custom");
              }}
            />
          </div>

          <div className="field">
            <label>{t("filter_to_date", "শেষ তারিখ")}</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setActiveDatePreset("custom");
              }}
            />
          </div>

          <div className="field" style={{ alignSelf: "flex-end" }}>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: "100%" }}
              onClick={handleResetFilters}
            >
              {t("filter_reset", "রিসেট")}
            </button>
          </div>
        </div>
      </div>

      {/* Printable & PDF Capture Container (Ultra Condensed Header + Single Line Rows) */}
      <div ref={reportContentRef} className="report-printable-area">
        {/* Condensed Header Banner */}
        <div className="report-condensed-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: "1.2rem", fontWeight: 800, color: effectiveContact ? "#38bdf8" : "#f8fafc" }}>
                {effectiveContact
                  ? `👤 ${effectiveContact.name} (${effectiveContact.type === "customer" ? t("customer", "কাস্টমার") : t("supplier", "সাপ্লায়ার")})`
                  : user?.businessName || t("business", "আপনার ব্যবসা")}
              </span>
              {effectiveContact?.phone && (
                <span className="report-chip" style={{ fontSize: "0.8rem", color: "#38bdf8", background: "rgba(56, 189, 248, 0.12)", border: "1px solid rgba(56, 189, 248, 0.3)" }}>
                  📞 {effectiveContact.phone}
                </span>
              )}
              {isContactColHidden && effectiveContact && (
                <span style={{ fontSize: "0.75rem", background: "rgba(16, 185, 129, 0.15)", color: "#10b981", padding: "2px 8px", borderRadius: "12px", border: "1px solid rgba(16, 185, 129, 0.3)", fontWeight: 600 }}>
                  ✓ কাস্টমার নাম উপরে সংক্ষেপিত
                </span>
              )}
            </div>
            <div className="row-sub" style={{ fontSize: "0.82rem", marginTop: 3 }}>
              {effectiveContact ? `ব্যবসায়িক লেজার স্টেটমেন্ট` : t("reports_title", "সামগ্রিক হিসাব")} 
              {fromDate || toDate ? ` · সময়: ${fromDate || "শুরু"} হতে ${toDate || "আজ"}` : " · শুরু হতে আজ পর্যন্ত"} 
              {` · 📅 ${new Date().toLocaleDateString("bn-BD")}`}
            </div>
          </div>

          <div className="report-condensed-chips">
            {effectiveContact ? (
              <>
                <span className="report-chip">
                  <span style={{ color: "#94a3b8" }}>মোট দিয়েছি: </span>
                  <strong className="debit">{fmt(totalFilteredGave)}</strong>
                </span>
                <span className="report-chip">
                  <span style={{ color: "#94a3b8" }}>মোট পেয়েছি: </span>
                  <strong className="credit">{fmt(totalFilteredGot)}</strong>
                </span>
                <span className="report-chip">
                  <span style={{ color: "#94a3b8" }}>নেট ব্যালেন্স: </span>
                  <strong className={contactNetBalance >= 0 ? "debit" : "credit"}>
                    {contactNetBalance >= 0 ? `পাওনা ${fmt(contactNetBalance)}` : `জমা ${fmt(Math.abs(contactNetBalance))}`}
                  </strong>
                </span>
                <span className="report-chip">
                  <span style={{ color: "#94a3b8" }}>এন্ট্রি: </span>
                  <strong>{transactions.length} টি</strong>
                </span>
              </>
            ) : (
              <>
                <span className="report-chip">
                  <span style={{ color: "#94a3b8" }}>{t("total_gave_label", "পাওনা")}: </span>
                  <strong className="debit">{fmt(totalFilteredGave)}</strong>
                </span>
                <span className="report-chip">
                  <span style={{ color: "#94a3b8" }}>{t("total_got_label", "জমা")}: </span>
                  <strong className="credit">{fmt(totalFilteredGot)}</strong>
                </span>
                <span className="report-chip">
                  <span style={{ color: "#94a3b8" }}>{t("total_expense", "খরচ")}: </span>
                  <strong className="debit">{fmt(totalExpenseOnly)}</strong>
                </span>
                <span className="report-chip">
                  <span style={{ color: "#94a3b8" }}>{t("total_entries", "এন্ট্রি")}: </span>
                  <strong>{transactions.length} টি</strong>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Detailed Transactions List in Strictly Single-Line Rows */}
        {loading ? (
          <div className="empty-note">{t("loading", "লোড হচ্ছে...")}</div>
        ) : transactions.length === 0 ? (
          <div className="empty-note">{t("no_recent_transactions", "কোনো লেনদেন পাওয়া যায়নি।")}</div>
        ) : (
          <div className="table-container" style={{ margin: 0 }}>
            <table className="report-table compact-table">
              <thead>
                <tr>
                  <th style={{ width: "135px" }}>{t("col_date", "তারিখ")}</th>
                  {!isContactColHidden && <th>{t("col_contact", "গ্রাহক / সাপ্লায়ার")}</th>}
                  <th style={{ width: "120px" }}>{t("col_direction", "প্রকৃতি")}</th>
                  <th style={{ width: "100px" }}>{t("col_category", "খাত")}</th>
                  <th>{t("col_note", "নোট")}</th>
                  <th style={{ textAlign: "right", width: "110px" }}>{t("col_amount", "পরিমাণ")}</th>
                  <th className="print-hide" style={{ textAlign: "center", width: "45px" }}></th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    {/* Date on Single Line */}
                    <td style={{ whiteSpace: "nowrap" }}>
                      <span>{new Date(tx.occurred_at).toLocaleDateString("bn-BD")}</span>{" "}
                      <span className="row-sub" style={{ fontSize: "0.74rem" }}>
                        {new Date(tx.occurred_at).toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </td>

                    {/* Contact Name & Type on Single Line (Only shown when not hidden) */}
                    {!isContactColHidden && (
                      <td style={{ whiteSpace: "nowrap" }}>
                        {tx.contact_name ? (
                          <span>
                            <strong>{tx.contact_name}</strong>
                            {tx.contact_type && (
                              <span className="row-sub" style={{ marginLeft: 4, fontSize: "0.74rem" }}>
                                ({tx.contact_type === "customer" ? t("customer", "কাস্টমার") : t("supplier", "সাপ্লায়ার")})
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="row-sub">{t("cat_general", "সাধারণ")}</span>
                        )}
                      </td>
                    )}

                    {/* Direction on Single Line */}
                    <td style={{ whiteSpace: "nowrap" }}>
                      <span className={`direction-badge ${tx.direction === "gave" ? "gave" : "got"}`}>
                        {tx.direction === "gave"
                          ? `${t("dir_short_gave", "দিলাম")} (পাওনা)`
                          : `${t("dir_short_got", "পেলাম")} (জমা)`}
                      </span>
                    </td>

                    {/* Category on Single Line */}
                    <td style={{ whiteSpace: "nowrap" }}>
                      <span className={`badge-cat cat-${tx.category || "general"}`}>
                        {getCategoryLabel(tx.category || "general")}
                      </span>
                    </td>

                    {/* Note on Single Line (clipped if long) */}
                    <td style={{ whiteSpace: "nowrap", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }} title={tx.note}>
                      {tx.note || "—"}
                    </td>

                    {/* Amount on Single Line */}
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <span className={`amount ${tx.direction === "gave" ? "debit" : "credit"}`} style={{ fontSize: "0.95rem" }}>
                        {tx.direction === "gave" ? "−" : "+"}
                        {fmt(tx.amount)}
                      </span>
                    </td>

                    {/* Edit button */}
                    <td className="print-hide" style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                      <button
                        type="button"
                        className="btn-edit-small"
                        style={{ padding: "2px 6px", fontSize: "0.75rem" }}
                        onClick={() => setEditingTx(tx)}
                        title={t("edit_tx", "এডিট")}
                      >
                        ✏️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingTx && (
        <EditTransactionModal
          tx={editingTx}
          onClose={() => setEditingTx(null)}
          onUpdated={() => loadData()}
          onDeleted={() => loadData()}
        />
      )}
    </Layout>
  );
}
