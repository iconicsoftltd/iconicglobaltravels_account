import { appConfiguration } from "@/utils/constant/appConfiguration";

const amount = (value: unknown) => Number(value || 0).toFixed(2);
const date = (value: unknown) => (value ? new Date(String(value)).toLocaleDateString() : "-");
const escapeHtml = (value: unknown) => String(value ?? "-").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

const InvoiceSummaryReportPrint = (reportData: any, currentCurrency: any, queryParams: any) => {
  const report = reportData?.data;
  const currency = currentCurrency?.name || currentCurrency?.symbol || "BDT";
  const rows = report?.rows || [];

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Invoice Summary Report</title>
  <style>
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { margin: 0; padding: 24px; color: #111827; font-family: Arial, sans-serif; }
    .wrap { max-width: 1100px; margin: 0 auto; }
    .header { text-align: center; border-bottom: 3px solid #00BFFF; padding-bottom: 14px; margin-bottom: 18px; }
    .header img { max-height: 54px; max-width: 190px; object-fit: contain; }
    h1 { margin: 8px 0 6px; font-size: 22px; color: #00BFFF; }
    .meta { display: flex; justify-content: center; gap: 18px; font-size: 12px; color: #4b5563; }
    .cards { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 18px; }
    .card { border: 1px solid #e5e7eb; padding: 10px; }
    .card span { display: block; color: #6b7280; font-size: 11px; }
    .card strong { display: block; margin-top: 5px; font-size: 15px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #BD06B3; color: #fff; padding: 8px; border: 1px solid #BD06B3; text-align: left; }
    td { padding: 8px; border: 1px solid #e5e7eb; }
    .right { text-align: right; }
    .center { text-align: center; }
    .footer { background: #f3f4f6; font-weight: 700; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <img src="${appConfiguration.logo}" alt="Logo" />
      <h1>Invoice Summary Report</h1>
      <div class="meta">
        <span>From: ${date(queryParams.fromDate)}</span>
        <span>To: ${date(queryParams.toDate)}</span>
        <span>Status: ${escapeHtml(queryParams.status || "All")}</span>
        <span>Generated: ${new Date().toLocaleString()}</span>
      </div>
    </div>
    <div class="cards">
      <div class="card"><span>Total Invoice</span><strong>${report?.totals?.invoiceCount || 0}</strong></div>
      <div class="card"><span>Grand Total</span><strong>${currency} ${amount(report?.totals?.grandTotal)}</strong></div>
      <div class="card"><span>Paid Total</span><strong>${currency} ${amount(report?.totals?.paidAmount)}</strong></div>
      <div class="card"><span>Refund Total</span><strong>${currency} ${amount(report?.totals?.refundAmount)}</strong></div>
      <div class="card"><span>Due Total</span><strong>${currency} ${amount(report?.totals?.dueAmount)}</strong></div>
    </div>
    <table>
      <thead>
        <tr><th>SL</th><th>Invoice No</th><th>Date</th><th>Customer</th><th class="right">Total</th><th class="right">Paid</th><th class="right">Refund</th><th class="right">Due</th><th>Status</th></tr>
      </thead>
      <tbody>
        ${rows.length ? rows.map((row: any, index: number) => `<tr><td class="center">${index + 1}</td><td>${escapeHtml(row.invoiceNo)}</td><td>${date(row.invoiceDate)}</td><td>${escapeHtml(row.customerName)}</td><td class="right">${currency} ${amount(row.grandTotal)}</td><td class="right">${currency} ${amount(row.paidAmount)}</td><td class="right">${currency} ${amount(row.refundAmount)}</td><td class="right">${currency} ${amount(row.dueAmount)}</td><td>${escapeHtml(String(row.status || "").replace(/_/g, " "))}</td></tr>`).join("") : `<tr><td colspan="9" class="center">No invoice found.</td></tr>`}
        <tr class="footer"><td colspan="4" class="right">Total</td><td class="right">${currency} ${amount(report?.totals?.grandTotal)}</td><td class="right">${currency} ${amount(report?.totals?.paidAmount)}</td><td class="right">${currency} ${amount(report?.totals?.refundAmount)}</td><td class="right">${currency} ${amount(report?.totals?.dueAmount)}</td><td></td></tr>
      </tbody>
    </table>
  </div>
  <script>setTimeout(() => { window.focus(); window.print(); }, 300);</script>
</body>
</html>`;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    if (iframe.parentNode) document.body.removeChild(iframe);
  }, 1500);
};

export default InvoiceSummaryReportPrint;

