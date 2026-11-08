import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

function formatTk(num) {
  const n = Number(num || 0);
  const parts = Math.abs(n).toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const str = parts[1] === '00' ? parts[0] : `${parts[0]}.${parts[1]}`;
  return `${n < 0 ? '-' : ''}৳ ${str}`;
}

export async function generateAndSharePdf({
  title = 'হিসাব বিবরণী',
  contact = null,
  transactions = [],
  merchantName = '',
  businessName = '',
  dateRangeStr = '',
}) {
  let runningBalance = 0;
  let totalGave = 0;
  let totalGot = 0;

  // Clone and sort chronologically (oldest first) to compute running balance
  const sortedTx = [...transactions].sort((a, b) => {
    const dA = a.occurred_at || a.created_at || '';
    const dB = b.occurred_at || b.created_at || '';
    return dA.localeCompare(dB);
  });

  const rowsHtml = sortedTx.map((tx, idx) => {
    const amt = Number(tx.amount) || 0;
    const isGave = tx.direction === 'gave';
    if (isGave) {
      totalGave += amt;
      runningBalance += amt;
    } else {
      totalGot += amt;
      runningBalance -= amt;
    }

    const dateStr = (tx.occurred_at || tx.created_at || '').substring(0, 10);
    const cat = tx.category && tx.category !== 'general' ? ` [${tx.category}]` : '';
    const note = (tx.note || '') + cat;

    return `
      <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 13px;">${idx + 1}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px;">${dateStr}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px;">${note || '—'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #dc2626; font-weight: 600; font-size: 13px;">
          ${isGave ? formatTk(amt) : '—'}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #16a34a; font-weight: 600; font-size: 13px;">
          ${!isGave ? formatTk(amt) : '—'}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; color: ${runningBalance >= 0 ? '#1e293b' : '#dc2626'}; font-size: 13px;">
          ${formatTk(runningBalance)}
        </td>
      </tr>
    `;
  }).join('');

  const finalBal = totalGave - totalGot;
  const balStatusText = finalBal > 0 ? 'পাওনা (Due)' : finalBal < 0 ? 'দেনা (Advance)' : 'পরিশোধিত';
  const balColor = finalBal > 0 ? '#dc2626' : finalBal < 0 ? '#16a34a' : '#475569';

  const html = `
    <!DOCTYPE html>
    <html lang="bn">
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hind Siliguri", "Kalpurush", Arial, sans-serif;
          color: #1e293b;
          margin: 0;
          padding: 30px;
          background: #ffffff;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #059669;
          padding-bottom: 16px;
          margin-bottom: 20px;
        }
        .brand {
          font-size: 26px;
          font-weight: 800;
          color: #059669;
          letter-spacing: -0.5px;
        }
        .sub-brand {
          font-size: 13px;
          color: #64748b;
          margin-top: 4px;
        }
        .meta-box {
          text-align: right;
          font-size: 13px;
          color: #475569;
        }
        .info-card {
          background: #f1f5f9;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .info-title {
          font-size: 12px;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .info-name {
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
        }
        .info-phone {
          font-size: 13px;
          color: #475569;
          margin-top: 2px;
        }
        .balance-badge {
          text-align: right;
        }
        .balance-val {
          font-size: 24px;
          font-weight: 800;
          color: ${balColor};
        }
        .balance-label {
          font-size: 12px;
          font-weight: 700;
          color: #64748b;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
        }
        th {
          background-color: #0f172a;
          color: #ffffff;
          padding: 10px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .summary-grid {
          display: flex;
          justify-content: flex-end;
          margin-top: 10px;
        }
        .summary-table {
          width: 320px;
          border-collapse: collapse;
        }
        .summary-table td {
          padding: 8px 12px;
          font-size: 14px;
        }
        .summary-table tr.total-row {
          background: #f8fafc;
          border-top: 2px solid #cbd5e1;
          border-bottom: 2px solid #cbd5e1;
          font-weight: 800;
          font-size: 16px;
        }
        .footer {
          margin-top: 40px;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #94a3b8;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="brand">আপন খাতা</div>
          <div class="sub-brand">${businessName ? businessName + ' • ' : ''}${merchantName || 'ডিজিটাল খাতা'}</div>
        </div>
        <div class="meta-box">
          <div><strong>তারিখ:</strong> ${new Date().toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          ${dateRangeStr ? `<div><strong>সময়কাল:</strong> ${dateRangeStr}</div>` : ''}
          <div><strong>লেনদেন সংখ্যা:</strong> ${sortedTx.length} টি</div>
        </div>
      </div>

      <div class="info-card">
        <div>
          <div class="info-title">পক্ষ / গ্রাহকের বিবরণী</div>
          <div class="info-name">${contact ? contact.name : 'হিসাব বিবরণী'}</div>
          ${contact && contact.phone ? `<div class="info-phone">📞 ${contact.phone}</div>` : ''}
        </div>
        <div class="balance-badge">
          <div class="balance-label">বর্তমান নীট স্থিতি (${balStatusText})</div>
          <div class="balance-val">${formatTk(finalBal)}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;">নং</th>
            <th style="width: 100px; text-align: left;">তারিখ</th>
            <th style="text-align: left;">বিবরণ / নোট</th>
            <th style="width: 120px; text-align: right;">দিলাম (বাকি)</th>
            <th style="width: 120px; text-align: right;">পেলাম (জমা)</th>
            <th style="width: 130px; text-align: right;">ব্যালেন্স</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #94a3b8;">কোনো লেনদেন পাওয়া যায়নি</td></tr>'}
        </tbody>
      </table>

      <div class="summary-grid">
        <table class="summary-table">
          <tr>
            <td>মোট দিলাম (Debit):</td>
            <td style="text-align: right; color: #dc2626; font-weight: 700;">${formatTk(totalGave)}</td>
          </tr>
          <tr>
            <td>মোট পেলাম (Credit):</td>
            <td style="text-align: right; color: #16a34a; font-weight: 700;">${formatTk(totalGot)}</td>
          </tr>
          <tr class="total-row">
            <td>নীট স্থিতি:</td>
            <td style="text-align: right; color: ${balColor};">${formatTk(finalBal)}</td>
          </tr>
        </table>
      </div>

      <div class="footer">
        <div>আপন খাতা — নিরাপদ ক্লাউড হিসাব খাতা</div>
        <div>তৈরি হয়েছে: ${new Date().toLocaleString()}</div>
      </div>
    </body>
    </html>
  `;

  // 1. Generate PDF file locally on the device
  const { uri } = await Print.printToFileAsync({ html });

  // 2. Open native Android sharing / PDF viewer / Save dialog
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `${contact ? contact.name : 'হিসাব বিবরণী'} — আপন খাতা PDF`,
      UTI: 'com.adobe.pdf',
    });
  }

  return uri;
}
