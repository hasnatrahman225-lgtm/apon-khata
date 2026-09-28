const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

function formatTk(num) {
  const n = Number(num || 0);
  const parts = Math.abs(n).toFixed(2).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const str = parts[1] === "00" ? parts[0] : `${parts[0]}.${parts[1]}`;
  return `${n < 0 ? "-" : ""}৳ ${str}`;
}

// GET /reports/statement — Print / Save as PDF view
router.get("/statement", (req, res) => {
  const { contactId, contact_id, from, to } = req.query;
  const targetContactId = contactId || contact_id || null;

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  let contact = null;
  if (targetContactId) {
    contact = db
      .prepare("SELECT * FROM contacts WHERE id = ? AND user_id = ?")
      .get(targetContactId, req.userId);
  }

  let sql = `
    SELECT t.*, c.name AS contact_name, c.type AS contact_type, c.phone AS contact_phone
    FROM transactions t
    LEFT JOIN contacts c ON c.id = t.contact_id
    WHERE t.user_id = ?
  `;
  const params = [req.userId];

  if (targetContactId) {
    sql += " AND t.contact_id = ?";
    params.push(targetContactId);
  }
  if (from) {
    sql += " AND date(t.occurred_at) >= date(?)";
    params.push(from);
  }
  if (to) {
    sql += " AND date(t.occurred_at) <= date(?)";
    params.push(to);
  }
  sql += " ORDER BY t.occurred_at ASC, t.created_at ASC";

  const rows = db.prepare(sql).all(...params);

  // Auto detect if all rows belong to a single contact
  const uniqueContactIds = Array.from(new Set(rows.map((r) => r.contact_id).filter(Boolean)));
  const uniqueContactNames = Array.from(new Set(rows.map((r) => r.contact_name).filter(Boolean)));
  const isSingleContactAuto = (uniqueContactIds.length === 1 || uniqueContactNames.length === 1);

  if (!contact && isSingleContactAuto && rows.length > 0 && rows[0].contact_name) {
    contact = {
      name: rows[0].contact_name,
      type: rows[0].contact_type,
      phone: rows[0].contact_phone,
    };
  }

  const hideContactColumn = Boolean(targetContactId || isSingleContactAuto);

  let totalGave = 0;
  let totalGot = 0;
  let runningBal = 0;

  const txWithBalance = rows.map((r) => {
    const amt = Number(r.amount || 0);
    if (r.direction === "gave") {
      totalGave += amt;
      runningBal += amt;
    } else {
      totalGot += amt;
      runningBal -= amt;
    }
    return {
      ...r,
      runningBalance: runningBal,
    };
  });

  const netBalance = totalGave - totalGot;
  const businessName = user?.business_name || user?.name || "আপন খাতা";
  const contactTitle = contact
    ? `${contact.name} (${contact.type === "customer" ? "কাস্টমার" : "সাপ্লায়ার"})`
    : "সকল কাস্টমার ও সাপ্লায়ার";

  const dateRangeStr =
    from && to
      ? `${from} হতে ${to}`
      : from
      ? `${from} থেকে পরবর্তী`
      : to
      ? `${to} পর্যন্ত`
      : "সকল লেনদেন";

  const html = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${businessName} - হিসাব বিবরণী</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Bengali', Arial, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      padding: 16px;
      font-size: 13px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 24px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #059669;
      padding-bottom: 16px;
      margin-bottom: 16px;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 800;
      color: #059669;
    }
    .brand-sub {
      font-size: 12px;
      color: #64748b;
      margin-top: 2px;
    }
    .doc-badge {
      background: #ecfdf5;
      color: #059669;
      font-weight: bold;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      border: 1px solid #a7f3d0;
      text-align: right;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 20px;
      background: #f1f5f9;
      padding: 12px;
      border-radius: 6px;
    }
    .meta-item strong {
      display: block;
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
    }
    .meta-item span {
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
    }
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 20px;
    }
    .kpi-box {
      padding: 12px;
      border-radius: 6px;
      text-align: center;
    }
    .kpi-box.gave { background: #fff1f2; border: 1px solid #fecdd3; }
    .kpi-box.got { background: #ecfdf5; border: 1px solid #a7f3d0; }
    .kpi-box.net { background: #eff6ff; border: 1px solid #bfdbfe; }
    .kpi-label { font-size: 11px; font-weight: bold; color: #475569; }
    .kpi-val { font-size: 16px; font-weight: 800; margin-top: 4px; }
    .kpi-box.gave .kpi-val { color: #e11d48; }
    .kpi-box.got .kpi-val { color: #059669; }
    .kpi-box.net .kpi-val { color: #2563eb; }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 12px;
    }
    th {
      background: #f8fafc;
      color: #475569;
      font-weight: 700;
      text-align: left;
      padding: 8px 10px;
      border-bottom: 2px solid #cbd5e1;
    }
    td {
      padding: 8px 10px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    tr:nth-child(even) { background: #fdfdfe; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .tag-gave { color: #e11d48; font-weight: bold; }
    .tag-got { color: #059669; font-weight: bold; }

    .print-bar {
      position: fixed;
      bottom: 20px;
      right: 20px;
      display: flex;
      gap: 10px;
      z-index: 1000;
    }
    .btn {
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: bold;
      cursor: pointer;
      border: none;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2);
    }
    .btn-print { background: #059669; color: #fff; }
    .btn-close { background: #64748b; color: #fff; }

    @media print {
      body { background: #fff; padding: 0; }
      .container { border: none; box-shadow: none; padding: 0; max-width: 100%; }
      .print-bar { display: none; }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <button class="btn btn-print" onclick="window.print()">🖨️ প্রিন্ট / PDF সংরক্ষণ</button>
  </div>

  <div class="container">
    <div class="header">
      <div>
        <div class="brand-title">${businessName}</div>
        <div class="brand-sub">সহজ ও নিরাপদ ডিজিটাল হিসাব খাতা</div>
        ${user?.email ? `<div class="brand-sub">${user.email}</div>` : ""}
      </div>
      <div>
        <div class="doc-badge">হিসাব বিবরণী (Statement)</div>
        <div style="font-size: 10px; color: #64748b; margin-top: 4px; text-align: right;">
          তারিখ: ${new Date().toLocaleDateString("bn-BD")}
        </div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-item">
        <strong>গ্রাহক / বিবরণ</strong>
        <span>${contactTitle}</span>
        ${contact?.phone ? `<div style="font-size: 12px; color: #475569;">📞 ${contact.phone}</div>` : ""}
      </div>
      <div class="meta-item">
        <strong>সময়সূচি / সময়সীমা</strong>
        <span>${dateRangeStr}</span>
        <div style="font-size: 12px; color: #475569;">মোট রেকর্ড: ${rows.length} টি</div>
      </div>
    </div>

    <div class="kpi-row">
      <div class="kpi-box gave">
        <div class="kpi-label">মোট দিলাম (বাকী বিক্রয়)</div>
        <div class="kpi-val">${formatTk(totalGave)}</div>
      </div>
      <div class="kpi-box got">
        <div class="kpi-label">মোট পেলাম (জমা আদায়)</div>
        <div class="kpi-val">${formatTk(totalGot)}</div>
      </div>
      <div class="kpi-box net">
        <div class="kpi-label">বর্তমান স্থিতি / পাওনা</div>
        <div class="kpi-val">${formatTk(netBalance)}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 85px;">তারিখ</th>
          ${!hideContactColumn ? `<th style="width: 130px;">গ্রাহক / পক্ষ</th>` : ""}
          <th>বিবরণ ও খাত</th>
          <th class="text-right" style="width: 100px;">দিলাম (-)</th>
          <th class="text-right" style="width: 100px;">পেলাম (+)</th>
          <th class="text-right" style="width: 100px;">ব্যালেন্স</th>
        </tr>
      </thead>
      <tbody>
        ${
          rows.length === 0
            ? `<tr><td colspan="${!hideContactColumn ? 6 : 5}" class="text-center" style="padding: 24px; color: #94a3b8;">কোনো লেনদেন পাওয়া যায়নি।</td></tr>`
            : rows
                .map((tx) => {
                  const dateStr = tx.occurred_at ? tx.occurred_at.split("T")[0] : "";
                  const isGave = tx.direction === "gave";
                  const contactCell = !hideContactColumn
                    ? `<td><strong>${tx.contact_name || "সাধারণ"}</strong></td>`
                    : "";
                  return `<tr>
                    <td>${dateStr}</td>
                    ${contactCell}
                    <td>
                      <strong>${tx.category || "সাধারণ"}</strong>
                      ${tx.note ? `<div style="color: #64748b; font-size: 11px;">${tx.note}</div>` : ""}
                    </td>
                    <td class="text-right ${isGave ? "tag-gave" : ""}">
                      ${isGave ? formatTk(tx.amount) : "—"}
                    </td>
                    <td class="text-right ${!isGave ? "tag-got" : ""}">
                      ${!isGave ? formatTk(tx.amount) : "—"}
                    </td>
                    <td class="text-right" style="font-weight: 700;">
                      ${formatTk(tx.runningBalance)}
                    </td>
                  </tr>`;
                })
                .join("")
        }
      </tbody>
    </table>

    <div style="border-top: 1px dashed #cbd5e1; padding-top: 12px; display: flex; justify-content: space-between; font-size: 11px; color: #64748b;">
      <div>তৈরি হয়েছে আপন খাতা অ্যাপ থেকে</div>
      <div>পৃষ্ঠা ১ / ১</div>
    </div>
  </div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

// GET /reports/csv — Download CSV directly
router.get("/csv", (req, res) => {
  const { contactId, contact_id, from, to } = req.query;
  const targetContactId = contactId || contact_id || null;

  let sql = `
    SELECT t.*, c.name AS contact_name, c.type AS contact_type, c.phone AS contact_phone
    FROM transactions t
    LEFT JOIN contacts c ON c.id = t.contact_id
    WHERE t.user_id = ?
  `;
  const params = [req.userId];

  if (targetContactId) {
    sql += " AND t.contact_id = ?";
    params.push(targetContactId);
  }
  if (from) {
    sql += " AND date(t.occurred_at) >= date(?)";
    params.push(from);
  }
  if (to) {
    sql += " AND date(t.occurred_at) <= date(?)";
    params.push(to);
  }
  sql += " ORDER BY t.occurred_at ASC, t.created_at ASC";

  const rows = db.prepare(sql).all(...params);

  const uniqueContactNames = Array.from(new Set(rows.map((r) => r.contact_name).filter(Boolean)));
  const hideCsvContactCol = Boolean(targetContactId || (rows.length > 0 && uniqueContactNames.length === 1));

  const csvRows = [
    ["তারিখ", ...(!hideCsvContactCol ? ["গ্রাহক / সাপ্লায়ার"] : []), "লেনদেনের ধরন", "খাত", "টাকার পরিমাণ", "বিবরণ"]
  ];

  rows.forEach((tx) => {
    const dateStr = tx.occurred_at ? tx.occurred_at.split("T")[0] : "";
    const contactStr = tx.contact_name || "সাধারণ";
    const dirStr = tx.direction === "gave" ? "দিলাম (বাকী)" : "পেলাম (জমা)";
    const catStr = tx.category || "সাধারণ";
    const amtStr = Number(tx.amount || 0).toFixed(2);
    const noteStr = (tx.note || "").replace(/"/g, '""');

    csvRows.push([
      `"${dateStr}"`,
      ...(!hideCsvContactCol ? [`"${contactStr}"`] : []),
      `"${dirStr}"`,
      `"${catStr}"`,
      `"${amtStr}"`,
      `"${noteStr}"`
    ]);
  });

  const csvContent = "\uFEFF" + csvRows.map((r) => r.join(",")).join("\r\n");
  const filename = `khata-statement-${new Date().toISOString().split("T")[0]}.csv`;

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csvContent);
});

module.exports = router;
