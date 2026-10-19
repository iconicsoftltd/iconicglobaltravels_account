import { appConfiguration } from "@/utils/constant/appConfiguration";

const formatAmount = (value: unknown) => Number(value || 0).toFixed(2);
const formatDate = (value: unknown) => (value ? new Date(String(value)).toLocaleDateString() : "N/A");
const safeText = (value: unknown) =>
  String(value ?? "N/A")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const InvoicePrint = (invoice: any, currentCurrency: any) => {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  document.body.appendChild(iframe);

  console.log("InvoicePrint", invoice, currentCurrency);
  
  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  const currency = currentCurrency?.name || currentCurrency?.symbol || "BDT";
  const items = invoice.items || [];
  const rows = items
    .map(
      (item: any, index: number) => `
        <tr>
          <td>${index + 1}</td>
          <td>
            <strong>${safeText(item.name)}</strong>
            <span>${safeText(item.description || "")}</span>
          </td>
          <td class="right">${formatAmount(item.quantity)}</td>
          <td class="right">${currency} ${formatAmount(item.unitPrice)}</td>
          <td class="right">${currency} ${formatAmount(item.lineTotal)}</td>
        </tr>`,
    )
    .join("");

  const customer = invoice.customer || {};
  const payments = invoice.payments || [];
  const paymentRows = payments.length
    ? payments
        .map(
          (payment: any, index: number) => `
            <tr>
              <td>${index + 1}</td>
              <td>${formatDate(payment.paymentDate)}</td>
              <td>${safeText(payment.method || "Cash")}</td>
              <td class="right">${currency} ${formatAmount(payment.amount)}</td>
            </tr>`,
        )
        .join("")
    : `<tr><td colspan="4" class="center muted">No payment received yet.</td></tr>`;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${safeText(invoice.invoiceNo)}</title>
        <style>
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { margin: 0; padding: 24px; color: #111827; font-family: Arial, sans-serif; background: #fff; }
          .invoice { max-width: 820px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 3px solid #00BFFF; padding-bottom: 16px; }
          .brand img { max-height: 54px; max-width: 190px; object-fit: contain; }
          .brand p, .meta p, .box p { margin: 4px 0; font-size: 12px; color: #4b5563; }
          h1 { margin: 0; font-size: 28px; color: #00BFFF; text-align: right; }
          h2 { margin: 0 0 8px; font-size: 15px; }
          .status { display: inline-block; margin-top: 8px; padding: 5px 10px; border-radius: 999px; background: rgba(0,191,255,0.10); color: #00BFFF; font-size: 12px; font-weight: 700; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 18px; }
          .box { border: 1px solid #e5e7eb; padding: 12px; min-height: 112px; }
          table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 12px; }
          th { background: #BD06B3; color: #fff; text-align: left; padding: 9px; border: 1px solid #BD06B3; }
          td { padding: 9px; border: 1px solid #e5e7eb; vertical-align: top; }
          td span { display: block; margin-top: 3px; color: #6b7280; font-size: 11px; }
          .right { text-align: right; }
          .center { text-align: center; }
          .muted { color: #6b7280; }
          .summary { width: 330px; margin-left: auto; margin-top: 18px; }
          .summary div { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
          .summary .total { font-size: 16px; font-weight: 700; color: #111827; border-top: 2px solid #111827; }
          .summary .paid { color: #047857; font-weight: 700; }
          .summary .due { color: #b45309; font-weight: 700; }
          .notes { margin-top: 18px; font-size: 12px; color: #4b5563; }
          .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 36px; margin-top: 64px; font-size: 12px; text-align: center; }
          .signatures div { border-top: 1px solid #111827; padding-top: 6px; }
          @media print { body { padding: 14px; } .invoice { max-width: none; } }
        </style>
      </head>
      <body>
        <div class="invoice">
          <div class="header">
            <div class="brand">
              <img src="${appConfiguration.logo}" alt="Logo" />
              <p>${safeText(appConfiguration.address)}</p>
              <p>${safeText(appConfiguration.email)} | ${safeText(appConfiguration.phone)}</p>
              <p>${safeText(appConfiguration.website)}</p>
            </div>
            <div class="meta">
              <h1>INVOICE</h1>
              <p><strong>Invoice No:</strong> ${safeText(invoice.invoiceNo)}</p>
              <p><strong>Invoice Date:</strong> ${formatDate(invoice.invoiceDate)}</p>
              <p><strong>Due Date:</strong> ${formatDate(invoice.dueDate)}</p>
              <span class="status">${safeText(String(invoice.status || "").replace(/_/g, " "))}</span>
            </div>
          </div>

          <div class="grid">
            <div class="box">
              <h2>Bill To</h2>
              <p><strong>Name:</strong> ${safeText(customer.accountType)}</p>
              <p><strong>Email:</strong> ${safeText(customer.email)}</p>
              <p><strong>Phone:</strong> ${safeText(customer.mobileNumber)}</p>
              <p><strong>Address:</strong> ${safeText(customer.address)}</p>
            </div>
            <div class="box">
              <h2>Invoice Summary</h2>
              <p><strong>Total:</strong> ${currency} ${formatAmount(invoice.grandTotal)}</p>
              <p><strong>Paid:</strong> ${currency} ${formatAmount(invoice.paidAmount)}</p>
              <p><strong>Due:</strong> ${currency} ${formatAmount(invoice.dueAmount)}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 46px;">SL</th>
                <th>Item</th>
                <th class="right" style="width: 90px;">Qty</th>
                <th class="right" style="width: 120px;">Rate</th>
                <th class="right" style="width: 130px;">Total</th>
              </tr>
            </thead>
            <tbody>${rows || `<tr><td colspan="5" class="center muted">No invoice item found.</td></tr>`}</tbody>
          </table>

          <div class="summary">
            <div><span>Subtotal</span><strong>${currency} ${formatAmount(invoice.subtotal)}</strong></div>
            <div><span>Discount</span><strong>${currency} ${formatAmount(invoice.discountAmount)}</strong></div>
            <div><span>Tax</span><strong>${currency} ${formatAmount(invoice.taxAmount)}</strong></div>
            <div><span>Delivery</span><strong>${currency} ${formatAmount(invoice.deliveryAmount)}</strong></div>
            <div class="total"><span>Grand Total</span><span>${currency} ${formatAmount(invoice.grandTotal)}</span></div>
            <div class="paid"><span>Paid Amount</span><span>${currency} ${formatAmount(invoice.paidAmount)}</span></div>
            <div class="due"><span>Due Amount</span><span>${currency} ${formatAmount(invoice.dueAmount)}</span></div>
          </div>

          <table>
            <thead><tr><th>SL</th><th>Payment Date</th><th>Method</th><th class="right">Amount</th></tr></thead>
            <tbody>${paymentRows}</tbody>
          </table>

          ${invoice.notes ? `<div class="notes"><strong>Notes:</strong> ${safeText(invoice.notes)}</div>` : ""}
          ${invoice.terms ? `<div class="notes"><strong>Terms:</strong> ${safeText(invoice.terms)}</div>` : ""}

          <div class="signatures">
            <div>Prepared By</div>
            <div>Accounts</div>
            <div>Authorized Signature</div>
          </div>
        </div>
        <script>
          setTimeout(() => {
            window.focus();
            window.print();
          }, 300);
        </script>
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    if (iframe.parentNode) document.body.removeChild(iframe);
  }, 1500);
};

export default InvoicePrint;
