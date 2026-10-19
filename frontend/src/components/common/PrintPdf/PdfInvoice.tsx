import { appConfiguration } from "@/utils/constant/appConfiguration";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const formatAmount = (value: unknown) => Number(value || 0).toFixed(2);
const formatDate = (value: unknown) => (value ? new Date(String(value)).toLocaleDateString() : "N/A");
const text = (value: unknown) => String(value ?? "N/A");

const PdfInvoice = (invoice: any, currentCurrency: any) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const currency = currentCurrency?.name || currentCurrency?.symbol || "BDT";
  const customer = invoice.customer || {};
console.log("invoice" , invoice,currentCurrency)
  try {
    doc.addImage(appConfiguration.logo, "PNG", margin, margin, 34, 12);
  } catch {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Accounts Admin Portal", margin, margin + 8);
  }

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(188, 6, 176);
  doc.text("INVOICE", pageWidth - margin, margin + 6, { align: "right" });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(text(appConfiguration.address), margin, margin + 18);
  doc.text(`${text(appConfiguration.email)} | ${text(appConfiguration.phone)}`, margin, margin + 24);
  doc.text(text(appConfiguration.website), margin, margin + 30);

  doc.text(`Invoice No: ${text(invoice.invoiceNo)}`, pageWidth - margin, margin + 16, { align: "right" });
  doc.text(`Invoice Date: ${formatDate(invoice.invoiceDate)}`, pageWidth - margin, margin + 22, { align: "right" });
  doc.text(`Due Date: ${formatDate(invoice.dueDate)}`, pageWidth - margin, margin + 28, { align: "right" });
  doc.text(`Status: ${text(invoice.status).replace(/_/g, " ")}`, pageWidth - margin, margin + 34, { align: "right" });
  doc.setDrawColor(188, 6, 176);
  doc.setLineWidth(0.8);
  doc.line(margin, margin + 38, pageWidth - margin, margin + 38);

  doc.setFont("helvetica", "bold");
  doc.text("Bill To", margin, margin + 48);
  doc.text("Summary", pageWidth / 2 + 8, margin + 48);
  doc.setFont("helvetica", "normal");
  doc.text(`Name: ${text(customer.accountType)}`, margin, margin + 55);
  doc.text(`Email: ${text(customer.email)}`, margin, margin + 61);
  doc.text(`Phone: ${text(customer.mobileNumber)}`, margin, margin + 67);
  doc.text(`Address: ${text(customer.address)}`, margin, margin + 73, { maxWidth: 80 });
  doc.text(`Total: ${currency} ${formatAmount(invoice.grandTotal)}`, pageWidth / 2 + 8, margin + 55);
  doc.text(`Paid: ${currency} ${formatAmount(invoice.paidAmount)}`, pageWidth / 2 + 8, margin + 61);
  doc.text(`Due: ${currency} ${formatAmount(invoice.dueAmount)}`, pageWidth / 2 + 8, margin + 67);

  autoTable(doc, {
    startY: margin + 84,
    head: [["SL", "Item", "Description", "Qty", "Rate", "Total"]],
    body: (invoice.items || []).map((item: any, index: number) => [
      index + 1,
      text(item.name),
      text(item.description || ""),
      formatAmount(item.quantity),
      `${currency} ${formatAmount(item.unitPrice)}`,
      `${currency} ${formatAmount(item.lineTotal)}`,
    ]),
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2, lineColor: [229, 231, 235], lineWidth: 0.2 },
    headStyles: { fillColor: [188, 6, 176], textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 12 }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } },
    margin: { left: margin, right: margin },
  });

  const afterItemsY = (doc as any).lastAutoTable.finalY + 8;
  const summaryRows = [
    ["Subtotal", `${currency} ${formatAmount(invoice.subtotal)}`],
    ["Discount", `${currency} ${formatAmount(invoice.discountAmount)}`],
    ["Tax", `${currency} ${formatAmount(invoice.taxAmount)}`],
    ["Delivery", `${currency} ${formatAmount(invoice.deliveryAmount)}`],
    ["Grand Total", `${currency} ${formatAmount(invoice.grandTotal)}`],
    ["Paid Amount", `${currency} ${formatAmount(invoice.paidAmount)}`],
    ["Due Amount", `${currency} ${formatAmount(invoice.dueAmount)}`],
  ];

  autoTable(doc, {
    startY: afterItemsY,
    body: summaryRows,
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 45, fontStyle: "bold" }, 1: { cellWidth: 45, halign: "right" } },
    margin: { left: pageWidth - margin - 90 },
  });

  const paymentStartY = Math.min((doc as any).lastAutoTable.finalY + 10, pageHeight - 60);
  autoTable(doc, {
    startY: paymentStartY,
    head: [["SL", "Payment Date", "Method", "Amount"]],
    body: (invoice.payments || []).length
      ? invoice.payments.map((payment: any, index: number) => [index + 1, formatDate(payment.paymentDate), text(payment.method || "Cash"), `${currency} ${formatAmount(payment.amount)}`])
      : [["", "No payment received yet.", "", ""]],
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2, lineColor: [229, 231, 235], lineWidth: 0.2 },
    headStyles: { fillColor: [188, 6, 176], textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: { 3: { halign: "right" } },
    margin: { left: margin, right: margin },
  });

  const signatureY = pageHeight - 22;
  doc.setFontSize(9);
  doc.setDrawColor(17, 24, 39);
  ["Prepared By", "Accounts", "Authorized Signature"].forEach((label, index) => {
    const x = margin + 28 + index * 62;
    doc.line(x - 20, signatureY, x + 20, signatureY);
    doc.text(label, x, signatureY + 5, { align: "center" });
  });

  doc.save(`invoice-${text(invoice.invoiceNo)}.pdf`);
};

export default PdfInvoice;
